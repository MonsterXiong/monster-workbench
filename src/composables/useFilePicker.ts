import { ref } from "vue";
import { useSystemStore } from "../stores/system";

export function useFilePicker() {
  const loading = ref(false);
  const systemStore = useSystemStore();

  const pickFolder = async (): Promise<string | null> => {
    loading.value = true;
    try {
      return await systemStore.selectPath("folder");
    } catch (err) {
      console.error("[ERR_FILE_PICKER_DIR] 调用原生目录选择器异常:", err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  const pickFile = async (): Promise<string | null> => {
    loading.value = true;
    try {
      return await systemStore.selectPath("file");
    } catch (err) {
      console.error("[ERR_FILE_PICKER_FILE] 调用原生文件选择器异常:", err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    pickFolder,
    pickFile,
  };
}
