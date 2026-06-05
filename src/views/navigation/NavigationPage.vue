<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useNavigationStore } from "../../stores/navigation";
import { useToast } from "../../composables/useToast";
import { useConfirm } from "../../composables/useConfirm";

import NavigationToolbar from "./components/NavigationToolbar.vue";
import NavigationCardGrid from "./components/NavigationCardGrid.vue";
import NavigationPagination from "./components/NavigationPagination.vue";
import NavigationFormModal from "./components/NavigationFormModal.vue";

const navigationStore = useNavigationStore();
const { triggerToast } = useToast();
const { confirm } = useConfirm();

// 页面模式控制
const isBatchMode = ref(false);
const selectedIds = ref<number[]>([]);

// 弹窗表单状态
const showFormModal = ref(false);
const isEdit = ref(false);
const currentId = ref<number | undefined>(undefined);
const form = ref({
  title: "",
  url: "",
  description: "",
  category: "常用工具",
  is_featured: 0,
  is_hot: 0,
  logo_path: "",
  bg_path: "",
});

onMounted(async () => {
  await navigationStore.fetchList();
});

// 监听查询参数变更
watch(
  () => [
    navigationStore.page,
    navigationStore.category,
    navigationStore.isFeatured,
    navigationStore.isHot,
  ],
  () => {
    navigationStore.fetchList();
  }
);

// 关键词防抖搜索
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
watch(
  () => navigationStore.keyword,
  () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      navigationStore.page = 1;
      navigationStore.fetchList();
    }, 250);
  }
);

// 勾选操作
function toggleSelection(id: number) {
  const index = selectedIds.value.indexOf(id);
  if (index === -1) {
    selectedIds.value.push(id);
  } else {
    selectedIds.value.splice(index, 1);
  }
}

function toggleSelectAll() {
  if (selectedIds.value.length === navigationStore.items.length) {
    selectedIds.value = [];
  } else {
    selectedIds.value = navigationStore.items.map((item) => item.id!).filter(Boolean);
  }
}

// 批量模式
function enterBatchMode() {
  isBatchMode.value = true;
  selectedIds.value = [];
}

function exitBatchMode() {
  isBatchMode.value = false;
  selectedIds.value = [];
}

// 批量删除（二次确认）
async function handleBatchDelete() {
  if (selectedIds.value.length === 0) {
    triggerToast("请先勾选需要删除的导航项");
    return;
  }
  const ok = await confirm({
    title: "批量删除确认",
    message: `确定要删除选中的 ${selectedIds.value.length} 个导航项吗？\n此操作无法撤销。`,
    confirmText: "确定删除",
    danger: true,
  });
  if (!ok) return;
  try {
    await navigationStore.batchDelete(selectedIds.value);
    triggerToast("批量删除成功！");
    exitBatchMode();
  } catch {
    triggerToast("批量删除失败");
  }
}

// 快速访问
async function handleVisit(item: any) {
  if (isBatchMode.value) {
    toggleSelection(item.id);
    return;
  }
  await navigationStore.clickItem(item);
  triggerToast(`正在访问: ${item.title}`);
}

// 打开新增弹窗
function openAddModal() {
  isEdit.value = false;
  currentId.value = undefined;
  form.value = {
    title: "",
    url: "",
    description: "",
    category: navigationStore.category || "常用工具",
    is_featured: 0,
    is_hot: 0,
    logo_path: "",
    bg_path: "",
  };
  showFormModal.value = true;
}

// 打开编辑弹窗
function openEditModal(item: any, event: Event) {
  event.stopPropagation();
  isEdit.value = true;
  currentId.value = item.id;
  form.value = {
    title: item.title,
    url: item.url,
    description: item.description,
    category: item.category,
    is_featured: item.is_featured,
    is_hot: item.is_hot,
    logo_path: item.logo_path || "",
    bg_path: item.bg_path || "",
  };
  showFormModal.value = true;
}

// 单条删除（二次确认）
async function handleDelete(id: number, title: string, event: Event) {
  event.stopPropagation();
  const ok = await confirm({
    title: "删除导航",
    message: `确定要删除导航 "${title}" 吗？\n此操作无法撤销。`,
    confirmText: "确定删除",
    danger: true,
  });
  if (!ok) return;
  try {
    await navigationStore.delete(id);
    triggerToast("删除成功！");
  } catch {
    triggerToast("删除失败");
  }
}

function changePage(newPage: number) {
  if (newPage < 1 || newPage > Math.ceil(navigationStore.total / navigationStore.pageSize)) return;
  navigationStore.page = newPage;
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-base-100 rounded-3xl p-5 border border-slate-200/60 shadow-sm relative">
    <!-- 顶部控制栏 + 分类筛选 -->
    <NavigationToolbar
      :is-batch-mode="isBatchMode"
      :selected-count="selectedIds.length"
      :total-count="navigationStore.items.length"
      @enter-batch-mode="enterBatchMode"
      @exit-batch-mode="exitBatchMode"
      @toggle-select-all="toggleSelectAll"
      @batch-delete="handleBatchDelete"
      @open-add-modal="openAddModal"
    />

    <!-- 卡片网格 -->
    <NavigationCardGrid
      :items="navigationStore.items"
      :is-batch-mode="isBatchMode"
      :selected-ids="selectedIds"
      @visit="handleVisit"
      @toggle-selection="toggleSelection"
      @open-edit-modal="openEditModal"
      @delete="handleDelete"
    />

    <!-- 分页器 -->
    <NavigationPagination
      :total="navigationStore.total"
      :page="navigationStore.page"
      :page-size="navigationStore.pageSize"
      @change-page="changePage"
    />

    <!-- 新增/编辑弹窗 -->
    <NavigationFormModal
      :visible="showFormModal"
      :is-edit="isEdit"
      :current-id="currentId"
      :form="form"
      @update:visible="showFormModal = $event"
      @update:form="form = $event"
      @saved="() => {}"
    />
  </div>
</template>
