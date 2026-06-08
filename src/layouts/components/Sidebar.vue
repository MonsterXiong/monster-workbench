<script setup lang="ts">
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Cog,
  TerminalSquare,
  Wrench,
  Compass,
  Bot,
  FolderOpen,
  FlaskConical
} from "lucide-vue-next";

defineProps<{
  activeTab: "workspace" | "system" | "tools" | "navigation" | "ai" | "settings" | "file-manager" | "playground";
  collapsed: boolean;
  version: string;
  hasUpdate?: boolean;
}>();

const emit = defineEmits<{
  (e: "changeTab", tab: "workspace" | "system" | "tools" | "navigation" | "ai" | "settings" | "file-manager" | "playground"): void;
  (e: "toggleCollapse"): void;
  (e: "checkUpdateManual"): void;
}>();

import { useI18n } from "../../composables/useI18n";
const { t } = useI18n();
const isDev = import.meta.env.DEV;

const items = [
  {
    key: "workspace",
    titleKey: "sidebar.workspace",
    icon: LayoutDashboard,
  },
  {
    key: "navigation",
    titleKey: "sidebar.navigation",
    icon: Compass,
  },
  {
    key: "tools",
    titleKey: "sidebar.tools",
    icon: Wrench,
  },
  {
    key: "ai",
    titleKey: "sidebar.ai",
    icon: Bot,
  },
] as const;
</script>

