<script setup lang="ts">
import {
  Edit3,
  Trash2,
  Bookmark,
  ExternalLink,
  GripVertical,
  MoreHorizontal,
  ListPlus,
  Upload,
} from "lucide-vue-next";
import { useDragSort } from "../../../composables/useDragSort";
import { ref, toRef } from "vue";
import { useI18n } from "../../../composables/useI18n";
import { formatTemplate, getInitials, hasSelectionKey } from "../../../utils";

const { t } = useI18n();

const props = defineProps<{
  items: any[];
  isBatchMode: boolean;
  isSortMode: boolean;
  selectedIds: number[];
  resolveImageUrl: (relPath: string) => string;
}>();

const emit = defineEmits<{
  (e: "visit", item: any): void;
  (e: "toggleSelection", id: number): void;
  (e: "openEditModal", item: any, event: Event): void;
  (e: "delete", id: number, title: string, event: Event): void;
  (e: "openAddModal"): void;
  (e: "openBatchPaste"): void;
  (e: "importData"): void;
}>();

const itemsRef = toRef(props, "items");
const { isDraggingIndex, handleDragStart, handleDragEnter, handleDragEnd } = useDragSort(itemsRef);
const openMenuId = ref<number | null>(null);

function getCategoryName(cat: string): string {
  if (!cat) return "";
  const key = `navigation.categories.${cat}`;
  const val = t(key);
  return val === key ? cat : val;
}

function toggleCardMenu(id: number, event: Event) {
  event.stopPropagation();
  openMenuId.value = openMenuId.value === id ? null : id;
}

function closeCardMenu() {
  openMenuId.value = null;
}
</script>

