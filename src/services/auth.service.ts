import { callTauri } from "./tauri";

export const authService = {
  /**
   * 核验管理员口令
   */
  async verifyAdminPassword(password: string): Promise<boolean> {
    return await callTauri<boolean>("verify_admin_password", { password });
  },
};
