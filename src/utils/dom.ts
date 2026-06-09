import { maxNumber, minNumber, parseFiniteFloat, roundTo, toIntegerAtLeast, toNonNegativeNumber } from "./number";

export type DomEventCleanup = () => void;
export type DomEventOptions = boolean | AddEventListenerOptions;
export type DomValueElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export interface FocusableElementOptions {
  selector?: string;
  includeDisabled?: boolean;
  includeHidden?: boolean;
  exclude?: Element | readonly (Element | null | undefined)[] | null;
}

export interface TextareaAutosizeOptions {
  rows?: number;
  minRows?: number;
  maxRows?: number;
  fallbackLineHeight?: number;
}

export interface TextareaAutosizeResult {
  height: number;
  minHeight: number;
  maxHeight?: number;
  overflowY: "auto" | "hidden";
}

export interface RectViewportSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface RectViewportSummary {
  viewportWidth: number;
  viewportHeight: number;
  width: number;
  height: number;
  spacing: RectViewportSpacing;
  overflow: RectViewportSpacing;
  visibleWidth: number;
  visibleHeight: number;
  visibleArea: number;
  partiallyVisible: boolean;
  fullyVisible: boolean;
}

export interface ElementStateSummary {
  exists: boolean;
  tagName: string;
  id: string;
  classNames: string[];
  visible: boolean;
  disabled: boolean;
  editable: boolean;
  focused: boolean;
  value: string;
}

export type DomEventPrimaryModifier = "ctrl" | "meta";

