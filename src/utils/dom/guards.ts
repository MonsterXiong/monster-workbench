import type { DomValueElement } from "./types";

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
