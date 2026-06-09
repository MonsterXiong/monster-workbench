import { createTimeout } from "./async";

export interface ViewportSize {
  width: number;
  height: number;
}

export function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function getWindow(fallback: Window | null = null): Window | null {
  return typeof window === "undefined" ? fallback : window;
}

export function getDocument(fallback: Document | null = null): Document | null {
  return typeof document === "undefined" ? fallback : document;
}

export function getNavigator(fallback: Navigator | null = null): Navigator | null {
  return typeof navigator === "undefined" ? fallback : navigator;
}

export function getLocation(fallback: Location | null = null): Location | null {
  return typeof window === "undefined" ? fallback : window.location;
}

export function getUserAgent(nav: Navigator | null = getNavigator()): string {
  return nav?.userAgent ?? "";
}

export function isWindowsUserAgent(userAgent = getUserAgent()): boolean {
  return userAgent.includes("Windows");
}

export function isMacUserAgent(userAgent = getUserAgent()): boolean {
  return /Macintosh|Mac OS X/i.test(userAgent);
}

export function isMobileUserAgent(userAgent = getUserAgent()): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
}

export function isOnline(nav: Navigator | null = getNavigator(), fallback = true): boolean {
  return typeof nav?.onLine === "boolean" ? nav.onLine : fallback;
}

export function isOffline(nav: Navigator | null = getNavigator(), fallback = false): boolean {
  return typeof nav?.onLine === "boolean" ? !nav.onLine : fallback;
}

export function getViewportSize(win: Window | null = getWindow()): ViewportSize {
  return {
    width: win?.innerWidth ?? 0,
    height: win?.innerHeight ?? 0,
  };
}

export function getDevicePixelRatio(win: Window | null = getWindow(), fallback = 1): number {
  return win?.devicePixelRatio || fallback;
}

export function matchesMediaQuery(query: string, fallback = false, win: Window | null = getWindow()): boolean {
  if (!query || !win?.matchMedia) {
    return fallback;
  }

  return win.matchMedia(query).matches;
}

export function prefersDarkColorScheme(win: Window | null = getWindow()): boolean {
  return matchesMediaQuery("(prefers-color-scheme: dark)", false, win);
}

export function prefersReducedMotion(win: Window | null = getWindow()): boolean {
  return matchesMediaQuery("(prefers-reduced-motion: reduce)", false, win);
}

export function isTouchDevice(win: Window | null = getWindow(), nav: Navigator | null = getNavigator()): boolean {
  return Boolean((win && "ontouchstart" in win) || (nav?.maxTouchPoints ?? 0) > 0);
}

export function reloadPage(loc: Location | null = getLocation()): void {
  loc?.reload();
}

export function reloadPageAfterDelay(delayMs: number, loc: Location | null = getLocation()): void {
  createTimeout(() => reloadPage(loc), delayMs);
}
