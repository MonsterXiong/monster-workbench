import { copyTextToClipboard } from "../utils";
import { useToast } from "./useToast";

export function useClipboard() {
  const { triggerToast } = useToast();

  async function copyText(text: string, successMsg = "已复制到剪贴板！") {
    if (!text) {
      return false;
    }

    try {
      const success = await copyTextToClipboard(text);
      if (success) {
        triggerToast(successMsg, "success");
      }
      return success;
    } catch (error) {
      console.error("[ERR_CLIPBOARD_COPY] 复制失败:", error);
      triggerToast("复制到剪贴板失败，请手动选择复制", "error");
      return false;
    }
  }

  return { copyText };
}
