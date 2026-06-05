import { ref } from "vue";

export function useAsyncTask() {
  const loading = ref(false);
  const error = ref("");

  async function run<T>(task: () => Promise<T>): Promise<T | null> {
    loading.value = true;
    error.value = "";

    try {
      return await task();
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : "操作失败";
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
