import { relaunch } from "@tauri-apps/plugin-process";
import { check, Update } from "@tauri-apps/plugin-updater";
import { ensureBrowserMessage, isTauriRuntime } from "./runtime";

export type AppUpdateProgress = {
  downloaded: number;
  total: number;
  percent: number;
};

// 缓存当前检测到待更新的 Update 实例
let pendingUpdate: Update | null = null;

/**
 * 仅执行检查更新，返回 Update 实例或 null
 */
export async function checkForAppUpdate(): Promise<Update | null> {
  if (!isTauriRuntime()) {
    return null;
  }
  const update = await check();
  pendingUpdate = update;
  return update;
}

/**
 * 下载并安装挂载中的更新，并在成功后自动重启应用
 */
export async function downloadAndInstallPendingUpdate(
  onProgress?: (progress: AppUpdateProgress) => void
): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error(ensureBrowserMessage("安装更新"));
  }

  if (!pendingUpdate) {
    // 兜底尝试重新检查一次
    pendingUpdate = await check();
  }

  if (!pendingUpdate) {
    throw new Error("当前无可用的更新包");
  }

  let downloaded = 0;
  let total = 0;

  await pendingUpdate.downloadAndInstall((event) => {
    if (event.event === "Started") {
      total = event.data.contentLength ?? 0;
    }

    if (event.event === "Progress") {
      downloaded += event.data.chunkLength;
      onProgress?.({
        downloaded,
        total,
        percent: total > 0 ? Math.round((downloaded / total) * 100) : 0,
      });
    }
  });

  await relaunch();
}

/**
 * 兼容旧版的直接检查并全自动后台安装接口
 */
export async function checkAndInstallAppUpdate(
  onProgress?: (progress: AppUpdateProgress) => void
) {
  if (!isTauriRuntime()) {
    throw new Error(ensureBrowserMessage("检查更新"));
  }

  const update = await checkForAppUpdate();

  if (!update) {
    return { hasUpdate: false };
  }

  await downloadAndInstallPendingUpdate(onProgress);

  return { hasUpdate: true };
}

