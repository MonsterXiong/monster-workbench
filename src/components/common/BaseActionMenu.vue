<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  addDomEventListener,
  clearAnimationFrameHandle,
  createAnimationFrame,
  createRandomId,
  dispatchWindowCustomEvent,
  firstItem,
  formatCssPixelValue,
  getNextCircularItem,
  isEventTargetInsideAny,
  isActivationKey,
  isEscapeKey,
  isKeyboardKey,
  lastItem,
  mergeDomEventCleanups,
  queryElements,
  toAriaKeyShortcuts,
  type AnimationFrameHandle,
  type DomEventCleanup,
} from "../../utils";

export interface ActionMenuItem {
  key: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon?: string;
  type?: "default" | "danger";
  disabled?: boolean;
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
});

const emit = defineEmits<{
  (e: "select", action: ActionMenuItem): void;
}>();

const rootRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const open = ref(false);
const panelStyle = ref<Record<string, string>>({});
const resolvedPlacement = ref<"bottom" | "top">(props.placement === "top" ? "top" : "bottom");
const { t } = useI18n();
const menuId = createRandomId("base-action-menu");
const triggerId = createRandomId("base-action-menu-trigger");
const resolvedMenuLabel = computed(() => props.ariaLabel || props.label || t("common.moreActions"));
const resolvedEmptyText = computed(() => props.emptyText || t("common.noData"));
let positionFrame: AnimationFrameHandle | null = null;
let stopGlobalListeners: DomEventCleanup | null = null;

const getViewportPadding = () => Math.max(0, props.viewportPadding);
const getActionAriaKeyshortcuts = (shortcut?: string) => {
  if (!shortcut) return undefined;
  return toAriaKeyShortcuts(shortcut.includes("+") ? shortcut : shortcut.trim().replace(/\s+/g, "+"));
};

const getEnabledItems = () => queryElements<HTMLButtonElement>(panelRef.value, ".base-action-menu__item:not(:disabled)");

const focusMenuItem = (target: "first" | "last") => {
  const items = getEnabledItems();
  if (!items.length) {
    panelRef.value?.focus({ preventScroll: true });
    return;
  }

  const item = target === "last" ? lastItem(items) : firstItem(items);
  item?.focus({ preventScroll: true });
};

const updatePanelPosition = () => {
  const root = rootRef.value;
  const panel = panelRef.value;
  if (!root) return;

  const rect = root.getBoundingClientRect();
  const gap = 8;
  const viewportPadding = getViewportPadding();
  const availableWidth = Math.max(160, window.innerWidth - viewportPadding * 2);
  const minWidth = Math.min(Math.max(rect.width, props.minWidth), availableWidth);
  const maxWidth = Math.min(Math.max(minWidth, props.maxWidth), availableWidth);
  const panelWidth = panel ? Math.min(Math.max(panel.offsetWidth, minWidth), maxWidth) : minWidth;
  const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - viewportPadding - gap);
  const spaceAbove = Math.max(0, rect.top - viewportPadding - gap);
  const shouldOpenTop = props.placement === "top" || (props.placement === "auto" && spaceBelow < Math.min(props.maxHeight, 220) && spaceAbove > spaceBelow);
  const placement = shouldOpenTop ? "top" : "bottom";
  const availableHeight = Math.max(120, placement === "top" ? spaceAbove : spaceBelow);
  const maxHeight = Math.min(props.maxHeight, availableHeight);
  const panelHeight = panel ? Math.min(panel.offsetHeight, maxHeight) : maxHeight;
  let left = rect.right - panelWidth;

  if (props.align === "left") {
    left = rect.left;
  } else if (props.align === "center") {
    left = rect.left + rect.width / 2 - panelWidth / 2;
  }

  left = Math.min(Math.max(left, viewportPadding), window.innerWidth - viewportPadding - panelWidth);

  let top = placement === "top" ? rect.top - gap - panelHeight : rect.bottom + gap;
  top = Math.min(Math.max(top, viewportPadding), window.innerHeight - viewportPadding - panelHeight);

  const nextStyle: Record<string, string> = {
    minWidth: formatCssPixelValue(minWidth),
    maxWidth: formatCssPixelValue(maxWidth),
    maxHeight: formatCssPixelValue(maxHeight),
    left: formatCssPixelValue(Math.round(left)),
    top: formatCssPixelValue(Math.round(top)),
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
  if (restoreFocus) {
    void nextTick(() => triggerRef.value?.focus());
  }
};

const handleSelect = (action: ActionMenuItem) => {
  if (action.disabled) return;
  emit("select", action);
  if (props.closeOnSelect) closeMenu(true);
};

const handleDocumentClick = (event: MouseEvent) => {
  if (!isEventTargetInsideAny(event, [rootRef.value, panelRef.value])) {
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
    closeMenu();
    return;
  }

  const items = getEnabledItems();
  if (!items.length) return;

  const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

  if (isKeyboardKey(event, ["ArrowDown", "ArrowUp"])) {
    event.preventDefault();
    const offset = isKeyboardKey(event, "ArrowDown") ? 1 : -1;
    getNextCircularItem(items, currentIndex, offset)?.focus();
  } else if (isKeyboardKey(event, "Home")) {
    event.preventDefault();
    firstItem(items)?.focus();
  } else if (isKeyboardKey(event, "End")) {
    event.preventDefault();
    lastItem(items)?.focus();
  }
};

const handleGlobalClose = (event: Event) => {
  if ((event as CustomEvent<string>).detail === menuId) return;
  closeMenu();
};

onMounted(() => {
  stopGlobalListeners = mergeDomEventCleanups([
    addDomEventListener(document, "click", handleDocumentClick),
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
        <div v-if="actions.length === 0" class="base-action-menu__empty" role="status">
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
            'is-disabled': action.disabled,
            'is-divided': action.divided
          }"
          :disabled="action.disabled"
          role="menuitem"
          :aria-disabled="action.disabled ? 'true' : undefined"
          :aria-keyshortcuts="getActionAriaKeyshortcuts(action.shortcut)"
          @click="handleSelect(action)"
        >
          <BaseIcon v-if="action.icon" :name="action.icon" size="14" aria-hidden="true" />
          <span class="base-action-menu__item-text">
            <span>{{ action.label }}</span>
            <small v-if="action.description">{{ action.description }}</small>
          </span>
          <kbd v-if="action.shortcut">{{ action.shortcut }}</kbd>
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

.base-action-menu__item kbd {
  @apply shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-black text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500;
}

.base-action-menu__item.is-danger {
  @apply text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950;
}

.base-action-menu__item.is-divided {
  @apply mt-1 border-t border-slate-100 pt-2 dark:border-slate-800;
}

.base-action-menu__empty {
  @apply flex min-h-20 flex-col items-center justify-center gap-2 rounded-md px-3 py-4 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500;
}
</style>
