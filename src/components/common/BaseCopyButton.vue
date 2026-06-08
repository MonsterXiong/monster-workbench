<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { Check, Copy } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";

interface Props {
  text: string;
  label?: string;
  copiedLabel?: string;
  disabled?: boolean;
  size?: "xs" | "sm" | "md";
}

const props = withDefaults(defineProps<Props>(), {
  label: "",
  copiedLabel: "",
  disabled: false,
  size: "sm",
});

const emit = defineEmits<{
  (e: "copied", value: string): void;
  (e: "error", error: unknown): void;
}>();

const copied = ref(false);
let resetTimer: number | undefined;
const { t } = useI18n();

const fallbackCopy = (value: string) => {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!ok) throw new Error("copy failed");
};

const handleCopy = async () => {
  if (props.disabled || !props.text) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.text);
    } else {
      fallbackCopy(props.text);
    }
    copied.value = true;
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      copied.value = false;
    }, 1500);
    emit("copied", props.text);
  } catch (error) {
    emit("error", error);
  }
};

onBeforeUnmount(() => {
  window.clearTimeout(resetTimer);
});
</script>

<template>
  <button
    type="button"
    class="base-copy-button"
    :class="[`base-copy-button--${size}`, { 'is-copied': copied }]"
    :disabled="disabled || !text"
    :aria-label="copied ? copiedLabel || t('common.copied') : label || t('common.copy')"
    :aria-live="copied ? 'polite' : undefined"
    @click="handleCopy"
  >
    <Check v-if="copied" class="h-3.5 w-3.5" aria-hidden="true" />
    <Copy v-else class="h-3.5 w-3.5" aria-hidden="true" />
    <span>{{ copied ? copiedLabel || t("common.copied") : label || t("common.copy") }}</span>
  </button>
</template>

<style scoped>
.base-copy-button {
  @apply inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white font-black text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-950 dark:hover:text-slate-100;
}

.base-copy-button--xs {
  @apply h-6 px-2 text-[10px];
}

.base-copy-button--sm {
  @apply h-8 px-2.5 text-[11px];
}

.base-copy-button--md {
  @apply h-9 px-3 text-xs;
}

.base-copy-button.is-copied {
  @apply border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300;
}
</style>
