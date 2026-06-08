import { callTauri } from "./tauri";

export const databaseService = {
  /**
   * 备份导出底座 SQLite 数据库物理文件到指定位置
   */
  async exportDatabase(targetPath: string): Promise<void> {
    return await callTauri<void>("export_database", { targetPath });
  },

  /**
   * 从外部备份恢复覆盖 SQLite 并触发客户端自愈重启
   */
  async importDatabase(srcPath: string): Promise<void> {
    return await callTauri<void>("import_database", { srcPath });
  },

  /**
   * 一键重置清空本地 SQLite 数据库与上传文件沙箱
   */
  async resetDatabase(): Promise<void> {
    return await callTauri<void>("reset_database");
  },
};
