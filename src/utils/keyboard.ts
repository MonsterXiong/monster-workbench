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

const KEY_ALIASES: Record<string, string> = {
  cmd: "meta",
  command: "meta",
  control: "ctrl",
  esc: "escape",
  return: "enter",
  space: " ",
};

function normalizeShortcutPart(value: string): string {
  const normalizedValue = value.trim().toLowerCase();
  return KEY_ALIASES[normalizedValue] ?? normalizedValue;
}

export function parseKeyboardShortcut(value: string): KeyboardShortcut {
  const parts = value
    .split("+")
    .map(normalizeShortcutPart)
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

export function isKeyboardShortcutMatched(event: KeyboardEventLike, shortcut: string | KeyboardShortcut): boolean {
  const parsedShortcut = typeof shortcut === "string" ? parseKeyboardShortcut(shortcut) : shortcut;
  const eventKey = normalizeShortcutPart(event.key);

  return (
    eventKey === parsedShortcut.key &&
    Boolean(event.ctrlKey) === parsedShortcut.ctrlKey &&
    Boolean(event.altKey) === parsedShortcut.altKey &&
    Boolean(event.shiftKey) === parsedShortcut.shiftKey &&
    Boolean(event.metaKey) === parsedShortcut.metaKey
  );
}
