import type {
  FormatKeyboardShortcutsOptions,
  KeyboardEventLike,
  KeyboardEventSummary,
  KeyboardShortcut,
  KeyboardShortcutActionConfig,
  KeyboardShortcutActionSummary,
  KeyboardShortcutSummary,
} from "./types";
import {
  formatKeyboardKey,
  getKeyboardBoundaryPosition,
  getKeyboardNavigationDirection,
  hasKeyboardModifier,
  isActivationKey,
  isEscapeKey,
  isPlainKeyboardEvent,
} from "./core";
import {
  formatKeyboardShortcut,
  getKeyboardShortcutSignature,
  keyboardShortcutFromEvent,
  normalizeKeyboardShortcut,
  toAriaKeyShortcutsList,
} from "./shortcuts";

export function summarizeKeyboardEvent(
  event: KeyboardEventLike & { code?: string },
  options: { forwardKeys?: readonly string[]; backwardKeys?: readonly string[] } = {}
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

/** 执行结构化特征分析并返回报告。 */
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
