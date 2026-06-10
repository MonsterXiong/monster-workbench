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
