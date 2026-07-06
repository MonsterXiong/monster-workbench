<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from "vue";
import { RotateCcw } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { formatTemplate } from "../../utils";

interface ImageModelOption {
  value: string;
  text: string;
  disabled?: boolean;
}

const props = defineProps<{
  open: boolean;
  groupTitle: string;
  count: number;
  modelConfigId: string;
  modelOptions: ImageModelOption[];
  loading?: boolean;
  canConfirm?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [];
  "update:modelConfigId": [value: string];
}>();

const { t } = useI18n();
const dialogId = useId();
const titleId = `${dialogId}-title`;
const messageId = `${dialogId}-message`;
const modelSelectRef = ref<HTMLSelectElement | null>(null);

const message = computed(() =>
  formatTemplate(t("imageWorkbench.taskbar.storyboardReplanConfirm"), {
    title: props.groupTitle,
    count: props.count,
  })
);

function handleModelChange(event: Event) {
  emit("update:modelConfigId", (event.target as HTMLSelectElement | null)?.value || "");
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      void nextTick(() => {
        modelSelectRef.value?.focus();
      });
    }
  }
);
</script>

<template>
  <teleport to="body">
    <transition
      enter-active-class="ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="storyboard-replan-dialog"
        @click.self="emit('close')"
      >
        <div
          class="storyboard-replan-dialog__panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
          @click.stop
        >
          <div class="storyboard-replan-dialog__head">
            <span class="storyboard-replan-dialog__icon" aria-hidden="true">
              <RotateCcw class="h-4 w-4" />
            </span>
            <div>
              <h3 :id="titleId">{{ t("imageWorkbench.taskbar.storyboardReplanTitle") }}</h3>
              <p :id="messageId">{{ message }}</p>
            </div>
          </div>
          <label class="storyboard-replan-dialog__field">
            <span>{{ t("imageWorkbench.taskbar.storyboardReplanModel") }}</span>
            <select
              ref="modelSelectRef"
              :value="modelConfigId"
              :disabled="loading"
              @change="handleModelChange"
            >
              <option
                v-for="item in modelOptions"
                :key="item.value"
                :value="item.value"
                :disabled="item.disabled"
              >
                {{ item.text }}
              </option>
            </select>
          </label>
          <small class="storyboard-replan-dialog__hint">
            {{ t("imageWorkbench.taskbar.storyboardReplanModelHint") }}
          </small>
          <div class="storyboard-replan-dialog__actions">
            <button type="button" @click="emit('close')">
              {{ t("common.cancel") }}
            </button>
            <button
              type="button"
              class="is-primary"
              :disabled="!canConfirm"
              @click="emit('confirm')"
            >
              {{ t("imageWorkbench.taskbar.storyboardReplanAction") }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.storyboard-replan-dialog {
  @apply fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm;
}

.storyboard-replan-dialog__panel {
  @apply w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-950;
}

.storyboard-replan-dialog__head {
  @apply flex min-w-0 gap-3;
}

.storyboard-replan-dialog__icon {
  @apply inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary;
}

.storyboard-replan-dialog__head h3 {
  @apply text-sm font-black leading-6 text-slate-800 dark:text-slate-100;
}

.storyboard-replan-dialog__head p {
  @apply mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400;
  overflow-wrap: anywhere;
}

.storyboard-replan-dialog__field {
  @apply mt-4 grid gap-1.5;
}

.storyboard-replan-dialog__field span {
  @apply text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.storyboard-replan-dialog__field select {
  @apply h-9 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100;
}

.storyboard-replan-dialog__hint {
  @apply mt-2 block text-[11px] font-semibold leading-4 text-slate-400 dark:text-slate-500;
}

.storyboard-replan-dialog__actions {
  @apply mt-5 flex flex-wrap justify-end gap-2;
}

.storyboard-replan-dialog__actions button {
  @apply inline-flex h-8 min-w-20 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800;
}

.storyboard-replan-dialog__actions button.is-primary {
  @apply border-primary bg-primary text-white hover:bg-primary/90;
}
</style>
