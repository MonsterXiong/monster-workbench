<script setup lang="ts">
import type { DialogBeforeCloseFn, DialogTransition, DrawerInstance } from "element-plus";
import { computed, ref, useAttrs, useId, useSlots } from "vue";
import { useI18n } from "../../composables/useI18n";
import { joinAriaIds, resolveCssSizeAlias } from "../../utils";

defineOptions({
  inheritAttrs: false,
});

type DrawerSize = "sm" | "md" | "lg" | "xl";
type DrawerLevel = 2 | 3 | 4 | 5 | 6;
type DrawerFooterAlign = "start" | "end" | "between";
type DrawerRole = "dialog" | "alertdialog";
type DrawerPlacement = "left" | "right" | "top" | "bottom";
type DrawerDirection = "ltr" | "rtl" | "ttb" | "btt";

interface Props {
  modelValue: boolean;
  title?: string;
  description?: string;
  level?: DrawerLevel;
  icon?: string;
  showIcon?: boolean;
  placement?: DrawerPlacement;
  direction?: DrawerDirection;
  width?: string;
  size?: DrawerSize;
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  showClose?: boolean;
  closeDisabled?: boolean;
  lockCloseOnLoading?: boolean;
  beforeClose?: DialogBeforeCloseFn;
  destroyOnClose?: boolean;
  appendToBody?: boolean;
  appendTo?: string | HTMLElement;
  lockScroll?: boolean;
  modal?: boolean;
  modalPenetrable?: boolean;
  modalFade?: boolean;
  openDelay?: number;
  closeDelay?: number;
  modalClass?: string;
  headerClass?: string;
  bodyClass?: string;
  footerClass?: string;
  zIndex?: number;
  trapFocus?: boolean;
  transition?: DialogTransition;
  center?: boolean;
  alignCenter?: boolean;
  draggable?: boolean;
  overflow?: boolean;
  fullscreen?: boolean;
  resizable?: boolean;
  withHeader?: boolean;
  headerAriaLevel?: string;
  loading?: boolean;
  loadingText?: string;
  confirmLoading?: boolean;
  confirmLoadingText?: string;
  footerAlign?: DrawerFooterAlign;
  role?: DrawerRole;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  ariaLabel?: string;
  ariaDescribedby?: string;
  actionsLabel?: string;
  closeLabel?: string;
  bodyLabel?: string;
  footerLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: "",
  level: 3,
  icon: "",
  showIcon: false,
  placement: "right",
  direction: undefined,
  width: "",
  size: "md",
  closeOnOverlay: true,
  closeOnEsc: true,
  showClose: true,
  closeDisabled: false,
  lockCloseOnLoading: false,
  beforeClose: undefined,
  destroyOnClose: true,
  appendToBody: true,
  appendTo: "body",
  lockScroll: true,
  modal: true,
  modalPenetrable: false,
  modalFade: true,
  openDelay: 0,
  closeDelay: 0,
  modalClass: "",
  headerClass: "",
  bodyClass: "",
  footerClass: "",
  zIndex: undefined,
  trapFocus: false,
  transition: undefined,
  center: false,
  alignCenter: undefined,
  draggable: false,
  overflow: false,
  fullscreen: false,
  resizable: false,
  withHeader: true,
  headerAriaLevel: undefined,
  loading: false,
  loadingText: "",
  confirmLoading: false,
  confirmLoadingText: "",
  footerAlign: "end",
  role: "dialog",
  wrapTitle: false,
  wrapDescription: false,
  ariaLabel: "",
  ariaDescribedby: "",
  actionsLabel: "",
  closeLabel: "",
  bodyLabel: "",
  footerLabel: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
  (e: "open"): void;
  (e: "opened"): void;
  (e: "close"): void;
  (e: "closed"): void;
  (e: "open-auto-focus"): void;
  (e: "close-auto-focus"): void;
  (e: "resize-start", event: MouseEvent, size: number): void;
  (e: "resize", event: MouseEvent, size: number): void;
  (e: "resize-end", event: MouseEvent, size: number): void;
}>();

