<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  addDomEventListener,
  clampNumberToBounds,
  clearAnimationFrameHandle,
  createAnimationFrame,
  createRandomId,
  dispatchWindowCustomEvent,
  focusElementIntoView,
  focusElementPreventScroll,
  formatCssPixelValue,
  formatRoundedCssPixelValue,
  getBoundaryItem,
  getViewportAvailableHeight,
  getViewportAvailableWidth,
  getNextCircularItem,
  isEventTargetInsideAnyPath,
  isActivationKey,
  isEmptyArray,
  isEscapeKey,
  isKeyboardKey,
  mergeDomEventCleanups,
  queryFocusableElements,
  toAriaKeyShortcuts,
  toNonNegativeNumber,
  type AnimationFrameHandle,
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

const rootRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const open = ref(false);
const activeActionKey = ref<string | null>(null);
const panelStyle = ref<Record<string, string>>({});
const resolvedPlacement = ref<"bottom" | "top">(props.placement === "top" ? "top" : "bottom");
const { t } = useI18n();
const menuId = createRandomId("base-action-menu");
const triggerId = createRandomId("base-action-menu-trigger");
const resolvedMenuLabel = computed(() => props.ariaLabel || props.label || t("common.moreActions"));
const resolvedEmptyText = computed(() => props.emptyText || t("common.noData"));
let positionFrame: AnimationFrameHandle | null = null;
let stopGlobalListeners: DomEventCleanup | null = null;

const getViewportPadding = () => toNonNegativeNumber(props.viewportPadding);
const getActionAriaKeyshortcuts = (action: ActionMenuItem) => {
  const shortcut = action.ariaShortcut || (props.exposeAriaShortcuts ? action.shortcut : "");
  return shortcut ? toAriaKeyShortcuts(shortcut) : undefined;
};
const getActionIconName = (action: ActionMenuItem) => action.loading ? "LoaderCircle" : action.icon ?? "";

const getEnabledItems = () => queryFocusableElements<HTMLButtonElement>(panelRef.value, { selector: ".base-action-menu__item" });
const isActionDisabled = (action: ActionMenuItem) => Boolean(action.disabled || action.loading);
const getActionRole = (action: ActionMenuItem) => (action.selected ? "menuitemcheckbox" : "menuitem");
const focusActionItem = (item?: HTMLButtonElement) => {
  focusElementIntoView(item);
  activeActionKey.value = item?.dataset.actionKey ?? null;
};

const getFocusableElements = () => queryFocusableElements(document, { exclude: panelRef.value });

const focusAdjacentTriggerElement = (direction: 1 | -1) => {
  const trigger = triggerRef.value;
  if (!trigger) return;
  const items = getFocusableElements();
  const currentIndex = items.indexOf(trigger);
  const target = items[currentIndex + direction];
  void nextTick(() => focusElementPreventScroll(target));
};

const isEventInsideMenu = (event: Event) => {
  return isEventTargetInsideAnyPath(event, [rootRef.value, panelRef.value]);
};

const isTriggerAnchorVisible = () => {
  const root = rootRef.value;
  if (!root) return false;

  const rect = root.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= window.innerHeight || rect.left >= window.innerWidth) return false;

  const x = clampNumberToBounds(rect.left + rect.width / 2, 0, window.innerWidth - 1);
  const y = clampNumberToBounds(rect.top + rect.height / 2, 0, window.innerHeight - 1);
  const elementAtAnchor = document.elementFromPoint(x, y);
  return Boolean(elementAtAnchor && root.contains(elementAtAnchor));
};

const focusMenuItem = (target: "first" | "last") => {
  const items = getEnabledItems();
  if (isEmptyArray(items)) {
    focusElementPreventScroll(panelRef.value);
    return;
  }

  const item = getBoundaryItem(items, target);
  focusActionItem(item);
};

