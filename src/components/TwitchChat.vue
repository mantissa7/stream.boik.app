<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useTwitchChat } from "../composables/useTwitchChat";
import ChatMessage from "./ChatMessage.vue";

const props = defineProps<{ channelName: string; channelId: string }>();

const { messages, emotes, status, user, send, signIn, signOut } = useTwitchChat(
	props.channelName,
	props.channelId,
);

const draft = ref("");
const listEl = ref<HTMLElement | null>(null);
// Keep auto-scrolling only while the viewer is parked at the bottom, so reading
// back through history isn't yanked away by new messages.
const pinned = ref(true);

const onScroll = () => {
	const el = listEl.value;
	if (!el) {
		return;
	}
	pinned.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
};

watch(
	() => messages.value.length,
	async () => {
		if (!pinned.value) {
			return;
		}
		await nextTick();
		const el = listEl.value;
		if (el) {
			el.scrollTop = el.scrollHeight;
		}
	},
);

const submit = () => {
	const text = draft.value.trim();
	if (!text) {
		return;
	}
	send(text);
	draft.value = "";
};
</script>

<template>
  <div class="chat-root">
    <div class="chat-header">
      <span class="status" :data-status="status" :title="`chat: ${status}`"></span>
      <span class="channel">#{{ channelName }}</span>
      <button v-if="user" type="button" class="auth-btn" @click="signOut">
        Log out ({{ user.login }})
      </button>
      <button v-else type="button" class="auth-btn" @click="signIn">
        Log in with Twitch
      </button>
    </div>

    <div ref="listEl" class="messages" @scroll="onScroll">
      <ChatMessage
        v-for="m in messages"
        :key="m.id"
        :message="m"
        :emotes="emotes"
      />
    </div>

    <form class="composer" @submit.prevent="submit">
      <input
        v-model="draft"
        :disabled="!user"
        :placeholder="user ? 'Send a message' : 'Log in to chat'"
        maxlength="500"
        autocomplete="off"
      />
      <button type="submit" :disabled="!user || !draft.trim()">Chat</button>
    </form>
  </div>
</template>

<style scoped>
.chat-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #18181b;
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
}
.chat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #888;
}
.status[data-status="open"] {
  background: #00c389;
}
.status[data-status="connecting"] {
  background: #e0b000;
}
.status[data-status="closed"] {
  background: #e04545;
}
.channel {
  font-weight: 700;
}
.auth-btn {
  margin-left: auto;
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: #9147ff;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}
.auth-btn:hover {
  background: #772ce8;
}
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}
.composer {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.composer input {
  flex: 1;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  background: #0e0e10;
  color: inherit;
}
.composer input:disabled {
  opacity: 0.5;
}
.composer button {
  padding: 0 14px;
  border: none;
  border-radius: 4px;
  background: #9147ff;
  color: #fff;
  cursor: pointer;
}
.composer button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
