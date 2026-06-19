<script setup lang="ts">
import { computed, ref, onBeforeUnmount, onMounted, watch } from "vue";
import {
  NavigationBackupValidationError,
  useNavigationStore,
} from "../../stores/navigation";
import { useToast } from "../../composables/useToast";
import { useConfirm } from "../../composables/useConfirm";
import { useI18n } from "../../composables/useI18n";
import {
  clearTimeoutHandle,
  clearSelection,
  compactArray,
  formatTemplate,
  getErrorMessage,
  getTotalPages,
  isEmptyArray,
  resetTimeoutHandle,
  toggleAllSelectionKeys,
  toggleSelectionKey,
  uniqueArray,
  type TimeoutHandle,
} from "../../utils";

import NavigationToolbar from "./components/NavigationToolbar.vue";
import NavigationCardGrid from "./components/NavigationCardGrid.vue";
import NavigationPagination from "./components/NavigationPagination.vue";
import NavigationFormModal from "./components/NavigationFormModal.vue";
import NavigationBatchPasteModal from "./components/NavigationBatchPasteModal.vue";
import NavigationReviewPanel from "./components/NavigationReviewPanel.vue";

const navigationStore = useNavigationStore();
const { triggerToast } = useToast();
const { confirm } = useConfirm();
const { t } = useI18n();

// 页面模式控制
const isBatchMode = ref(false);
const isSortMode = ref(false);
const selectedIds = ref<number[]>([]);
const reviewItems = ref<ReturnType<typeof useNavigationStore>["items"]>([]);

// 弹窗表单状态
const showFormModal = ref(false);
const showBatchPasteModal = ref(false);
const isEdit = ref(false);
const currentId = ref<number | undefined>(undefined);
const form = ref({
  title: "",
  url: "",
  description: "",
  category: "Utility",
  is_featured: 0,
  is_hot: 0,
  logo_path: "",
  bg_path: "",
  tags: [] as string[],
});

const allTags = computed(() => {
  return uniqueArray([...reviewItems.value, ...navigationStore.items].flatMap((item) => item.tags || [])).slice(0, 16);
});

async function refreshReviewItems() {
  reviewItems.value = await navigationStore.exportData();
}

async function refreshNavigationData() {
  await navigationStore.fetchList();
  await refreshReviewItems();
}

// 进入排序模式
async function enterSortMode() {
  if (isBatchMode.value) {
    exitBatchMode();
  }
  isSortMode.value = true;
  navigationStore.page = 1;
  navigationStore.pageSize = 1000; // 临时展示全量卡片以支持拖放
  await navigationStore.fetchList();
}

// 保存排序
async function handleSaveSort() {
  const orders = navigationStore.items.map((item, index) => ({
    id: item.id!,
    sort_order: index,
  }));
  try {
    await navigationStore.saveSort(orders);
    triggerToast(t('navigation.sortSuccess'));
  } catch {
    triggerToast(t('navigation.sortFailed'));
  } finally {
    isSortMode.value = false;
    navigationStore.pageSize = 12;
    navigationStore.page = 1;
    await refreshNavigationData();
  }
}

// 取消排序
async function handleCancelSort() {
  isSortMode.value = false;
  navigationStore.pageSize = 12;
  navigationStore.page = 1;
  await refreshNavigationData();
}

// 导出导航备份 JSON 文件
async function handleExportData() {
  try {
    const result = await navigationStore.exportBackup(t('navigation.backupFileLabel'));
    if (result === "empty") {
      triggerToast(t('navigation.noDataBackup'), "warning");
      return;
    }
    if (result === "cancelled") {
      return;
    }

    triggerToast(
      result === "browser" ? t('navigation.browserBackupSuccess') : t('navigation.backupSuccess'),
      "success"
    );
  } catch (err) {
    triggerToast(getErrorMessage(err, t('navigation.backupFailed')), "error");
  }
}

function getImportErrorMessage(err: NavigationBackupValidationError) {
  if (err.code === "empty") return t('navigation.importEmpty');
  if (err.code === "invalid_json") return t('navigation.importInvalidJson');
  if (err.code === "not_array") return t('navigation.importNotArray');
  return t('navigation.importMissingFields');
}

