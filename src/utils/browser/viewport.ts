import { getNavigator } from "./platform";
import type { MediaQuerySummary, ViewportBreakpoint, ViewportBreakpointSummary, ViewportOrientation, ViewportSize, ViewportSummary } from "./types";

export function getViewportSize(win: Window | null = typeof window === "undefined" ? null : window): ViewportSize {
  return {
    width: win?.innerWidth ?? 0,
    height: win?.innerHeight ?? 0,
  };
}

export function getViewportOrientation(size: ViewportSize = getViewportSize()): ViewportOrientation {
  if (size.width === size.height) {
    return "square";
  }

  return size.width > size.height ? "landscape" : "portrait";
}

export function isViewportAtLeast(width: number, height = 0, win: Window | null = typeof window === "undefined" ? null : window): boolean {
  const size = getViewportSize(win);
  return size.width >= width && size.height >= height;
}

export function isViewportBelow(width: number, win: Window | null = typeof window === "undefined" ? null : window): boolean {
  return getViewportSize(win).width < width;
}

export function getViewportBreakpoint(
  breakpoints: readonly ViewportBreakpoint[],
  win: Window | null = typeof window === "undefined" ? null : window,
  fallback = ""
): string {
  const width = getViewportSize(win).width;
  const matched = [...breakpoints].sort((left, right) => left.minWidth - right.minWidth).filter((breakpoint) => width >= breakpoint.minWidth);

  return matched[matched.length - 1]?.key ?? fallback;
}

export function summarizeViewportBreakpoints(
  breakpoints: readonly ViewportBreakpoint[],
  win: Window | null = typeof window === "undefined" ? null : window,
  fallback = ""
): ViewportBreakpointSummary {
  const size = getViewportSize(win);
  const matchedBreakpoints = [...breakpoints].sort((left, right) => left.minWidth - right.minWidth).filter((breakpoint) => size.width >= breakpoint.minWidth).map((breakpoint) => breakpoint.key);

  return {
    ...size,
    breakpoint: matchedBreakpoints[matchedBreakpoints.length - 1] ?? fallback,
    matchedBreakpoints,
  };
}

export function getDevicePixelRatio(win: Window | null = typeof window === "undefined" ? null : window, fallback = 1): number {
  return win?.devicePixelRatio || fallback;
}

export function matchesMediaQuery(query: string, fallback = false, win: Window | null = typeof window === "undefined" ? null : window): boolean {
  if (!query || !win?.matchMedia) {
    return fallback;
  }

  return win.matchMedia(query).matches;
}

export function summarizeMediaQuery(query: string, fallback = false, win: Window | null = typeof window === "undefined" ? null : window): MediaQuerySummary {
  const supported = Boolean(query && win?.matchMedia);

  return {
    query,
    supported,
    matches: supported ? matchesMediaQuery(query, fallback, win) : fallback,
  };
}

export function summarizeMediaQueries(
  queries: readonly string[],
  fallback = false,
  win: Window | null = typeof window === "undefined" ? null : window
): MediaQuerySummary[] {
  return queries.map((query) => summarizeMediaQuery(query, fallback, win));
}

export function prefersDarkColorScheme(win: Window | null = typeof window === "undefined" ? null : window): boolean {
  return matchesMediaQuery("(prefers-color-scheme: dark)", false, win);
}

export function prefersReducedMotion(win: Window | null = typeof window === "undefined" ? null : window): boolean {
  return matchesMediaQuery("(prefers-reduced-motion: reduce)", false, win);
}

export function hasCoarsePointer(win: Window | null = typeof window === "undefined" ? null : window): boolean {
  return matchesMediaQuery("(pointer: coarse)", false, win);
}

export function hasHoverSupport(win: Window | null = typeof window === "undefined" ? null : window): boolean {
  return matchesMediaQuery("(hover: hover)", false, win);
}

export function isStandaloneDisplayMode(win: Window | null = typeof window === "undefined" ? null : window, nav: Navigator | null = getNavigator()): boolean {
  const standaloneNavigator = nav as { standalone?: boolean } | null;
  return matchesMediaQuery("(display-mode: standalone)", false, win) || standaloneNavigator?.standalone === true;
}

export function isTouchDevice(win: Window | null = typeof window === "undefined" ? null : window, nav: Navigator | null = getNavigator()): boolean {
  return Boolean((win && "ontouchstart" in win) || (nav?.maxTouchPoints ?? 0) > 0);
}

export function getViewportSummary(win: Window | null = typeof window === "undefined" ? null : window, nav: Navigator | null = getNavigator()): ViewportSummary {
  const size = getViewportSize(win);

  return {
    ...size,
    orientation: getViewportOrientation(size),
    devicePixelRatio: getDevicePixelRatio(win),
    touch: isTouchDevice(win, nav),
  };
}
