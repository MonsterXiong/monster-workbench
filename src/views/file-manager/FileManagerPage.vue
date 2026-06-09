<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { useFileManagerStore, type UploadedFileInfo, type BatchUploadResult } from "../../stores/file-manager";
import { useToast } from "../../composables/useToast";
import { useConfirm } from "../../composables/useConfirm";
import { useI18n } from "../../composables/useI18n";
import { formatTemplate, getErrorMessage, isEmptyArray, isNonEmptyArray, joinTextList } from "../../utils";

// 引入局部业务组件
import FileManagerToolbar from "./components/FileManagerToolbar.vue";
import FileManagerTable from "./components/FileManagerTable.vue";
import FileManagerDragMask from "./components/FileManagerDragMask.vue";

const { triggerToast } = useToast();
const { confirm } = useConfirm();
const { t } = useI18n();
const fileManagerStore = useFileManagerStore();
const {
  loading,
  keyword,
  typeFilterKey,
  filteredFiles,
  previewUrl,
  showPreview,
  isBatchMode,
  selectedPaths,
  isDragging,
} = storeToRefs(fileManagerStore);

onMounted(async () => {
  await fetchFiles();
  await fileManagerStore.setupDesktopDragDrop(showBatchUploadResult);
});

onUnmounted(() => {
  fileManagerStore.teardownDesktopDragDrop();
});

async function fetchFiles() {
  try {
    await fileManagerStore.fetchFiles();
  } catch (err) {
    triggerToast(getErrorMessage(err, t('common.error')), "error");
  }
}

function showBatchUploadResult(result: BatchUploadResult) {
  if (result.successCount > 0) {
    const failedText = result.failCount > 0
      ? formatTemplate(t('fileManager.uploadFailedSuffix'), { count: result.failCount })
      : '';
    triggerToast(
      formatTemplate(t('fileManager.uploadSuccessCount'), {
        count: result.successCount,
        failed: failedText,
      }),
      "success"
    );
    return;
  }

  if (result.failCount > 0) {
    triggerToast(t('fileManager.uploadFailed'), "error");
  }
}

// 点击手动选择上传文件
async function handleUpload() {
  try {
    const uploaded = await fileManagerStore.uploadSelectedFile();
    if (uploaded) {
      triggerToast(t('fileManager.uploadSuccess'), "success");
    }
  } catch (err) {
    triggerToast(getErrorMessage(err, t('fileManager.uploadFailed')), "error");
  }
}

// 单条删除文件（二次确认及强力解绑）
async function handleDelete(file: UploadedFileInfo) {
  try {
    const check = await fileManagerStore.buildDeletePlan(file);
    let confirmMsg = formatTemplate(t('fileManager.deleteConfirmMsg'), { name: file.file_name });
    if (check.referenced) {
      confirmMsg = formatTemplate(t('fileManager.deleteConfirmWarning'), { usage: joinTextList(check.usage) });
    }

    const ok = await confirm({
      title: check.referenced ? t('fileManager.deleteConfirmTitleForce') : t('fileManager.deleteConfirmTitle'),
      message: confirmMsg,
      confirmText: check.referenced ? t('fileManager.deleteConfirmBtnForce') : t('fileManager.deleteConfirmBtn'),
      danger: true,
    });
    if (!ok) return;

    await fileManagerStore.deleteFile(file, check);
    triggerToast(t('fileManager.deleteSuccess'), "success");
  } catch (err) {
    triggerToast(getErrorMessage(err, t('fileManager.deleteFailed')), "error");
  }
}

// 批量删除已勾选文件（高度自愈逻辑）
async function handleBatchDelete() {
  if (isEmptyArray(selectedPaths.value)) {
    triggerToast(t('fileManager.selectToDelete'), "warning");
    return;
  }

  try {
    const deletePlan = await fileManagerStore.buildBatchDeletePlan();
    let confirmMsg = formatTemplate(t('fileManager.batchDeleteConfirmMsg'), { count: selectedPaths.value.length });
    if (isNonEmptyArray(deletePlan.referencedUsage)) {
      confirmMsg = formatTemplate(t('fileManager.batchDeleteConfirmWarning'), { usage: joinTextList(deletePlan.referencedUsage) });
    }

    const ok = await confirm({
      title: isNonEmptyArray(deletePlan.referencedUsage) ? t('fileManager.batchDeleteConfirmTitleForce') : t('fileManager.batchDeleteConfirmTitle'),
      message: confirmMsg,
      confirmText: isNonEmptyArray(deletePlan.referencedUsage) ? t('fileManager.deleteConfirmBtnForce') : t('fileManager.deleteConfirmBtn'),
      danger: true,
    });
    if (!ok) return;

    const deletedCount = selectedPaths.value.length;
    await fileManagerStore.batchDeleteSelected(deletePlan);
    triggerToast(formatTemplate(t('fileManager.batchDeleteSuccess'), { count: deletedCount }), "success");
  } catch (err) {
    triggerToast(getErrorMessage(err, t('fileManager.batchDeleteFailed')), "error");
  }
}