<template>
  <aside
    class="flex h-full flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-[width] duration-200"
    :class="collapsed ? 'w-18' : 'w-[230px]'"
  >
    <!-- Logo 区域：Logo 与菜单项左侧完美对齐，版本号压在分割线中间 -->
    <div class="relative border-b border-slate-200 dark:border-slate-800 p-4" :class="collapsed ? 'px-3' : 'px-5.5'">
      <div class="flex items-center gap-3">
        <!-- 渐变质感 Logo -->
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-400 text-[18px] font-black text-white shadow-md shadow-blue-500/10"
        >
          {{ t('sidebar.logoChar') }}
        </div>
        <div v-if="!collapsed" class="min-w-0 flex items-center gap-1.5">
          <span class="truncate text-[15px] font-black tracking-tight text-slate-900 dark:text-slate-100">
            {{ t('sidebar.logoText') }}
          </span>
          <span class="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary shrink-0">Pro</span>
        </div>
      </div>
      <!-- 版本号压在分割线中间且高亮色，点击可手动检查更新 -->
      <div v-if="!collapsed"
        class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-primary/10 px-2 py-0.5 border border-primary/20 rounded-full z-10 leading-none flex items-center justify-center shadow-sm cursor-pointer hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all duration-150"
        :title="t('sidebar.checkUpdate')"
        @click="emit('checkUpdateManual')"
      >
        <span class="text-[9px] font-extrabold text-primary">V{{ version }}</span>
        <!-- 小红点 -->
        <span v-if="hasUpdate" class="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-red-500 ring-1 ring-white dark:ring-slate-950"></span>
      </div>
    </div>

    <!-- 导航菜单项 -->
    <div class="flex-1 overflow-y-auto p-3 space-y-1">
      <button
        v-for="item in items"
        :key="item.key"
        class="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3.5 text-left transition-all duration-200 cursor-pointer h-10"
        :class="
          activeTab === item.key
            ? 'bg-primary/10 text-primary font-bold'
            : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
        "
        @click="emit('changeTab', item.key)"
      >
        <!-- 状态高亮指示竖条：负定位贴紧侧边栏最左侧边缘，高度占一半 -->
        <div
          class="absolute left-[-12px] top-1/4 w-[3.5px] rounded-r-md bg-primary transition-all duration-200"
          :class="activeTab === item.key ? 'h-1/2 opacity-100' : 'h-0 opacity-0'"
        ></div>

        <!-- 纯净无边框扁平图标 -->
        <div
          class="flex h-5 w-5 shrink-0 items-center justify-center transition-colors"
          :class="activeTab === item.key ? 'text-primary' : 'text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100'"
        >
          <component :is="item.icon" class="h-[18px] w-[18px]" />
        </div>

        <!-- 文字说明 -->
        <div v-if="!collapsed" class="min-w-0 flex-1">
          <div class="text-[13px] tracking-wide font-bold">
            {{ t(item.titleKey) }}
          </div>
        </div>
      </button>
    </div>

    <!-- 底部工具组：高保真扁平整合设计 -->
    <div class="p-3 pb-4">
      <!-- 展开状态：左边，右边一个 -->
      <div v-if="!collapsed" class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <!-- 系统能力按钮 -->
          <button
            class="flex h-8 w-8 items-center justify-center rounded-xl transition duration-150 cursor-pointer group/btn active:scale-95"
            :class="activeTab === 'system' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'"
            :title="t('sidebar.system')"
            @click="emit('changeTab', 'system')"
          >
            <TerminalSquare class="h-[17px] w-[17px] transition-transform duration-300 group-hover/btn:-translate-y-0.5" />
          </button>
          <!-- 设置中心按钮 -->
          <button
            class="flex h-8 w-8 items-center justify-center rounded-xl transition duration-150 cursor-pointer group/btn active:scale-95"
            :class="activeTab === 'settings' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'"
            :title="t('sidebar.settings')"
            @click="emit('changeTab', 'settings')"
          >
            <Cog class="h-[17px] w-[17px] transition-transform duration-500 group-hover/btn:rotate-180" />
          </button>
          <!-- 组件沙箱（仅开发环境可见） -->
          <button
            v-if="isDev"
            class="flex h-8 w-8 items-center justify-center rounded-xl transition duration-150 cursor-pointer group/btn active:scale-95"
            :class="activeTab === 'playground' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'"
            title="组件沙箱"
            @click="emit('changeTab', 'playground')"
          >
            <FlaskConical class="h-[17px] w-[17px] transition-transform duration-300 group-hover/btn:-translate-y-0.5" />
          </button>
        </div>
        <div class="flex items-center gap-2">
          <!-- 文件管理按钮 -->
          <button
            class="flex h-8 w-8 items-center justify-center rounded-xl transition duration-150 cursor-pointer group/btn active:scale-95"
            :class="activeTab === 'file-manager' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'"
            :title="t('sidebar.fileManager')"
            @click="emit('changeTab', 'file-manager')"
          >
            <FolderOpen class="h-[17px] w-[17px] transition-transform duration-300 group-hover/btn:scale-110" />
          </button>
          <!-- 折叠收起按钮 -->
          <button
            class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-150 cursor-pointer group/btn"
            :title="t('sidebar.collapse')"
            @click="emit('toggleCollapse')"
          >
            <ChevronLeft class="h-4.5 w-4.5 transition-transform duration-200 group-hover/btn:-translate-x-0.5" />
          </button>
        </div>
      </div>

      <!-- 收缩状态：垂直排列图标 -->
      <div v-else class="flex flex-col items-center gap-2">
        <!-- 系统能力按钮 -->
        <button
          class="flex h-8 w-8 items-center justify-center rounded-xl transition duration-150 cursor-pointer group/btn active:scale-95"
          :class="activeTab === 'system' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'"
          :title="t('sidebar.system')"
          @click="emit('changeTab', 'system')"
        >
          <TerminalSquare class="h-[17px] w-[17px] transition-transform duration-300 group-hover/btn:-translate-y-0.5" />
        </button>
        <!-- 设置中心按钮 -->
        <button
          class="flex h-8 w-8 items-center justify-center rounded-xl transition duration-150 cursor-pointer group/btn active:scale-95"
          :class="activeTab === 'settings' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'"
          :title="t('sidebar.settings')"
          @click="emit('changeTab', 'settings')"
        >
          <Cog class="h-[17px] w-[17px] transition-transform duration-500 group-hover/btn:rotate-180" />
        </button>
        <!-- 组件沙箱（仅开发环境可见） -->
        <button
          v-if="isDev"
          class="flex h-8 w-8 items-center justify-center rounded-xl transition duration-150 cursor-pointer group/btn active:scale-95"
          :class="activeTab === 'playground' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'"
          title="组件沙箱"
          @click="emit('changeTab', 'playground')"
        >
          <FlaskConical class="h-[17px] w-[17px] transition-transform duration-300 group-hover/btn:-translate-y-0.5" />
        </button>
        <!-- 文件管理按钮 -->
        <button
          class="flex h-8 w-8 items-center justify-center rounded-xl transition duration-150 cursor-pointer group/btn active:scale-95"
          :class="activeTab === 'file-manager' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'"
          :title="t('sidebar.fileManager')"
          @click="emit('changeTab', 'file-manager')"
        >
          <FolderOpen class="h-[17px] w-[17px] transition-transform duration-300 group-hover/btn:scale-110" />
        </button>
        <!-- 展开按钮 -->
        <button
          class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-150 cursor-pointer group/btn mt-1"
          :title="t('sidebar.expand')"
          @click="emit('toggleCollapse')"
        >
          <ChevronRight class="h-4.5 w-4.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
        </button>
      </div>
    </div>
  </aside>
</template>