export interface DomEventModifierLike {
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

export interface DomEventModifierSummary {
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  primaryKey: boolean;
  hasModifier: boolean;
  modifierCount: number;
  labels: string[];
  signature: string;
}

export type PointerButtonName = "main" | "auxiliary" | "secondary" | "back" | "forward" | "unknown";

export interface PointerButtonLike {
  button?: number;
  buttons?: number;
}

export interface PointerButtonSummary {
  button: number;
  buttons: number;
  name: PointerButtonName;
  primary: boolean;
  auxiliary: boolean;
  secondary: boolean;
  back: boolean;
  forward: boolean;
  hasAnyPressed: boolean;
  pressedButtonNames: PointerButtonName[];
}

export interface ElementScrollSummary {
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  scrollWidth: number;
  clientHeight: number;
  clientWidth: number;
  distanceToBottom: number;
  distanceToRight: number;
  verticalScrollable: boolean;
  horizontalScrollable: boolean;
  nearBottom: boolean;
  nearRight: boolean;
  atTop: boolean;
  atLeft: boolean;
}

const CSS_PROPERTY_UPPER_REGEXP = /[A-Z]/g;
const CSS_SIZE_ALIAS_MAP: Record<string, string> = {
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
const noopCleanup: DomEventCleanup = () => {};
const POINTER_BUTTON_NAMES: Record<number, PointerButtonName> = {
  0: "main",
  1: "auxiliary",
  2: "secondary",
  3: "back",
  4: "forward",
};
const POINTER_BUTTON_MASKS: readonly [PointerButtonName, number][] = [
  ["main", 1],
  ["secondary", 2],
  ["auxiliary", 4],
  ["back", 8],
  ["forward", 16],
];

export function isNode(value: unknown): value is Node {
  return typeof Node !== "undefined" && value instanceof Node;
}

export function isElement(value: unknown): value is Element {
  return typeof Element !== "undefined" && value instanceof Element;
}

export function isHTMLElement(value: unknown): value is HTMLElement {
  return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}

export function isDocument(value: unknown): value is Document {
  return typeof Document !== "undefined" && value instanceof Document;
}

export function isHTMLInputElement(value: unknown): value is HTMLInputElement {
  return typeof HTMLInputElement !== "undefined" && value instanceof HTMLInputElement;
}

export function isHTMLButtonElement(value: unknown): value is HTMLButtonElement {
  return typeof HTMLButtonElement !== "undefined" && value instanceof HTMLButtonElement;
}

export function isHTMLAnchorElement(value: unknown): value is HTMLAnchorElement {
  return typeof HTMLAnchorElement !== "undefined" && value instanceof HTMLAnchorElement;
}

export function isHTMLTextAreaElement(value: unknown): value is HTMLTextAreaElement {
  return typeof HTMLTextAreaElement !== "undefined" && value instanceof HTMLTextAreaElement;
}

export function isHTMLSelectElement(value: unknown): value is HTMLSelectElement {
  return typeof HTMLSelectElement !== "undefined" && value instanceof HTMLSelectElement;
}

export function isDomValueElement(value: unknown): value is DomValueElement {
  return isHTMLInputElement(value) || isHTMLTextAreaElement(value) || isHTMLSelectElement(value);
}

export function isEditableElement(value: unknown): value is HTMLElement {
  if (isDomValueElement(value)) {
    return true;
  }

  if (!isHTMLElement(value)) {
    return false;
  }

  return value.isContentEditable || Boolean(value.closest("[contenteditable='true']"));
}

export function isEditableEventTarget(target: EventTarget | null): boolean {
  return isEditableElement(target);
}

export function getEventTargetNode(event: Event): Node | null {
  return isNode(event.target) ? event.target : null;
}

export function getEventTargetElement<T extends Element = Element>(event: Event): T | null {
  return isElement(event.target) ? (event.target as T) : null;
}

export function getEventCurrentTargetElement<T extends Element = Element>(event: Event): T | null {
  return isElement(event.currentTarget) ? (event.currentTarget as T) : null;
}

export function getEventTargetValueElement(event: Event): DomValueElement | null {
  return isDomValueElement(event.target) ? event.target : null;
}

export function getEventTargetValue(event: Event, fallback = ""): string {
  return getEventTargetValueElement(event)?.value ?? fallback;
}

export function setEventTargetValue(event: Event, value: string): boolean {
  const target = getEventTargetValueElement(event);

  if (!target) {
    return false;
  }

  target.value = value;
  return true;
}

export function getEventTargetChecked(event: Event, fallback = false): boolean {
  return isHTMLInputElement(event.target) ? event.target.checked : fallback;
}

export function setEventTargetChecked(event: Event, checked: boolean): boolean {
  const target = event.target;

  if (!isHTMLInputElement(target)) {
    return false;
  }

  target.checked = checked;
  return true;
}

export function preventDomEventDefault<T extends Event>(event: T): T {
  event.preventDefault();
  return event;
}

export function stopDomEventPropagation<T extends Event>(event: T): T {
  event.stopPropagation();
  return event;
}

export function preventAndStopDomEvent<T extends Event>(event: T): T {
  preventDomEventDefault(event);
  stopDomEventPropagation(event);
  return event;
}

export function summarizeDomEventModifiers(
  event: DomEventModifierLike,
  primary: DomEventPrimaryModifier = "ctrl"
): DomEventModifierSummary {
  const labels: string[] = [];
  const ctrlKey = Boolean(event.ctrlKey);
  const altKey = Boolean(event.altKey);
  const shiftKey = Boolean(event.shiftKey);
  const metaKey = Boolean(event.metaKey);

  if (ctrlKey) labels.push("Ctrl");
  if (altKey) labels.push("Alt");
  if (shiftKey) labels.push("Shift");
  if (metaKey) labels.push("Meta");

  return {
    ctrlKey,
    altKey,
    shiftKey,
    metaKey,
    primaryKey: primary === "meta" ? metaKey : ctrlKey,
    hasModifier: labels.length > 0,
    modifierCount: labels.length,
    labels,
    signature: labels.join("+").toLowerCase(),
  };
}

export function getPointerButtonName(button: unknown, fallback: PointerButtonName = "unknown"): PointerButtonName {
  return typeof button === "number" ? POINTER_BUTTON_NAMES[button] ?? fallback : fallback;
}

export function getPressedPointerButtonNames(buttons: unknown): PointerButtonName[] {
  const mask = typeof buttons === "number" ? buttons : 0;
  return POINTER_BUTTON_MASKS.filter(([, value]) => (mask & value) === value).map(([name]) => name);
}

export function summarizePointerButtons(event: PointerButtonLike): PointerButtonSummary {
  const button = typeof event.button === "number" ? event.button : -1;
  const buttons = typeof event.buttons === "number" ? event.buttons : 0;
  const pressedButtonNames = getPressedPointerButtonNames(buttons);

  return {
    button,
    buttons,
    name: getPointerButtonName(button),
    primary: pressedButtonNames.includes("main"),
    auxiliary: pressedButtonNames.includes("auxiliary"),
    secondary: pressedButtonNames.includes("secondary"),
    back: pressedButtonNames.includes("back"),
    forward: pressedButtonNames.includes("forward"),
    hasAnyPressed: pressedButtonNames.length > 0,
    pressedButtonNames,
  };
}

export function getEventTargetFiles(event: Event): FileList | null {
  return isHTMLInputElement(event.target) ? event.target.files : null;
}

export function isEventTargetInsideElement(event: Event, element: Element | null | undefined): boolean {
  const target = getEventTargetNode(event);
  return Boolean(target && element?.contains(target));
}

export function isNodeInsideElement(target: unknown, element: Element | null | undefined): boolean {
  return isNode(target) && Boolean(element?.contains(target));
}

export function isRelatedTargetInsideCurrentTarget(event: MouseEvent | DragEvent): boolean {
  return isElement(event.currentTarget) && isNodeInsideElement(event.relatedTarget, event.currentTarget);
}

export function isEventTargetInsideAny(event: Event, elements: readonly (Element | null | undefined)[]): boolean {
  return elements.some((element) => isEventTargetInsideElement(event, element));
}

export function getEventComposedPath(event: Event): EventTarget[] {
  return typeof event.composedPath === "function" ? event.composedPath() : [];
}

export function isElementInEventComposedPath(event: Event, element: EventTarget | null | undefined): boolean {
  return Boolean(element && getEventComposedPath(event).includes(element));
}

export function isEventTargetInsideAnyPath(event: Event, elements: readonly (Element | null | undefined)[]): boolean {
  return elements.some((element) => isElementInEventComposedPath(event, element)) || isEventTargetInsideAny(event, elements);
}

export function isEventFromInteractiveElement(event: Event, selector = INTERACTIVE_EVENT_TARGET_SELECTOR): boolean {
  const currentTarget = event.currentTarget;
  const path = getEventComposedPath(event);

  for (const target of path) {
    if (target === currentTarget) {
      break;
    }

    if (isElement(target) && target.matches(selector)) {
      return true;
    }
  }

  const target = event.target;

  if (!isElement(target) || target === currentTarget) {
    return false;
  }

  const interactiveElement = target.closest(selector);
  return Boolean(interactiveElement && interactiveElement !== currentTarget);
}

export function queryElements<T extends Element = Element>(root: ParentNode | null | undefined, selector: string): T[] {
  return Array.from(root?.querySelectorAll<T>(selector) ?? []);
}

export function isElementVisible(element: HTMLElement): boolean {
  return element.offsetParent !== null;
}

export function queryVisibleElements<T extends HTMLElement = HTMLElement>(root: ParentNode | null | undefined, selector: string): T[] {
  return queryElements<T>(root, selector).filter(isElementVisible);
}

function normalizeExcludedElements(exclude: FocusableElementOptions["exclude"]): Element[] {
  if (!exclude) {
    return [];
  }

  return (Array.isArray(exclude) ? exclude : [exclude]).filter(isElement);
}

export function isFocusableElement(element: HTMLElement, options: FocusableElementOptions = {}): boolean {
  if (!options.includeDisabled) {
    if (element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true") {
      return false;
    }

    if ("disabled" in element && Boolean((element as HTMLButtonElement).disabled)) {
      return false;
    }
  }

  if (!options.includeHidden) {
    if (element.getAttribute("aria-hidden") === "true") {
      return false;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }
  }

  return true;
}

export function queryFocusableElements<T extends HTMLElement = HTMLElement>(
  root: ParentNode | null | undefined,
  options: FocusableElementOptions = {}
): T[] {
  const excludedElements = normalizeExcludedElements(options.exclude);

  return queryElements<T>(root, options.selector ?? FOCUSABLE_ELEMENT_SELECTOR)
    .filter((element) => !excludedElements.some((excludedElement) => excludedElement.contains(element)))
    .filter((element) => isFocusableElement(element, options));
}

export function getActiveHTMLElement(doc: Document = document): HTMLElement | null {
  return isHTMLElement(doc.activeElement) ? doc.activeElement : null;
}

export function isActiveElement(element: Element | null | undefined, doc: Document = document): boolean {
  return Boolean(element && doc.activeElement === element);
}

export function getFocusableElementIndex(
  root: ParentNode | null | undefined,
  element: Element | null | undefined,
  options: FocusableElementOptions = {}
): number {
  if (!element) {
    return -1;
  }

  return queryFocusableElements(root, options).findIndex((item) => item === element);
}

export function getActiveFocusableElementIndex(
  root: ParentNode | null | undefined,
  options: FocusableElementOptions = {},
  doc: Document = document
): number {
  return getFocusableElementIndex(root, getActiveHTMLElement(doc), options);
}

export function focusElement(element: HTMLElement | null | undefined, options?: FocusOptions): void {
  element?.focus(options);
}

export function focusElementPreventScroll(element: HTMLElement | null | undefined): void {
  focusElement(element, { preventScroll: true });
}

export function focusFirstElement(
  root: ParentNode | null | undefined,
  options: FocusableElementOptions = {},
  focusOptions?: FocusOptions
): boolean {
  const element = queryFocusableElements(root, options)[0];

  if (!element) {
    return false;
  }

  focusElement(element, focusOptions);
  return true;
}

export function focusLastElement(
  root: ParentNode | null | undefined,
  options: FocusableElementOptions = {},
  focusOptions?: FocusOptions
): boolean {
  const elements = queryFocusableElements(root, options);
  const element = elements[elements.length - 1];

  if (!element) {
    return false;
  }

  focusElement(element, focusOptions);
  return true;
}

export function focusElementIntoView(
  element: HTMLElement | null | undefined,
  focusOptions: FocusOptions = { preventScroll: true },
  scrollOptions: ScrollIntoViewOptions = { block: "nearest", inline: "nearest" }
): void {
  focusElement(element, focusOptions);
  element?.scrollIntoView(scrollOptions);
}

export function blurElement(element: HTMLElement | null | undefined): void {
  element?.blur();
}

export function setBodyOverflow(value: string, doc: Document = document): string {
  const previousValue = doc.body.style.overflow;
  doc.body.style.overflow = value;
  return previousValue;
}

export function toggleElementClass(element: Element | null | undefined, className: string, force?: boolean): boolean {
  return element?.classList.toggle(className, force) ?? false;
}

export function setElementClasses(element: Element | null | undefined, classes: Record<string, boolean>): void {
  if (!element) {
    return;
  }

  Object.entries(classes).forEach(([className, enabled]) => {
    toggleElementClass(element, className, enabled);
  });
}

export function setElementDataset(element: HTMLElement | null | undefined, values: Record<string, string | number | boolean | null | undefined>): void {
  if (!element) {
    return;
  }

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      delete element.dataset[key];
      return;
    }

    element.dataset[key] = String(value);
  });
}

