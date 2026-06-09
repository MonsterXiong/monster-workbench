<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { joinAriaIds, normalizeDomIdSegment, splitLines, toSet } from "../../utils";
import BaseCopyButton from "./BaseCopyButton.vue";
import BaseIcon from "./BaseIcon.vue";

type CodeBlockSize = "sm" | "md" | "lg";

interface Props {
  code: string;
  language?: string;
  title?: string;
  description?: string;
  maxHeight?: string;
  wrap?: boolean;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  lineNumberStart?: number;
  copyable?: boolean;
  copyLabel?: string;
  copiedLabel?: string;
  copyErrorLabel?: string;
  copyText?: string;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  size?: CodeBlockSize;
  ariaLabel?: string;
  ariaDescribedby?: string;
}

const props = withDefaults(defineProps<Props>(), {
  language: "",
  title: "",
  description: "",
  maxHeight: "220px",
  wrap: false,
  showLineNumbers: true,
  highlightLines: () => [],
  lineNumberStart: 1,
  copyable: false,
  copyLabel: "",
  copiedLabel: "",
  copyErrorLabel: "",
  copyText: "",
  loading: false,
  loadingText: "",
  emptyText: "",
  size: "md",
  ariaLabel: "",
  ariaDescribedby: "",
});

const emit = defineEmits<{
  (e: "copied", value: string): void;
  (e: "copy-error", error: unknown): void;
}>();

const { t } = useI18n();
const blockId = useId();
const titleId = `base-code-block-title-${blockId}`;
const descriptionId = `base-code-block-description-${blockId}`;
const loadingId = `base-code-block-loading-${blockId}`;
const emptyId = `base-code-block-empty-${blockId}`;
const codeLabel = computed(() => props.title || props.language || t("common.codeBlock"));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedEmptyText = computed(() => props.emptyText || t("common.codeBlockEmpty"));
const hasCode = computed(() => props.code.length > 0);
const hasHeader = computed(() => props.title || props.description || props.language || props.copyable || props.loading);
const copyValue = computed(() => props.copyText || props.code);
const hasCopyValue = computed(() => copyValue.value.length > 0);
const languageClass = computed(() => (props.language ? `language-${normalizeDomIdSegment(props.language, "code")}` : undefined));
const highlightedLineSet = computed(() => toSet(props.highlightLines));
const describedBy = computed(() =>
  joinAriaIds([
    props.description ? descriptionId : undefined,
    props.loading ? loadingId : undefined,
    !hasCode.value ? emptyId : undefined,
    props.ariaDescribedby,
  ])
);
const lines = computed(() => {
  if (!hasCode.value) return [];

  return splitLines(props.code).map((line, index) => {
    const number = props.lineNumberStart + index;
    return {
      key: `${number}-${line}`,
      number,
      text: line || " ",
      highlighted: highlightedLineSet.value.has(number),
    };
  });
});
</script>

