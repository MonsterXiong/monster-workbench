import { onMounted, onUnmounted } from "vue";
import { isKeyboardShortcutMatched, parseKeyboardShortcut } from "../utils";

/**
 * 注册全局键盘快捷键 Hook，支持 Ctrl+S, Esc, Ctrl+Alt+N 等写法
 */
export function useKeyboardShortcut(
  keyCombo: string,
  callback: (e: KeyboardEvent) => void
) {
  const shortcut = parseKeyboardShortcut(keyCombo);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isKeyboardShortcutMatched(e, shortcut)) {
      e.preventDefault();
      callback(e);
    }
  };

  onMounted(() => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });
}