const { t } = useI18n();
const slots = useSlots();
const instanceId = useId();
const attrs = useAttrs();
const drawerRef = ref<DrawerInstance | null>(null);
const titleId = `${instanceId}-title`;
const descriptionId = `${instanceId}-description`;
const bodyId = `${instanceId}-body`;
const footerId = `${instanceId}-footer`;

const computedValue = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit("update:modelValue", val);
  },
});

const resolvedWidth = computed(() => {
  if (props.width) {
    return resolveCssSizeAlias(props.width);
  }

  const sizeMap: Record<DrawerSize, string> = {
    sm: "360px",
    md: "448px",
    lg: "560px",
    xl: "720px",
  };
  return sizeMap[props.size];
});

const drawerDirection = computed<DrawerDirection>(() => {
  if (props.direction) return props.direction;
  if (props.placement === "left") return "ltr";
  if (props.placement === "top") return "ttb";
  if (props.placement === "bottom") return "btt";
  return "rtl";
});
const hasCustomHeader = computed(() => Boolean(slots.header));
const fallbackLabel = computed(() => props.ariaLabel || props.title || t("common.dialog"));
const headingTag = computed(() => `h${props.level}`);
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedConfirmLoadingText = computed(() => props.confirmLoadingText || "处理中");
const isCloseDisabled = computed(() => props.closeDisabled || (props.lockCloseOnLoading && (props.loading || props.confirmLoading)));
const resolvedCloseLabel = computed(() => props.closeLabel || t("common.close"));
const resolvedPanelLabel = computed(() => {
  if (props.ariaLabel) return props.ariaLabel;
  if (hasCustomHeader.value) return props.title || fallbackLabel.value;
  return props.title ? "" : fallbackLabel.value;
});
const labelledBy = computed(() => (resolvedPanelLabel.value || !props.title || hasCustomHeader.value ? undefined : titleId));
const describedBy = computed(() =>
  joinAriaIds([!hasCustomHeader.value && props.description ? descriptionId : undefined, props.ariaDescribedby])
);
const resolvedActionsLabel = computed(() => props.actionsLabel || `${props.title || props.ariaLabel || t("common.dialog")} 操作`);
const rootClass = computed(() => attrs.class);
const rootStyle = computed(() => attrs.style);
const drawerPassthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== "class" && key !== "style"))
);

const open = () => {
  computedValue.value = true;
};

const close = () => {
  if (isCloseDisabled.value) return;

  if (drawerRef.value?.handleClose) {
    drawerRef.value.handleClose();
    return;
  }

  computedValue.value = false;
};

const escapeCssName = (value: string) =>
  typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
const escapeCssAttributeValue = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const getDrawerElementFromAttrs = () => {
  if (typeof document === "undefined") return null;

  const id = drawerPassthroughAttrs.value.id;
  if (typeof id === "string" && id) {
    return document.getElementById(id);
  }

  const dataEntry = Object.entries(drawerPassthroughAttrs.value).find(
    ([key, value]) => key.startsWith("data-") && (typeof value === "string" || typeof value === "number")
  );
  if (!dataEntry) return null;

  const [key, value] = dataEntry;
  return document.querySelector<HTMLElement>(`[${escapeCssName(key)}="${escapeCssAttributeValue(String(value))}"]`);
};

const getDrawerElement = () => {
  const element = drawerRef.value?.$el;
  if (element instanceof HTMLElement) return element;

  if (typeof document === "undefined") return null;
  return getDrawerElementFromAttrs() ?? document.querySelector<HTMLElement>(".base-drawer.open");
};

const handleBeforeClose = (done: () => void) => {
  if (isCloseDisabled.value) return;
  if (props.beforeClose) {
    props.beforeClose(done);
    return;
  }
  done();
};

const handleClosed = () => {
  emit("close");
  emit("closed");
};

const handleResizeStart = (event: MouseEvent, size: number) => {
  emit("resize-start", event, size);
};

const handleResize = (event: MouseEvent, size: number) => {
  emit("resize", event, size);
};

const handleResizeEnd = (event: MouseEvent, size: number) => {
  emit("resize-end", event, size);
};