export function getElementDatasetValue(element: HTMLElement | null | undefined, key: string, fallback = ""): string {
  return element?.dataset[key] ?? fallback;
}

export function setElementAttributes(
  element: Element | null | undefined,
  attributes: Record<string, string | number | boolean | null | undefined>
): void {
  if (!element) {
    return;
  }

  Object.entries(attributes).forEach(([name, value]) => {
    if (value === undefined || value === null) {
      element.removeAttribute(name);
      return;
    }

    element.setAttribute(name, String(value));
  });
}

export function removeElementAttributes(element: Element | null | undefined, names: readonly string[]): void {
  if (!element) {
    return;
  }

  names.forEach((name) => {
    element.removeAttribute(name);
  });
}

export function getElementAttributeMap(
  element: Element | null | undefined,
  names: readonly string[],
  fallback = ""
): Record<string, string> {
  return Object.fromEntries(names.map((name) => [name, element?.getAttribute(name) ?? fallback]));
}

export function normalizeCssPropertyName(property: string): string {
  return property.replace(CSS_PROPERTY_UPPER_REGEXP, (match) => `-${match.toLowerCase()}`);
}

export function parseCssPixelValue(value: unknown, fallback = 0): number {
  return parseFiniteFloat(value, fallback);
}

export function getComputedCssValue(element: Element | null | undefined, property: string, fallback = ""): string {
  if (!element || typeof window === "undefined") return fallback;
  const styles = window.getComputedStyle(element);
  return styles.getPropertyValue(normalizeCssPropertyName(property)) || fallback;
}

