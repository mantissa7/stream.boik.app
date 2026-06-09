// Minimal Twitch chat client over the IRC-WebSocket gateway. Reads anonymously
// by default; pass credentials to connect() to also send messages. Only the
// PRIVMSG path is parsed — everything else (joins, notices, etc.) is ignored.

export type ChatMessage = {
	id: string;
	login: string;
	displayName: string;
	color: string | null;
	text: string;
	/** Twitch native emotes: emoteId -> ["start-end", ...] (code-point offsets). */
	emotes: Record<string, string[]>;
};

export type ConnectionStatus = "connecting" | "open" | "closed";

type Handlers = {
	onMessage: (message: ChatMessage) => void;
	onStatus?: (status: ConnectionStatus) => void;
};

type Credentials = { token: string; login: string };

// Resolved on every (re)connect, so a reconnect after token expiry picks up a
// freshly minted token. Returning undefined connects anonymously (read-only).
type CredentialsProvider = () => Promise<Credentials | undefined>;

const IRC_URL = "wss://irc-ws.chat.twitch.tv:443";

function unescapeTagValue(value: string): string {
	return value
		.replace(/\\s/g, " ")
		.replace(/\\:/g, ";")
		.replace(/\\r/g, "\r")
		.replace(/\\n/g, "\n")
		.replace(/\\\\/g, "\\");
}

function parseTags(raw: string): Record<string, string> {
	const tags: Record<string, string> = {};
	for (const part of raw.split(";")) {
		const eq = part.indexOf("=");
		const key = eq === -1 ? part : part.slice(0, eq);
		const value = eq === -1 ? "" : part.slice(eq + 1);
		tags[key] = unescapeTagValue(value);
	}
	return tags;
}

function parseEmotes(tag: string): Record<string, string[]> {
	const emotes: Record<string, string[]> = {};
	if (!tag) {
		return emotes;
	}
	for (const group of tag.split("/")) {
		const [id, ranges] = group.split(":");
		if (id && ranges) {
			emotes[id] = ranges.split(",");
		}
	}
	return emotes;
}

export class TwitchChatClient {
	private ws?: WebSocket;
	private creds?: Credentials;
	private credsProvider?: CredentialsProvider;
	private closedByUser = false;
	private reconnectDelay = 1000;
	private fallbackId = 0;

	constructor(
		private readonly channel: string,
		private readonly handlers: Handlers,
	) {}

	connect(credsProvider?: CredentialsProvider) {
		this.credsProvider = credsProvider;
		this.closedByUser = false;
		this.open();
	}

	/** Drop the current connection and reconnect (e.g. after login/logout). */
	reconnect() {
		this.closedByUser = false;
		this.ws?.close(); // onclose re-opens with freshly resolved credentials
	}

	private open() {
		this.handlers.onStatus?.("connecting");
		const ws = new WebSocket(IRC_URL);
		this.ws = ws;

		ws.onopen = async () => {
			let creds: Credentials | undefined;
			try {
				creds = await this.credsProvider?.();
			} catch {
				creds = undefined;
			}
			// Bail if the socket closed while we were resolving credentials.
			if (ws.readyState !== WebSocket.OPEN) {
				return;
			}
			this.creds = creds;
			ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
			if (creds) {
				ws.send(`PASS oauth:${creds.token}`);
				ws.send(`NICK ${creds.login}`);
			} else {
				ws.send(`NICK justinfan${10000 + Math.floor(Math.random() * 80000)}`);
			}
			ws.send(`JOIN #${this.channel}`);
			this.reconnectDelay = 1000;
			this.handlers.onStatus?.("open");
		};

		ws.onmessage = (event) => {
			for (const line of String(event.data).split("\r\n")) {
				if (line) {
					this.handleLine(line, ws);
				}
			}
		};

		ws.onclose = () => {
			this.handlers.onStatus?.("closed");
			if (!this.closedByUser) {
				setTimeout(() => this.open(), this.reconnectDelay);
				this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
			}
		};

		ws.onerror = () => ws.close();
	}

	private handleLine(line: string, ws: WebSocket) {
		let rest = line;
		let tags: Record<string, string> = {};
		if (rest.startsWith("@")) {
			const sp = rest.indexOf(" ");
			tags = parseTags(rest.slice(1, sp));
			rest = rest.slice(sp + 1);
		}

		if (rest.startsWith("PING")) {
			ws.send("PONG :tmi.twitch.tv");
			return;
		}

		// :nick!user@host PRIVMSG #channel :message text
		const match = rest.match(/^:([^!]+)![^ ]+ PRIVMSG #[^ ]+ :(.*)$/);
		if (!match) {
			return;
		}
		const [, login, text] = match;
		this.fallbackId += 1;
		this.handlers.onMessage({
			id: tags.id || `local-${this.fallbackId}`,
			login,
			displayName: tags["display-name"] || login,
			color: tags.color || null,
			text,
			emotes: parseEmotes(tags.emotes || ""),
		});
	}

	say(text: string) {
		if (this.ws?.readyState === WebSocket.OPEN && this.creds) {
			this.ws.send(`PRIVMSG #${this.channel} :${text}`);
		}
	}

	close() {
		this.closedByUser = true;
		this.ws?.close();
	}
}
