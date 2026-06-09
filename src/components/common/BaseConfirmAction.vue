<script setup lang="ts">
import { computed, ref, useSlots } from "vue";
import { useConfirm } from "../../composables/useConfirm";
import { useI18n } from "../../composables/useI18n";

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

const isDanger = computed(() => props.danger || props.type === "danger");
const resolvedConfirmText = computed(() => props.confirmText || t("common.confirm"));
const resolvedCancelText = computed(() => props.cancelText || t("common.cancel"));
const buttonLabel = computed(() => props.label || resolvedConfirmText.value);
const buttonLoading = computed(() => props.loading || pending.value);
const buttonAriaLabel = computed(() => props.ariaLabel || buttonLabel.value);
const buttonTitle = computed(() => props.buttonTitle || buttonAriaLabel.value);

const handleClick = async () => {
  if (props.disabled || buttonLoading.value) return;
  emit("open");
  pending.value = true;
  try {
    const confirmed = await confirm({
      title: props.title,
      message: props.message,
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
</script>

<template>
  <BaseButton
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
</template>