// 预览图片
function handlePreview(file: UploadedFileInfo) {
  fileManagerStore.openPreview(file);
}

// 浏览器 Web 端降级拖放事件处理
function handleWebDragOver(e: DragEvent) {
  fileManagerStore.handleWebDragOver(e);
}

function handleWebDragEnter(e: DragEvent) {
  fileManagerStore.handleWebDragEnter(e);
}

function handleWebDragLeave(e: DragEvent) {
  fileManagerStore.handleWebDragLeave(e);
}

async function handleWebDrop(e: DragEvent) {
  const result = await fileManagerStore.handleWebDrop(e);
  if (result) {
    showBatchUploadResult(result);
  }
}
</script>

<template>
  <div
    class="flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative"
    @dragover.prevent="handleWebDragOver"
    @dragenter.prevent="handleWebDragEnter"
    @dragleave.prevent="handleWebDragLeave"
    @drop.prevent="handleWebDrop"
  >
    <!-- 1. 顶部控制栏 -->
    <FileManagerToolbar
      :is-batch-mode="isBatchMode"
      :loading="loading"
      :selected-count="selectedPaths.length"
      :filtered-count="filteredFiles.length"
      @refresh="fetchFiles"
      @enter-batch-mode="fileManagerStore.enterBatchMode"
      @exit-batch-mode="fileManagerStore.exitBatchMode"
      @toggle-select-all="fileManagerStore.toggleSelectAll"
      @batch-delete="handleBatchDelete"
      @upload="handleUpload"
    />

    <!-- 2. 筛选与检索栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4 pb-1 shrink-0" :class="{ 'opacity-40 pointer-events-none': isBatchMode }">
      <!-- 类型筛选 (改用高定的 BaseTab) -->
      <div class="flex items-center gap-2">
        <BaseTab
          v-model="typeFilterKey"
          :tabs="[
            { key: 'all', title: t('fileManager.types.all'), icon: 'Compass' },
            { key: 'image', title: t('fileManager.types.image'), icon: 'ImageIcon' },
            { key: 'file', title: t('fileManager.types.file'), icon: 'FileText' }
          ]"
          @update:model-value="fetchFiles"
        />
      </div>

      <!-- 搜索框 (改用 BaseInput) -->
      <div class="relative w-full md:w-72">
        <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 z-10">
          <Search class="h-3.5 w-3.5" />
        </div>
        <BaseInput
          v-model="keyword"
          :placeholder="t('fileManager.searchPlaceholder')"
          class="h-9 pr-8 text-xs"
          style="padding-left: 32px !important;"
        />
        <div
          v-if="keyword"
          role="button"
          class="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-650 cursor-pointer z-10"
          @click="fileManagerStore.clearKeyword"
        >
          <X class="h-3.5 w-3.5" />
        </div>
      </div>
    </div>

    <!-- 3. 文件列表表格 (复用 BaseTable 组件的独立包装) -->
    <FileManagerTable
      :data="filteredFiles"
      :loading="loading"
      :is-batch-mode="isBatchMode"
      :selected-paths="selectedPaths"
      :img-url-getter="fileManagerStore.getImgUrl"
      @toggle-selection="fileManagerStore.toggleSelection"
      @toggle-select-all="fileManagerStore.toggleSelectAll"
      @preview="handlePreview"
      @delete="handleDelete"
    />

    <!-- 4. 底部统计 -->
    <div class="flex items-center justify-between mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 shrink-0 select-none">
      <span class="text-[11px] text-slate-400 font-bold">
        {{ formatTemplate(t('fileManager.totalCount'), {
          count: filteredFiles.length,
          selected: isBatchMode ? formatTemplate(t('fileManager.selectedCountSuffix'), { count: selectedPaths.length }) : ''
        }) }}
      </span>
    </div>

    <!-- 5. 图片预览弹窗 -->
    <transition
      enter-active-class="ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showPreview"
        class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-8"
        @click.self="showPreview = false"
      >
        <div class="relative max-w-[80vw] max-h-[80vh]">
          <img :src="previewUrl" class="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-200" />
          <div
            role="button"
            class="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-white shadow-md flex items-center justify-center text-slate-500 hover:text-slate-700 transition cursor-pointer"
            @click="showPreview = false"
          >
            <X class="h-4 w-4" />
          </div>
        </div>
      </div>
    </transition>

    <!-- 6. 拖拽上传覆盖遮罩 -->
    <FileManagerDragMask :is-dragging="isDragging" />
  </div>
</template>

<style scoped>
/* 无 */
</style>
