<script setup lang="ts">
import { CircleCheckFilled, WarningFilled } from "@element-plus/icons-vue";
import type { PopconfirmInstance } from "element-plus";
import type { StyleValue } from "vue";
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useSlots } from "vue";
import { useConfirm } from "../../composables/useConfirm";
import { useI18n } from "../../composables/useI18n";
import { addDomEventListener, createRandomId, omit, type DomEventCleanup } from "../../utils";

defineOptions({
  inheritAttrs: false,
});

type ButtonType = "primary" | "secondary" | "danger" | "warning" | "success" | "neutral" | "ghost" | "link";
type ButtonSize = "xs" | "sm" | "md" | "lg";
type PopconfirmButtonType = "" | "text" | "default" | "info" | "primary" | "success" | "warning" | "danger";
type PopconfirmEffect = "dark" | "light";
type PopconfirmPlacement =
  | "auto"
  | "auto-start"
  | "auto-end"
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";

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
  placement?: PopconfirmPlacement;
  width?: string | number;
  showIcon?: boolean;
  iconColor?: string;
  confirmButtonType?: PopconfirmButtonType;
  cancelButtonType?: PopconfirmButtonType;
  teleported?: boolean;
  persistent?: boolean;
  hideAfter?: number;
  offset?: number;
  fallbackPlacements?: PopconfirmPlacement[];
  popperClass?: string;
  effect?: PopconfirmEffect;
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
  placement: "top",
  width: 320,
  showIcon: true,
  iconColor: "",
  confirmButtonType: "",
  cancelButtonType: "default",
  teleported: true,
  persistent: false,
  hideAfter: 80,
  offset: 8,
  fallbackPlacements: () => ["top", "bottom", "right", "left"],
  popperClass: "",
  effect: "light",
});

const emit = defineEmits<{
  (e: "open"): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

type TriggerButtonRef = HTMLElement | { $el?: Element | null } | null;

const attrs = useAttrs();
const slots = useSlots();
const { confirm } = useConfirm();
const { t } = useI18n();
const pending = ref(false);
const popconfirmRef = ref<PopconfirmInstance | null>(null);
const triggerRef = ref<TriggerButtonRef>(null);
const instanceId = createRandomId("base-confirm-action");
let stopGlobalListeners: DomEventCleanup | null = null;

const rootClass = computed(() => attrs.class);
const rootStyle = computed(() => attrs.style as StyleValue | undefined);
const triggerButtonAttrs = computed(() => omit(attrs, ["class", "style"]));
const isDanger = computed(() => props.danger || props.type === "danger");
const usesKeywordConfirm = computed(() => Boolean(props.confirmKeyword.trim()));
const resolvedConfirmText = computed(() => props.confirmText || t("common.confirm"));
const resolvedCancelText = computed(() => props.cancelText || t("common.cancel"));
const resolvedMessage = computed(() => props.message.replace(/\\n/g, "\n"));
const buttonLabel = computed(() => props.label || resolvedConfirmText.value);
const buttonLoading = computed(() => props.loading || pending.value);
const buttonAriaLabel = computed(() => props.ariaLabel || buttonLabel.value);
const buttonTitle = computed(() => props.buttonTitle || buttonAriaLabel.value);
const inferredPopconfirmButtonType = computed<PopconfirmButtonType>(() => {
  if (isDanger.value) return "danger";
  if (props.type === "warning") return "warning";
  if (props.type === "success") return "success";
  return "primary";
});
const popconfirmButtonType = computed<PopconfirmButtonType>(() => props.confirmButtonType || inferredPopconfirmButtonType.value);
const getBaseButtonType = (type: PopconfirmButtonType, fallback: ButtonType): ButtonType => {
  if (type === "primary" || type === "success" || type === "warning" || type === "danger") return type;
  return fallback;
};
const confirmActionButtonType = computed(() => getBaseButtonType(popconfirmButtonType.value, isDanger.value ? "danger" : "primary"));
const cancelActionButtonType = computed(() => getBaseButtonType(props.cancelButtonType, "neutral"));
const popconfirmIcon = computed(() => (isDanger.value || props.type === "warning" ? WarningFilled : CircleCheckFilled));
const popconfirmIconColor = computed(() => {
  if (props.iconColor) return props.iconColor;
  if (isDanger.value) return "#ef4444";
  if (props.type === "warning") return "#f59e0b";
  if (props.type === "success") return "#10b981";
  return "rgb(var(--color-primary))";
});
const popconfirmClass = computed(() =>
  ["base-confirm-action-popper", isDanger.value ? "base-confirm-action-popper--danger" : "", props.popperClass].filter(Boolean).join(" ")
);
const popconfirmOptions = computed(() => ({
  strategy: "fixed",
  modifiers: [
    { name: "offset", options: { offset: [0, props.offset] } },
    { name: "preventOverflow", options: { padding: 12 } },
    { name: "flip", options: { padding: 12, fallbackPlacements: props.fallbackPlacements } },
  ],
}));

const closeOtherPopconfirms = () => {
  if (props.disabled || buttonLoading.value) return;
  window.dispatchEvent(new CustomEvent("base-confirm-action:close-all", { detail: instanceId }));
};

const closePopconfirm = () => {
  popconfirmRef.value?.hide?.();
};

const handleGlobalClose = (event: Event) => {
  if ((event as CustomEvent<string>).detail === instanceId) return;
  closePopconfirm();
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

const getElement = () => {
  const current = triggerRef.value;
  if (!current) return null;
  if (current instanceof HTMLElement) return current;
  return current.$el instanceof HTMLElement ? current.$el : null;
};

const focusTrigger = () => {
  getElement()?.focus();
};

const open = () => {
  if (props.disabled || buttonLoading.value) return;
  getElement()?.click();
};

defineExpose({
  getNativePopconfirm: () => popconfirmRef.value,
  getElement,
  focusTrigger,
  open,
  close: closePopconfirm,
});
</script>

<template>
  <BaseButton
    v-if="usesKeywordConfirm"
    ref="triggerRef"
    v-bind="triggerButtonAttrs"
    :type="type"
    :size="size"
    :disabled="disabled"
    :loading="buttonLoading"
    :outline="outline"
    :block="block"
    :aria-label="buttonAriaLabel"
    :title="buttonTitle"
    :class="rootClass"
    :style="rootStyle"
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
    :cancel-button-type="cancelButtonType"
    :icon="popconfirmIcon"
    :icon-color="popconfirmIconColor"
    :hide-icon="!showIcon"
    :width="width"
    :hide-after="hideAfter"
    :teleported="teleported"
    :persistent="persistent"
    :popper-class="popconfirmClass"
    :popper-options="popconfirmOptions"
    :effect="effect"
    :placement="placement"
    @confirm="handlePopconfirmConfirm"
    @cancel="handlePopconfirmCancel"
  >
    <template #reference>
      <BaseButton
        ref="triggerRef"
        v-bind="triggerButtonAttrs"
        :type="type"
        :size="size"
        :disabled="disabled"
        :loading="buttonLoading"
        :outline="outline"
        :block="block"
        :aria-label="buttonAriaLabel"
        :title="buttonTitle"
        :class="rootClass"
        :style="rootStyle"
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
          <BaseButton :type="cancelActionButtonType" size="xs" outline @click="cancelPopper">{{ resolvedCancelText }}</BaseButton>
          <BaseButton :type="confirmActionButtonType" size="xs" @click="confirmPopper">{{ resolvedConfirmText }}</BaseButton>
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
