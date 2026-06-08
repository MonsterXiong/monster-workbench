import { computed } from "vue";
import { useSettingStore } from "../stores/settings";
import { getTranslation } from "../locales";

export function useI18n() {
  const settings = useSettingStore();
  const locale = computed(() => settings.locale);

  const t = (key: string): string => {
    return getTranslation(key, locale.value);
  };

  return {
    locale,
    t,
    setLocale: settings.setLocale,
  };
}
