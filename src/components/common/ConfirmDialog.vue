<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { useConfirm } from "../../composables/useConfirm";
import { useI18n } from "../../composables/useI18n";
import { addDomEventListener, focusElement, getActiveHTMLElement, getBoundaryItems, isEscapeKey, isKeyboardKey, joinAriaIds, queryFocusableElements, toTrimmedString, type DomEventCleanup } from "../../utils";
import BaseIcon from "./BaseIcon.vue";

const { visible, options, handleConfirm, handleCancel } = useConfirm();
const { t } = useI18n();
const confirmDialogId = useId();
const titleId = `${confirmDialogId}-title`;
const messageId = `${confirmDialogId}-message`;
const keywordHintId = `${confirmDialogId}-keyword-hint`;
const keywordErrorId = `${confirmDialogId}-keyword-error`;
const panelRef = ref<HTMLElement | null>(null);
const keywordInputRef = ref<HTMLInputElement | null>(null);
const keywordInputValue = ref("");
const keywordInputTouched = ref(false);
let previousActiveElement: HTMLElement | null = null;
let stopKeydownListener: DomEventCleanup | null = null;

const isDanger = computed(() => Boolean(options.value.danger));
const dialogRole = computed(() => (isDanger.value ? "alertdialog" : "dialog"));
const dialogIcon = computed(() => (isDanger.value ? "AlertTriangle" : "Info"));
const normalizedConfirmKeyword = computed(() => toTrimmedString(options.value.confirmKeyword));
const hasConfirmKeyword = computed(() => normalizedConfirmKeyword.value.length > 0);
const isConfirmKeywordMatched = computed(() => !hasConfirmKeyword.value || toTrimmedString(keywordInputValue.value) === normalizedConfirmKeyword.value);
const resolvedConfirmInputLabel = computed(() => options.value.confirmInputLabel || t("common.confirmKeywordLabel"));
const resolvedConfirmInputPlaceholder = computed(() => options.value.confirmInputPlaceholder || t("common.confirmKeywordPlaceholder"));
const resolvedConfirmInputHint = computed(() => options.value.confirmInputHint || `${t("common.confirmKeywordHint")} ${normalizedConfirmKeyword.value}`);
const resolvedConfirmMismatchText = computed(() => options.value.confirmMismatchText || t("common.confirmKeywordMismatch"));
const showConfirmKeywordError = computed(() => keywordInputTouched.value && !isConfirmKeywordMatched.value);
const confirmKeywordDescribedBy = computed(() => joinAriaIds([keywordHintId, showConfirmKeywordError.value ? keywordErrorId : undefined]));

const getFocusableElements = () => queryFocusableElements(panelRef.value);

const handleKeydown = (event: KeyboardEvent) => {
  if (!visible.value) return;

  if (isEscapeKey(event)) {
    event.preventDefault();
    handleCancel();
    return;
  }

  if (isKeyboardKey(event, "Tab")) {
    const focusableElements = getFocusableElements();
    if (!focusableElements.length) {
      event.preventDefault();
      focusElement(panelRef.value);
      return;
    }

    const { first: firstElement, last: lastElement } = getBoundaryItems(focusableElements);

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      focusElement(lastElement);
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      focusElement(firstElement);
    }
  }
};

const handleConfirmClick = () => {
  if (!isConfirmKeywordMatched.value) {
    keywordInputTouched.value = true;
    focusElement(keywordInputRef.value);
    return;
  }

  handleConfirm();
};

const handleKeywordInput = () => {
  keywordInputTouched.value = true;
};

onMounted(() => {
  stopKeydownListener = addDomEventListener(document, "keydown", handleKeydown);
});

onBeforeUnmount(() => {
  stopKeydownListener?.();
  stopKeydownListener = null;
});

watch(
  visible,
  (nextVisible) => {
    if (nextVisible) {
      previousActiveElement = getActiveHTMLElement();
      keywordInputValue.value = "";
      keywordInputTouched.value = false;
      nextTick(() => {
        focusElement(hasConfirmKeyword.value ? keywordInputRef.value : panelRef.value);
      });
    } else {
      nextTick(() => {
        focusElement(previousActiveElement);
        previousActiveElement = null;
      });
    }
  }
);
</script>

