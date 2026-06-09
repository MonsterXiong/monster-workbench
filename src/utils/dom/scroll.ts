import { maxNumber, minNumber, toIntegerAtLeast, toNonNegativeNumber } from "../number";
import { formatCssPixelValue, getComputedCssPixelValue } from "./css";
import type { ElementScrollSummary, TextareaAutosizeOptions, TextareaAutosizeResult } from "./types";

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
