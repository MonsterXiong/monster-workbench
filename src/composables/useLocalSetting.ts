import { ref, watch } from "vue";
import { parseJsonOrRaw, safeJsonStringify } from "../utils";

export function useLocalSetting<T>(key: string, defaultValue: T) {
  const readValue = (): T => {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return parseJsonOrRaw<T>(raw) as T;
  };

  const data = ref<T>(readValue());

  watch(
    data,
    (newValue) => {
      localStorage.setItem(key, safeJsonStringify(newValue, String(newValue)));
    },
    { deep: true }
  );

  return data;
}
