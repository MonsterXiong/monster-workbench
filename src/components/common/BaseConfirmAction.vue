<script setup lang="ts">
import { CircleCheckFilled, WarningFilled } from "@element-plus/icons-vue";
import { computed, onBeforeUnmount, onMounted, ref, useSlots } from "vue";
import { useConfirm } from "../../composables/useConfirm";
import { useI18n } from "../../composables/useI18n";
import { addDomEventListener, createRandomId, type DomEventCleanup } from "../../utils";

type ButtonType = "primary" | "secondary" | "danger" | "warning" | "success" | "neutral" | "ghost" | "link";
type ButtonSize = "xs" | "sm" | "md" | "lg";

interface Props {
  label?: string;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ButtonType;
  size?: ButtonSize;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  outline?: boolean;
  block?: boolean;
  ariaLabel?: string;
  buttonTitle?: string;
  confirmKeyword?: string;
  confirmInputLabel?: string;
  confirmInputPlaceholder?: string;
  confirmInputHint?: string;
  confirmMismatchText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: "",
  confirmText: "",
  cancelText: "",
  type: "danger",
  size: "sm",
  icon: "",
  danger: false,
  disabled: false,
  loading: false,
  outline: false,
  block: false,
  ariaLabel: "",
  buttonTitle: "",
  confirmKeyword: "",
  confirmInputLabel: "",
  confirmInputPlaceholder: "",
  confirmInputHint: "",
  confirmMismatchText: "",
});

