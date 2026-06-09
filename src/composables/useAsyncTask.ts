import { ref } from "vue";
import { useToast } from "./useToast";
import { useSettingStore } from "../stores/settings";
import { getTranslation } from "../locales";
import { getErrorMessage } from "../utils";

export interface AsyncTaskOptions {
  autoToast?: boolean;
}

export function useAsyncTask(options?: AsyncTaskOptions) {
  const loading = ref(false);
  const error = ref("");
  const { triggerToast } = useToast();

  async function run<T>(task: () => Promise<T>): Promise<T | null> {
    loading.value = true;
    error.value = "";

    try {
      const result = await task();
      return result;
    } catch (err: unknown) {
      const settingsStore = useSettingStore();
      const errMsg = getErrorMessage(err, getTranslation("common.error", settingsStore.locale));
      error.value = errMsg;

      if (options?.autoToast) {
        triggerToast(errMsg, "error");
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  function clearError() {
    error.value = "";
  }

  return {
    loading,
    error,
    run,
    clearError,
  };
}
