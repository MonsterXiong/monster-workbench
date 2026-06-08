import { callTauri } from "./tauri";

export const appService = {
  /**
   * 获取本地 ~/.monster-tools 应用专属数据根目录
   */
  async getAppPaths(): Promise<string> {
    return await callTauri<string>("get_app_paths");
  },

  /**
   * 获取底座包版本号
   */
  async getAppVersion(): Promise<string> {
    return await callTauri<string>("get_app_version");
  }
};
