import { parseFiniteFloat, toIntegerAtLeast } from "./number";

export type DomEventCleanup = () => void;
export type DomEventOptions = boolean | AddEventListenerOptions;
export type DomValueElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const CSS_PROPERTY_UPPER_REGEXP = /[A-Z]/g;
const noopCleanup: DomEventCleanup = () => {};

export function isNode(value: unknown): value is Node {
  return typeof Node !== "undefined" && value instanceof Node;
}

export function isElement(value: unknown): value is Element {
  return typeof Element !== "undefined" && value instanceof Element;
}

export function isHTMLElement(value: unknown): value is HTMLElement {
  return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}

export function isHTMLInputElement(value: unknown): value is HTMLInputElement {
  return typeof HTMLInputElement !== "undefined" && value instanceof HTMLInputElement;
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

export function getEventTargetNode(event: Event): Node | null {
  return isNode(event.target) ? event.target : null;
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

export function queryElements<T extends Element = Element>(root: ParentNode | null | undefined, selector: string): T[] {
  return Array.from(root?.querySelectorAll<T>(selector) ?? []);
}

export function isElementVisible(element: HTMLElement): boolean {
  return element.offsetParent !== null;
}

export function queryVisibleElements<T extends HTMLElement = HTMLElement>(root: ParentNode | null | undefined, selector: string): T[] {
  return queryElements<T>(root, selector).filter(isElementVisible);
}

export function getActiveHTMLElement(doc: Document = document): HTMLElement | null {
  return isHTMLElement(doc.activeElement) ? doc.activeElement : null;
}

export function focusElement(element: HTMLElement | null | undefined, options?: FocusOptions): void {
  element?.focus(options);
}

export function setBodyOverflow(value: string, doc: Document = document): string {
  const previousValue = doc.body.style.overflow;
  doc.body.style.overflow = value;
  return previousValue;
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
