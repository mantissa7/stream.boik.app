// Loads third-party emotes (BTTV, FFZ, 7TV — global + channel) into a single
// name -> Emote map for word-based replacement in chat messages. Twitch's own
// emotes are not handled here; they arrive positionally in each message's tags
// and are resolved in renderMessage.ts.

export type Emote = {
	name: string;
	url: string;
};

export type EmoteMap = Map<string, Emote>;

const bttvUrl = (id: string) => `https://cdn.betterttv.net/emote/${id}/2x.webp`;
const sevenTvUrl = (id: string) => `https://cdn.7tv.app/emote/${id}/2x.webp`;

async function safeJson<T>(url: string): Promise<T | null> {
	try {
		const res = await fetch(url);
		if (!res.ok) {
			return null;
		}
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

type BttvEmote = { id: string; code: string };
type BttvChannel = { channelEmotes: BttvEmote[]; sharedEmotes: BttvEmote[] };

function addBttv(map: EmoteMap, emotes: BttvEmote[] | undefined) {
	for (const e of emotes ?? []) {
		map.set(e.code, { name: e.code, url: bttvUrl(e.id) });
	}
}

type FfzEmote = { name: string; urls: Record<string, string> };
type FfzResponse = { sets: Record<string, { emoticons: FfzEmote[] }> };

function addFfz(map: EmoteMap, resp: FfzResponse | null) {
	for (const set of Object.values(resp?.sets ?? {})) {
		for (const e of set.emoticons ?? []) {
			const url = e.urls["2"] ?? e.urls["1"] ?? e.urls["4"];
			if (url) {
				map.set(e.name, {
					name: e.name,
					url: url.startsWith("http") ? url : `https:${url}`,
				});
			}
		}
	}
}

type SevenEmote = { name: string; id: string };

function addSeven(map: EmoteMap, emotes: SevenEmote[] | undefined) {
	for (const e of emotes ?? []) {
		map.set(e.name, { name: e.name, url: sevenTvUrl(e.id) });
	}
}

// Each provider fails independently — a single dead API never blocks the rest.
// Globals load first, then channel sets, so channel emotes win on name clashes.
export async function loadEmotes(
	channelName: string,
	channelId: string,
): Promise<EmoteMap> {
	const map: EmoteMap = new Map();

	await Promise.all([
		safeJson<BttvEmote[]>(
			"https://api.betterttv.net/3/cached/emotes/global",
		).then((e) => addBttv(map, e ?? undefined)),
		safeJson<FfzResponse>("https://api.frankerfacez.com/v1/set/global").then(
			(r) => addFfz(map, r),
		),
		safeJson<{ emotes: SevenEmote[] }>(
			"https://7tv.io/v3/emote-sets/global",
		).then((r) => addSeven(map, r?.emotes)),
	]);

	await Promise.all([
		safeJson<BttvChannel>(
			`https://api.betterttv.net/3/cached/users/twitch/${channelId}`,
		).then((c) => {
			addBttv(map, c?.channelEmotes);
			addBttv(map, c?.sharedEmotes);
		}),
		safeJson<FfzResponse>(
			`https://api.frankerfacez.com/v1/room/${channelName}`,
		).then((r) => addFfz(map, r)),
		safeJson<{ emote_set?: { emotes: SevenEmote[] } }>(
			`https://7tv.io/v3/users/twitch/${channelId}`,
		).then((r) => addSeven(map, r?.emote_set?.emotes)),
	]);

	return map;
}
