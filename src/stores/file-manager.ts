import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  fileManagerService,
  type UploadedFileInfo,
} from "../services/file-manager.service";
import { useAppStore } from "./app";
import { filterBySearchTextFields, getFileNames, toggleAllSelection, toggleSelectionKey, uniqueArray } from "../utils";

export type FileTypeFilter = "image" | "file" | undefined;

export interface FileDeletePlan {
  referenced: boolean;
  usage: string[];
}

export interface BatchUploadResult {
  successCount: number;
  failCount: number;
}

export interface BatchDeletePlan {
  count: number;
  referencedUsage: string[];
}

export const useFileManagerStore = defineStore("file-manager", () => {
  const files = ref<UploadedFileInfo[]>([]);
  const loading = ref(false);
  const keyword = ref("");
  const typeFilter = ref<FileTypeFilter>(undefined);
  const previewUrl = ref("");
  const showPreview = ref(false);
  const isBatchMode = ref(false);
  const selectedPaths = ref<string[]>([]);
  const isDragging = ref(false);

  let unlistenDragDrop: (() => void) | null = null;

  const typeFilterKey = computed({
    get: () => typeFilter.value || "all",
    set: (val: string) => {
      typeFilter.value = val === "all" ? undefined : val as FileTypeFilter;
    },
  });

  const filteredFiles = computed(() => {
    return filterBySearchTextFields(files.value, keyword.value, [
      (file) => file.file_name,
      (file) => file.rel_path,
    ]);
  });

  async function fetchFiles() {
    loading.value = true;
    try {
      files.value = await fileManagerService.listUploadedFiles(typeFilter.value);
    } finally {
      loading.value = false;
    }
  }

  function getImgUrl(relPath: string) {
    const appStore = useAppStore();
    return fileManagerService.buildPreviewUrl(appStore.localPath, relPath);
  }

  function openPreview(file: UploadedFileInfo) {
    if (file.file_type !== "image") return;
    previewUrl.value = getImgUrl(file.rel_path);
    showPreview.value = true;
  }

  async function uploadSelectedFile(): Promise<boolean> {
    const uploaded = await fileManagerService.selectAndUploadFile();
    if (uploaded) {
      await fetchFiles();
    }
    return uploaded;
  }

  async function uploadSelectedImage(): Promise<string | null> {
    const relPath = await fileManagerService.selectAndUploadImage();
    if (relPath) {
      await fetchFiles();
    }
    return relPath;
  }

  async function batchUploadFiles(paths: string[]): Promise<BatchUploadResult> {
    loading.value = true;
    let successCount = 0;
    let failCount = 0;

    try {
      for (const path of paths) {
        try {
          await fileManagerService.uploadPhysicalFile(path);
          successCount++;
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        await fetchFiles();
      }

      return { successCount, failCount };
    } finally {
      loading.value = false;
    }
  }

  async function buildDeletePlan(file: UploadedFileInfo): Promise<FileDeletePlan> {
    const appStore = useAppStore();
    return fileManagerService.isFileReferenced(appStore.localPath, file.rel_path);
  }

  async function deleteFile(file: UploadedFileInfo, plan: FileDeletePlan) {
    const appStore = useAppStore();
    if (plan.referenced) {
      await fileManagerService.clearFileReferences(appStore.localPath, file.rel_path);
    }

    await fileManagerService.deleteUploadedFile(file.rel_path);
    await fetchFiles();
  }

  async function buildBatchDeletePlan(): Promise<BatchDeletePlan> {
    const appStore = useAppStore();
    const referencedUsage: string[] = [];

    for (const relPath of selectedPaths.value) {
      const check = await fileManagerService.isFileReferenced(appStore.localPath, relPath);
      if (check.referenced) {
        referencedUsage.push(...check.usage);
      }
    }

    return {
      count: selectedPaths.value.length,
      referencedUsage: uniqueArray(referencedUsage),
    };
  }

  async function batchDeleteSelected(plan: BatchDeletePlan) {
    const appStore = useAppStore();

    if (plan.referencedUsage.length > 0) {
      await Promise.all(
        selectedPaths.value.map((relPath) =>
          fileManagerService.clearFileReferences(appStore.localPath, relPath)
        )
      );
    }

    await Promise.all(
      selectedPaths.value.map((relPath) =>
        fileManagerService.deleteUploadedFile(relPath)
      )
    );

    selectedPaths.value = [];
    isBatchMode.value = false;
    await fetchFiles();
  }

  function toggleSelection(relPath: string) {
    selectedPaths.value = toggleSelectionKey(selectedPaths.value, relPath);
  }

  function toggleSelectAll() {
    selectedPaths.value = toggleAllSelection(filteredFiles.value, selectedPaths.value, (file) => file.rel_path);
  }

  function enterBatchMode() {
    isBatchMode.value = true;
    selectedPaths.value = [];
  }

  function exitBatchMode() {
    isBatchMode.value = false;
    selectedPaths.value = [];
  }

  function clearKeyword() {
    keyword.value = "";
  }

  function handleWebDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function handleWebDragEnter(event: DragEvent) {
    event.preventDefault();
    isDragging.value = true;
  }

  function handleWebDragLeave(event: DragEvent) {
    event.preventDefault();
    if (
      event.relatedTarget === null ||
      !(event.currentTarget as HTMLElement).contains(event.relatedTarget as HTMLElement)
    ) {
      isDragging.value = false;
    }
  }

  async function handleWebDrop(event: DragEvent): Promise<BatchUploadResult | null> {
    event.preventDefault();
    isDragging.value = false;

    const filesList = event.dataTransfer?.files;
    if (!filesList || filesList.length === 0) return null;

    const paths = getFileNames(filesList);
    return batchUploadFiles(paths);
  }

  async function setupDesktopDragDrop(onDrop: (result: BatchUploadResult) => void) {
    try {
      unlistenDragDrop = await fileManagerService.registerWindowFileDrop({
        onEnter: () => {
          isDragging.value = true;
        },
        onLeave: () => {
          isDragging.value = false;
        },
        onDrop: async (paths) => {
          onDrop(await batchUploadFiles(paths));
        },
      });
    } catch (err) {
      console.error("[ERR_FILE_DRAGDROP_INIT] 初始化文件拖拽上传监听失败:", err);
    }
  }

  function teardownDesktopDragDrop() {
    if (unlistenDragDrop) {
      unlistenDragDrop();
      unlistenDragDrop = null;
    }
  }

  return {
    files,
    loading,
    keyword,
    typeFilter,
    typeFilterKey,
    filteredFiles,
    previewUrl,
    showPreview,
    isBatchMode,
    selectedPaths,
    isDragging,
    fetchFiles,
    getImgUrl,
    openPreview,
    uploadSelectedFile,
    uploadSelectedImage,
    batchUploadFiles,
    buildDeletePlan,
    deleteFile,
    buildBatchDeletePlan,
    batchDeleteSelected,
    toggleSelection,
    toggleSelectAll,
    enterBatchMode,
    exitBatchMode,
    clearKeyword,
    handleWebDragOver,
    handleWebDragEnter,
    handleWebDragLeave,
    handleWebDrop,
    setupDesktopDragDrop,
    teardownDesktopDragDrop,
  };
});

export type { UploadedFileInfo };
