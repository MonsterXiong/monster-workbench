import { getNextCircularIndex, getNextClampedIndex } from "./array";

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

export interface KeyboardActivationHandlerOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export interface KeyboardShortcutAction extends KeyboardShortcutHandlerOptions {
  shortcut: string | KeyboardShortcut;
  handler: (event: KeyboardEvent) => void;
}

export interface FormatKeyboardShortcutOptions {
  separator?: string;
  metaLabel?: string;
}

export interface FormatKeyboardShortcutsOptions extends FormatKeyboardShortcutOptions {
  shortcutSeparator?: string;
}

export interface KeyboardShortcutSummary {
  totalCount: number;
  empty: boolean;
  shortcuts: KeyboardShortcut[];
  keys: string[];
  modifierCount: number;
  plainCount: number;
  labels: string[];
  ariaLabel: string;
}

export interface KeyboardEventSummary {
  key: string;
  code: string;
  normalizedKey: string;
  label: string;
  shortcut: KeyboardShortcut;
  signature: string;
  hasModifier: boolean;
  plain: boolean;
  activation: boolean;
  escape: boolean;
  navigationDirection: KeyboardNavigationDirection | null;
  boundaryPosition: KeyboardBoundaryPosition | null;
}

export interface KeyboardShortcutActionSummary {
  totalCount: number;
  enabledCount: number;
  disabledCount: number;
  shortcuts: KeyboardShortcut[];
  labels: string[];
  signatures: string[];
  duplicateSignatures: string[];
}

export interface KeyboardShortcutActionConfig {
  shortcut: string | KeyboardShortcut;
  disabled?: boolean;
}

export interface KeyboardIndexNavigationOptions extends KeyboardNavigationOptions {
  wrap?: boolean;
  includeBoundary?: boolean;
  fallbackIndex?: number;
}

export interface KeyboardIndexNavigationHandlerOptions extends KeyboardIndexNavigationOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
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
  options: KeyboardNavigationOptions = {},
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

export function getKeyboardNavigationIndex(
  event: KeyboardEventLike,
  length: number,
  currentIndex: number,
  options: KeyboardIndexNavigationOptions = {}
): number | null {
  if (length <= 0) {
    return null;
  }

  const includeBoundary = options.includeBoundary ?? true;
  const boundary = includeBoundary ? getKeyboardBoundaryPosition(event) : null;

  if (boundary === "first") {
    return 0;
  }

  if (boundary === "last") {
    return length - 1;
  }

  const direction = getKeyboardNavigationDirection(event, options);

  if (!direction) {
    return null;
  }

  const fallbackIndex = options.fallbackIndex ?? 0;
  return options.wrap ?? true
    ? getNextCircularIndex(length, currentIndex, direction, fallbackIndex)
    : getNextClampedIndex(length, currentIndex, direction, fallbackIndex);
}

export function handleKeyboardIndexNavigation(
  event: KeyboardEvent,
  length: number,
  currentIndex: number,
  onChange: (nextIndex: number, event: KeyboardEvent) => void,
  options: KeyboardIndexNavigationHandlerOptions = {}
): boolean {
  const nextIndex = getKeyboardNavigationIndex(event, length, currentIndex, options);

  if (nextIndex === null) {
    return false;
  }

  if (options.preventDefault ?? true) {
    event.preventDefault();
  }

  if (options.stopPropagation) {
    event.stopPropagation();
  }

  onChange(nextIndex, event);
  return true;
}

export function handleActivationKeydown(
  event: KeyboardEvent,
  callback: (event: KeyboardEvent) => void,
  options: KeyboardActivationHandlerOptions = {}
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

export function summarizeKeyboardEvent(
  event: KeyboardEventLike & { code?: string },
  options: KeyboardNavigationOptions = {}
): KeyboardEventSummary {
  const shortcut = keyboardShortcutFromEvent(event);

  return {
    key: event.key,
    code: event.code ?? "",
    normalizedKey: shortcut.key,
    label: formatKeyboardKey(event.key),
    shortcut,
    signature: getKeyboardShortcutSignature(shortcut),
    hasModifier: hasKeyboardModifier(event),
    plain: isPlainKeyboardEvent(event),
    activation: isActivationKey(event),
    escape: isEscapeKey(event),
    navigationDirection: getKeyboardNavigationDirection(event, options),
    boundaryPosition: getKeyboardBoundaryPosition(event),
  };
}

export function hasKeyboardModifier(event: KeyboardEventLike): boolean {
  return Boolean(event.ctrlKey || event.altKey || event.shiftKey || event.metaKey);
}

export function isPlainKeyboardEvent(event: KeyboardEventLike): boolean {
  return !hasKeyboardModifier(event);
}

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

export function summarizeKeyboardShortcuts(
  shortcuts: readonly (string | KeyboardShortcut)[],
  options: FormatKeyboardShortcutsOptions = {}
): KeyboardShortcutSummary {
  const normalizedShortcuts = shortcuts.map(normalizeKeyboardShortcut);
  const keys = Array.from(new Set(normalizedShortcuts.map((shortcut) => shortcut.key).filter(Boolean)));
  const labels = normalizedShortcuts.map((shortcut) => formatKeyboardShortcut(shortcut, options)).filter(Boolean);

  return {
    totalCount: shortcuts.length,
    empty: shortcuts.length === 0,
    shortcuts: normalizedShortcuts,
    keys,
    modifierCount: normalizedShortcuts.filter((shortcut) => shortcut.ctrlKey || shortcut.altKey || shortcut.shiftKey || shortcut.metaKey).length,
    plainCount: normalizedShortcuts.filter((shortcut) => !(shortcut.ctrlKey || shortcut.altKey || shortcut.shiftKey || shortcut.metaKey)).length,
    labels,
    ariaLabel: toAriaKeyShortcutsList(normalizedShortcuts),
  };
}

export function summarizeKeyboardShortcutActions(
  actions: readonly KeyboardShortcutActionConfig[],
  options: FormatKeyboardShortcutsOptions = {}
): KeyboardShortcutActionSummary {
  const enabledActions = actions.filter((action) => !action.disabled);
  const shortcuts = enabledActions.map((action) => normalizeKeyboardShortcut(action.shortcut));
  const signatures = shortcuts.map(getKeyboardShortcutSignature).filter(Boolean);
  const duplicateSignatures = Array.from(new Set(signatures.filter((signature, index) => signatures.indexOf(signature) !== index)));

  return {
    totalCount: actions.length,
    enabledCount: enabledActions.length,
    disabledCount: actions.length - enabledActions.length,
    shortcuts,
    labels: shortcuts.map((shortcut) => formatKeyboardShortcut(shortcut, options)).filter(Boolean),
    signatures,
    duplicateSignatures,
  };
}

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

export function findMatchedKeyboardShortcutAction(
  event: KeyboardEventLike,
  actions: readonly KeyboardShortcutAction[]
): KeyboardShortcutAction | undefined {
  return actions.find((action) => isKeyboardShortcutMatched(event, action.shortcut, action));
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

export function handleKeyboardShortcuts(event: KeyboardEvent, actions: readonly KeyboardShortcutAction[]): boolean {
  const action = findMatchedKeyboardShortcutAction(event, actions);

  if (!action) {
    return false;
  }

  return handleKeyboardShortcut(event, action.shortcut, action.handler, action);
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
