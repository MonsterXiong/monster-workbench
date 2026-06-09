export interface KeyboardShortcut {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

export interface KeyboardEventLike {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

export type KeyboardNavigationDirection = 1 | -1;
export type KeyboardBoundaryPosition = "first" | "last";

export interface KeyboardNavigationOptions {
  forwardKeys?: readonly string[];
  backwardKeys?: readonly string[];
}

export interface KeyboardShortcutMatchOptions {
  exactModifiers?: boolean;
}

export interface KeyboardShortcutHandlerOptions extends KeyboardShortcutMatchOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export interface FormatKeyboardShortcutOptions {
  separator?: string;
  metaLabel?: string;
}

const DEFAULT_FORWARD_NAVIGATION_KEYS = ["ArrowDown", "ArrowRight"] as const;
const DEFAULT_BACKWARD_NAVIGATION_KEYS = ["ArrowUp", "ArrowLeft"] as const;

const KEY_ALIASES: Record<string, string> = {
  cmd: "meta",
  command: "meta",
  control: "ctrl",
  esc: "escape",
  return: "enter",
  space: " ",
  spacebar: " ",
};

const KEY_DISPLAY_LABELS: Record<string, string> = {
  " ": "Space",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  arrowup: "ArrowUp",
  backspace: "Backspace",
  delete: "Delete",
  end: "End",
  enter: "Enter",
  escape: "Escape",
  home: "Home",
  pagedown: "PageDown",
  pageup: "PageUp",
  tab: "Tab",
};

export function normalizeKeyboardKey(value: string): string {
  const normalizedValue = value.trim().toLowerCase();
  return KEY_ALIASES[normalizedValue] ?? normalizedValue;
}

export function isKeyboardKey(event: KeyboardEventLike, key: string | readonly string[]): boolean {
  const eventKey = normalizeKeyboardKey(event.key);
  const keys = Array.isArray(key) ? key : [key];
  return keys.some((item) => normalizeKeyboardKey(item) === eventKey);
}

export function isActivationKey(event: KeyboardEventLike): boolean {
  return isKeyboardKey(event, ["Enter", " "]);
}

export function isEscapeKey(event: KeyboardEventLike): boolean {
  return isKeyboardKey(event, "Escape");
}

export function getKeyboardNavigationDirection(
  event: KeyboardEventLike,
  options: KeyboardNavigationOptions = {},
): KeyboardNavigationDirection | null {
  if (isKeyboardKey(event, options.forwardKeys ?? DEFAULT_FORWARD_NAVIGATION_KEYS)) return 1;
  if (isKeyboardKey(event, options.backwardKeys ?? DEFAULT_BACKWARD_NAVIGATION_KEYS)) return -1;
  return null;
}

export function getKeyboardBoundaryPosition(event: KeyboardEventLike): KeyboardBoundaryPosition | null {
  if (isKeyboardKey(event, "Home")) return "first";
  if (isKeyboardKey(event, "End")) return "last";
  return null;
}

export function parseKeyboardShortcut(value: string): KeyboardShortcut {
  const parts = value
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

export function hasKeyboardModifier(event: KeyboardEventLike): boolean {
  return Boolean(event.ctrlKey || event.altKey || event.shiftKey || event.metaKey);
}

export function isPlainKeyboardEvent(event: KeyboardEventLike): boolean {
  return !hasKeyboardModifier(event);
}

export function formatKeyboardShortcut(shortcut: string | KeyboardShortcut, options: FormatKeyboardShortcutOptions = {}): string {
  const parsedShortcut = typeof shortcut === "string" ? parseKeyboardShortcut(shortcut) : shortcut;
  const separator = options.separator ?? " + ";
  const parts: string[] = [];

  if (parsedShortcut.ctrlKey) parts.push("Ctrl");
  if (parsedShortcut.altKey) parts.push("Alt");
  if (parsedShortcut.shiftKey) parts.push("Shift");
  if (parsedShortcut.metaKey) parts.push(options.metaLabel ?? "Meta");
  if (parsedShortcut.key) parts.push(formatKeyboardKeyLabel(parsedShortcut.key));

  return parts.join(separator);
}

export function toAriaKeyShortcuts(shortcut: string | KeyboardShortcut): string {
  const parsedShortcut = typeof shortcut === "string" ? parseKeyboardShortcut(shortcut) : shortcut;
  const parts: string[] = [];

  if (parsedShortcut.ctrlKey) parts.push("Control");
  if (parsedShortcut.altKey) parts.push("Alt");
  if (parsedShortcut.shiftKey) parts.push("Shift");
  if (parsedShortcut.metaKey) parts.push("Meta");
  if (parsedShortcut.key) parts.push(formatKeyboardKeyLabel(parsedShortcut.key));

  return parts.join("+");
}

export function isKeyboardShortcutMatched(
  event: KeyboardEventLike,
  shortcut: string | KeyboardShortcut,
  options: KeyboardShortcutMatchOptions = {}
): boolean {
  const parsedShortcut = typeof shortcut === "string" ? parseKeyboardShortcut(shortcut) : shortcut;
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

export function handleKeyboardShortcut(
  event: KeyboardEvent,
  shortcut: string | KeyboardShortcut,
  callback: (event: KeyboardEvent) => void,
  options: KeyboardShortcutHandlerOptions = {}
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

  callback(event);
  return true;
}

function formatKeyboardKeyLabel(key: string): string {
  const normalizedKey = normalizeKeyboardKey(key);

  if (KEY_DISPLAY_LABELS[normalizedKey]) return KEY_DISPLAY_LABELS[normalizedKey];
  if (normalizedKey.length === 1) return normalizedKey.toUpperCase();

  return normalizedKey
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}
