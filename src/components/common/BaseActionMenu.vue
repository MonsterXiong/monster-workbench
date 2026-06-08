<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
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
  align?: "left" | "right";
  placement?: "bottom" | "top";
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: "",
  icon: "MoreHorizontal",
  disabled: false,
  align: "right",
  placement: "bottom",
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "select", action: ActionMenuItem): void;
}>();

const rootRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const open = ref(false);
const panelStyle = ref<Record<string, string>>({});
const { t } = useI18n();
const menuId = createRandomId("base-action-menu");

const updatePanelPosition = () => {
  const root = rootRef.value;
  if (!root) return;

  const rect = root.getBoundingClientRect();
  const gap = 6;
  const minWidth = Math.max(rect.width, 176);
  const nextStyle: Record<string, string> = {
    minWidth: `${minWidth}px`,
  };

  if (props.align === "left") {
    nextStyle.left = `${Math.round(rect.left)}px`;
  } else {
    nextStyle.right = `${Math.round(window.innerWidth - rect.right)}px`;
  }

  if (props.placement === "top") {
    nextStyle.bottom = `${Math.round(window.innerHeight - rect.top + gap)}px`;
  } else {
    nextStyle.top = `${Math.round(rect.bottom + gap)}px`;
  }

  panelStyle.value = nextStyle;
};

const openMenu = async () => {
  if (props.disabled) return;
  window.dispatchEvent(new CustomEvent("base-action-menu:close-all"));
  open.value = true;
  await nextTick();
  updatePanelPosition();
  panelRef.value?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
};

const toggle = () => {
  if (props.disabled) return;
  if (open.value) {
    close();
    return;
  }
  void openMenu();
};

const close = () => {
  open.value = false;
};

const handleSelect = (action: ActionMenuItem) => {
  if (action.disabled) return;
  emit("select", action);
  close();
};

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node;
  if (!rootRef.value?.contains(target) && !panelRef.value?.contains(target)) {
    close();
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") close();
};

const handleTriggerKeydown = (event: KeyboardEvent) => {
  if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    void openMenu();
  }
};

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("base-action-menu:close-all", close);
  window.addEventListener("resize", close);
  window.addEventListener("scroll", updatePanelPosition, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("base-action-menu:close-all", close);
  window.removeEventListener("resize", close);
  window.removeEventListener("scroll", updatePanelPosition, true);
});
</script>

<template>
  <div ref="rootRef" class="base-action-menu">
    <button
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
      <Transition name="base-action-menu">
        <div
          v-if="open"
          ref="panelRef"
          class="base-action-menu__panel"
          :class="[`base-action-menu__panel--${placement}`]"
          :style="panelStyle"
          :id="menuId"
          role="menu"
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
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.base-action-menu {
  @apply relative inline-flex;
}

.base-action-menu__trigger {
  @apply inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-950 dark:hover:text-slate-100;
}

.base-action-menu__trigger.is-open {
  border-color: rgb(var(--color-primary) / 0.45);
  @apply text-primary;
}

.base-action-menu__panel {
  @apply fixed z-[1200] min-w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-800 dark:bg-slate-900;
}

.base-action-menu__item {
  @apply flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100;
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

.base-action-menu-enter-active,
.base-action-menu-leave-active {
  @apply transition duration-150;
}

.base-action-menu-enter-from,
.base-action-menu-leave-to {
  @apply -translate-y-1 opacity-0;
}
</style>
