/**
 * 文件管理前端服务层
 * 负责调用 Tauri 后端命令管理 .monster-tools/uploads/ 下的文件
 */
import { callTauri } from "./tauri";
import { isTauriRuntime } from "./runtime";
import { navigationService } from "./navigation.service";

/** 文件元数据类型 */
export interface UploadedFileInfo {
  rel_path: string;
  file_name: string;
  file_size: number;
  file_type: "image" | "file";
  modified: number;
}

/**
 * 列出已上传的文件
 * @param fileType 筛选类型: 'image' | 'file' | undefined(全部)
 */
export async function listUploadedFiles(
  fileType?: string
): Promise<UploadedFileInfo[]> {
  if (!isTauriRuntime()) {
    // 浏览器降级：返回空列表
    return [];
  }
  const json = await callTauri<string>("list_uploaded_files", {
    fileType: fileType || null,
  });
  return JSON.parse(json) as UploadedFileInfo[];
}

/**
 * 删除已上传的文件
 * @param relPath 相对于 .monster-tools/ 的路径
 */
export async function deleteUploadedFile(relPath: string): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("浏览器环境不支持文件删除操作");
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
    const db = await navigationService.getDb(appDataPath);
    if (!db) return { referenced: false, usage: [] };

    const res = (await db.select(
      "SELECT title, logo_path, bg_path FROM navigation WHERE logo_path = ? OR bg_path = ?",
      [relPath, relPath]
    )) as { title: string; logo_path: string; bg_path: string }[];

    if (res && res.length > 0) {
      const usage = res.map((r) => {
        const types: string[] = [];
        if (r.logo_path === relPath) types.push("Logo");
        if (r.bg_path === relPath) types.push("封面背景");
        return `"${r.title}" (${types.join("/")})`;
      });
      return { referenced: true, usage };
    }
  } catch (err) {
    console.error("检测文件引用状态出错:", err);
  }
  return { referenced: false, usage: [] };
}

/** 文件管理服务对象 */
export const fileManagerService = {
  listUploadedFiles,
  deleteUploadedFile,
  isFileReferenced,
};
