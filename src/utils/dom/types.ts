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

export interface DomEventListenerConfig {
  target: EventTarget | null | undefined;
  type: string;
  listener: EventListenerOrEventListenerObject;
  options?: DomEventOptions;
}
