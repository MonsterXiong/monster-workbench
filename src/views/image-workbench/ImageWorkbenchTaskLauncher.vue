<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  buildImageWorkbenchTaskEntries,
  buildImageWorkbenchTaskPresets,
  type ImageWorkbenchTaskEntryKey,
  type ImageWorkbenchTaskPresetKey,
} from "./imageWorkbenchTaskLauncher";

const props = defineProps<{
  activeKey: ImageWorkbenchTaskEntryKey;
}>();

const emit = defineEmits<{
  select: [key: ImageWorkbenchTaskEntryKey];
  applyPreset: [key: ImageWorkbenchTaskPresetKey];
}>();

const { t } = useI18n();
const taskEntries = computed(() => buildImageWorkbenchTaskEntries(t));
const taskPresets = computed(() => buildImageWorkbenchTaskPresets(props.activeKey, t));
</script>

<template>
  <section class="image-workbench-task-launcher">
    <button
      v-for="entry in taskEntries"
      :key="entry.key"
      type="button"
      class="image-workbench-task-entry"
      :class="{ 'is-active': activeKey === entry.key }"
      @click="emit('select', entry.key)"
    >
      <component :is="entry.icon" class="h-3.5 w-3.5" />
      <span>
        <strong>{{ entry.title }}</strong>
        <small>{{ entry.description }}</small>
      </span>
    </button>
    <details v-if="taskPresets.length" class="image-workbench-task-presets">
      <summary>
        <span>{{ t("imageWorkbench.tasks.presetsTitle") }}</span>
        <small>{{ taskPresets.length }}</small>
      </summary>
      <div>
        <button
          v-for="preset in taskPresets"
          :key="preset.key"
          type="button"
          @click="emit('applyPreset', preset.key)"
        >
          {{ preset.label }}
        </button>
      </div>
    </details>
  </section>
</template>
