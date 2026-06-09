import { INTERACTIVE_EVENT_TARGET_SELECTOR, noopCleanup, POINTER_BUTTON_MASKS, POINTER_BUTTON_NAMES } from "./constants";
import {
  isDomValueElement,
  isElement,
  isHTMLInputElement,
  isNode,
} from "./guards";
import type {
  DomEventCleanup,
  DomEventListenerConfig,
  DomEventModifierLike,
  DomEventModifierSummary,
  DomEventOptions,
  DomEventPrimaryModifier,
  DomValueElement,
  PointerButtonLike,
  PointerButtonName,
  PointerButtonSummary,
} from "./types";

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
