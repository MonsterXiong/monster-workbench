import { callTauri } from "./tauri";
import { isTauriRuntime } from "./runtime";
import { canUseDevBridgeRuntime } from "./tauri.dev-bridge";
import { stripJsonBom } from "../utils";

export const configService = {
  canUsePreferenceConfigRuntime(): boolean {
    return isTauriRuntime() || canUseDevBridgeRuntime();
  },

  /**
   * 读取本地 config.json 的偏好配置
   */
  async getPreferenceConfig(): Promise<string> {
    const content = await callTauri<string>("get_preference_config");
    return stripJsonBom(content);
  },

  /**
   * 写入持久化偏好设置
   */
  async savePreferenceConfig(content: string): Promise<void> {
    return await callTauri<void>("save_preference_config", { content: stripJsonBom(content) });
  }
};