const updatePanelPosition = () => {
  const root = rootRef.value;
  const panel = panelRef.value;
  if (!root) return;
  if (!isTriggerAnchorVisible()) {
    closeMenu();
    return;
  }

  const rect = root.getBoundingClientRect();
  const gap = 8;
  const viewportPadding = getViewportPadding();
  const availableWidth = getViewportAvailableWidth(viewportPadding, 160);
  const minWidth = clampNumberToBounds(rect.width, props.minWidth, availableWidth, props.minWidth);
  const maxWidth = clampNumberToBounds(props.maxWidth, minWidth, availableWidth, minWidth);
  const panelWidth = panel ? clampNumberToBounds(panel.offsetWidth, minWidth, maxWidth, minWidth) : minWidth;
  const spaceBelow = toNonNegativeNumber(window.innerHeight - rect.bottom - viewportPadding - gap);
  const spaceAbove = toNonNegativeNumber(rect.top - viewportPadding - gap);
  const shouldOpenTop = props.placement === "top" || (props.placement === "auto" && spaceBelow < Math.min(props.maxHeight, 220) && spaceAbove > spaceBelow);
  const placement = shouldOpenTop ? "top" : "bottom";
  const viewportHeight = getViewportAvailableHeight(viewportPadding, 48);
  const preferredHeight = Math.min(placement === "top" ? spaceAbove : spaceBelow, viewportHeight);
  const availableHeight = Math.max(Math.min(120, viewportHeight), preferredHeight);
  const maxHeight = Math.min(props.maxHeight, availableHeight);
  const panelHeight = panel ? Math.min(panel.offsetHeight, maxHeight) : maxHeight;
  let left = rect.right - panelWidth;

  if (props.align === "left") {
    left = rect.left;
  } else if (props.align === "center") {
    left = rect.left + rect.width / 2 - panelWidth / 2;
  }

  left = clampNumberToBounds(left, viewportPadding, window.innerWidth - viewportPadding - panelWidth, viewportPadding);

  let top = placement === "top" ? rect.top - gap - panelHeight : rect.bottom + gap;
  top = clampNumberToBounds(top, viewportPadding, window.innerHeight - viewportPadding - panelHeight, viewportPadding);

  const nextStyle: Record<string, string> = {
    minWidth: formatCssPixelValue(minWidth),
    maxWidth: formatCssPixelValue(maxWidth),
    maxHeight: formatCssPixelValue(maxHeight),
    left: formatRoundedCssPixelValue(left),
    top: formatRoundedCssPixelValue(top),
    transformOrigin: placement === "top" ? "bottom center" : "top center",
  };

  resolvedPlacement.value = placement;
  panelStyle.value = nextStyle;
};

const schedulePanelPosition = () => {
  if (!open.value) return;
  clearAnimationFrameHandle(positionFrame);
  positionFrame = createAnimationFrame(() => {
    positionFrame = null;
    updatePanelPosition();
  });
};

const openMenu = async (focusTarget: "first" | "last" = "first") => {
  if (props.disabled) return;
  dispatchWindowCustomEvent("base-action-menu:close-all", menuId);
  open.value = true;
  await nextTick();
  updatePanelPosition();
  await nextTick();
  updatePanelPosition();
  focusMenuItem(focusTarget);
};

const toggle = () => {
  if (props.disabled) return;
  if (open.value) {
    closeMenu();
    return;
  }
  void openMenu();
};

const closeMenu = (restoreFocus = false) => {
  if (!open.value) return;
  open.value = false;
  activeActionKey.value = null;
  if (restoreFocus) {
    void nextTick(() => triggerRef.value?.focus());
  }
};

const handleSelect = (action: ActionMenuItem) => {
  if (isActionDisabled(action)) return;
  emit("select", action);
  if (props.closeOnSelect) closeMenu(true);
};

const handleItemFocus = (action: ActionMenuItem) => {
  activeActionKey.value = action.key;
};

const handleItemBlur = (action: ActionMenuItem) => {
  if (activeActionKey.value === action.key) activeActionKey.value = null;
};

const handleDocumentPointerdown = (event: PointerEvent) => {
  if (!isEventInsideMenu(event)) {
    closeMenu();
  }
};