// 导入导航备份 JSON 文件并查重
async function handleImportData() {
  try {
    const parsedData = await navigationStore.readBackup(
      t('navigation.backupFileLabel'),
      t('navigation.restoreFailed')
    );
    if (!parsedData) return;
    const preview = await navigationStore.previewImport(parsedData);

    const ok = await confirm({
      title: t('navigation.restoreConfirmTitle'),
      message: formatTemplate(t('navigation.restoreConfirmMsg'), {
        count: parsedData.length,
        valid: preview.validCount,
        skipped: preview.duplicateCount,
        invalid: preview.invalidCount,
      }),
      confirmText: t('navigation.restoreConfirmBtn'),
    });
    if (!ok) return;

    const importedCount = await navigationStore.importData(parsedData);
    await refreshReviewItems();
    triggerToast(
      formatTemplate(t('navigation.restoreSuccess'), {
        imported: importedCount,
        skipped: parsedData.length - importedCount,
      }),
      "success"
    );
  } catch (err) {
    if (err instanceof NavigationBackupValidationError) {
      triggerToast(getImportErrorMessage(err), "error");
      return;
    }
    triggerToast(getErrorMessage(err, t('navigation.restoreFailed')), "error");
  }
}

onMounted(async () => {
  await refreshNavigationData();
});

// 监听查询参数变更
watch(
  () => [
    navigationStore.page,
    navigationStore.category,
    navigationStore.isFeatured,
    navigationStore.isHot,
    navigationStore.view,
    navigationStore.tag,
  ],
  () => {
    if (isSortMode.value) return; // 排序模式下屏蔽副作用刷新
    refreshNavigationData();
  }
);

// 关键词防抖搜索
let searchTimeout: TimeoutHandle | null = null;
watch(
  () => navigationStore.keyword,
  () => {
    searchTimeout = resetTimeoutHandle(searchTimeout, () => {
      navigationStore.page = 1;
      refreshNavigationData();
      searchTimeout = null;
    }, 250);
  }
);

onBeforeUnmount(() => {
  clearTimeoutHandle(searchTimeout);
  searchTimeout = null;
});

// 勾选操作
function toggleSelection(id: number) {
  selectedIds.value = toggleSelectionKey(selectedIds.value, id);
}

// 全选
function toggleSelectAll() {
  const currentIds = compactArray(navigationStore.items.map((item) => item.id));
  selectedIds.value = toggleAllSelectionKeys(currentIds, selectedIds.value);
}

// 批量模式
function enterBatchMode() {
  isBatchMode.value = true;
  selectedIds.value = clearSelection<number>();
}

function exitBatchMode() {
  isBatchMode.value = false;
  selectedIds.value = clearSelection<number>();
}

// 批量删除（二次确认）
async function handleBatchDelete() {
  if (isEmptyArray(selectedIds.value)) {
    triggerToast(t('navigation.selectToDelete'));
    return;
  }
  const ok = await confirm({
    title: t('navigation.batchDeleteConfirmTitle'),
    message: formatTemplate(t('navigation.batchDeleteConfirmMsg'), { count: selectedIds.value.length }),
    confirmText: t('navigation.batchDeleteConfirmBtn'),
    danger: true,
  });
  if (!ok) return;
  try {
    await navigationStore.batchDelete(selectedIds.value);
    triggerToast(t('navigation.batchDeleteSuccess'));
    exitBatchMode();
    await refreshReviewItems();
  } catch {
    triggerToast(t('navigation.batchDeleteFailed'));
  }
}

function handleChangeView(view: typeof navigationStore.view) {
  navigationStore.view = view;
  navigationStore.page = 1;
}

function handleChangeTag(tag: string) {
  navigationStore.tag = tag;
  navigationStore.page = 1;
}

async function handleBatchPasteSubmit(items: any[]) {
  try {
    const preview = await navigationStore.previewImport(items);
    if (preview.validCount === 0) {
      triggerToast(t('navigation.batchPasteNoValid'), "warning");
      return;
    }
    const imported = await navigationStore.addMany(items);
    showBatchPasteModal.value = false;
    triggerToast(formatTemplate(t('navigation.batchPasteSuccess'), { count: imported }), "success");
    await refreshReviewItems();
  } catch (err) {
    triggerToast(getErrorMessage(err, t('navigation.saveFailed')), "error");
  }
}

async function handleFillDescriptions() {
  const targets = reviewItems.value.filter((item) => item.id && !item.description?.trim());
  if (targets.length === 0) {
    triggerToast(formatTemplate(t('navigation.reviewFilledDescriptions'), { count: 0 }), "success");
    return;
  }
  const updates = targets.map((item) => {
    const suggestion = navigationStore.suggestFromUrl(item.url);
    return {
      ...item,
      description: suggestion.description,
      tags: item.tags || suggestion.tags,
    };
  });
  await navigationStore.updateMany(updates);
  triggerToast(formatTemplate(t('navigation.reviewFilledDescriptions'), { count: targets.length }), "success");
  await refreshNavigationData();
}

