<script setup lang="ts">
import {
  Compass,
  Plus,
  Search,
  Star,
  Flame,
  X,
  SlidersHorizontal,
  CheckSquare,
  Trash2,
} from "lucide-vue-next";
import { useNavigationStore } from "../../../stores/navigation";
import { useConfirm } from "../../../composables/useConfirm";
import { useToast } from "../../../composables/useToast";

const navigationStore = useNavigationStore();
const { confirm } = useConfirm();
const { triggerToast } = useToast();

defineProps<{
  isBatchMode: boolean;
  selectedCount: number;
  totalCount: number;
}>();

const emit = defineEmits<{
  (e: "enterBatchMode"): void;
  (e: "exitBatchMode"): void;
  (e: "toggleSelectAll"): void;
  (e: "batchDelete"): void;
  (e: "openAddModal"): void;
}>();

function changeCategory(cat: string) {
  navigationStore.category = cat;
  navigationStore.page = 1;
}

function toggleFeatured() {
  navigationStore.isFeatured = navigationStore.isFeatured === 1 ? undefined : 1;
  navigationStore.page = 1;
}

function toggleHot() {
  navigationStore.isHot = navigationStore.isHot === 1 ? undefined : 1;
  navigationStore.page = 1;
}

function handleClearSearch() {
  navigationStore.keyword = "";
}

function handleSearch() {
  navigationStore.page = 1;
  navigationStore.fetchList();
}

// 删除自定义分类（二次确认）
async function handleDeleteCategory(cat: string) {
  const ok = await confirm({
    title: "删除分类",
    message: `确定要删除分类 "${cat}" 吗？\n删除后该分类下的导航项将自动归入"常用工具"。`,
    confirmText: "确定删除",
    danger: true,
  });
  if (!ok) return;
  try {
    await navigationStore.deleteCategory(cat);
    triggerToast(`分类 "${cat}" 已成功删除！`);
  } catch {
    triggerToast("删除分类失败");
  }
}
</script>

<template>
  <!-- 1. 顶部控制栏 -->
  <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5 mb-1 gap-3 shrink-0">
    <div class="flex items-center gap-2.5">
      <div class="h-9 w-9 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
        <Compass class="h-5 w-5" />
      </div>
      <div>
        <h2 class="text-sm font-black text-slate-800 tracking-wide">网址导航菜单</h2>
      </div>
    </div>

    <!-- 操作区域 -->
    <div class="flex items-center gap-2">
      <template v-if="!isBatchMode">
        <button
          class="workbench-btn border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 h-8 text-[11px] font-bold px-3.5"
          @click="emit('enterBatchMode')"
        >
          <SlidersHorizontal class="h-3 w-3 mr-1" />
          管理
        </button>
        <button
          class="workbench-btn bg-primary text-primary-content h-8 text-[11px] font-bold px-4 shadow-sm shadow-primary/10"
          @click="emit('openAddModal')"
        >
          <Plus class="h-3.5 w-3.5 mr-1" />
          新增
        </button>
      </template>
      <template v-else>
        <button
          class="workbench-btn border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 h-8 text-[11px] font-bold px-3.5"
          @click="emit('toggleSelectAll')"
        >
          <CheckSquare class="h-3 w-3 mr-1" />
          {{ selectedCount === totalCount ? '取消' : '全选' }}
        </button>
        <button
          class="workbench-btn bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none text-white h-8 text-[11px] font-bold px-4 shadow-sm"
          :disabled="selectedCount === 0"
          @click="emit('batchDelete')"
        >
          <Trash2 class="h-3 w-3 mr-1" />
          删除 ({{ selectedCount }})
        </button>
        <button
          class="workbench-btn border border-slate-200 bg-slate-100 hover:bg-slate-150 text-slate-500 h-8 text-[11px] font-bold px-3.5"
          @click="emit('exitBatchMode')"
        >
          退出
        </button>
      </template>
    </div>
  </div>

  <!-- 2. 分类与筛选工具栏 -->
  <div class="flex flex-col gap-3.5 mt-4 pb-1 shrink-0">
    <!-- 分类 Tabs -->
    <div class="overflow-x-auto no-scrollbar flex shrink-0">
      <div class="flex gap-2">
        <button
          class="cat-tab-btn"
          :class="!navigationStore.category ? 'bg-blue-600 text-white font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'"
          @click="changeCategory('')"
        >
          全部
        </button>
        <button
          v-for="cat in navigationStore.categories"
          :key="cat"
          class="cat-tab-btn flex items-center gap-1"
          :class="navigationStore.category === cat ? 'bg-blue-600 text-white font-bold font-black' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'"
          @click="changeCategory(cat)"
        >
          <span>{{ cat }}</span>
          <X
            v-if="!['全部', '常用工具', '开发社区', '技术文档', '设计资源', '日常休闲'].includes(cat)"
            class="h-3.5 w-3.5 hover:text-red-500 transition-colors cursor-pointer rounded-full hover:bg-black/10 p-0.5 shrink-0"
            @click.stop="handleDeleteCategory(cat)"
          />
        </button>
      </div>
    </div>

    <!-- 条件筛选栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
      <div class="flex items-center gap-2">
        <button
          class="filter-badge-btn"
          :class="navigationStore.isFeatured === 1 ? 'bg-blue-50 text-blue-600 border border-blue-200/60 font-bold' : 'bg-slate-50 text-slate-500 border border-slate-100/50 hover:bg-slate-100'"
          @click="toggleFeatured"
        >
          <Star class="h-3.5 w-3.5" :class="{ 'fill-blue-600': navigationStore.isFeatured === 1 }" />
          精选
        </button>
        <button
          class="filter-badge-btn"
          :class="navigationStore.isHot === 1 ? 'bg-amber-50 text-amber-600 border border-amber-200/60 font-bold' : 'bg-slate-50 text-slate-500 border border-slate-100/50 hover:bg-slate-100'"
          @click="toggleHot"
        >
          <Flame class="h-3.5 w-3.5" :class="{ 'fill-amber-600': navigationStore.isHot === 1 }" />
          热门
        </button>
      </div>

      <!-- 搜索框 -->
      <div class="relative w-full md:w-72">
        <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          <Search class="h-3.5 w-3.5" />
        </div>
        <input
          v-model="navigationStore.keyword"
          type="text"
          placeholder="快速检索..."
          class="workbench-input h-9 w-full pr-8 text-xs"
          style="padding-left: 32px !important;"
          @keyup.enter="handleSearch"
        />
        <button
          v-if="navigationStore.keyword"
          class="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
          @click="handleClearSearch"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cat-tab-btn {
  @apply flex-shrink-0 px-4 py-1.5 text-[11px] font-extrabold rounded-full transition-all duration-200 cursor-pointer border border-transparent;
}
.filter-badge-btn {
  @apply px-3 py-1.5 rounded-full text-[10px] font-bold transition flex items-center gap-1 cursor-pointer;
}
</style>
