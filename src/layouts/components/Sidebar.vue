<script setup lang="ts">
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Cog,
  TerminalSquare,
  Wrench,
  Compass,
  FolderOpen
} from "lucide-vue-next";

defineProps<{
  activeTab: "workspace" | "system" | "tools" | "navigation" | "settings" | "file-manager";
  collapsed: boolean;
  version: string;
  hasUpdate?: boolean;
}>();

const emit = defineEmits<{
  (e: "changeTab", tab: "workspace" | "system" | "tools" | "navigation" | "settings" | "file-manager"): void;
  (e: "toggleCollapse"): void;
  (e: "checkUpdateManual"): void;
}>();

const items = [
  {
    key: "workspace",
    title: "工作台",
    icon: LayoutDashboard,
  },
  {
    key: "navigation",
    title: "导航菜单",
    icon: Compass,
  },
  {
    key: "tools",
    title: "工具箱",
    icon: Wrench,
  },
] as const;
</script>

<template>
  <aside
    class="flex h-full flex-col border-r border-slate-200 bg-white transition-[width] duration-200"
    :class="collapsed ? 'w-18' : 'w-[230px]'"
  >
    <!-- Logo 区域：Logo 与菜单项左侧完美对齐，版本号压在分割线中间 -->
    <div class="relative border-b border-slate-200 p-4" :class="collapsed ? 'px-3' : 'px-5.5'">
      <div class="flex items-center gap-3">
        <!-- 渐变质感 Logo -->
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-400 text-[18px] font-black text-white shadow-md shadow-blue-500/10"
        >
          智
        </div>
        <div v-if="!collapsed" class="min-w-0 flex items-center gap-1.5">
          <span class="truncate text-[15px] font-black tracking-tight text-slate-800">
            智汇工具箱
          </span>
          <span class="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-black text-blue-600 shrink-0">Pro</span>
        </div>
      </div>
      <!-- 版本号压在分割线中间且高亮色，点击可手动检查更新 -->
      <div v-if="!collapsed" 
        class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-blue-50 px-2 py-0.5 border border-blue-200 rounded-full z-10 leading-none flex items-center justify-center shadow-sm cursor-pointer hover:bg-blue-100 hover:scale-105 active:scale-95 transition-all duration-150"
        title="点击检查更新"
        @click="emit('checkUpdateManual')"
      >
        <span class="text-[9px] font-extrabold text-blue-600">V{{ version }}</span>
        <!-- 小红点 -->
        <span v-if="hasUpdate" class="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-error ring-1 ring-white"></span>
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
            ? 'bg-[#EFF6FF] text-blue-600 font-bold'
            : 'bg-transparent hover:bg-slate-50 text-slate-500 hover:text-slate-800'
        "
        @click="emit('changeTab', item.key)"
      >
        <!-- 状态高亮指示竖条：负定位贴紧侧边栏最左侧边缘，高度占一半 -->
        <div
          class="absolute left-[-12px] top-1/4 w-[3.5px] rounded-r-md bg-blue-600 transition-all duration-200"
          :class="activeTab === item.key ? 'h-1/2 opacity-100' : 'h-0 opacity-0'"
        ></div>

        <!-- 纯净无边框扁平图标 -->
        <div
          class="flex h-5 w-5 shrink-0 items-center justify-center transition-colors"
          :class="activeTab === item.key ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'"
        >
          <component :is="item.icon" class="h-[18px] w-[18px]" />
        </div>

        <!-- 文字说明 -->
        <div v-if="!collapsed" class="min-w-0 flex-1">
          <div class="text-[13px] tracking-wide font-bold">
            {{ item.title }}
          </div>
        </div>
      </button>
    </div>

    <!-- 底部工具组：高保真非对称两端对齐 -->
    <div class="p-3.5 pb-4">
      <!-- 展开状态：左边两个，右边一个 -->
      <div v-if="!collapsed" class="flex items-center justify-between px-1">
        <div class="flex items-center gap-3">
          <!-- 系统能力按钮 -->
          <button
            class="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white hover:text-slate-700 hover:border-slate-350 transition duration-150 cursor-pointer shadow-sm group/btn hover:scale-105 active:scale-95"
            :class="activeTab === 'system' ? 'text-blue-600 border-blue-300 bg-blue-50/50' : 'text-slate-500'"
            title="系统能力"
            @click="emit('changeTab', 'system')"
          >
            <TerminalSquare class="h-4 w-4 transition-transform duration-300 group-hover/btn:-translate-y-0.5" />
          </button>
          <!-- 设置中心按钮 -->
          <button
            class="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white hover:text-slate-700 hover:border-slate-350 transition duration-150 cursor-pointer shadow-sm group/btn hover:scale-105 active:scale-95"
            :class="activeTab === 'settings' ? 'text-blue-600 border-blue-300 bg-blue-50/50' : 'text-slate-500'"
            title="设置中心"
            @click="emit('changeTab', 'settings')"
          >
            <Cog class="h-4 w-4 transition-transform duration-500 group-hover/btn:rotate-180" />
          </button>
        </div>
        <div class="flex items-center gap-3">
          <!-- 文件管理按钮 -->
          <button
            class="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white hover:text-slate-700 hover:border-slate-350 transition duration-150 cursor-pointer shadow-sm group/btn hover:scale-105 active:scale-95"
            :class="activeTab === 'file-manager' ? 'text-blue-600 border-blue-300 bg-blue-50/50' : 'text-slate-500'"
            title="文件管理"
            @click="emit('changeTab', 'file-manager')"
          >
            <FolderOpen class="h-4 w-4 transition-transform duration-300 group-hover/btn:scale-110" />
          </button>
          <!-- 折叠收起按钮 -->
          <button
            class="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition duration-150 cursor-pointer group/btn"
            title="折叠侧边栏"
            @click="emit('toggleCollapse')"
          >
            <ChevronLeft class="h-[18px] w-[18px] transition-transform duration-200 group-hover/btn:-translate-x-0.5" />
          </button>
        </div>
      </div>

      <!-- 收缩状态：垂直排列图标 -->
      <div v-else class="flex flex-col items-center gap-3">
        <!-- 系统能力按钮 -->
        <button
          class="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white hover:text-slate-700 hover:border-slate-350 transition duration-150 cursor-pointer shadow-sm group/btn hover:scale-105 active:scale-95"
          :class="activeTab === 'system' ? 'text-blue-600 border-blue-300 bg-blue-50/50' : 'text-slate-500'"
          title="系统能力"
          @click="emit('changeTab', 'system')"
        >
          <TerminalSquare class="h-4 w-4 transition-transform duration-300 group-hover/btn:-translate-y-0.5" />
        </button>
        <!-- 设置中心按钮 -->
        <button
          class="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white hover:text-slate-700 hover:border-slate-350 transition duration-150 cursor-pointer shadow-sm group/btn hover:scale-105 active:scale-95"
          :class="activeTab === 'settings' ? 'text-blue-600 border-blue-300 bg-blue-50/50' : 'text-slate-500'"
          title="设置中心"
          @click="emit('changeTab', 'settings')"
        >
          <Cog class="h-4 w-4 transition-transform duration-500 group-hover/btn:rotate-180" />
        </button>
        <!-- 文件管理按钮 -->
        <button
          class="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white hover:text-slate-700 hover:border-slate-350 transition duration-150 cursor-pointer shadow-sm group/btn hover:scale-105 active:scale-95"
          :class="activeTab === 'file-manager' ? 'text-blue-600 border-blue-300 bg-blue-50/50' : 'text-slate-500'"
          title="文件管理"
          @click="emit('changeTab', 'file-manager')"
        >
          <FolderOpen class="h-4 w-4 transition-transform duration-300 group-hover/btn:scale-110" />
        </button>
        <!-- 展开按钮 -->
        <button
          class="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition duration-150 cursor-pointer group/btn mt-1"
          title="展开侧边栏"
          @click="emit('toggleCollapse')"
        >
          <ChevronRight class="h-[18px] w-[18px] transition-transform duration-200 group-hover/btn:translate-x-0.5" />
        </button>
      </div>
    </div>
  </aside>
</template>