const handleDocumentFocusin = (event: FocusEvent) => {
  if (!isEventInsideMenu(event)) {
    closeMenu();
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (isEscapeKey(event)) closeMenu(true);
};

const handleTriggerKeydown = (event: KeyboardEvent) => {
  if (isKeyboardKey(event, "ArrowDown") || isActivationKey(event)) {
    event.preventDefault();
    void openMenu();
  } else if (isKeyboardKey(event, "ArrowUp")) {
    event.preventDefault();
    void openMenu("last");
  }
};

const handlePanelKeydown = (event: KeyboardEvent) => {
  if (isKeyboardKey(event, "Tab")) {
    event.preventDefault();
    focusAdjacentTriggerElement(event.shiftKey ? -1 : 1);
    closeMenu();
    return;
  }

  const items = getEnabledItems();
  if (isEmptyArray(items)) return;

  const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

  if (isKeyboardKey(event, ["ArrowDown", "ArrowUp"])) {
    event.preventDefault();
    const offset = isKeyboardKey(event, "ArrowDown") ? 1 : -1;
    focusActionItem(getNextCircularItem(items, currentIndex, offset) ?? undefined);
  } else if (isKeyboardKey(event, "Home")) {
    event.preventDefault();
    focusActionItem(getBoundaryItem(items, "first"));
  } else if (isKeyboardKey(event, "End")) {
    event.preventDefault();
    focusActionItem(getBoundaryItem(items, "last"));
  }
};

const handleGlobalClose = (event: Event) => {
  if ((event as CustomEvent<string>).detail === menuId) return;
  closeMenu();
};

onMounted(() => {
  stopGlobalListeners = mergeDomEventCleanups([
    addDomEventListener(document, "pointerdown", handleDocumentPointerdown, { capture: true }),
    addDomEventListener(document, "focusin", handleDocumentFocusin, { capture: true }),
    addDomEventListener(document, "keydown", handleKeydown),
    addDomEventListener(window, "base-action-menu:close-all", handleGlobalClose),
    addDomEventListener(window, "resize", schedulePanelPosition),
    addDomEventListener(window, "scroll", schedulePanelPosition, true),
  ]);
});

onBeforeUnmount(() => {
  clearAnimationFrameHandle(positionFrame);
  positionFrame = null;
  stopGlobalListeners?.();
  stopGlobalListeners = null;
});

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closeMenu();
  },
);

watch(
  () => [props.align, props.placement, props.minWidth, props.maxWidth, props.maxHeight, props.viewportPadding],
  schedulePanelPosition,
);

watch(
  () => props.actions,
  () => {
    void nextTick(schedulePanelPosition);
  },
  { deep: true },
);
</script>

<template>
  <div ref="rootRef" class="base-action-menu">
    <button
      :id="triggerId"
      ref="triggerRef"
      type="button"
      class="base-action-menu__trigger"
      :class="{ 'is-open': open }"
      :disabled="disabled"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="open ? menuId : undefined"
      :aria-label="resolvedMenuLabel"
      @click.stop="toggle"
      @keydown="handleTriggerKeydown"
    >
      <BaseIcon :name="icon" size="15" aria-hidden="true" />
      <span v-if="label">{{ label }}</span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelRef"
        class="base-action-menu__panel"
        :class="[`base-action-menu__panel--${resolvedPlacement}`, { 'base-action-menu__panel--wrap-text': wrapText }]"
        :style="panelStyle"
        :id="menuId"
        role="menu"
        aria-orientation="vertical"
        :aria-label="resolvedMenuLabel"
        :aria-labelledby="triggerId"
        :data-placement="resolvedPlacement"
        :data-align="align"
        tabindex="-1"
        @keydown="handlePanelKeydown"
      >
        <div v-if="isEmptyArray(actions)" class="base-action-menu__empty" role="status">
          <BaseIcon name="Inbox" size="14" aria-hidden="true" />
          <span>{{ resolvedEmptyText }}</span>
        </div>

        <button
          v-for="action in actions"
          :key="action.key"
          type="button"
          class="base-action-menu__item"
          :class="{
            'is-danger': action.type === 'danger',
            'is-disabled': isActionDisabled(action),
            'is-selected': action.selected,
            'is-loading': action.loading,
            'is-keyboard-active': activeActionKey === action.key,
            'is-divided': action.divided
          }"
          :data-action-key="action.key"
          :disabled="isActionDisabled(action)"
          :role="getActionRole(action)"
          :aria-checked="action.selected ? 'true' : undefined"
          :aria-disabled="isActionDisabled(action) ? 'true' : undefined"
          :aria-busy="action.loading ? 'true' : undefined"
          :aria-keyshortcuts="getActionAriaKeyshortcuts(action)"
          @click="handleSelect(action)"
          @focus="handleItemFocus(action)"
          @blur="handleItemBlur(action)"
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
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.base-action-menu {
  @apply relative inline-flex;
}

