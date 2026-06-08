<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";
import { createRandomId, splitLines } from "../../utils";

interface Props {
  code: string;
  language?: string;
  title?: string;
  maxHeight?: string;
  wrap?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  language: "",
  title: "",
  maxHeight: "220px",
  wrap: false,
});

const { t } = useI18n();
const blockId = createRandomId("");
const titleId = `base-code-block-title-${blockId}`;
const codeLabel = computed(() => props.title || props.language || t("common.codeBlock"));
const lines = computed(() => splitLines(props.code));
</script>

<template>
  <section class="base-code-block" :aria-labelledby="title ? titleId : undefined" :aria-label="title ? undefined : codeLabel">
    <div v-if="title || language" class="base-code-block__header">
      <strong v-if="title" :id="titleId">{{ title }}</strong>
      <span v-if="language" aria-hidden="true">{{ language }}</span>
    </div>
    <pre class="base-code-block__body" :class="{ 'is-wrap': wrap }" :style="{ maxHeight }" tabindex="0"><code><span
      v-for="(line, index) in lines"
      :key="`${index}-${line}`"
      class="base-code-block__line"
    ><span class="base-code-block__number" aria-hidden="true">{{ index + 1 }}</span><span class="base-code-block__text">{{ line || ' ' }}</span></span></code></pre>
  </section>
</template>

<style scoped>
.base-code-block {
  @apply min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.base-code-block__header {
  @apply flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.base-code-block__header strong {
  @apply truncate text-[11px] font-black text-slate-700 dark:text-slate-200;
}

.base-code-block__header span {
  @apply shrink-0 rounded bg-white px-2 py-0.5 text-[10px] font-black text-slate-400 dark:bg-slate-900 dark:text-slate-500;
}

.base-code-block__body {
  @apply overflow-auto bg-slate-50 p-0 text-[11px] leading-5 text-slate-700 dark:bg-slate-950 dark:text-slate-200;
}

.base-code-block__body:focus-visible {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-code-block__body.is-wrap .base-code-block__text {
  @apply whitespace-pre-wrap break-words;
}

.base-code-block__line {
  @apply grid min-w-max grid-cols-[44px_minmax(0,1fr)];
}

.base-code-block__number {
  @apply select-none border-r border-slate-200 px-3 text-right text-slate-300 dark:border-slate-800 dark:text-slate-600;
}

.base-code-block__text {
  @apply px-3 font-mono;
  letter-spacing: 0;
}
</style>