export function getComputedCssPixelValue(element: Element | null | undefined, property: string, fallback = 0): number {
  return parseCssPixelValue(getComputedCssValue(element, property), fallback);
}

export function formatCssPixelValue(value: unknown, fallback = 0): string {
  return `${parseCssPixelValue(value, fallback)}px`;
}

export function formatRoundedCssPixelValue(value: unknown, fallback = 0): string {
  return formatCssPixelValue(roundTo(parseCssPixelValue(value, fallback)));
}

export function formatCssPercentValue(value: unknown, fallback = 0): string {
  return `${parseCssPixelValue(value, fallback)}%`;
}

export function formatCssLengthValue(value: unknown, fallback: string | number = 0): string {
  if (typeof value === "number") {
    return formatCssPixelValue(value);
  }

  if (typeof value === "string") {
    const text = value.trim();

    if (!text) {
      return formatCssLengthValue(fallback);
    }

    return /^-?\d+(?:\.\d+)?$/.test(text) ? formatCssPixelValue(text) : text;
  }

  return typeof fallback === "string" ? fallback : formatCssPixelValue(fallback);
}

export function resolveCssSizeAlias(value: string, aliases: Record<string, string> = CSS_SIZE_ALIAS_MAP): string {
  const text = value.trim();
  return aliases[text] ?? text;
}

