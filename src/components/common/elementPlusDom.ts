import { nextTick } from "vue";

export type ElementPlusControlRef = HTMLElement | { $el?: Element | null } | null;
export type ElementPlusComponentSize = "small" | "default" | "large";
export type ProjectControlSize = "xs" | "sm" | "md" | "lg";

export function getElementPlusControlRoot(control: ElementPlusControlRef) {
  if (!control) return null;
  if (control instanceof HTMLElement) return control;
  return control.$el instanceof HTMLElement ? control.$el : null;
}

export async function syncElementPlusClearButtonLabel(
  control: ElementPlusControlRef,
  selector: string,
  label: string
) {
  await nextTick();

  const clearButton = getElementPlusControlRoot(control)?.querySelector<HTMLElement>(selector);
  if (!clearButton) return;

  clearButton.setAttribute("aria-label", label);
  clearButton.setAttribute("title", label);
}

export function toElementPlusSize(size?: ProjectControlSize): ElementPlusComponentSize {
  if (size === "xs" || size === "sm") return "small";
  if (size === "lg") return "large";
  return "default";
}
