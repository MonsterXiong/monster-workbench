import type { KeyboardBoundaryPosition, KeyboardEventLike, KeyboardNavigationDirection, KeyboardNavigationOptions } from "./types";

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

export function normalizeKeyboardShortcutText(value: string): string {
  const trimmedValue = value.trim();
  return trimmedValue.includes("+")
    ? trimmedValue.replace(/\s*\+\s*/g, "+")
    : trimmedValue.replace(/\s+/g, "+");
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

export function isModifierKey(key: string): boolean {
  return ["ctrl", "alt", "shift", "meta"].includes(normalizeKeyboardKey(key));
}

export function isPrimaryModifierPressed(event: KeyboardEventLike, primary: "ctrl" | "meta" = "ctrl"): boolean {
  return primary === "meta" ? Boolean(event.metaKey) : Boolean(event.ctrlKey);
}

export function getPlatformPrimaryModifier(platform = typeof navigator === "undefined" ? "" : navigator.platform): "ctrl" | "meta" {
  return /Mac|iPhone|iPad|iPod/i.test(platform) ? "meta" : "ctrl";
}

export function isPlatformPrimaryModifierPressed(
  event: KeyboardEventLike,
  platform = typeof navigator === "undefined" ? "" : navigator.platform
): boolean {
  return isPrimaryModifierPressed(event, getPlatformPrimaryModifier(platform));
}

export function getKeyboardNavigationDirection(
  event: KeyboardEventLike,
  options: KeyboardNavigationOptions = {}
): KeyboardNavigationDirection | null {
  if (isKeyboardKey(event, options.forwardKeys ?? DEFAULT_FORWARD_NAVIGATION_KEYS)) return 1;
  if (isKeyboardKey(event, options.backwardKeys ?? DEFAULT_BACKWARD_NAVIGATION_KEYS)) return -1;
  return null;
}

export function isKeyboardNavigationKey(event: KeyboardEventLike, options: KeyboardNavigationOptions = {}): boolean {
  return getKeyboardNavigationDirection(event, options) !== null;
}

export function getKeyboardBoundaryPosition(event: KeyboardEventLike): KeyboardBoundaryPosition | null {
  if (isKeyboardKey(event, "Home")) return "first";
  if (isKeyboardKey(event, "End")) return "last";
  return null;
}

export function hasKeyboardModifier(event: KeyboardEventLike): boolean {
  return Boolean(event.ctrlKey || event.altKey || event.shiftKey || event.metaKey);
}

export function isPlainKeyboardEvent(event: KeyboardEventLike): boolean {
  return !hasKeyboardModifier(event);
}

export function formatKeyboardKey(key: string): string {
  const normalizedKey = normalizeKeyboardKey(key);

  if (KEY_DISPLAY_LABELS[normalizedKey]) return KEY_DISPLAY_LABELS[normalizedKey];
  if (normalizedKey.length === 1) return normalizedKey.toUpperCase();

  return normalizedKey
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}
