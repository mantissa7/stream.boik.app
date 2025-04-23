<script setup lang="ts">
  // const parent = "localhost"
  const parent = "stream.boik.app"
  const chat = `https://www.twitch.tv/embed/hatfilms/chat?parent=${parent}&darkpopout`;
</script>

<template>
  <!-- <iframe
      src="https://player.twitch.tv/?hatfilms&parent=localhost"
      height="100%"
      width="100%"
      allowfullscreen="true"
    >
    </iframe> -->
  <div className="vid">
    <iframe
      src="https://www.youtube.com/embed/live_stream?channel=UC7A_dLnSAjl7uROCdoNyjzg"
      width="100%"
      height="100%"
      title="stream"
    ></iframe>
  </div>
  <div className="chat">
    <iframe
      :src="chat"
      height="100%"
      width="100%"
      title="chat"
    ></iframe>
  </div>
</template>

<style scoped></style>