export function resolveCssLengthValue(value: unknown, fallback: string | number = 0, aliases: Record<string, string> = CSS_SIZE_ALIAS_MAP): string {
  return resolveCssSizeAlias(formatCssLengthValue(value, fallback), aliases);
}

export function setElementStyle(element: HTMLElement | null | undefined, styles: Record<string, string | number | null | undefined>): void {
  if (!element) {
    return;
  }

  Object.entries(styles).forEach(([property, value]) => {
    element.style.setProperty(normalizeCssPropertyName(property), value === undefined || value === null ? "" : String(value));
  });
}

export function setElementCssVariables(element: HTMLElement | null | undefined, variables: Record<string, string | number | null | undefined>): void {
  if (!element) {
    return;
  }

  Object.entries(variables).forEach(([name, value]) => {
    const property = name.startsWith("--") ? name : `--${normalizeCssPropertyName(name)}`;
    element.style.setProperty(property, value === undefined || value === null ? "" : String(value));
  });
}

export function getElementRect(element: Element | null | undefined): DOMRect | null {
  return element?.getBoundingClientRect() ?? null;
}

export function getViewportAvailableWidth(
  padding = 0,
  minWidth = 0,
  root: Window | null = typeof window === "undefined" ? null : window
): number {
  const safeMinWidth = toNonNegativeNumber(minWidth);
  return root ? maxNumber([root.innerWidth - toNonNegativeNumber(padding) * 2, safeMinWidth], safeMinWidth) : safeMinWidth;
}

export function getViewportAvailableHeight(
  padding = 0,
  minHeight = 0,
  root: Window | null = typeof window === "undefined" ? null : window
): number {
  const safeMinHeight = toNonNegativeNumber(minHeight);
  return root ? maxNumber([root.innerHeight - toNonNegativeNumber(padding) * 2, safeMinHeight], safeMinHeight) : safeMinHeight;
}

export function isRectPartiallyInViewport(rect: DOMRect | null | undefined, root: Window | null = typeof window === "undefined" ? null : window): boolean {
  if (!rect || !root) {
    return false;
  }

  return rect.bottom > 0 && rect.right > 0 && rect.top < root.innerHeight && rect.left < root.innerWidth;
}

export function getRectViewportSpacing(
  rect: DOMRect | null | undefined,
  root: Window | null = typeof window === "undefined" ? null : window
): RectViewportSpacing {
  if (!rect || !root) {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
  }

  return {
    top: rect.top,
    right: root.innerWidth - rect.right,
    bottom: root.innerHeight - rect.bottom,
    left: rect.left,
  };
}