defineExpose({
  getNativeDrawer: () => drawerRef.value,
  getElement: getDrawerElement,
  handleClose: close,
  open,
  close,
});
</script>

<template>
  <el-drawer
    ref="drawerRef"
    v-bind="drawerPassthroughAttrs"
    v-model="computedValue"
    class="base-drawer"
    :class="[
      `base-drawer--${size}`,
      `base-drawer--${placement}`,
      {
        'base-drawer--loading': loading,
        'base-drawer--confirm-loading': confirmLoading,
        'base-drawer--wrap-title': wrapTitle,
        'base-drawer--wrap-description': wrapDescription,
      },
      rootClass,
    ]"
    :style="rootStyle"
    :size="resolvedWidth"
    :direction="drawerDirection"
    :close-on-click-modal="closeOnOverlay"
    :close-on-press-escape="closeOnEsc"
    :show-close="false"
    :before-close="handleBeforeClose"
    :destroy-on-close="destroyOnClose"
    :append-to-body="appendToBody"
    :append-to="appendTo"
    :lock-scroll="lockScroll"
    :modal="modal"
    :modal-penetrable="modalPenetrable"
    :modal-fade="modalFade"
    :open-delay="openDelay"
    :close-delay="closeDelay"
    :modal-class="modalClass || undefined"
    :header-class="headerClass || undefined"
    :body-class="bodyClass || undefined"
    :footer-class="footerClass || undefined"
    :z-index="zIndex"
    :trap-focus="trapFocus"
    :transition="transition"
    :center="center"
    :align-center="alignCenter"
    :draggable="draggable"
    :overflow="overflow"
    :fullscreen="fullscreen"
    :resizable="resizable"
    :with-header="withHeader"
    :header-aria-level="headerAriaLevel || String(level)"
    :role="role"
    aria-modal="true"
    :aria-busy="loading || confirmLoading ? 'true' : undefined"
    :aria-label="resolvedPanelLabel || undefined"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    @open="emit('open')"
    @opened="emit('opened')"
    @closed="handleClosed"
    @open-auto-focus="emit('open-auto-focus')"
    @close-auto-focus="emit('close-auto-focus')"
    @resize-start="handleResizeStart"
    @resize="handleResize"
    @resize-end="handleResizeEnd"
  >
    <template #header>
      <header class="base-drawer__header">
        <div class="base-drawer__heading">
          <slot name="header">
            <div v-if="showIcon || icon || $slots.icon" class="base-drawer__icon" aria-hidden="true">
              <slot name="icon">
                <BaseIcon :name="icon || 'PanelRightOpen'" size="17" aria-hidden="true" />
              </slot>
            </div>
            <div class="base-drawer__title-wrap">
              <component :is="headingTag" v-if="title" :id="titleId">{{ title }}</component>
              <p v-if="description" :id="descriptionId">{{ description }}</p>
            </div>
          </slot>
        </div>
        <div v-if="$slots.actions || showClose" class="base-drawer__header-actions" role="group" :aria-label="resolvedActionsLabel">
          <slot name="actions"></slot>
          <BaseButton
            v-if="showClose"
            class="base-drawer__close"
            type="ghost"
            size="sm"
            native-type="button"
            circle
            :disabled="isCloseDisabled"
            :aria-label="resolvedCloseLabel"
            :title="resolvedCloseLabel"
            data-ignore-container-click
            @click.stop="close"
          >
            <template #icon>
              <BaseIcon name="X" size="16" aria-hidden="true" />
            </template>
          </BaseButton>
        </div>
      </header>
    </template>

    <div
      :id="bodyId"
      class="base-drawer__body"
      :role="bodyLabel ? 'region' : undefined"
      :aria-label="bodyLabel || undefined"
    >
      <BaseLoading v-if="loading" type="skeleton" :text="resolvedLoadingText" :skeleton-lines="4" surface="muted" bordered />
      <slot></slot>
    </div>

    <template #footer v-if="$slots.footer">
      <div
        :id="footerId"
        class="base-drawer__footer"
        :class="`base-drawer__footer--${footerAlign}`"
        :role="footerLabel ? 'group' : undefined"
        :aria-label="footerLabel || undefined"
      >
        <BaseLoading v-if="confirmLoading" type="spinner" size="sm" :text="resolvedConfirmLoadingText" direction="horizontal" compact />
        <slot name="footer"></slot>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
