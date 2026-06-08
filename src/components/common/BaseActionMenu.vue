<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "../../composables/useI18n";
import { createRandomId } from "../../utils";

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
let positionFrame = 0;

const getViewportPadding = () => Math.max(0, props.viewportPadding);

const getEnabledItems = () => Array.from(panelRef.value?.querySelectorAll<HTMLButtonElement>(".base-action-menu__item:not(:disabled)") ?? []);

const focusMenuItem = (target: "first" | "last") => {
  const items = getEnabledItems();
  if (!items.length) return;

  const item = target === "last" ? items[items.length - 1] : items[0];
  item.focus();
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
    minWidth: `${minWidth}px`,
    maxWidth: `${maxWidth}px`,
    maxHeight: `${maxHeight}px`,
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    transformOrigin: placement === "top" ? "bottom center" : "top center",
  };

  resolvedPlacement.value = placement;
  panelStyle.value = nextStyle;
};

const schedulePanelPosition = () => {
  if (!open.value) return;
  if (positionFrame) window.cancelAnimationFrame(positionFrame);
  positionFrame = window.requestAnimationFrame(() => {
    positionFrame = 0;
    updatePanelPosition();
  });
};

const openMenu = async (focusTarget: "first" | "last" = "first") => {
  if (props.disabled) return;
  window.dispatchEvent(new CustomEvent("base-action-menu:close-all", { detail: menuId }));
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
  const target = event.target as Node;
  if (!rootRef.value?.contains(target) && !panelRef.value?.contains(target)) {
    closeMenu();
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") closeMenu(true);
};

const handleTriggerKeydown = (event: KeyboardEvent) => {
  if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    void openMenu();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    void openMenu("last");
  }
};

const handlePanelKeydown = (event: KeyboardEvent) => {
  const items = getEnabledItems();
  if (!items.length) return;

  const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const offset = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + offset + items.length) % items.length;
    items[nextIndex]?.focus();
  } else if (event.key === "Home") {
    event.preventDefault();
    items[0]?.focus();
  } else if (event.key === "End") {
    event.preventDefault();
    items[items.length - 1]?.focus();
  }
};

const handleGlobalClose = (event: Event) => {
  if ((event as CustomEvent<string>).detail === menuId) return;
  closeMenu();
};

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("base-action-menu:close-all", handleGlobalClose);
  window.addEventListener("resize", schedulePanelPosition);
  window.addEventListener("scroll", schedulePanelPosition, true);
});

onBeforeUnmount(() => {
  if (positionFrame) window.cancelAnimationFrame(positionFrame);
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("base-action-menu:close-all", handleGlobalClose);
  window.removeEventListener("resize", schedulePanelPosition);
  window.removeEventListener("scroll", schedulePanelPosition, true);
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
      :aria-label="ariaLabel || label || t('common.moreActions')"
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
        :class="[`base-action-menu__panel--${resolvedPlacement}`]"
        :style="panelStyle"
        :id="menuId"
        role="menu"
        :aria-labelledby="triggerId"
        @keydown="handlePanelKeydown"
      >
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
          :aria-disabled="action.disabled"
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
  scrollbar-width: thin;
  scrollbar-color: rgb(203 213 225) transparent;
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
</style>
