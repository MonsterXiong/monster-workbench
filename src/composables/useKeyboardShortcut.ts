import { onMounted, onUnmounted } from "vue";
import {
  addDomEventListener,
  handleKeyboardShortcut,
  parseKeyboardShortcut,
  type DomEventCleanup,
  type KeyboardShortcutHandlerOptions,
} from "../utils";

/**
 * 注册全局键盘快捷键 Hook，支持 Ctrl+S, Esc, Ctrl+Alt+N 等写法
 */
export function useKeyboardShortcut(
  keyCombo: string,
  callback: (e: KeyboardEvent) => void,
  options: KeyboardShortcutHandlerOptions = {}
) {
  const shortcut = parseKeyboardShortcut(keyCombo);
  let stopKeydown: DomEventCleanup | null = null;

  const handleKeyDown = (e: KeyboardEvent) => {
    handleKeyboardShortcut(e, shortcut, callback, options);
  };

  onMounted(() => {
    stopKeydown = addDomEventListener(window, "keydown", handleKeyDown);
  });

  onUnmounted(() => {
    stopKeydown?.();
    stopKeydown = null;
  });
}
