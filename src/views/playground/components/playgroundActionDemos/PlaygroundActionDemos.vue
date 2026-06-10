<script setup lang="ts">
import ActionCommandPaletteDemo from "./components/ActionCommandPaletteDemo.vue";
import ActionActionMenuDemo from "./components/ActionActionMenuDemo.vue";
import ActionToolbarDemo from "./components/ActionToolbarDemo.vue";
import ActionConfirmActionDemo from "./components/ActionConfirmActionDemo.vue";
import ActionFormActionsDemo from "./components/ActionFormActionsDemo.vue";

defineProps<{
  activeComponentKey: string;
}>();
</script>

<template>
  <div>
    <ActionCommandPaletteDemo v-if="activeComponentKey === 'command-palette'" />
    <ActionActionMenuDemo v-else-if="activeComponentKey === 'action-menu'" />
    <ActionToolbarDemo v-else-if="activeComponentKey === 'toolbar'" />
    <ActionConfirmActionDemo v-else-if="activeComponentKey === 'confirm-action'" />
    <ActionFormActionsDemo v-else-if="activeComponentKey === 'form-actions'" />
  </div>
</template>
