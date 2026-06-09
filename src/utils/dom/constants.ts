import type { DomEventCleanup, PointerButtonName } from "./types";

export const CSS_PROPERTY_UPPER_REGEXP = /[A-Z]/g;

export const CSS_SIZE_ALIAS_MAP: Record<string, string> = {
  "max-w-xs": "320px",
  "max-w-sm": "384px",
  "max-w-md": "448px",
  "max-w-lg": "512px",
  "max-w-xl": "576px",
  "max-w-2xl": "672px",
  "max-w-3xl": "768px",
  "max-w-4xl": "896px",
  "max-w-5xl": "1024px",
  "max-w-6xl": "1152px",
  "max-w-7xl": "1280px",
};

export const FOCUSABLE_ELEMENT_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export const INTERACTIVE_EVENT_TARGET_SELECTOR = [
  FOCUSABLE_ELEMENT_SELECTOR,
  "label",
  "summary",
  "[contenteditable='true']",
  "[role='checkbox']",
  "[role='link']",
  "[role='menuitem']",
  "[role='option']",
  "[role='radio']",
  "[role='switch']",
  "[data-ignore-container-click]",
].join(",");

export const noopCleanup: DomEventCleanup = () => {};

export const POINTER_BUTTON_NAMES: Record<number, PointerButtonName> = {
  0: "main",
  1: "auxiliary",
  2: "secondary",
  3: "back",
  4: "forward",
};

export const POINTER_BUTTON_MASKS: readonly [PointerButtonName, number][] = [
  ["main", 1],
  ["secondary", 2],
  ["auxiliary", 4],
  ["back", 8],
  ["forward", 16],
];