<template>
  <section
    class="base-code-block"
    :class="[
      `base-code-block--${size}`,
      {
        'base-code-block--wrap': wrap,
        'base-code-block--no-lines': !showLineNumbers,
        'is-loading': loading,
      },
    ]"
    :aria-labelledby="title ? titleId : undefined"
    :aria-describedby="describedBy"
    :aria-label="title ? undefined : ariaLabel || codeLabel"
    :aria-busy="loading ? 'true' : undefined"
  >
    <div v-if="hasHeader" class="base-code-block__header">
      <div class="base-code-block__heading">
        <strong v-if="title" :id="titleId">{{ title }}</strong>
        <p v-if="description" :id="descriptionId">{{ description }}</p>
      </div>
      <div class="base-code-block__meta">
        <span v-if="language" class="base-code-block__language" aria-hidden="true">{{ language }}</span>
        <span v-if="loading" :id="loadingId" class="base-code-block__loading" role="status" aria-live="polite">
          <BaseIcon name="LoaderCircle" size="13" aria-hidden="true" />
          {{ resolvedLoadingText }}
        </span>
        <slot name="actions"></slot>
        <BaseCopyButton
          v-if="copyable"
          :text="copyValue"
          :label="copyLabel"
          :copied-label="copiedLabel"
          :error-label="copyErrorLabel"
          :disabled="loading || !hasCopyValue"
          size="xs"
          @copied="emit('copied', $event)"
          @error="emit('copy-error', $event)"
        />
      </div>
    </div>

    <div class="base-code-block__body-wrap">
      <pre
        v-if="hasCode"
        class="base-code-block__body"
        :style="{ maxHeight }"
        tabindex="0"
        :aria-label="codeLabel"
      ><code :class="languageClass" :data-language="language || undefined"><span
        v-for="line in lines"
        :key="line.key"
        class="base-code-block__line"
        :class="{ 'is-highlighted': line.highlighted }"
      ><span v-if="showLineNumbers" class="base-code-block__number" aria-hidden="true">{{ line.number }}</span><span class="base-code-block__text">{{ line.text }}</span></span></code></pre>
      <div v-else :id="emptyId" class="base-code-block__empty" :style="{ minHeight: maxHeight }" role="status">
        {{ resolvedEmptyText }}
      </div>
      <div v-if="loading" class="base-code-block__overlay" aria-hidden="true">
        <BaseIcon name="LoaderCircle" size="18" aria-hidden="true" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.base-code-block {
  @apply min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.base-code-block__header {
  @apply flex min-w-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.base-code-block__heading {
  @apply min-w-0 flex-1;
}

.base-code-block__header strong {
  @apply block truncate text-[11px] font-black text-slate-700 dark:text-slate-200;
}

.base-code-block__header p {
  @apply mt-0.5 truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-code-block__meta {
  @apply flex shrink-0 flex-wrap items-center justify-end gap-2;
}

.base-code-block__language,
.base-code-block__loading {
  @apply shrink-0 rounded bg-white px-2 py-0.5 text-[10px] font-black text-slate-400 dark:bg-slate-900 dark:text-slate-500;
}

.base-code-block__loading {
  color: rgb(var(--color-primary));
  @apply inline-flex items-center gap-1;
}

.base-code-block__loading :deep(svg),
.base-code-block__overlay :deep(svg) {
  animation: base-code-block-spin 0.9s linear infinite;
}

.base-code-block__body-wrap {
  @apply relative min-w-0;
}

.base-code-block__body {
  @apply overflow-auto bg-slate-50 p-0 text-[11px] leading-5 text-slate-700 dark:bg-slate-950 dark:text-slate-200;
}

.base-code-block__body:focus-visible {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-code-block__body code {
  @apply block min-w-max;
}

.base-code-block__line {
  @apply grid min-w-max grid-cols-[44px_minmax(0,1fr)];
}

.base-code-block--no-lines .base-code-block__line {
  @apply grid-cols-1;
}

.base-code-block--wrap .base-code-block__body {
  @apply overflow-x-hidden;
}

.base-code-block--wrap .base-code-block__body code,
.base-code-block--wrap .base-code-block__line {
  @apply min-w-0;
}

.base-code-block--wrap .base-code-block__line {
  @apply w-full;
}

.base-code-block__number {
  @apply select-none border-r border-slate-200 px-3 text-right text-slate-300 dark:border-slate-800 dark:text-slate-600;
}

.base-code-block__text {
  @apply whitespace-pre px-3 font-mono;
  letter-spacing: 0;
}

.base-code-block--wrap .base-code-block__text {
  @apply whitespace-pre-wrap break-words;
}

.base-code-block__line.is-highlighted {
  background-color: rgb(var(--color-primary) / 0.08);
  box-shadow: inset 2px 0 0 rgb(var(--color-primary));
}

.base-code-block__empty {
  @apply flex min-h-24 items-center justify-center bg-slate-50 px-4 py-8 text-xs font-bold text-slate-400 dark:bg-slate-950 dark:text-slate-500;
}

.base-code-block__overlay {
  @apply absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 text-primary backdrop-blur-[1px] dark:bg-slate-950 dark:bg-opacity-70;
}

.base-code-block--sm .base-code-block__body {
  @apply text-[10px] leading-4;
}

.base-code-block--lg .base-code-block__body {
  @apply text-xs leading-6;
}

.base-code-block--sm .base-code-block__line {
  @apply grid-cols-[38px_minmax(0,1fr)];
}

.base-code-block--lg .base-code-block__line {
  @apply grid-cols-[52px_minmax(0,1fr)];
}

.base-code-block--sm.base-code-block--no-lines .base-code-block__line,
.base-code-block--lg.base-code-block--no-lines .base-code-block__line {
  @apply grid-cols-1;
}

@media (max-width: 640px) {
  .base-code-block__header {
    @apply flex-wrap;
  }

  .base-code-block__meta {
    @apply w-full justify-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-code-block__loading :deep(svg),
  .base-code-block__overlay :deep(svg) {
    animation: none !important;
  }
}

@keyframes base-code-block-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
