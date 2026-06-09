import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useUpdateStore } from "../stores/update";
import { getErrorMessage } from "../utils";

export function useAppUpdater() {
  const updateStore = useUpdateStore();
  const { checking, hasUpdate, updateInfo } = storeToRefs(updateStore);
  const errorMsg = ref<string | null>(null);
  const versionInfo = computed(() => updateInfo.value?.version ?? null);
  const notes = computed(() => updateInfo.value?.body ?? null);

  /**
   * 检查底座新版本
   * @param silent - 是否静默检查（红点轮询）
   */
  const checkUpdate = async (silent = false) => {
    errorMsg.value = null;
    try {
      await updateStore.checkUpdate(silent);
    } catch (err: any) {
      console.error("[ERR_UPDATER_CHECK] 底座检查更新异常:", err);
      if (!silent) {
        errorMsg.value = getErrorMessage(err, "检查更新失败");
      }
    }
  };

  /**
   * 触发后台模拟升级包下载（用于开发演示及进度条联动）
   */
  const downloadDummyUpdate = async () => {
    try {
      await updateStore.triggerDummyDownload();
    } catch (err) {
      console.error("[ERR_UPDATER_DOWNLOAD] 底座拉起更新任务失败:", err);
    }
  };

  return {
    isChecking: checking,
    updateAvailable: hasUpdate,
    versionInfo,
    notes,
    errorMsg,
    checkUpdate,
    downloadDummyUpdate,
  };
}