:deep(.base-drawer.el-drawer) {
  @apply max-w-[calc(100vw-1rem)] bg-white shadow-2xl dark:bg-slate-900;
}

:deep(.base-drawer.base-drawer--top.el-drawer),
:deep(.base-drawer.base-drawer--bottom.el-drawer) {
  @apply max-h-[calc(100vh-1rem)] max-w-none;
}

:deep(.base-drawer.base-drawer--right.el-drawer) {
  @apply border-l border-slate-200 dark:border-slate-800;
}

:deep(.base-drawer.base-drawer--left.el-drawer) {
  @apply border-r border-slate-200 dark:border-slate-800;
}

:deep(.base-drawer.base-drawer--top.el-drawer) {
  @apply border-b border-slate-200 dark:border-slate-800;
}

:deep(.base-drawer.base-drawer--bottom.el-drawer) {
  @apply border-t border-slate-200 dark:border-slate-800;
}

:deep(.base-drawer .el-drawer__header) {
  @apply mb-0 border-b border-slate-100 px-6 py-4 dark:border-slate-800;
}

:deep(.base-drawer .el-drawer__body) {
  @apply min-h-0 overflow-hidden p-0 text-slate-700 dark:text-slate-200;
}

:deep(.base-drawer .el-drawer__footer) {
  @apply border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950;
}

.base-drawer__header {
  @apply flex min-w-0 items-start justify-between gap-4;
}

.base-drawer__heading {
  @apply flex min-w-0 flex-1 items-start gap-3;
}

.base-drawer__icon {
  color: rgb(var(--color-primary));
  background-color: rgba(var(--color-primary), 0.1);
  @apply mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl;
}

.base-drawer__title-wrap {
  @apply min-w-0 flex-1;
}

.base-drawer__title-wrap :is(h2, h3, h4, h5, h6) {
  @apply truncate text-base font-black text-slate-900 dark:text-slate-100;
}

.base-drawer--wrap-title :deep(.base-drawer__title-wrap :is(h2, h3, h4, h5, h6)),
.base-drawer--wrap-title .base-drawer__title-wrap :is(h2, h3, h4, h5, h6) {
  @apply whitespace-normal break-words;
}

.base-drawer__title-wrap p {
  @apply mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400;
  overflow-wrap: anywhere;
}

.base-drawer--wrap-description .base-drawer__title-wrap p {
  @apply break-words;
}

.base-drawer__header-actions {
  @apply ml-auto flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2;
  max-width: 100%;
}

.base-drawer__close {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200;
  --el-button-size: 2rem;
  border-color: transparent !important;
  background: transparent !important;
  padding: 0 !important;
}

.base-drawer__close:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.18);
}

.base-drawer__close:disabled {
  @apply cursor-not-allowed opacity-50;
}

.base-drawer__body {
  @apply min-h-0 overflow-y-auto px-6 py-4;
}

.base-drawer__footer {
  @apply flex min-w-0 flex-wrap items-center justify-end gap-2;
}

.base-drawer__header-actions :deep(.el-button),
.base-drawer__footer :deep(.el-button) {
  min-width: 0;
  max-width: 100%;
  white-space: normal;
}

.base-drawer__header-actions :deep(.el-button > span),
.base-drawer__footer :deep(.el-button > span) {
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: normal;
}

.base-drawer__footer--start {
  @apply justify-start;
}

.base-drawer__footer--between {
  @apply justify-between;
}

@media (max-width: 640px) {
  :deep(.base-drawer .el-drawer__header) {
    @apply px-4;
  }

  :deep(.base-drawer .el-drawer__footer) {
    @apply px-4;
  }

  .base-drawer__header {
    @apply gap-2;
  }

  .base-drawer__body {
    @apply px-4;
  }

  .base-drawer__footer,
  .base-drawer__footer--between {
    @apply justify-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-drawer__close {
    transition: none !important;
  }
}
</style>
