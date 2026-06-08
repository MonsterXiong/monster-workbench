import { ref } from "vue";
import { useSettingStore } from "../stores/settings";
import { getTranslation } from "../locales";

const isGlobalLoading = ref(false);
const loadingText = ref("Loading...");

export function useLoading() {
  function showLoading(text?: string) {
    const settingsStore = useSettingStore();
    const defaultText = getTranslation("common.loading", settingsStore.locale);
    isGlobalLoading.value = true;
    loadingText.value = text !== undefined ? text : defaultText;
  }

  function hideLoading() {
    isGlobalLoading.value = false;
  }

  return {
    isGlobalLoading,
    loadingText,
    showLoading,
    hideLoading,
  };
}
