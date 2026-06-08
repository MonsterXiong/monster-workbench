import { callTauri } from "./tauri";

export const updaterService = {
  /**
   * 触发自更新包下载模拟
   */
  async triggerUpdateDownload(taskId: string, taskName: string): Promise<void> {
    return await callTauri<void>("trigger_update_download", { taskId, taskName });
  },
};
