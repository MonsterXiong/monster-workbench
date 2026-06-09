/**
 * 文件管理前端服务层
 * 负责调用 Tauri 后端命令管理 .monster-tools/uploads/ 下的文件
 */
import { callTauri } from "./tauri";
import { isTauriRuntime } from "./runtime";
import { ref } from "vue";
import { systemService } from "./system.service";
import { navigationService } from "./navigation.service";
import { convertFileSrc, getCurrentWebviewWindow } from "./tauri";
import { buildUrlWithQuery, filterByValue, getCurrentUnixTimestamp, getUploadFileType, joinPathIfPresent, removeByValue, safeJsonParse } from "../utils";

/** 文件元数据类型 */
export interface UploadedFileInfo {
  rel_path: string;
  file_name: string;
  file_size: number;
  file_type: "image" | "file";
  modified: number;
}

// 模块级 Mock 文件存储（浏览器预览端数据闭环自愈资产）
export const mockFiles = ref<UploadedFileInfo[]>([
  { rel_path: "uploads/images/2026/06/avatar-placeholder.png", file_name: "avatar-placeholder.png", file_size: 1024 * 45, file_type: "image", modified: getCurrentUnixTimestamp() - 3600 },
  { rel_path: "uploads/files/2026/06/sample-report.pdf", file_name: "sample-report.pdf", file_size: 1024 * 1024 * 1.5, file_type: "file", modified: getCurrentUnixTimestamp() - 86400 }
]);

/**
 * 列出已上传的文件
 * @param fileType 筛选类型: 'image' | 'file' | undefined(全部)
 */
export async function listUploadedFiles(
  fileType?: string
): Promise<UploadedFileInfo[]> {
  if (!isTauriRuntime()) {
    if (!fileType) return mockFiles.value;
    return filterByValue(mockFiles.value, (file) => file.file_type, fileType);
  }
  const json = await callTauri<string>("list_uploaded_files", {
    fileType: fileType || null,
  });
  return safeJsonParse<UploadedFileInfo[]>(json, []);
}

/**
 * 删除已上传的文件
 * @param relPath 相对于 .monster-tools/ 的路径
 */
export async function deleteUploadedFile(relPath: string): Promise<void> {
  if (!isTauriRuntime()) {
    mockFiles.value = removeByValue(mockFiles.value, (file) => file.rel_path, relPath);
    return;
  }
  await callTauri<void>("delete_uploaded_file", { relPath });
}

/**
 * 检测文件是否被网址导航引用
 * @param appDataPath 应用数据物理目录路径
 * @param relPath 相对路径
 */
export async function isFileReferenced(
  appDataPath: string,
  relPath: string
): Promise<{ referenced: boolean; usage: string[] }> {
  if (!isTauriRuntime()) {
    return { referenced: false, usage: [] };
  }
  try {
    const usage = await callTauri<string[]>("check_navigation_file_references", {
      dbPath: appDataPath,
      relPath
    });

    return {
      referenced: usage.length > 0,
      usage
    };
  } catch (err) {
    console.error("[ERR_FILEREF_CHECK] 检测文件引用状态出错:", err);
  }
  return { referenced: false, usage: [] };
}

async function uploadPhysicalFile(path: string): Promise<void> {
  await systemService.uploadFile(path, getUploadFileType(path));
}

async function selectAndUploadFile(): Promise<boolean> {
  const selected = await systemService.selectFile();
  if (!selected) return false;

  await uploadPhysicalFile(selected);
  return true;
}

async function selectAndUploadImage(): Promise<string | null> {
  const selected = await systemService.selectFile();
  if (!selected) return null;

  return systemService.uploadFile(selected, "image");
}

function buildPreviewUrl(appDataPath: string, relPath: string): string {
  if (!relPath) return "";
  if (!isTauriRuntime()) {
    return buildUrlWithQuery("https://api.dicebear.com/7.x/identicon/svg", { params: { seed: relPath } });
  }

  return convertFileSrc(joinPathIfPresent(appDataPath, relPath));
}

async function clearFileReferences(appDataPath: string, relPath: string): Promise<void> {
  await navigationService.clearFileReferences(appDataPath, relPath);
}

async function registerWindowFileDrop(
  handlers: {
    onEnter: () => void;
    onLeave: () => void;
    onDrop: (paths: string[]) => void | Promise<void>;
  }
): Promise<(() => void) | null> {
  if (!isTauriRuntime()) return null;

  const webviewWindow = getCurrentWebviewWindow();
  return webviewWindow.onDragDropEvent(async (event: any) => {
    if (event.payload.type === "enter") {
      handlers.onEnter();
      return;
    }

    if (event.payload.type === "leave") {
      handlers.onLeave();
      return;
    }

    if (event.payload.type === "drop") {
      const paths = event.payload.paths;
      handlers.onLeave();
      if (paths && paths.length > 0) {
        await handlers.onDrop(paths);
      }
    }
  });
}

/** 文件管理服务对象 */
export const fileManagerService = {
  listUploadedFiles,
  deleteUploadedFile,
  isFileReferenced,
  uploadPhysicalFile,
  selectAndUploadFile,
  selectAndUploadImage,
  buildPreviewUrl,
  clearFileReferences,
  registerWindowFileDrop,
};
