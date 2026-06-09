<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import TwitchChat from "./components/TwitchChat.vue";

// Twitch chat is rendered by a custom client (see TwitchChat.vue) so we keep
// Twitch + BTTV/FFZ/7TV emotes — the official embed can't show third-party ones.
const TWITCH_CHANNEL = "hatfilms";
const TWITCH_CHANNEL_ID = "21945983";

const CHANNEL_ID = "UC7A_dLnSAjl7uROCdoNyjzg";
// Base URL of the backend (in a separate repo). Override at build time with
// VITE_STREAM_API_BASE; defaults to a same-origin relative path.
const API_BASE = import.meta.env.VITE_STREAM_API_BASE ?? "";
// How often to re-check whether a livestream is up (ms).
const POLL_INTERVAL_MS = 90_000;

type LiveStatus = {
	live: boolean;
	videoId: string | null;
	embedUrl?: string | null;
	title?: string | null;
};

const videoSrc = ref<string | null>(null);
const loading = ref(true);
const errored = ref(false);

let timer: ReturnType<typeof setInterval> | undefined;

const fetchLatestLive = async () => {
	try {
		const res = await fetch(
			`${API_BASE}/youtube/live?channelId=${encodeURIComponent(CHANNEL_ID)}`,
		);
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}
		const data: LiveStatus = await res.json();
		if (data.live && data.videoId) {
			const next =
				data.embedUrl ??
				`https://www.youtube.com/embed/${data.videoId}?autoplay=1`;
			// Only reassign when the URL actually changes, so a poll that returns
			// the same stream doesn't reload the iframe out from under the viewer.
			if (videoSrc.value !== next) {
				videoSrc.value = next;
			}
		} else {
			videoSrc.value = null;
		}
		errored.value = false;
	} catch {
		errored.value = true;
	} finally {
		loading.value = false;
	}
};

onMounted(() => {
	fetchLatestLive();
	timer = setInterval(fetchLatestLive, POLL_INTERVAL_MS);
});

onUnmounted(() => {
	if (timer) {
		clearInterval(timer);
	}
});
</script>

<template>
  <div class="vid">
    <iframe
      v-if="videoSrc"
      :src="videoSrc"
      width="100%"
      height="100%"
      title="stream"
      allow="autoplay; fullscreen; encrypted-media"
      allowfullscreen
    ></iframe>
    <div v-else class="placeholder">
      <p v-if="loading">Loading stream…</p>
      <p v-else-if="errored">Couldn't reach the stream service.</p>
      <p v-else>Stream is offline right now.</p>
    </div>
  </div>
  <div class="chat">
    <TwitchChat
      :channel-name="TWITCH_CHANNEL"
      :channel-id="TWITCH_CHANNEL_ID"
    />
  </div>
</template>

<style scoped>
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  opacity: 0.7;
}
</style>