<template>
  <transition
    enter-active-class="ease-out duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      @click.self="handleCancel"
    >
      <transition
        enter-active-class="ease-out duration-300"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="ease-in duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          ref="panelRef"
          class="confirm-dialog__panel"
          :role="dialogRole"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
        >
          <!-- 图标 + 标题 -->
          <div class="confirm-dialog__header">
            <div
              class="confirm-dialog__icon"
              :class="options.danger ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-primary/10 text-primary'"
              aria-hidden="true"
            >
              <BaseIcon :name="dialogIcon" size="20" aria-hidden="true" />
            </div>
            <h3 :id="titleId" class="confirm-dialog__title">{{ options.title }}</h3>
          </div>

          <!-- 消息内容 -->
          <p :id="messageId" class="confirm-dialog__message">
            {{ options.message }}
          </p>

          <label v-if="hasConfirmKeyword" class="confirm-dialog__keyword">
            <span class="confirm-dialog__keyword-label">{{ resolvedConfirmInputLabel }}</span>
            <input
              ref="keywordInputRef"
              v-model="keywordInputValue"
              class="confirm-dialog__keyword-input"
              type="text"
              autocomplete="off"
              spellcheck="false"
              :placeholder="resolvedConfirmInputPlaceholder"
              :aria-invalid="showConfirmKeywordError"
              :aria-describedby="confirmKeywordDescribedBy"
              @input="handleKeywordInput"
              @blur="keywordInputTouched = true"
            />
            <span :id="keywordHintId" class="confirm-dialog__keyword-hint">{{ resolvedConfirmInputHint }}</span>
            <span v-if="showConfirmKeywordError" :id="keywordErrorId" class="confirm-dialog__keyword-error" role="status">
              {{ resolvedConfirmMismatchText }}
            </span>
          </label>

          <!-- 操作按钮 -->
          <div class="confirm-dialog__actions">
            <BaseButton
              class="confirm-dialog__button confirm-dialog__button--cancel"
              type="neutral"
              size="md"
              native-type="button"
              outline
              :aria-label="options.cancelText"
              :title="options.cancelText"
              @click="handleCancel"
            >
              {{ options.cancelText }}
            </BaseButton>
            <BaseButton
              class="confirm-dialog__button confirm-dialog__button--confirm"
              :class="options.danger ? 'confirm-dialog__button--danger' : 'confirm-dialog__button--primary'"
              :type="isDanger ? 'danger' : 'primary'"
              size="md"
              native-type="button"
              :disabled="!isConfirmKeywordMatched"
              :aria-label="options.confirmText"
              :title="options.confirmText"
              @click="handleConfirmClick"
            >
              {{ options.confirmText }}
            </BaseButton>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
.confirm-dialog__panel {
  max-height: min(82vh, 560px);
  @apply relative w-full max-w-[420px] overflow-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition duration-300 dark:border-slate-800 dark:bg-slate-900;
}

.confirm-dialog__header {
  @apply mb-4 flex min-w-0 items-start gap-3;
}

.confirm-dialog__icon {
  @apply flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl;
}

.confirm-dialog__title {
  @apply min-w-0 text-sm font-black leading-6 text-slate-800 dark:text-slate-100;
  overflow-wrap: anywhere;
}

.confirm-dialog__message {
  @apply whitespace-pre-line text-xs leading-relaxed text-slate-500 dark:text-slate-400;
  overflow-wrap: anywhere;
}

.confirm-dialog__keyword {
  @apply mt-4 grid min-w-0 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950;
}

.confirm-dialog__keyword-label {
  @apply text-[11px] font-black text-slate-700 dark:text-slate-200;
}

.confirm-dialog__keyword-input {
  @apply h-9 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500;
}

.confirm-dialog__keyword-input[aria-invalid="true"] {
  @apply border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-800 dark:focus:border-red-500;
}

.confirm-dialog__keyword-hint {
  @apply text-[11px] leading-4 text-slate-500 dark:text-slate-400;
  overflow-wrap: anywhere;
}

.confirm-dialog__keyword-error {
  @apply text-[11px] font-bold leading-4 text-red-600 dark:text-red-400;
}

.confirm-dialog__actions {
  @apply mt-6 flex flex-wrap items-center justify-end gap-2.5;
}

.confirm-dialog__button {
  @apply flex min-w-20 items-center justify-center rounded-xl text-xs font-semibold transition;
  height: 2.25rem !important;
  padding: 0 1rem !important;
}

.confirm-dialog__button--cancel {
  border-color: #e2e8f0 !important;
  background: #ffffff !important;
  color: #475569 !important;
}

.confirm-dialog__button--cancel:hover:not(.is-disabled) {
  background: #f8fafc !important;
  color: #0f172a !important;
}

:global(.dark) .confirm-dialog__button--cancel {
  border-color: #1e293b !important;
  background: #1e293b !important;
  color: #cbd5e1 !important;
}

:global(.dark) .confirm-dialog__button--cancel:hover:not(.is-disabled) {
  background: rgb(51 65 85 / 0.5) !important;
  color: #f8fafc !important;
}

.confirm-dialog__button--confirm {
  @apply text-white shadow-md hover:scale-[1.02] active:scale-[0.98];
}

.confirm-dialog__button--primary:not(.is-disabled) {
  box-shadow: 0 10px 18px rgb(var(--color-primary) / 0.18) !important;
}

.confirm-dialog__button--danger:not(.is-disabled) {
  box-shadow: 0 10px 18px rgba(239, 68, 68, 0.12) !important;
}

.confirm-dialog__button.is-disabled {
  @apply cursor-not-allowed opacity-50 shadow-none hover:scale-100 active:scale-100;
}

@media (max-width: 480px) {
  .confirm-dialog__panel {
    @apply max-w-full p-4;
  }

  .confirm-dialog__actions {
    @apply flex-col-reverse items-stretch;
  }

  .confirm-dialog__button {
    @apply w-full;
  }
}

@media (prefers-reduced-motion: reduce) {
  .transition,
  .transition-all {
    transition: none !important;
  }
}
</style>
