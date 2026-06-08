import zhCN from "./zh-CN";
import enUS from "./en-US";

export const messages: Record<string, any> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

/**
 * 根据多级 Key 获取翻译文案，如 'common.confirm'
 */
export function getTranslation(key: string, locale: string = "zh-CN"): string {
  const dict = messages[locale] || messages["zh-CN"];
  const keys = key.split(".");
  let result: any = dict;
  for (const k of keys) {
    if (result && typeof result === "object" && k in result) {
      result = result[k];
    } else {
      return key;
    }
  }
  return typeof result === "string" ? result : key;
}
