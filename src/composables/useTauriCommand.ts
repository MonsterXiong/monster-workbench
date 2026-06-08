import { ref } from "vue";

export function useTauriCommand<T = any, Args extends any[] = any[]>(
  commandFn: (...args: Args) => Promise<T>
) {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const data = ref<T | null>(null);

  const execute = async (...args: Args): Promise<T | null> => {
    loading.value = true;
    error.value = null;
    try {
      const result = await commandFn(...args);
      data.value = result as any; // 强转类型
      return result;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      error.value = msg;
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    data,
    execute,
  };
}
