import type {
  FormatKeyboardShortcutOptions,
  FormatKeyboardShortcutsOptions,
  KeyboardEventLike,
  KeyboardShortcut,
  KeyboardShortcutMatchOptions,
} from "./types";
import { formatKeyboardKey, isActivationKey, normalizeKeyboardKey, normalizeKeyboardShortcutText } from "./core";

/** 内部核心工具方法。 */
export function parseKeyboardShortcut(value: string): KeyboardShortcut {
  const parts = normalizeKeyboardShortcutText(value)
    .split("+")
    .map(normalizeKeyboardKey)
    .filter(Boolean);
  const key = parts[parts.length - 1] ?? "";

  return {
    key,
    ctrlKey: parts.includes("ctrl"),
    altKey: parts.includes("alt"),
    shiftKey: parts.includes("shift"),
    metaKey: parts.includes("meta"),
  };
}

export function normalizeKeyboardShortcut(shortcut: string | KeyboardShortcut): KeyboardShortcut {
  if (typeof shortcut === "string") {
    return parseKeyboardShortcut(shortcut);
  }

  return {
    key: normalizeKeyboardKey(shortcut.key),
    ctrlKey: Boolean(shortcut.ctrlKey),
    altKey: Boolean(shortcut.altKey),
    shiftKey: Boolean(shortcut.shiftKey),
    metaKey: Boolean(shortcut.metaKey),
  };
}

export function keyboardShortcutFromEvent(event: KeyboardEventLike): KeyboardShortcut {
  return {
    key: normalizeKeyboardKey(event.key),
    ctrlKey: Boolean(event.ctrlKey),
    altKey: Boolean(event.altKey),
    shiftKey: Boolean(event.shiftKey),
    metaKey: Boolean(event.metaKey),
  };
}

export function getKeyboardShortcutSignature(shortcut: string | KeyboardShortcut): string {
  const parsedShortcut = normalizeKeyboardShortcut(shortcut);
  const parts: string[] = [];

  if (parsedShortcut.ctrlKey) parts.push("ctrl");
  if (parsedShortcut.altKey) parts.push("alt");
  if (parsedShortcut.shiftKey) parts.push("shift");
  if (parsedShortcut.metaKey) parts.push("meta");
  if (parsedShortcut.key) parts.push(parsedShortcut.key);

  return parts.join("+");
}

/** 执行格式化逻辑并返回可展示字符串。 */
export function formatKeyboardShortcut(shortcut: string | KeyboardShortcut, options: FormatKeyboardShortcutOptions = {}): string {
  const parsedShortcut = normalizeKeyboardShortcut(shortcut);
  const separator = options.separator ?? " + ";
  const parts: string[] = [];

  if (parsedShortcut.ctrlKey) parts.push("Ctrl");
  if (parsedShortcut.altKey) parts.push("Alt");
  if (parsedShortcut.shiftKey) parts.push("Shift");
  if (parsedShortcut.metaKey) parts.push(options.metaLabel ?? "Meta");
  if (parsedShortcut.key) parts.push(formatKeyboardKey(parsedShortcut.key));

  return parts.join(separator);
}

export function formatKeyboardShortcuts(
  shortcuts: readonly (string | KeyboardShortcut)[],
  options: FormatKeyboardShortcutsOptions = {}
): string {
  return shortcuts
    .map((shortcut) => formatKeyboardShortcut(shortcut, options))
    .filter(Boolean)
    .join(options.shortcutSeparator ?? " / ");
}

/** 内部核心工具方法。 */
export function toAriaKeyShortcuts(shortcut: string | KeyboardShortcut): string {
  const parsedShortcut = normalizeKeyboardShortcut(shortcut);
  const parts: string[] = [];

  if (parsedShortcut.ctrlKey) parts.push("Control");
  if (parsedShortcut.altKey) parts.push("Alt");
  if (parsedShortcut.shiftKey) parts.push("Shift");
  if (parsedShortcut.metaKey) parts.push("Meta");
  if (parsedShortcut.key) parts.push(formatKeyboardKey(parsedShortcut.key));

  return parts.join("+");
}

export function toAriaKeyShortcutsList(shortcuts: readonly (string | KeyboardShortcut)[]): string {
  return shortcuts
    .map(toAriaKeyShortcuts)
    .filter(Boolean)
    .join(" ");
}

export function isKeyboardShortcutMatched(
  event: KeyboardEventLike,
  shortcut: string | KeyboardShortcut,
  options: KeyboardShortcutMatchOptions = {}
): boolean {
  const parsedShortcut = normalizeKeyboardShortcut(shortcut);
  const eventKey = normalizeKeyboardKey(event.key);
  const exactModifiers = options.exactModifiers ?? true;

  if (eventKey !== parsedShortcut.key) {
    return false;
  }

  if (!exactModifiers) {
    return (
      (!parsedShortcut.ctrlKey || Boolean(event.ctrlKey)) &&
      (!parsedShortcut.altKey || Boolean(event.altKey)) &&
      (!parsedShortcut.shiftKey || Boolean(event.shiftKey)) &&
      (!parsedShortcut.metaKey || Boolean(event.metaKey))
    );
  }

  return (
    Boolean(event.ctrlKey) === parsedShortcut.ctrlKey &&
    Boolean(event.altKey) === parsedShortcut.altKey &&
    Boolean(event.shiftKey) === parsedShortcut.shiftKey &&
    Boolean(event.metaKey) === parsedShortcut.metaKey
  );
}

export function isAnyKeyboardShortcutMatched(
  event: KeyboardEventLike,
  shortcuts: readonly (string | KeyboardShortcut)[],
  options: KeyboardShortcutMatchOptions = {}
): boolean {
  return shortcuts.some((shortcut) => isKeyboardShortcutMatched(event, shortcut, options));
}

export function handleKeyboardShortcut(
  event: KeyboardEvent,
  shortcut: string | KeyboardShortcut,
  handler: (event: KeyboardEvent) => void,
  options: KeyboardShortcutMatchOptions & { preventDefault?: boolean; stopPropagation?: boolean } = {}
): boolean {
  if (!isKeyboardShortcutMatched(event, shortcut, options)) {
    return false;
  }

  if (options.preventDefault ?? true) {
    event.preventDefault();
  }

  if (options.stopPropagation) {
    event.stopPropagation();
  }

  handler(event);
  return true;
}

export function handleKeyboardShortcuts(
  event: KeyboardEvent,
  actions: readonly { shortcut: string | KeyboardShortcut; handler: (event: KeyboardEvent) => void; disabled?: boolean }[],
  options: KeyboardShortcutMatchOptions & { preventDefault?: boolean; stopPropagation?: boolean } = {}
): boolean {
  for (const action of actions) {
    if (action.disabled) {
      continue;
    }

    if (handleKeyboardShortcut(event, action.shortcut, action.handler, options)) {
      return true;
    }
  }

  return false;
}

export function handleActivationKeydown(
  event: KeyboardEvent,
  callback: (event: KeyboardEvent) => void,
  options: { preventDefault?: boolean; stopPropagation?: boolean } = {}
): boolean {
  if (!isActivationKey(event)) {
    return false;
  }

  if (options.preventDefault ?? true) {
    event.preventDefault();
  }

  if (options.stopPropagation) {
    event.stopPropagation();
  }

  callback(event);
  return true;
}
