<script setup lang="ts">
import DisplayStatCardDemo from "./components/DisplayStatCardDemo.vue";
import DisplayInfoCardDemo from "./components/DisplayInfoCardDemo.vue";
import DisplayAvatarDividerDemo from "./components/DisplayAvatarDividerDemo.vue";
import DisplayCodeCopyDemo from "./components/DisplayCodeCopyDemo.vue";
import DisplayTooltipUploadDemo from "./components/DisplayTooltipUploadDemo.vue";
import DisplayUploadDemo from "./components/DisplayUploadDemo.vue";

defineProps<{
  activeComponentKey: string;
}>();
</script>

<template>
  <div>
    <DisplayStatCardDemo v-if="activeComponentKey === 'stat-card'" />
    <DisplayInfoCardDemo v-else-if="activeComponentKey === 'info-card'" />
    <DisplayAvatarDividerDemo v-else-if="activeComponentKey === 'avatar-divider'" />
    <DisplayCodeCopyDemo v-else-if="activeComponentKey === 'code-copy'" />
    <DisplayTooltipUploadDemo v-else-if="activeComponentKey === 'tooltip-upload'" />
    <DisplayUploadDemo v-else-if="activeComponentKey === 'upload'" />
  </div>
</template>