async function handleMarkCommon() {
  const targets = reviewItems.value.filter((item) => item.id && item.clicks >= 20 && item.is_hot !== 1);
  if (targets.length === 0) {
    triggerToast(formatTemplate(t('navigation.reviewMarkedCommon'), { count: 0 }), "success");
    return;
  }
  const updates = targets.map((item) => ({
    ...item,
    is_hot: 1,
  }));
  await navigationStore.updateMany(updates);
  triggerToast(formatTemplate(t('navigation.reviewMarkedCommon'), { count: targets.length }), "success");
  await refreshNavigationData();
}

// 快速访问
async function handleVisit(item: any) {
  if (isBatchMode.value) {
    toggleSelection(item.id);
    return;
  }
  await navigationStore.clickItem(item);
  triggerToast(formatTemplate(t('navigation.visiting'), { title: item.title }));
  await refreshReviewItems();
}

// 打开新增弹窗
function openAddModal() {
  isEdit.value = false;
  currentId.value = undefined;
  form.value = {
    title: "",
    url: "",
    description: "",
    category: navigationStore.category || "Utility",
    is_featured: 0,
    is_hot: 0,
    logo_path: "",
    bg_path: "",
    tags: [],
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
    tags: item.tags || [],
  };
  showFormModal.value = true;
}

// 单条删除（二次确认）
async function handleDelete(id: number, title: string, event: Event) {
  event.stopPropagation();
  const ok = await confirm({
    title: t('navigation.deleteConfirmTitle'),
    message: formatTemplate(t('navigation.deleteConfirmMsg'), { title }),
    confirmText: t('navigation.batchDeleteConfirmBtn'),
    danger: true,
  });
  if (!ok) return;
  try {
    await navigationStore.delete(id);
    triggerToast(t('navigation.deleteSuccess'));
    await refreshReviewItems();
  } catch {
    triggerToast(t('navigation.deleteFailed'));
  }
}

function changePage(newPage: number) {
  if (newPage < 1 || newPage > getTotalPages(navigationStore.total, navigationStore.pageSize)) return;
  navigationStore.page = newPage;
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative">
    <!-- 顶部控制栏 + 分类筛选 -->
    <NavigationToolbar
      :is-batch-mode="isBatchMode"
      :is-sort-mode="isSortMode"
      :selected-count="selectedIds.length"
      :total-count="navigationStore.items.length"
      :active-view="navigationStore.view"
      :active-tag="navigationStore.tag"
      :tags="allTags"
      @enter-batch-mode="enterBatchMode"
      @exit-batch-mode="exitBatchMode"
      @toggle-select-all="toggleSelectAll"
      @batch-delete="handleBatchDelete"
      @open-add-modal="openAddModal"
      @enter-sort-mode="enterSortMode"
      @save-sort="handleSaveSort"
      @cancel-sort="handleCancelSort"
      @export-data="handleExportData"
      @import-data="handleImportData"
      @open-batch-paste="showBatchPasteModal = true"
      @change-view="handleChangeView"
      @change-tag="handleChangeTag"
    />

    <NavigationReviewPanel
      v-if="!isSortMode && reviewItems.length > 0"
      class="mt-4"
      :items="reviewItems"
      @mark-common="handleMarkCommon"
      @fill-descriptions="handleFillDescriptions"
      @refresh="refreshReviewItems"
    />

    <!-- 卡片网格 -->
    <NavigationCardGrid
      :items="navigationStore.items"
      :is-batch-mode="isBatchMode"
      :is-sort-mode="isSortMode"
      :selected-ids="selectedIds"
      :resolve-image-url="navigationStore.getImgUrl"
      @visit="handleVisit"
      @toggle-selection="toggleSelection"
      @open-edit-modal="openEditModal"
      @delete="handleDelete"
      @open-add-modal="openAddModal"
      @open-batch-paste="showBatchPasteModal = true"
      @import-data="handleImportData"
    />

    <!-- 分页器 -->
    <NavigationPagination
      v-if="!isSortMode"
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
      @saved="refreshNavigationData"
    />

    <NavigationBatchPasteModal
      v-model:visible="showBatchPasteModal"
      @submit="handleBatchPasteSubmit"
    />
  </div>
</template>
