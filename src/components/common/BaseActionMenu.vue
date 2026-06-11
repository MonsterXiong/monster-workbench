<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  addDomEventListener,
  createRandomId,
  dispatchWindowCustomEvent,
  isEmptyArray,
  toAriaKeyShortcuts,
  toNonNegativeNumber,
  type DomEventCleanup,
} from "../../utils";

export interface ActionMenuItem {
  key: string;
  label: string;
  description?: string;
  meta?: string;
  shortcut?: string;
  ariaShortcut?: string;
  icon?: string;
  type?: "default" | "danger";
  disabled?: boolean;
  selected?: boolean;
  loading?: boolean;
  divided?: boolean;
}

interface Props {
  actions: ActionMenuItem[];
  label?: string;
  icon?: string;
  disabled?: boolean;
  align?: "left" | "center" | "right";
  placement?: "auto" | "bottom" | "top";
  ariaLabel?: string;
  minWidth?: number;
  maxWidth?: number;
  maxHeight?: number;
  viewportPadding?: number;
  closeOnSelect?: boolean;
  emptyText?: string;
  wrapText?: boolean;
  exposeAriaShortcuts?: boolean;
}

type DropdownPlacement = "bottom" | "bottom-start" | "bottom-end" | "top" | "top-start" | "top-end";
type DropdownControlRef = {
  handleClose?: () => void;
  handleOpen?: () => void;
} | null;

const props = withDefaults(defineProps<Props>(), {
  label: "",
  icon: "MoreHorizontal",
  disabled: false,
  align: "right",
  placement: "auto",
  ariaLabel: "",
  minWidth: 188,
  maxWidth: 320,
  maxHeight: 320,
  viewportPadding: 10,
  closeOnSelect: true,
  emptyText: "",
  wrapText: false,
  exposeAriaShortcuts: false,
});

const emit = defineEmits<{
  (e: "select", action: ActionMenuItem): void;
}>();

const dropdownRef = ref<DropdownControlRef>(null);
const open = ref(false);
const { t } = useI18n();
const menuId = createRandomId("base-action-menu");
const triggerId = createRandomId("base-action-menu-trigger");
const resolvedMenuLabel = computed(() => props.ariaLabel || props.label || t("common.moreActions"));
const resolvedEmptyText = computed(() => props.emptyText || t("common.noData"));
let stopGlobalListeners: DomEventCleanup | null = null;

const normalizedMinWidth = computed(() => Math.max(120, toNonNegativeNumber(props.minWidth)));
const normalizedMaxWidth = computed(() => Math.max(normalizedMinWidth.value, toNonNegativeNumber(props.maxWidth) || normalizedMinWidth.value));
const normalizedMaxHeight = computed(() => Math.max(96, toNonNegativeNumber(props.maxHeight)));
const viewportPadding = computed(() => Math.max(4, toNonNegativeNumber(props.viewportPadding)));
const resolvedPlacement = computed<DropdownPlacement>(() => {
  const side = props.placement === "top" ? "top" : "bottom";
  if (props.align === "left") return `${side}-start` as DropdownPlacement;
  if (props.align === "center") return side;
  return `${side}-end` as DropdownPlacement;
});
const resolvedPopperClass = computed(() =>
  [
    "base-action-menu-popper",
    `base-action-menu-popper--${props.align}`,
    props.wrapText ? "base-action-menu-popper--wrap-text" : "",
  ]
    .filter(Boolean)
    .join(" ")
);
const popperStyle = computed(() => ({
  minWidth: `${normalizedMinWidth.value}px`,
  maxWidth: `${normalizedMaxWidth.value}px`,
  "--base-action-menu-max-height": `${normalizedMaxHeight.value}px`,
}));
const popperOptions = computed(() => ({
  strategy: "fixed",
  modifiers: [
    { name: "offset", options: { offset: [0, 8] } },
    { name: "preventOverflow", options: { padding: viewportPadding.value } },
    { name: "flip", options: { padding: viewportPadding.value } },
  ],
}));