.base-action-menu__trigger {
  @apply inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-950 dark:hover:text-slate-100;
}

.base-action-menu__trigger.is-open {
  border-color: rgb(var(--color-primary) / 0.45);
  @apply text-primary;
}

.base-action-menu__panel {
  @apply fixed z-[1200] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 outline-none dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgb(203 213 225) transparent;
  max-width: calc(100vw - 20px);
}

.base-action-menu__panel:focus-visible {
  box-shadow:
    0 18px 42px rgba(15, 23, 42, 0.14),
    0 0 0 3px rgba(var(--color-primary), 0.16);
}

.base-action-menu__item {
  @apply flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus:bg-slate-800 dark:focus:text-slate-100;
}

.base-action-menu__item.is-selected {
  background-color: rgb(var(--color-primary) / 0.08);
  @apply text-primary;
}

.base-action-menu__item.is-keyboard-active {
  @apply bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100;
}

.base-action-menu__item.is-loading {
  @apply cursor-progress;
}

.base-action-menu__item-text {
  @apply flex min-w-0 flex-1 flex-col gap-0.5;
}

.base-action-menu__item-text span,
.base-action-menu__item-text small {
  @apply truncate;
}

.base-action-menu__panel--wrap-text .base-action-menu__item-text span,
.base-action-menu__panel--wrap-text .base-action-menu__item-text small {
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
  white-space: normal;
}

.base-action-menu__item-text small {
  @apply text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-action-menu__item-trailing {
  @apply ml-auto flex min-w-0 max-w-[45%] shrink-0 items-center justify-end gap-1.5;
}

.base-action-menu__item-meta {
  @apply min-w-0 max-w-24 truncate rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300;
}

.base-action-menu__item kbd {
  @apply min-w-0 max-w-28 truncate rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-black text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500;
}

.base-action-menu__item-check {
  @apply shrink-0 text-primary;
}

.base-action-menu__item-spinner {
  animation: base-action-menu-spin 0.9s linear infinite;
}

.base-action-menu__item.is-danger {
  @apply text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:focus:bg-red-950 dark:focus:text-red-300;
}

.base-action-menu__item.is-danger:hover,
.base-action-menu__item.is-danger:focus,
.base-action-menu__item.is-danger:focus-visible,
.base-action-menu__item.is-danger.is-keyboard-active {
  background-color: rgb(254 242 242);
  color: rgb(185 28 28);
}

.dark .base-action-menu__item.is-danger:hover,
.dark .base-action-menu__item.is-danger:focus,
.dark .base-action-menu__item.is-danger:focus-visible,
.dark .base-action-menu__item.is-danger.is-keyboard-active {
  background-color: rgb(69 10 10);
  color: rgb(252 165 165);
}

.base-action-menu__item.is-divided {
  @apply mt-1 border-t border-slate-100 pt-2 dark:border-slate-800;
}

.base-action-menu__empty {
  @apply flex min-h-20 flex-col items-center justify-center gap-2 rounded-md px-3 py-4 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500;
}

@media (prefers-reduced-motion: reduce) {
  .base-action-menu__trigger,
  .base-action-menu__item,
  .base-action-menu__item-spinner {
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
