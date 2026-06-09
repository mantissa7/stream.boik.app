<script setup lang="ts">
import { computed } from "vue";
import type { EmoteMap } from "../lib/emotes";
import { tokenize } from "../lib/renderMessage";
import type { ChatMessage } from "../lib/twitchIrc";

const props = defineProps<{ message: ChatMessage; emotes: EmoteMap }>();

const tokens = computed(() =>
	tokenize(props.message.text, props.message.emotes, props.emotes),
);
</script>

<template>
  <div class="msg">
    <span class="name" :style="{ color: message.color || '#a0a0b3' }">{{ message.displayName }}</span><span class="sep">: </span><template
      v-for="(t, i) in tokens"
      :key="i"
    ><img
        v-if="t.type === 'emote'"
        :src="t.url"
        :alt="t.alt"
        :title="t.alt"
        class="emote"
        loading="lazy"
      /><span v-else>{{ t.value }}</span></template>
  </div>
</template>

<style scoped>
.msg {
  padding: 2px 8px;
  line-height: 1.4;
  word-wrap: break-word;
}
.name {
  font-weight: 700;
}
.sep {
  opacity: 0.6;
}
.emote {
  vertical-align: middle;
  height: 1.6em;
  margin: -2px 1px;
}
</style>
