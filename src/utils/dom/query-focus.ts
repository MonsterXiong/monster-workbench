import { FOCUSABLE_ELEMENT_SELECTOR } from "./constants";
import { isElement, isHTMLElement } from "./guards";
import type { FocusableElementOptions } from "./types";

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