export function summarizeRectInViewport(
  rect: DOMRect | null | undefined,
  root: Window | null = typeof window === "undefined" ? null : window
): RectViewportSummary {
  const viewportWidth = root?.innerWidth ?? 0;
  const viewportHeight = root?.innerHeight ?? 0;
  const width = rect?.width ?? 0;
  const height = rect?.height ?? 0;
  const spacing = getRectViewportSpacing(rect, root);
  const overflow = {
    top: Math.max(0, -spacing.top),
    right: Math.max(0, -spacing.right),
    bottom: Math.max(0, -spacing.bottom),
    left: Math.max(0, -spacing.left),
  };
  const visibleWidth = rect && root ? Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0)) : 0;
  const visibleHeight = rect && root ? Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0)) : 0;
  const partiallyVisible = visibleWidth > 0 && visibleHeight > 0;
  const fullyVisible = Boolean(
    rect &&
    root &&
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= viewportHeight &&
    rect.right <= viewportWidth
  );

  return {
    viewportWidth,
    viewportHeight,
    width,
    height,
    spacing,
    overflow,
    visibleWidth,
    visibleHeight,
    visibleArea: visibleWidth * visibleHeight,
    partiallyVisible,
    fullyVisible,
  };
}

export function isElementPartiallyInViewport(element: Element | null | undefined, root: Window | null = typeof window === "undefined" ? null : window): boolean {
  return isRectPartiallyInViewport(getElementRect(element), root);
}

export function isElementInViewport(element: Element | null | undefined, root: Window | null = typeof window === "undefined" ? null : window): boolean {
  const rect = getElementRect(element);

  if (!rect || !root) {
    return false;
  }

  return rect.top >= 0 && rect.left >= 0 && rect.bottom <= root.innerHeight && rect.right <= root.innerWidth;
}

export function scrollElementIntoViewIfNeeded(element: Element | null | undefined, options: ScrollIntoViewOptions = { block: "nearest" }): void {
  if (element && !isElementInViewport(element)) {
    element.scrollIntoView(options);
  }
}

export function getScrollDistanceToBottom(element: HTMLElement | null | undefined, fallback = 0): number {
  return element ? element.scrollHeight - element.scrollTop - element.clientHeight : fallback;
}

export function getScrollDistanceToRight(element: HTMLElement | null | undefined, fallback = 0): number {
  return element ? element.scrollWidth - element.scrollLeft - element.clientWidth : fallback;
}

export function isScrollNearRight(element: HTMLElement | null | undefined, threshold = 0): boolean {
  return getScrollDistanceToRight(element, Number.POSITIVE_INFINITY) <= Math.max(0, threshold);
}

export function summarizeElementScroll(element: HTMLElement | null | undefined, threshold = 0): ElementScrollSummary {
  const scrollTop = element?.scrollTop ?? 0;
  const scrollLeft = element?.scrollLeft ?? 0;
  const scrollHeight = element?.scrollHeight ?? 0;
  const scrollWidth = element?.scrollWidth ?? 0;
  const clientHeight = element?.clientHeight ?? 0;
  const clientWidth = element?.clientWidth ?? 0;
  const distanceToBottom = getScrollDistanceToBottom(element);
  const distanceToRight = getScrollDistanceToRight(element);
  const safeThreshold = Math.max(0, threshold);

  return {
    scrollTop,
    scrollLeft,
    scrollHeight,
    scrollWidth,
    clientHeight,
    clientWidth,
    distanceToBottom,
    distanceToRight,
    verticalScrollable: scrollHeight > clientHeight,
    horizontalScrollable: scrollWidth > clientWidth,
    nearBottom: distanceToBottom <= safeThreshold,
    nearRight: distanceToRight <= safeThreshold,
    atTop: scrollTop <= safeThreshold,
    atLeft: scrollLeft <= safeThreshold,
  };
}

export function getClampedElementScrollHeight(element: HTMLElement | null | undefined, minHeight = 0, maxHeight?: number): number {
  const nextHeight = element ? maxNumber([element.scrollHeight, minHeight], minHeight) : toNonNegativeNumber(minHeight);
  return typeof maxHeight === "number" ? minNumber([nextHeight, maxHeight], nextHeight) : nextHeight;
}