<template>
  <div class="flex-1 overflow-y-auto mt-4.5 pt-2 pr-0.5 min-h-0 relative">
    <!-- 空白占位 -->
    <div v-if="items.length === 0" class="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div class="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700">
        <Bookmark class="h-7 w-7" />
      </div>
      <div>
        <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">{{ t('navigation.noData') }}</h3>
        <p class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">{{ t('navigation.noDataDesc') }}</p>
      </div>
      <div class="flex flex-wrap justify-center gap-2 pt-2">
        <BaseButton type="primary" size="sm" @click="emit('openAddModal')">
          {{ t('navigation.add') }}
        </BaseButton>
        <BaseButton type="neutral" outline size="sm" @click="emit('openBatchPaste')">
          <template #icon><ListPlus class="h-3.5 w-3.5" /></template>
          {{ t('navigation.batchPaste') }}
        </BaseButton>
        <BaseButton type="neutral" outline size="sm" @click="emit('importData')">
          <template #icon><Upload class="h-3.5 w-3.5" /></template>
          {{ t('navigation.import') }}
        </BaseButton>
      </div>
    </div>

    <transition-group
      v-else
      tag="div"
      name="grid-fade"
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
    >
      <div
        v-for="(item, index) in items"
        :key="item.id"
        class="nav-card group"
        :class="{
          'ring-2 ring-blue-500/40 shadow-blue-500/5 bg-blue-50/20': hasSelectionKey(selectedIds, item.id!),
          'is-sorting opacity-40 scale-95 border-dashed border-blue-400/60 bg-blue-50/10 cursor-grabbing': isSortMode && isDraggingIndex === index,
          'hover:shadow-none hover:transform-none cursor-grab': isSortMode
        }"
        :draggable="isSortMode"
        @click="emit('visit', item)"
        @dragstart="handleDragStart(index, $event)"
        @dragover.prevent
        @dragenter="handleDragEnter(index)"
        @dragend="handleDragEnd"
      >
        <!-- 背景封面 -->
        <div v-if="item.bg_path" class="-mx-4 -mt-4 mb-3 h-[88px] overflow-hidden shrink-0 relative rounded-t-2xl">
          <img :src="resolveImageUrl(item.bg_path)" class="w-full h-full object-cover transition-transform duration-500" :class="{ 'group-hover:scale-110': !isSortMode }" />
          <div class="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-slate-900/80 via-white/10 dark:via-slate-900/10 to-transparent"></div>
        </div>

        <!-- 批量选择框 -->
        <div v-if="isBatchMode" class="absolute left-3.5 top-3.5 z-10" @click.stop>
          <input
            type="checkbox"
            class="checkbox cursor-pointer"
            :checked="hasSelectionKey(selectedIds, item.id!)"
            @change="emit('toggleSelection', item.id!)"
          />
        </div>

        <!-- 卡片头 -->
        <div class="flex items-center justify-between gap-2.5">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <!-- 拖拽手柄 -->
            <div
              v-if="isSortMode"
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition shrink-0 mr-1 p-0.5"
            >
              <GripVertical class="h-3.5 w-3.5" />
            </div>
            <div
              v-if="item.logo_path"
              class="h-7 w-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm"
            >
              <img :src="resolveImageUrl(item.logo_path)" class="h-full w-full object-contain" />
            </div>
            <div v-else class="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
              <span class="text-[10px] font-black text-white">{{ getInitials(item.title || "", "?", 1) }}</span>
            </div>
            <h3 class="text-xs font-black text-slate-900 dark:text-slate-100 truncate transition" :class="{ 'group-hover:text-primary': !isSortMode }">
              {{ item.title }}
            </h3>
          </div>
          <!-- 属性徽标 -->
          <div class="flex gap-1 shrink-0">
            <span v-if="item.is_featured === 1" class="badge-feature">{{ t('navigation.featured') }}</span>
            <span v-if="item.is_hot === 1" class="badge-hot">{{ t('navigation.common') }}</span>
          </div>
        </div>

        <!-- 网址与描述 -->
        <div class="mt-2.5">
          <p class="text-[10px] text-slate-500 font-semibold truncate flex items-center gap-1">
            <ExternalLink class="h-2.5 w-2.5 shrink-0" />
            {{ item.url }}
          </p>
          <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-normal mt-2 line-clamp-2 h-8.5">
            {{ item.description || t('navigation.defaultDescription') }}
          </p>
        </div>

        <!-- 卡片页脚 -->
        <div class="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-400">
          <span class="font-bold bg-slate-50 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">
            {{ getCategoryName(item.category) }}
          </span>
          <span class="font-medium">
            {{ formatTemplate(t('navigation.clicks'), { count: item.clicks || 0 }) }}
          </span>
        </div>

        <div v-if="item.tags?.length" class="mt-2 flex flex-wrap gap-1">
          <span
            v-for="tag in item.tags.slice(0, 4)"
            :key="tag"
            class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          >
            #{{ tag }}
          </span>
        </div>

        <!-- 操作菜单 -->
        <div
          v-if="!isBatchMode && !isSortMode"
          class="absolute right-3.5 top-3.5"
          @click.stop
        >
          <button
            class="card-action-btn text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            :title="t('navigation.moreActions')"
            @click="toggleCardMenu(item.id!, $event)"
          >
            <MoreHorizontal class="h-3.5 w-3.5" />
          </button>
          <div
            v-if="openMenuId === item.id"
            class="absolute right-0 top-8 z-20 w-28 rounded-xl border border-slate-200 bg-white p-1 shadow-workbench-lg dark:border-slate-800 dark:bg-slate-900"
          >
            <button class="card-menu-item" @click="closeCardMenu(); emit('openEditModal', item, $event)">
              <Edit3 class="h-3.5 w-3.5" />
              {{ t('navigation.editNav') }}
            </button>
            <button class="card-menu-item text-red-500 hover:bg-red-500/10 hover:text-red-600" @click="closeCardMenu(); emit('delete', item.id!, item.title, $event)">
              <Trash2 class="h-3.5 w-3.5" />
              {{ t('navigation.deleteNav') }}
            </button>
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.nav-card {
  @apply relative rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer overflow-hidden transition-all duration-300;
  box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.01), 0 8px 30px -4px rgba(15, 23, 42, 0.03);
}
:global(.dark) .nav-card {
  border: 1px solid rgba(255, 255, 255, 0.035) !important;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.045) !important;
}
.nav-card:hover:not(.is-sorting) {
  border-color: rgba(var(--color-primary) / 0.4);
  box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.01);
  transform: translateY(-3px);
}
:global(.dark) .nav-card:hover:not(.is-sorting) {
  border-color: rgba(99, 102, 241, 0.25) !important;
  box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 0 16px 0 rgba(99, 102, 241, 0.08) !important;
}
.badge-feature {
  @apply text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none select-none;
  color: rgb(var(--color-primary));
  background-color: rgba(var(--color-primary), 0.1);
  border: 1px solid rgba(var(--color-primary), 0.2);
}
.badge-hot {
  @apply text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none select-none;
  color: #e6a23c;
  background-color: rgba(230, 162, 60, 0.1);
  border: 1px solid rgba(230, 162, 60, 0.2);
}
.card-action-btn {
  @apply flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition;
}
.card-menu-item {
  @apply flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[10px] font-black text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800;
}

/* 列表避让平移动画 */
.grid-fade-move {
  transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}
</style>
