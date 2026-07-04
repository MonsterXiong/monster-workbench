<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  buildImageWorkbenchTaskEntries,
  buildImageWorkbenchTaskPresets,
  type ImageWorkbenchTaskEntryKey,
  type ImageWorkbenchTaskPresetKey,
} from "./imageWorkbenchTaskLauncher";

const props = withDefaults(defineProps<{
  activeKey: ImageWorkbenchTaskEntryKey;
  showPresets?: boolean;
}>(), {
  showPresets: true,
});

const emit = defineEmits<{
  select: [key: ImageWorkbenchTaskEntryKey];
  applyPreset: [key: ImageWorkbenchTaskPresetKey];
}>();

const { t } = useI18n();
const collapsedPresetCount = 4;
const presetsExpanded = ref(false);
const taskEntries = computed(() => buildImageWorkbenchTaskEntries(t));
const taskPresets = computed(() => buildImageWorkbenchTaskPresets(props.activeKey, t));
const hiddenPresetCount = computed(() => Math.max(taskPresets.value.length - collapsedPresetCount, 0));
const visibleTaskPresets = computed(() =>
  presetsExpanded.value || !hiddenPresetCount.value
    ? taskPresets.value
    : taskPresets.value.slice(0, collapsedPresetCount)
);
const visiblePresetGroups = computed(() => {
  const groups: Array<{
    key: string;
    label: string;
    presets: typeof visibleTaskPresets.value;
  }> = [];
  visibleTaskPresets.value.forEach((preset) => {
    let group = groups.find((item) => item.key === preset.groupKey);
    if (!group) {
      group = { key: preset.groupKey, label: preset.groupLabel, presets: [] };
      groups.push(group);
    }
    group.presets.push(preset);
  });
  return groups;
});

watch(
  () => props.activeKey,
  () => {
    presetsExpanded.value = false;
  }
);
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
    <div v-if="showPresets && taskPresets.length" class="image-workbench-task-presets">
      <span>{{ t("imageWorkbench.tasks.presetsTitle") }}</span>
      <div>
        <div
          v-for="group in visiblePresetGroups"
          :key="group.key"
          class="image-workbench-task-presets__group"
        >
          <small>{{ group.label }}</small>
          <button
            v-for="preset in group.presets"
            :key="preset.key"
            type="button"
            @click="emit('applyPreset', preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>
        <button
          v-if="hiddenPresetCount"
          type="button"
          class="image-workbench-task-presets__more"
          @click="presetsExpanded = !presetsExpanded"
        >
          {{
            presetsExpanded
              ? t("imageWorkbench.tasks.collapsePresets")
              : t("imageWorkbench.tasks.morePresets")
          }}
        </button>
      </div>
    </div>
  </section>
</template>
