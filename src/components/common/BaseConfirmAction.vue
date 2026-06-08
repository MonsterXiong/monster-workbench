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
});

const emit = defineEmits<{
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

const handleClick = async () => {
  if (props.disabled || buttonLoading.value) return;
  pending.value = true;
  try {
    const confirmed = await confirm({
      title: props.title,
      message: props.message,
      confirmText: resolvedConfirmText.value,
      cancelText: resolvedCancelText.value,
      danger: isDanger.value,
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