const emit = defineEmits<{
  (e: "open"): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

const slots = useSlots();
const { confirm } = useConfirm();
const { t } = useI18n();
const pending = ref(false);
const popconfirmRef = ref<{ hide?: () => void } | null>(null);
const instanceId = createRandomId("base-confirm-action");
let stopGlobalListeners: DomEventCleanup | null = null;

const isDanger = computed(() => props.danger || props.type === "danger");
const usesKeywordConfirm = computed(() => Boolean(props.confirmKeyword.trim()));
const resolvedConfirmText = computed(() => props.confirmText || t("common.confirm"));
const resolvedCancelText = computed(() => props.cancelText || t("common.cancel"));
const resolvedMessage = computed(() => props.message.replace(/\\n/g, "\n"));
const buttonLabel = computed(() => props.label || resolvedConfirmText.value);
const buttonLoading = computed(() => props.loading || pending.value);
const buttonAriaLabel = computed(() => props.ariaLabel || buttonLabel.value);
const buttonTitle = computed(() => props.buttonTitle || buttonAriaLabel.value);
const popconfirmButtonType = computed(() => {
  if (isDanger.value) return "danger";
  if (props.type === "warning") return "warning";
  if (props.type === "success") return "success";
  return "primary";
});
const popconfirmIcon = computed(() => (isDanger.value || props.type === "warning" ? WarningFilled : CircleCheckFilled));
const popconfirmIconColor = computed(() => {
  if (isDanger.value) return "#ef4444";
  if (props.type === "warning") return "#f59e0b";
  if (props.type === "success") return "#10b981";
  return "rgb(var(--color-primary))";
});
const popconfirmClass = computed(() =>
  ["base-confirm-action-popper", isDanger.value ? "base-confirm-action-popper--danger" : ""].filter(Boolean).join(" ")
);
const popconfirmOptions = {
  strategy: "fixed",
  modifiers: [
    { name: "offset", options: { offset: [0, 8] } },
    { name: "preventOverflow", options: { padding: 12 } },
    { name: "flip", options: { padding: 12 } },
  ],
};

const closeOtherPopconfirms = () => {
  if (props.disabled || buttonLoading.value) return;
  window.dispatchEvent(new CustomEvent("base-confirm-action:close-all", { detail: instanceId }));
};

const handleGlobalClose = (event: Event) => {
  if ((event as CustomEvent<string>).detail === instanceId) return;
  popconfirmRef.value?.hide?.();
};

const handlePopconfirmTrigger = () => {
  if (props.disabled || buttonLoading.value) return;
  closeOtherPopconfirms();
  emit("open");
};

const handlePopconfirmConfirm = () => {
  emit("confirm");
};

const handlePopconfirmCancel = () => {
  emit("cancel");
};

const handleClick = async () => {
  if (props.disabled || buttonLoading.value) return;
  emit("open");
  pending.value = true;
  try {
    const confirmed = await confirm({
      title: props.title,
      message: resolvedMessage.value,
      confirmText: resolvedConfirmText.value,
      cancelText: resolvedCancelText.value,
      danger: isDanger.value,
      confirmKeyword: props.confirmKeyword,
      confirmInputLabel: props.confirmInputLabel,
      confirmInputPlaceholder: props.confirmInputPlaceholder,
      confirmInputHint: props.confirmInputHint,
      confirmMismatchText: props.confirmMismatchText,
    });

    if (confirmed) {
      emit("confirm");
      return;
    }

    emit("cancel");
  } finally {
    pending.value = false;
  }
};

onMounted(() => {
  stopGlobalListeners = addDomEventListener(window, "base-confirm-action:close-all", handleGlobalClose);
});

onBeforeUnmount(() => {
  stopGlobalListeners?.();
  stopGlobalListeners = null;
});
</script>

<template>
  <BaseButton
    v-if="usesKeywordConfirm"
    :type="type"
    :size="size"
    :disabled="disabled"
    :loading="buttonLoading"
    :outline="outline"
    :block="block"
    :aria-label="buttonAriaLabel"
    :title="buttonTitle"
    @click="handleClick"
  >
    <template v-if="icon || slots.icon" #icon>
      <slot name="icon">
        <BaseIcon :name="icon" size="14" aria-hidden="true" />
      </slot>
    </template>
    <slot>{{ buttonLabel }}</slot>
  </BaseButton>

  <el-popconfirm
    v-else
    ref="popconfirmRef"
    :title="title"
    :confirm-button-text="resolvedConfirmText"
    :cancel-button-text="resolvedCancelText"
    :confirm-button-type="popconfirmButtonType"
    cancel-button-type="default"
    :icon="popconfirmIcon"
    :icon-color="popconfirmIconColor"
    :width="320"
    :hide-after="80"
    :teleported="true"
    :persistent="false"
    :popper-class="popconfirmClass"
    :popper-options="popconfirmOptions"
    effect="light"
    placement="top"
    @confirm="handlePopconfirmConfirm"
    @cancel="handlePopconfirmCancel"
  >
    <template #reference>
      <BaseButton
        :type="type"
        :size="size"
        :disabled="disabled"
        :loading="buttonLoading"
        :outline="outline"
        :block="block"
        :aria-label="buttonAriaLabel"
        :title="buttonTitle"
        @click="handlePopconfirmTrigger"
      >
        <template v-if="icon || slots.icon" #icon>
          <slot name="icon">
            <BaseIcon :name="icon" size="14" aria-hidden="true" />
          </slot>
        </template>
        <slot>{{ buttonLabel }}</slot>
      </BaseButton>
    </template>

    <template #actions="{ confirm: confirmPopper, cancel: cancelPopper }">
      <div class="base-confirm-action__popper-body">
        <p v-if="resolvedMessage" class="base-confirm-action__message">{{ resolvedMessage }}</p>
        <div class="base-confirm-action__popper-actions">
          <BaseButton type="neutral" size="xs" outline @click="cancelPopper">{{ resolvedCancelText }}</BaseButton>
          <BaseButton :type="isDanger ? 'danger' : 'primary'" size="xs" @click="confirmPopper">{{ resolvedConfirmText }}</BaseButton>
        </div>
      </div>
    </template>
  </el-popconfirm>
</template>

<style scoped>
:global(.base-confirm-action-popper.el-popper) {
  --el-color-primary: rgb(var(--color-primary));
  --el-popover-border-radius: 10px;
}

:global(.base-confirm-action-popper.el-popper.is-light) {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow:
    0 18px 42px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

:global(.base-confirm-action-popper.el-popper.is-light .el-popper__arrow::before) {
  border-color: #e2e8f0;
  background: #ffffff;
}

:global(.base-confirm-action-popper.el-zoom-in-top-enter-active),
:global(.base-confirm-action-popper.el-zoom-in-top-leave-active),
:global(.base-confirm-action-popper.el-zoom-in-bottom-enter-active),
:global(.base-confirm-action-popper.el-zoom-in-bottom-leave-active) {
  transition-duration: 0.08s !important;
}

:global(.base-confirm-action-popper .el-popconfirm) {
  padding: 14px;
}

:global(.base-confirm-action-popper .el-popconfirm__main) {
  align-items: flex-start;
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

:global(.base-confirm-action-popper .el-popconfirm__icon) {
  margin-top: 2px;
  flex-shrink: 0;
  font-size: 16px;
}

:global(.base-confirm-action-popper .el-popconfirm__action) {
  margin-top: 8px;
  text-align: initial;
}

:global(.base-confirm-action__popper-body) {
  display: grid;
  min-width: 0;
  gap: 12px;
}

:global(.base-confirm-action__message) {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.55;
  overflow-wrap: anywhere;
  white-space: pre-line;
}

:global(.base-confirm-action__popper-actions) {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

:global(.dark .base-confirm-action-popper.el-popper.is-light) {
  border-color: #1e293b;
  background: #0f172a;
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(148, 163, 184, 0.1);
}

:global(.dark .base-confirm-action-popper.el-popper.is-light .el-popper__arrow::before) {
  border-color: #1e293b;
  background: #0f172a;
}

:global(.dark .base-confirm-action-popper .el-popconfirm__main) {
  color: #f8fafc;
}

:global(.dark .base-confirm-action__message) {
  color: #94a3b8;
}

@media (prefers-reduced-motion: reduce) {
  :global(.base-confirm-action-popper.el-popper) {
    transition: none !important;
  }
}
</style>
