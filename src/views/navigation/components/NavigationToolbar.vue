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
  ArrowUpDown,
  Check,
  Download,
  Upload,
} from "lucide-vue-next";
import { useNavigationStore } from "../../../stores/navigation";
import { useConfirm } from "../../../composables/useConfirm";
import { useToast } from "../../../composables/useToast";
import { useI18n } from "../../../composables/useI18n";
import { formatTemplate, hasItem } from "../../../utils";

const navigationStore = useNavigationStore();
const { confirm } = useConfirm();
const { triggerToast } = useToast();
const { t } = useI18n();

defineProps<{
  isBatchMode: boolean;
  isSortMode: boolean;
  selectedCount: number;
  totalCount: number;
}>();

const emit = defineEmits<{
  (e: "enterBatchMode"): void;
  (e: "exitBatchMode"): void;
  (e: "toggleSelectAll"): void;
  (e: "batchDelete"): void;
  (e: "openAddModal"): void;
  (e: "enterSortMode"): void;
  (e: "saveSort"): void;
  (e: "cancelSort"): void;
  (e: "exportData"): void;
  (e: "importData"): void;
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

function getCategoryName(cat: string): string {
  const key = `navigation.categories.${cat}`;
  const val = t(key);
  return val === key ? cat : val;
}



function handleSearch() {
  navigationStore.page = 1;
  navigationStore.fetchList();
}

// 删除自定义分类
async function handleDeleteCategory(cat: string) {
  const ok = await confirm({
    title: t('navigation.deleteCategoryConfirmTitle'),
    message: formatTemplate(t('navigation.deleteCategoryConfirmMsg'), { cat }),
    confirmText: t('navigation.batchDeleteConfirmBtn'),
    danger: true,
  });
  if (!ok) return;
  try {
    await navigationStore.deleteCategory(cat);
    triggerToast(formatTemplate(t('navigation.deleteCategorySuccess'), { cat }), "success");
  } catch {
    triggerToast(t('navigation.deleteCategoryFailed'), "error");
  }
}
</script>

<template>
  <!-- 1. 顶部控制栏 -->
  <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-1 gap-3 shrink-0 select-none">
    <div class="flex items-center gap-2.5">
      <div class="h-9 w-9 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-inner">
        <Compass class="h-5 w-5" />
      </div>
      <div>
        <h2 class="text-sm font-black text-slate-850 dark:text-slate-100 tracking-wide">{{ t('navigation.title') }}</h2>
      </div>
    </div>

    <!-- 操作区域 -->
    <div class="flex flex-wrap items-center gap-2 select-none">
      <!-- 正常模式 -->
      <template v-if="!isBatchMode && !isSortMode">
        <div class="toolbar-action-group">
          <BaseButton
            type="neutral"
            outline
            size="sm"
            class="toolbar-icon-btn"
            :title="t('navigation.export') || 'Export Backup (JSON)'"
            @click="emit('exportData')"
          >
            <template #icon><Download class="h-3.5 w-3.5" /></template>
          </BaseButton>
          <BaseButton
            type="neutral"
            outline
            size="sm"
            class="toolbar-icon-btn"
            :title="t('navigation.import') || 'Import Backup (JSON)'"
            @click="emit('importData')"
          >
            <template #icon><Upload class="h-3.5 w-3.5" /></template>
          </BaseButton>
          <BaseButton
            type="neutral"
            outline
            size="sm"
            class="toolbar-ghost-btn"
            @click="emit('enterBatchMode')"
          >
            <template #icon><SlidersHorizontal class="h-3 w-3" /></template>
            {{ t('navigation.manage') }}
          </BaseButton>
          <BaseButton
            type="neutral"
            outline
            size="sm"
            class="toolbar-ghost-btn"
            @click="emit('enterSortMode')"
          >
            <template #icon><ArrowUpDown class="h-3 w-3" /></template>
            {{ t('navigation.sort') }}
          </BaseButton>
          <BaseButton
            type="warning"
            size="sm"
            class="toolbar-add-btn"
            @click="emit('openAddModal')"
          >
            <template #icon><Plus class="h-3.5 w-3.5 mr-1" /></template>
            {{ t('navigation.add') }}
          </BaseButton>
        </div>
      </template>
      <!-- 排序模式 -->
      <template v-else-if="isSortMode">
        <BaseButton
          type="primary"
          size="sm"
          @click="emit('saveSort')"
        >
          <template #icon><Check class="h-3.5 w-3.5 mr-1" /></template>
          {{ t('navigation.saveSort') }}
        </BaseButton>
        <BaseButton
          type="neutral"
          outline
          size="sm"
          @click="emit('cancelSort')"
        >
          {{ t('common.cancel') }}
        </BaseButton>
      </template>
      <!-- 批量选择模式 -->
      <template v-else>
        <BaseButton
          type="neutral"
          outline
          size="sm"
          @click="emit('toggleSelectAll')"
        >
          <template #icon><CheckSquare class="h-3 w-3 mr-1" /></template>
          {{ selectedCount === totalCount ? t('common.cancel') : t('navigation.selectAll') }}
        </BaseButton>
        <BaseButton
          type="danger"
          size="sm"
          :disabled="selectedCount === 0"
          @click="emit('batchDelete')"
        >
          <template #icon><Trash2 class="h-3 w-3 mr-1" /></template>
          {{ formatTemplate(t('navigation.batchDelete'), { count: selectedCount }) }}
        </BaseButton>
        <BaseButton
          type="neutral"
          outline
          size="sm"
          @click="emit('exitBatchMode')"
        >
          {{ t('navigation.exit') }}
        </BaseButton>
      </template>
    </div>
  </div>

  <!-- 2. 分类与筛选工具栏 -->
  <div class="flex flex-col gap-3.5 mt-4 pb-1 shrink-0 transition-opacity duration-200" :class="{ 'opacity-40 pointer-events-none': isSortMode }">
    <!-- 分类 Tabs -->
    <div class="overflow-x-auto no-scrollbar flex shrink-0 select-none">
      <div class="flex gap-2">
        <div
          role="button"
          class="cat-tab-btn cursor-pointer"
          :class="!navigationStore.category ? 'bg-primary text-white font-bold shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'"
          @click="changeCategory('')"
        >
          {{ t('navigation.all') }}
        </div>
        <div
          v-for="cat in navigationStore.categories"
          :key="cat"
          role="button"
          class="cat-tab-btn flex items-center gap-1 cursor-pointer"
          :class="navigationStore.category === cat ? 'bg-primary text-white font-bold shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'"
          @click="changeCategory(cat)"
        >
          <span>{{ getCategoryName(cat) }}</span>
          <X
            v-if="!hasItem(['Utility', 'Community', 'Documentation', 'Design', 'Leisure'], cat)"
            class="h-3.5 w-3.5 hover:text-red-500 transition-colors cursor-pointer rounded-full hover:bg-black/10 p-0.5 shrink-0"
            @click.stop="handleDeleteCategory(cat)"
          />
        </div>
      </div>
    </div>

    <!-- 条件筛选栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
      <div class="flex items-center gap-2 select-none">
        <div
          role="button"
          class="filter-badge-btn cursor-pointer"
          :class="navigationStore.isFeatured === 1 ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'"
          @click="toggleFeatured"
        >
          <Star class="h-3.5 w-3.5" :class="{ 'fill-primary': navigationStore.isFeatured === 1 }" />
          {{ t('navigation.featured') }}
        </div>
        <div
          role="button"
          class="filter-badge-btn cursor-pointer"
          :class="navigationStore.isHot === 1 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'"
          @click="toggleHot"
        >
          <Flame class="h-3.5 w-3.5" :class="{ 'fill-amber-500': navigationStore.isHot === 1 }" />
          {{ t('navigation.hot') }}
        </div>
      </div>

      <!-- 搜索框 (改用 BaseInput) -->
      <div class="relative w-full md:w-72">
        <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 z-10">
          <Search class="h-3.5 w-3.5" />
        </div>
        <BaseInput
          v-model="navigationStore.keyword"
          :placeholder="t('navigation.searchPlaceholder')"
          class="nav-search-input"
          clearable
          size="sm"
          style="padding-left: 32px !important;"
          @keyup.enter="handleSearch"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cat-tab-btn {
  @apply flex-shrink-0 px-4 py-1.5 text-[11px] font-extrabold rounded-full transition-all duration-200;
}
.filter-badge-btn {
  @apply px-3 py-1.5 rounded-full text-[10px] font-bold transition flex items-center gap-1;
}
.toolbar-action-group {
  @apply flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-1.5 py-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/70;
}
:deep(.toolbar-icon-btn.el-button),
:deep(.toolbar-ghost-btn.el-button) {
  border-radius: 9999px;
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.92);
  color: #475569;
  box-shadow: none;
}
:deep(.toolbar-icon-btn.el-button:hover),
:deep(.toolbar-ghost-btn.el-button:hover) {
  border-color: rgba(59, 130, 246, 0.28);
  background: rgba(239, 246, 255, 0.95);
  color: #1d4ed8;
}
:deep(.toolbar-add-btn.el-button--warning) {
  border-radius: 9999px;
  border-color: rgba(245, 158, 11, 0.72);
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  color: #fff7ed;
  box-shadow: 0 8px 18px -8px rgba(245, 158, 11, 0.65);
}
:deep(.toolbar-add-btn.el-button--warning:hover) {
  border-color: rgba(249, 115, 22, 0.88);
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  color: #ffffff;
  box-shadow: 0 12px 24px -10px rgba(249, 115, 22, 0.6);
}
:deep(.nav-search-input .el-input__wrapper) {
  border-radius: 9999px;
  background: rgba(248, 250, 252, 0.95);
  box-shadow: 0 0 0 1px rgba(226, 232, 240, 0.95);
}
:deep(.nav-search-input .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px rgba(147, 197, 253, 0.95);
}
:deep(.nav-search-input.is-focus .el-input__wrapper),
:deep(.nav-search-input .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.85), 0 0 0 4px rgba(59, 130, 246, 0.08);
}
:global(.dark) :deep(.toolbar-icon-btn.el-button),
:global(.dark) :deep(.toolbar-ghost-btn.el-button) {
  border-color: rgba(51, 65, 85, 0.9);
  background: rgba(15, 23, 42, 0.9);
  color: #cbd5e1;
}
:global(.dark) :deep(.toolbar-icon-btn.el-button:hover),
:global(.dark) :deep(.toolbar-ghost-btn.el-button:hover) {
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(30, 41, 59, 0.95);
  color: #dbeafe;
}
:global(.dark) :deep(.nav-search-input .el-input__wrapper) {
  background: rgba(15, 23, 42, 0.95);
  box-shadow: 0 0 0 1px rgba(51, 65, 85, 0.95);
}
:global(.dark) :deep(.nav-search-input .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.35);
}
:global(.dark) :deep(.nav-search-input.is-focus .el-input__wrapper),
:global(.dark) :deep(.nav-search-input .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.8), 0 0 0 4px rgba(37, 99, 235, 0.14);
}
</style>
