import { callTauri } from "./tauri";
import { safeJsonParse } from "../utils";

export interface PathItem {
  path: string;
  is_file: boolean;
}

export interface UploadedFile {
  rel_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  modified: number;
}

export const fileService = {
  /**
   * 调起原生对话框选择文件夹
   */
  async selectFolder(): Promise<string | null> {
    return await callTauri<string | null>("select_folder");
  },

  /**
   * 调起原生对话框选择文件
   */
  async selectFile(): Promise<string | null> {
    return await callTauri<string | null>("select_file");
  },

  /**
   * 上传文件至底座沙箱
   */
  async uploadFile(
    srcPath: string,
    fileType: string,
    yearMonth: string,
    uuidName: string
  ): Promise<string> {
    return await callTauri<string>("upload_file", {
      srcPath,
      fileType,
      yearMonth,
      uuidName,
    });
  },

  /**
   * 列出底座沙箱已上传的文件
   */
  async listUploadedFiles(fileType?: string): Promise<UploadedFile[]> {
    const res = await callTauri<string>("list_uploaded_files", { fileType });
    return safeJsonParse<UploadedFile[]>(res, []);
  },

  /**
   * 删除沙箱已上传的文件
   */
  async deleteUploadedFile(relPath: string): Promise<void> {
    return await callTauri<void>("delete_uploaded_file", { relPath });
  },

  /**
   * 写入底座测试文件并返回路径
   */
  async writeFileData(content: string): Promise<string> {
    return await callTauri<string>("write_file_data", { content });
  },

  /**
   * 读取底座测试文件内容
   */
  async readFileData(): Promise<string> {
    return await callTauri<string>("read_file_data");
  },

  /**
   * 物理批量创建目录和文件
   */
  async createDirectoryStructure(
    rootPath: string | null,
    items: PathItem[]
  ): Promise<void> {
    return await callTauri<void>("create_directory_structure", {
      rootPath,
      items,
    });
  },

  /**
   * 扫描目录层级树结构
   */
  async readDirectoryTree(
    dirPath: string,
    skipDirs: string[],
    maxDepth: number
  ): Promise<string> {
    return await callTauri<string>("read_directory_tree", {
      dirPath,
      skipDirs,
      maxDepth,
    });
  },
};
