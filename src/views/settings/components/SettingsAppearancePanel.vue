<script setup lang="ts">
import { LayoutPanelLeft, Type, PanelBottom, Palette } from "lucide-vue-next";
import { useI18n } from "../../../composables/useI18n";
import type { LayoutPrefs } from "../../../stores/app";
import { useSettingStore } from "../../../stores/settings";
import { applyObjectPatch } from "../../../utils";

const { t } = useI18n();
const settingsStore = useSettingStore();

const props = defineProps<{
  modelValue: LayoutPrefs;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: LayoutPrefs): void;
}>();

function patchPrefs(patch: Partial<LayoutPrefs>) {
  emit("update:modelValue", applyObjectPatch(props.modelValue, patch));
}
</script>

<template>
  <div class="space-y-4 select-none">
    <div>
      <h3 class="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
        {{ t('settings.appearance.layoutTitle') }}
      </h3>
    </div>

    <!-- 主题风格设置 -->
    <div class="setting-item">
      <div class="flex items-center gap-3">
        <div class="setting-icon-wrapper bg-purple-500/10 text-purple-500">
          <Palette class="h-4.5 w-4.5" />
        </div>
        <div class="min-w-0">
          <div class="setting-title">{{ t('settings.appearance.themeLabel') }}</div>
          <div class="setting-desc text-slate-500 dark:text-slate-400">{{ t('settings.appearance.themeDesc') }}</div>
        </div>
      </div>
      <div class="capsule-group">
        <button
          class="capsule-btn"
          :class="settingsStore.theme === 'light' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'"
          @click="settingsStore.setTheme('light')"
        >
          {{ t('settings.appearance.themeLight') }}
        </button>
        <button
          class="capsule-btn"
          :class="settingsStore.theme === 'dark' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'"
          @click="settingsStore.setTheme('dark')"
        >
          {{ t('settings.appearance.themeDark') }}
        </button>
        <button
          class="capsule-btn"
          :class="settingsStore.theme === 'system' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'"
          @click="settingsStore.setTheme('system')"
        >
          {{ t('settings.appearance.themeSystem') }}
        </button>
      </div>
    </div>

    <!-- 侧边导航设置 -->
    <div class="setting-item">
      <div class="flex items-center gap-3">
        <div class="setting-icon-wrapper bg-primary/10 text-primary">
          <LayoutPanelLeft class="h-4.5 w-4.5" />
        </div>
        <div class="min-w-0">
          <div class="setting-title">{{ t('settings.appearance.sidebarLabel') }}</div>
          <div class="setting-desc text-slate-500 dark:text-slate-400">{{ t('settings.appearance.sidebarDesc') }}</div>
        </div>
      </div>
      <div class="flex items-center">
        <button
          type="button"
          class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
          :class="modelValue.sidebarCollapsed ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'"
          @click="patchPrefs({ sidebarCollapsed: !modelValue.sidebarCollapsed })"
        >
          <span
            aria-hidden="true"
            class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            :class="modelValue.sidebarCollapsed ? 'translate-x-4' : 'translate-x-0'"
          />
        </button>
      </div>
    </div>

    <!-- 字体尺寸设置 -->
    <div class="setting-item">
      <div class="flex items-center gap-3">
        <div class="setting-icon-wrapper bg-indigo-500/10 text-indigo-500">
          <Type class="h-4.5 w-4.5" />
        </div>
        <div class="min-w-0">
          <div class="setting-title">{{ t('settings.appearance.fontSizeLabel') }}</div>
          <div class="setting-desc text-slate-500 dark:text-slate-400">{{ t('settings.appearance.fontSizeDesc') }}</div>
        </div>
      </div>
      <div class="capsule-group">
        <button
          class="capsule-btn"
          :class="modelValue.fontScale === 'normal' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'"
          @click="patchPrefs({ fontScale: 'normal' })"
        >
          {{ t('settings.appearance.fontSizeNormal') }}
        </button>
        <button
          class="capsule-btn"
          :class="modelValue.fontScale === 'large' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'"
          @click="patchPrefs({ fontScale: 'large' })"
        >
          {{ t('settings.appearance.fontSizeLarge') }}
        </button>
      </div>
    </div>

    <!-- 状态栏设置 -->
    <div class="setting-item">
      <div class="flex items-center gap-3">
        <div class="setting-icon-wrapper bg-sky-500/10 text-sky-500">
          <PanelBottom class="h-4.5 w-4.5" />
        </div>
        <div class="min-w-0">
          <div class="setting-title">{{ t('settings.appearance.statusFooterLabel') }}</div>
          <div class="setting-desc text-slate-500 dark:text-slate-400">{{ t('settings.appearance.statusFooterDesc') }}</div>
        </div>
      </div>
      <div class="flex items-center">
        <button
          type="button"
          class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
          :class="modelValue.showStatusFooter ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'"
          @click="patchPrefs({ showStatusFooter: !modelValue.showStatusFooter })"
        >
          <span
            aria-hidden="true"
            class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            :class="modelValue.showStatusFooter ? 'translate-x-4' : 'translate-x-0'"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setting-item {
  @apply flex items-center justify-between gap-4 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 transition-all duration-300;
}
.setting-item:hover {
  @apply border-primary/40 bg-primary/5 dark:border-primary/40 dark:bg-primary/5;
}
.setting-icon-wrapper {
  @apply flex h-9 w-9 items-center justify-center rounded-xl shrink-0 transition-transform duration-300;
}
.setting-item:hover .setting-icon-wrapper {
  @apply scale-105;
}
.setting-title {
  @apply text-xs font-black text-slate-800 dark:text-slate-200;
}
.setting-desc {
  @apply text-[10px] font-semibold mt-0.5 break-words;
}
.capsule-group {
  @apply flex shrink-0 border border-slate-200 dark:border-slate-700 rounded-full p-0.5 bg-slate-50 dark:bg-slate-900;
}
.capsule-btn {
  @apply flex items-center justify-center px-3.5 py-1 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer;
}
</style>