export function autosizeTextarea(
  element: HTMLTextAreaElement | null | undefined,
  options: TextareaAutosizeOptions = {}
): TextareaAutosizeResult | null {
  if (!element) {
    return null;
  }

  const lineHeight = getComputedCssPixelValue(element, "lineHeight", options.fallbackLineHeight ?? 20);
  const minRows = toIntegerAtLeast(options.minRows ?? options.rows ?? 1, 1, 1);
  const maxRows = options.maxRows ? toIntegerAtLeast(options.maxRows, 1, 1) : undefined;
  const minHeight = minRows * lineHeight;
  const maxHeight = maxRows ? maxRows * lineHeight : undefined;

  element.style.height = "auto";
  const height = getClampedElementScrollHeight(element, minHeight, maxHeight);
  const overflowY = maxHeight && element.scrollHeight > maxHeight ? "auto" : "hidden";
  element.style.height = formatCssPixelValue(height);
  element.style.overflowY = overflowY;

  return {
    height,
    minHeight,
    maxHeight,
    overflowY,
  };
}

export function isScrollNearBottom(element: HTMLElement | null | undefined, threshold = 0): boolean {
  return getScrollDistanceToBottom(element, Number.POSITIVE_INFINITY) <= Math.max(0, threshold);
}

export function scrollElementToBottom(element: HTMLElement | null | undefined, behavior: ScrollBehavior = "smooth"): void {
  element?.scrollTo({
    top: element.scrollHeight,
    behavior,
  });
}

export function summarizeElementState(
  element: HTMLElement | null | undefined,
  doc: Document | null = typeof document === "undefined" ? null : document
): ElementStateSummary {
  return {
    exists: Boolean(element),
    tagName: element?.tagName.toLowerCase() ?? "",
    id: element?.id ?? "",
    classNames: element ? Array.from(element.classList) : [],
    visible: element ? isElementVisible(element) : false,
    disabled: Boolean(element?.hasAttribute("disabled") || element?.getAttribute("aria-disabled") === "true"),
    editable: isEditableElement(element),
    focused: Boolean(element && doc?.activeElement === element),
    value: isDomValueElement(element) ? element.value : element?.textContent ?? "",
  };
}

export function createLineClampStyle(lineCount: unknown, minLines = 1): Record<string, string> {
  return {
    WebkitLineClamp: String(toIntegerAtLeast(lineCount, minLines)),
  };
}

export function addDomEventListener<K extends keyof WindowEventMap>(
  target: Window | null | undefined,
  type: K,
  listener: (event: WindowEventMap[K]) => void,
  options?: DomEventOptions
): DomEventCleanup;
export function addDomEventListener<K extends keyof DocumentEventMap>(
  target: Document | null | undefined,
  type: K,
  listener: (event: DocumentEventMap[K]) => void,
  options?: DomEventOptions
): DomEventCleanup;
export function addDomEventListener(
  target: EventTarget | null | undefined,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: DomEventOptions
): DomEventCleanup;
export function addDomEventListener(
  target: EventTarget | null | undefined,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: DomEventOptions
): DomEventCleanup {
  if (!target) {
    return noopCleanup;
  }

  target.addEventListener(type, listener, options);
  let active = true;

  return () => {
    if (!active) {
      return;
    }

    target.removeEventListener(type, listener, options);
    active = false;
  };
}

export interface DomEventListenerConfig {
  target: EventTarget | null | undefined;
  type: string;
  listener: EventListenerOrEventListenerObject;
  options?: DomEventOptions;
}

export function addDomEventListeners(listeners: readonly DomEventListenerConfig[]): DomEventCleanup {
  return mergeDomEventCleanups(listeners.map(({ target, type, listener, options }) => addDomEventListener(target, type, listener, options)));
}

export function cleanupDomEventListeners(cleanups: readonly DomEventCleanup[]): void {
  cleanups.forEach((cleanup) => cleanup());
}

export function mergeDomEventCleanups(cleanups: readonly DomEventCleanup[]): DomEventCleanup {
  let pendingCleanups = [...cleanups];

  return () => {
    cleanupDomEventListeners(pendingCleanups);
    pendingCleanups = [];
  };
}

export function dispatchWindowCustomEvent<T = unknown>(
  type: string,
  detail?: T,
  init: Omit<CustomEventInit<T>, "detail"> = {}
): boolean {
  return window.dispatchEvent(new CustomEvent<T>(type, { ...init, detail }));
}
