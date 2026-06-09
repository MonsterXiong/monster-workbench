import { maxNumber, toNonNegativeNumber } from "../number";
import type { RectViewportSpacing, RectViewportSummary } from "./types";

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
