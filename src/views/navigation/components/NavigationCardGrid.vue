<script setup lang="ts">
import {
  Edit3,
  Trash2,
  Bookmark,
  ExternalLink,
} from "lucide-vue-next";
import { isTauriRuntime } from "../../../services/runtime";
import { useAppStore } from "../../../stores/app";
import { convertFileSrc } from "@tauri-apps/api/core";

const appStore = useAppStore();

defineProps<{
  items: any[];
  isBatchMode: boolean;
  selectedIds: number[];
}>();

const emit = defineEmits<{
  (e: "visit", item: any): void;
  (e: "toggleSelection", id: number): void;
  (e: "openEditModal", item: any, event: Event): void;
  (e: "delete", id: number, title: string, event: Event): void;
}>();

// 图片本地绝对路径的 WebView 转换预览
function getImgUrl(relPath: string) {
  if (!relPath) return "";
  if (!isTauriRuntime()) {
    return "https://api.dicebear.com/7.x/identicon/svg?seed=" + encodeURIComponent(relPath);
  }
  const absPath = appStore.localPath + "/" + relPath;
  return convertFileSrc(absPath);
}
</script>

<template>
  <div class="flex-1 overflow-y-auto mt-4.5 pr-0.5 min-h-0 relative">
    <!-- 空白占位 -->
    <div v-if="items.length === 0" class="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div class="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
        <Bookmark class="h-7 w-7" />
      </div>
      <div>
        <h3 class="text-xs font-bold text-slate-700">暂无导航网址数据</h3>
        <p class="text-[10px] text-slate-400 font-semibold mt-1">您可点击右上方"新增"进行数据填充</p>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      <div
        v-for="item in items"
        :key="item.id"
        class="nav-card group"
        :class="{ 'ring-2 ring-blue-500/40 shadow-blue-500/5 bg-blue-50/20': selectedIds.includes(item.id!) }"
        @click="emit('visit', item)"
      >
        <!-- 背景封面 -->
        <div v-if="item.bg_path" class="-mx-4 -mt-4 mb-3 h-[88px] overflow-hidden shrink-0 relative rounded-t-2xl">
          <img :src="getImgUrl(item.bg_path)" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          <div class="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent"></div>
        </div>

        <!-- 批量选择框 -->
        <div v-if="isBatchMode" class="absolute left-3.5 top-3.5 z-10" @click.stop>
          <input
            type="checkbox"
            class="checkbox cursor-pointer"
            :checked="selectedIds.includes(item.id!)"
            @change="emit('toggleSelection', item.id!)"
          />
        </div>

        <!-- 卡片头 -->
        <div class="flex items-center justify-between gap-2.5">
          <div class="flex items-center gap-2.5 flex-1 min-w-0">
            <div
              v-if="item.logo_path"
              class="h-7 w-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm"
            >
              <img :src="getImgUrl(item.logo_path)" class="h-full w-full object-contain" />
            </div>
            <div v-else class="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
              <span class="text-[10px] font-black text-white">{{ item.title?.charAt(0) || '?' }}</span>
            </div>
            <h3 class="text-xs font-black text-slate-800 truncate group-hover:text-blue-600 transition">
              {{ item.title }}
            </h3>
          </div>
          <!-- 属性徽标 -->
          <div class="flex gap-1 shrink-0">
            <span v-if="item.is_featured === 1" class="badge-feature">精选</span>
            <span v-if="item.is_hot === 1" class="badge-hot">热门</span>
          </div>
        </div>

        <!-- 网址与描述 -->
        <div class="mt-2.5">
          <p class="text-[10px] text-slate-400 font-semibold truncate flex items-center gap-1">
            <ExternalLink class="h-2.5 w-2.5 shrink-0" />
            {{ item.url }}
          </p>
          <p class="text-[11px] text-slate-500 leading-normal mt-2 line-clamp-2 h-8.5">
            {{ item.description || '暂无详细描述文案。' }}
          </p>
        </div>

        <!-- 卡片页脚 -->
        <div class="mt-3.5 pt-3 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-400">
          <span class="font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
            {{ item.category }}
          </span>
          <span class="font-medium">
            点击量: <strong class="text-slate-700">{{ item.clicks }}</strong>
          </span>
        </div>

        <!-- 操作悬浮 -->
        <div
          v-if="!isBatchMode"
          class="absolute right-3.5 top-3.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          @click.stop
        >
          <button
            class="card-action-btn bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700"
            title="编辑导航"
            @click="emit('openEditModal', item, $event)"
          >
            <Edit3 class="h-3 w-3" />
          </button>
          <button
            class="card-action-btn bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 hover:border-red-200"
            title="删除导航"
            @click="emit('delete', item.id!, item.title, $event)"
          >
            <Trash2 class="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-card {
  @apply relative rounded-2xl p-4 hover:bg-white cursor-pointer overflow-hidden;
  border: 1px solid rgba(226, 232, 240, 0.7);
  background-color: rgba(248, 250, 252, 0.2);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.nav-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 16px 24px -4px rgba(226, 232, 240, 0.6), 0 8px 12px -6px rgba(226, 232, 240, 0.6);
  transform: translateY(-4px);
}
.badge-feature {
  @apply text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md leading-none select-none;
  border: 1px solid rgba(191, 219, 254, 0.5);
}
.badge-hot {
  @apply text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md leading-none select-none;
  border: 1px solid rgba(253, 230, 138, 0.5);
}
.card-action-btn {
  @apply flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-sm transition;
  border: 1px solid rgba(226, 232, 240, 0.6);
}
</style>
