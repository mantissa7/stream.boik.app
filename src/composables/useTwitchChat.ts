import { onMounted, onUnmounted, ref, shallowRef } from "vue";
import { type EmoteMap, loadEmotes } from "../lib/emotes";
import * as auth from "../lib/twitchAuth";
import {
	type ChatMessage,
	type ConnectionStatus,
	TwitchChatClient,
} from "../lib/twitchIrc";

// Cap retained messages so the DOM and memory stay bounded on long sessions.
const MAX_MESSAGES = 200;

export function useTwitchChat(channelName: string, channelId: string) {
	const messages = ref<ChatMessage[]>([]);
	const emotes = shallowRef<EmoteMap>(new Map());
	const status = ref<ConnectionStatus>("connecting");
	const user = ref<auth.AuthUser | null>(null);

	const client = new TwitchChatClient(channelName, {
		onMessage: (m) => {
			messages.value.push(m);
			if (messages.value.length > MAX_MESSAGES) {
				messages.value.splice(0, messages.value.length - MAX_MESSAGES);
			}
		},
		onStatus: (s) => {
			status.value = s;
		},
	});

	// Resolved on every (re)connect: returns a fresh token from the backend
	// session so reconnects survive token expiry; undefined => anonymous read.
	const resolveCreds = async () => {
		const current = await auth.getSession();
		user.value = current;
		return current ?? undefined;
	};

	const send = (text: string) => client.say(text);

	const signIn = () => auth.login();

	const signOut = async () => {
		await auth.logout();
		user.value = null;
		client.reconnect(); // drop back to an anonymous read-only connection
	};

	onMounted(async () => {
		emotes.value = await loadEmotes(channelName, channelId);
		user.value = await auth.getSession();
		client.connect(resolveCreds);
	});

	onUnmounted(() => client.close());

	return { messages, emotes, status, user, send, signIn, signOut };
}
