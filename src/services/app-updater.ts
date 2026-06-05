import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type AppUpdateProgress = {
  downloaded: number;
  total: number;
  percent: number;
};

export async function checkAndInstallAppUpdate(
  onProgress?: (progress: AppUpdateProgress) => void
) {
  const update = await check();

  if (!update) {
    return { hasUpdate: false };
  }

  let downloaded = 0;
  let total = 0;

  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      total = event.data.contentLength ?? 0;
    }

    if (event.event === "Progress") {
      downloaded += event.data.chunkLength;

      onProgress?.({
        downloaded,
        total,
        percent: total > 0 ? Math.round((downloaded / total) * 100) : 0
      });
    }
  });

  await relaunch();

  return { hasUpdate: true };
}
