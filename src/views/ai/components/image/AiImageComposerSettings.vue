<script setup lang="ts">
type SelectOptionValue = string | number | boolean | Record<string, unknown> | null | undefined;
export type ImageComposerSelectOption<T extends SelectOptionValue = SelectOptionValue> = {
  label: string;
  selectedLabel?: string;
  value: T;
  key?: string | number;
  filterText?: string;
  description?: string;
  meta?: string;
  icon?: string;
  disabled?: boolean;
};

defineProps<{
  modelConfigId: string;
  modelConfigOptions: ImageComposerSelectOption<string>[];
  imageDraftSize: string;
  imageSizeOptions: ImageComposerSelectOption<string>[];
  imageDraftCount: number;
  activeSizeLabel: string;
  activeSizeDetail: string;
}>();

const emit = defineEmits<{
  (event: "update:modelConfigId", value: string): void;
  (event: "update:imageDraftSize", value: string): void;
  (event: "update:imageDraftCount", value: number): void;
}>();

function updateModelConfigId(value: unknown) {
  emit("update:modelConfigId", String(value ?? ""));
}

function updateImageDraftSize(value: unknown) {
  emit("update:imageDraftSize", String(value ?? ""));
}

function updateImageDraftCount(value: unknown) {
  const numeric = Number(value);
  emit("update:imageDraftCount", Number.isFinite(numeric) ? Math.max(1, Math.floor(numeric)) : 1);
}
</script>

<template>
  <div class="composer-top">
    <div class="composer-controls">
      <BaseSelect
        :model-value="modelConfigId"
        :options="modelConfigOptions"
        size="sm"
        class="model-select"
        @update:model-value="updateModelConfigId"
      />
      <BaseSelect
        :model-value="imageDraftSize"
        :options="imageSizeOptions"
        size="sm"
        class="size-select"
        :fit-input-width="false"
        @update:model-value="updateImageDraftSize"
      />
      <BaseInput
        :model-value="imageDraftCount"
        type="number"
        min="1"
        size="sm"
        class="count-select"
        @update:model-value="updateImageDraftCount"
      />
    </div>
    <div class="composer-size-detail" :title="activeSizeDetail">
      <strong>{{ activeSizeLabel }}</strong>
      <span>{{ activeSizeDetail }}</span>
    </div>
  </div>
</template>

<style scoped>
.composer-top {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2;
}
.composer-controls {
  @apply flex min-w-[220px] flex-1 items-center gap-2;
}
.model-select {
  @apply min-w-0 flex-1 shrink;
}
.size-select {
  @apply w-20 shrink-0;
}
.count-select {
  @apply shrink-0;
  width: 84px;
}
.size-select :deep(.base-select__selected-label) {
  @apply w-full text-center font-black;
}
.count-select :deep(input) {
  @apply w-full text-center font-black;
}
.composer-size-detail {
  @apply flex min-w-0 max-w-64 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400;
}
.composer-size-detail strong {
  @apply shrink-0 text-[12px] font-black text-slate-800 dark:text-slate-100;
}
.composer-size-detail span {
  @apply min-w-0 truncate;
}
@media (max-width: 1024px) {
  .composer-size-detail {
    @apply max-w-36;
  }
}
@media (max-width: 520px) {
  .composer-top {
    @apply flex-col items-stretch;
  }

  .composer-size-detail {
    @apply max-w-full;
  }
}
</style>