const getActionAriaKeyshortcuts = (action: ActionMenuItem) => {
  const shortcut = action.ariaShortcut || (props.exposeAriaShortcuts ? action.shortcut : "");
  return shortcut ? toAriaKeyShortcuts(shortcut) : undefined;
};
const getActionIconName = (action: ActionMenuItem) => (action.loading ? "LoaderCircle" : action.icon ?? "");
const isActionDisabled = (action: ActionMenuItem) => Boolean(action.disabled || action.loading);
const getActionRole = (action: ActionMenuItem) => (action.selected ? "menuitemcheckbox" : "menuitem");

const closeMenu = () => {
  dropdownRef.value?.handleClose?.();
  open.value = false;
};

const closeOtherMenus = () => {
  if (props.disabled) return;
  dispatchWindowCustomEvent("base-action-menu:close-all", menuId);
};

const handleTriggerPointerdown = () => {
  closeOtherMenus();
};

const handleVisibleChange = (visible: boolean) => {
  if (props.disabled) {
    closeMenu();
    return;
  }

  if (visible) closeOtherMenus();
  open.value = visible;
};

const handleCommand = (command: unknown) => {
  const action = command as ActionMenuItem;
  if (!action || typeof action !== "object" || !("key" in action) || isActionDisabled(action)) return;
  emit("select", action);
};

const handleGlobalClose = (event: Event) => {
  if ((event as CustomEvent<string>).detail === menuId) return;
  closeMenu();
};

onMounted(() => {
  stopGlobalListeners = addDomEventListener(window, "base-action-menu:close-all", handleGlobalClose);
});

onBeforeUnmount(() => {
  stopGlobalListeners?.();
  stopGlobalListeners = null;
});
</script>

<template>
  <el-dropdown
    ref="dropdownRef"
    class="base-action-menu"
    trigger="click"
    :disabled="disabled"
    :placement="resolvedPlacement"
    :hide-on-click="closeOnSelect"
    :max-height="normalizedMaxHeight"
    :popper-class="resolvedPopperClass"
    :popper-style="popperStyle"
    :popper-options="popperOptions"
    :show-arrow="false"
    :teleported="true"
    :persistent="false"
    role="menu"
    @command="handleCommand"
    @visible-change="handleVisibleChange"
  >
    <button
      :id="triggerId"
      type="button"
      class="base-action-menu__trigger"
      :class="{ 'is-open': open }"
      :disabled="disabled"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="resolvedMenuLabel"
      @pointerdown="handleTriggerPointerdown"
    >
      <BaseIcon :name="icon" size="15" aria-hidden="true" />
      <span v-if="label">{{ label }}</span>
    </button>

    <template #dropdown>
      <el-dropdown-menu
        :id="menuId"
        class="base-action-menu__menu"
        :class="{ 'base-action-menu__menu--wrap-text': wrapText }"
        :aria-label="resolvedMenuLabel"
        :aria-labelledby="triggerId"
      >
        <div v-if="isEmptyArray(actions)" class="base-action-menu__empty" role="status">
          <BaseIcon name="Inbox" size="14" aria-hidden="true" />
          <span>{{ resolvedEmptyText }}</span>
        </div>

        <el-dropdown-item
          v-for="action in actions"
          :key="action.key"
          class="base-action-menu__item"
          :class="{
            'is-danger': action.type === 'danger',
            'is-disabled': isActionDisabled(action),
            'is-selected': action.selected,
            'is-loading': action.loading
          }"
          :command="action"
          :disabled="isActionDisabled(action)"
          :divided="action.divided"
          :text-value="action.label"
          :role="getActionRole(action)"
          :aria-checked="action.selected ? 'true' : undefined"
          :aria-disabled="isActionDisabled(action) ? 'true' : undefined"
          :aria-busy="action.loading ? 'true' : undefined"
          :aria-keyshortcuts="getActionAriaKeyshortcuts(action)"
        >
          <BaseIcon
            v-if="action.icon || action.loading"
            :name="getActionIconName(action)"
            size="14"
            :class="{ 'base-action-menu__item-spinner': action.loading }"
            aria-hidden="true"
          />
          <span class="base-action-menu__item-text">
            <span>{{ action.label }}</span>
            <small v-if="action.description">{{ action.description }}</small>
          </span>
          <span v-if="action.selected || action.meta || action.shortcut" class="base-action-menu__item-trailing">
            <span v-if="action.meta" class="base-action-menu__item-meta">{{ action.meta }}</span>
            <kbd v-if="action.shortcut">{{ action.shortcut }}</kbd>
            <BaseIcon v-if="action.selected" name="Check" size="14" class="base-action-menu__item-check" aria-hidden="true" />
          </span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped>
