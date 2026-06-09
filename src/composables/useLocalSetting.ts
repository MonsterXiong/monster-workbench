import { ref, watch } from "vue";
import { getStorageJsonOrRaw, setStorageJson } from "../utils";

export function useLocalSetting<T>(key: string, defaultValue: T) {
  const readValue = (): T => getStorageJsonOrRaw<T>(key, defaultValue);

  const data = ref<T>(readValue());

  watch(
    data,
    (newValue) => {
      setStorageJson(key, newValue, String(newValue));
    },
    { deep: true }
  );

  return data;
}
