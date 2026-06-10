<script setup lang="ts">
import FeedbackAlertDemo from "./components/FeedbackAlertDemo.vue";
import FeedbackToastMessageDemo from "./components/FeedbackToastMessageDemo.vue";
import FeedbackDialogDemo from "./components/FeedbackDialogDemo.vue";
import FeedbackDrawerDemo from "./components/FeedbackDrawerDemo.vue";

defineProps<{
  activeComponentKey: string;
}>();
</script>

<template>
  <div>
    <FeedbackAlertDemo v-if="activeComponentKey === 'alert'" />
    <FeedbackToastMessageDemo v-else-if="activeComponentKey === 'toast-message'" />
    <FeedbackDialogDemo v-else-if="activeComponentKey === 'dialog'" />
    <FeedbackDrawerDemo v-else-if="activeComponentKey === 'drawer'" />
  </div>
</template>