.base-action-menu {
  @apply inline-flex;
}

.base-action-menu__trigger {
  @apply inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-950 dark:hover:text-slate-100;
}

.base-action-menu__trigger.is-open {
  border-color: rgb(var(--color-primary) / 0.45);
  @apply text-primary;
}

:global(.base-action-menu-popper.el-popper) {
  --el-dropdown-menuItem-hover-fill: #f1f5f9;
  --el-dropdown-menuItem-hover-color: #0f172a;
  --el-color-primary: rgb(var(--color-primary));
}

:global(.base-action-menu-popper.el-zoom-in-bottom-enter-active),
:global(.base-action-menu-popper.el-zoom-in-bottom-leave-active),
:global(.base-action-menu-popper.el-zoom-in-top-enter-active),
:global(.base-action-menu-popper.el-zoom-in-top-leave-active) {
  transition-duration: 0.08s !important;
}

:global(.base-action-menu-popper.el-zoom-in-bottom-leave-active),
:global(.base-action-menu-popper.el-zoom-in-top-leave-active) {
  pointer-events: none;
}

:global(.base-action-menu-popper .el-popper__arrow) {
  display: none;
}

:global(.base-action-menu-popper .el-dropdown-menu) {
  box-sizing: border-box;
  max-height: var(--base-action-menu-max-height, 320px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  padding: 6px;
  scrollbar-color: #cbd5e1 transparent;
  scrollbar-width: thin;
  box-shadow:
    0 18px 42px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

:global(.base-action-menu-popper .el-dropdown-menu::-webkit-scrollbar) {
  width: 8px;
}

:global(.base-action-menu-popper .el-dropdown-menu::-webkit-scrollbar-thumb) {
  border: 2px solid transparent;
  border-radius: 999px;
  background: #cbd5e1;
  background-clip: padding-box;
}

:global(.base-action-menu-popper .el-dropdown-menu::-webkit-scrollbar-track) {
  background: transparent;
}

:global(.base-action-menu-popper .base-action-menu__item.el-dropdown-menu__item) {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  border-radius: 7px;
  padding: 8px 10px;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
}

:global(.base-action-menu-popper .base-action-menu__item.el-dropdown-menu__item:not(.is-disabled):hover),
:global(.base-action-menu-popper .base-action-menu__item.el-dropdown-menu__item:not(.is-disabled):focus) {
  background: #f1f5f9;
  color: #0f172a;
}

:global(.base-action-menu-popper .base-action-menu__item.is-selected.el-dropdown-menu__item) {
  background: rgb(var(--color-primary) / 0.08);
  color: rgb(var(--color-primary));
}

:global(.base-action-menu-popper .base-action-menu__item.is-loading.el-dropdown-menu__item) {
  cursor: progress;
}

:global(.base-action-menu-popper .base-action-menu__item-text) {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
}

:global(.base-action-menu-popper .base-action-menu__item-text span),
:global(.base-action-menu-popper .base-action-menu__item-text small) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.base-action-menu-popper--wrap-text .base-action-menu__item-text span),
:global(.base-action-menu-popper--wrap-text .base-action-menu__item-text small) {
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
  white-space: normal;
}

:global(.base-action-menu-popper .base-action-menu__item-text small) {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 700;
}

:global(.base-action-menu-popper .base-action-menu__item-trailing) {
  margin-left: auto;
  display: flex;
  min-width: 0;
  max-width: 45%;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

:global(.base-action-menu-popper .base-action-menu__item-meta) {
  min-width: 0;
  max-width: 96px;
  overflow: hidden;
  border-radius: 999px;
  background: #f1f5f9;
  padding: 2px 6px;
  color: #64748b;
  font-size: 9px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.base-action-menu-popper .base-action-menu__item kbd) {
  min-width: 0;
  max-width: 112px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #f8fafc;
  padding: 2px 6px;
  color: #94a3b8;
  font-size: 9px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.base-action-menu-popper .base-action-menu__item-check) {
  flex-shrink: 0;
  color: rgb(var(--color-primary));
}

:global(.base-action-menu-popper .base-action-menu__item-spinner) {
  animation: base-action-menu-spin 0.9s linear infinite;
}

:global(.base-action-menu-popper .base-action-menu__item.is-danger.el-dropdown-menu__item) {
  color: #dc2626;
}

:global(.base-action-menu-popper .base-action-menu__item.is-danger.el-dropdown-menu__item:not(.is-disabled):hover),
:global(.base-action-menu-popper .base-action-menu__item.is-danger.el-dropdown-menu__item:not(.is-disabled):focus) {
  background: #fef2f2;
  color: #b91c1c;
}

:global(.base-action-menu-popper .el-dropdown-menu__item--divided) {
  margin-top: 6px;
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
}

:global(.base-action-menu-popper .el-dropdown-menu__item--divided::before) {
  display: none;
}

:global(.base-action-menu-popper .base-action-menu__empty) {
  display: flex;
  min-height: 80px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 7px;
  padding: 16px 12px;
  text-align: center;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
}

:global(.dark .base-action-menu-popper.el-popper) {
  --el-dropdown-menuItem-hover-fill: #1e293b;
  --el-dropdown-menuItem-hover-color: #f8fafc;
}

:global(.dark .base-action-menu-popper .el-dropdown-menu) {
  border-color: #1e293b;
  background: #0f172a;
  scrollbar-color: #475569 transparent;
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

:global(.dark .base-action-menu-popper .el-dropdown-menu::-webkit-scrollbar-thumb) {
  background: #475569;
}

:global(.dark .base-action-menu-popper .base-action-menu__item.el-dropdown-menu__item) {
  color: #cbd5e1;
}

:global(.dark .base-action-menu-popper .base-action-menu__item.el-dropdown-menu__item:not(.is-disabled):hover),
:global(.dark .base-action-menu-popper .base-action-menu__item.el-dropdown-menu__item:not(.is-disabled):focus) {
  background: #1e293b;
  color: #f8fafc;
}

:global(.dark .base-action-menu-popper .base-action-menu__item-text small) {
  color: #64748b;
}

:global(.dark .base-action-menu-popper .base-action-menu__item-meta) {
  background: #1e293b;
  color: #cbd5e1;
}

:global(.dark .base-action-menu-popper .base-action-menu__item kbd) {
  border-color: #334155;
  background: #020617;
  color: #64748b;
}

:global(.dark .base-action-menu-popper .base-action-menu__item.is-danger.el-dropdown-menu__item:not(.is-disabled):hover),
:global(.dark .base-action-menu-popper .base-action-menu__item.is-danger.el-dropdown-menu__item:not(.is-disabled):focus) {
  background: #450a0a;
  color: #fca5a5;
}

:global(.dark .base-action-menu-popper .el-dropdown-menu__item--divided) {
  border-top-color: #1e293b;
}

@media (prefers-reduced-motion: reduce) {
  .base-action-menu__trigger,
  :global(.base-action-menu-popper .base-action-menu__item.el-dropdown-menu__item),
  :global(.base-action-menu-popper .base-action-menu__item-spinner) {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes base-action-menu-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
