import { toIntegerAtLeast } from "../number";
import { isDomValueElement, isEditableElement } from "./guards";
import { isElementVisible } from "./query-focus";
import type { ElementStateSummary } from "./types";

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
