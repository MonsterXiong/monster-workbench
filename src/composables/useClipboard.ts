import { useToast } from './useToast';

/**
 * 通用剪贴板复制 Composable
 * 支持现代化 clipboard API 并在不支持时自动降级至隐藏 textarea 执行 copy
 */
export function useClipboard() {
  const { triggerToast } = useToast();

  /**
   * 复制指定文本到剪贴板，并在成功时弹出 Toast 气泡
   * @param text - 待复制的目标文本
   * @param successMsg - 复制成功后的提示文案，默认“已复制到剪贴板！”
   */
  async function copyText(text: string, successMsg = "已复制到剪贴板！") {
    if (!text) return false;

    try {
      // 1. 尝试使用现代 Clipboard API
      await navigator.clipboard.writeText(text);
      triggerToast(successMsg, "success");
      return true;
    } catch (err) {
      // 2. 降级方案：创建临时隐藏的 textarea
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;

        // 样式隐身防抖动
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        textarea.style.left = "-9999px";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.select();

        const success = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (success) {
          triggerToast(successMsg, "success");
          return true;
        }

        throw new Error("[ERR_CLIPBOARD_EXEC] execCommand copy 命令执行失败");
      } catch (fallbackErr) {
        console.error("[ERR_CLIPBOARD_COPY] 复制失败:", fallbackErr);
        triggerToast("复制到剪贴板失败，请手动选择复制", "error");
        return false;
      }
    }
  }

  return { copyText };
}
