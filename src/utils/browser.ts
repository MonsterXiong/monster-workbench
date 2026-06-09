import { createTimeout } from "./async";

export interface ViewportSize {
  width: number;
  height: number;
}

export type ViewportOrientation = "landscape" | "portrait" | "square";

export interface ViewportSummary extends ViewportSize {
  orientation: ViewportOrientation;
  devicePixelRatio: number;
  touch: boolean;
}

export type BrowserPlatform = "windows" | "mac" | "mobile" | "unknown";

export interface ViewportBreakpoint {
  key: string;
  minWidth: number;
}

export interface ViewportBreakpointSummary extends ViewportSize {
  breakpoint: string;
  matchedBreakpoints: string[];
}

export interface BrowserEnvironmentSummary extends ViewportSummary {
  browser: boolean;
  online: boolean;
  offline: boolean;
  userAgent: string;
  platform: BrowserPlatform;
  prefersDark: boolean;
  prefersReducedMotion: boolean;
}

export interface MediaQuerySummary {
  query: string;
  supported: boolean;
  matches: boolean;
}

export interface BrowserCapabilitySummary {
  browser: boolean;
  online: boolean;
  offline: boolean;
  touch: boolean;
  coarsePointer: boolean;
  hover: boolean;
  clipboard: boolean;
  cookieEnabled: boolean;
  languages: string[];
  standalone: boolean;
}

export interface LocationSnapshot {
  href: string;
  origin: string;
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
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

export function getNavigatorLanguages(nav: Navigator | null = getNavigator()): string[] {
  return Array.from(nav?.languages ?? (nav?.language ? [nav.language] : []));
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

export function getViewportOrientation(size: ViewportSize = getViewportSize()): ViewportOrientation {
  if (size.width === size.height) {
    return "square";
  }

  return size.width > size.height ? "landscape" : "portrait";
}

export function isViewportAtLeast(width: number, height = 0, win: Window | null = getWindow()): boolean {
  const size = getViewportSize(win);
  return size.width >= width && size.height >= height;
}

export function isViewportBelow(width: number, win: Window | null = getWindow()): boolean {
  return getViewportSize(win).width < width;
}

export function getViewportBreakpoint(
  breakpoints: readonly ViewportBreakpoint[],
  win: Window | null = getWindow(),
  fallback = ""
): string {
  const width = getViewportSize(win).width;
  const matched = [...breakpoints]
    .sort((left, right) => left.minWidth - right.minWidth)
    .filter((breakpoint) => width >= breakpoint.minWidth);

  return matched[matched.length - 1]?.key ?? fallback;
}

export function summarizeViewportBreakpoints(
  breakpoints: readonly ViewportBreakpoint[],
  win: Window | null = getWindow(),
  fallback = ""
): ViewportBreakpointSummary {
  const size = getViewportSize(win);
  const matchedBreakpoints = [...breakpoints]
    .sort((left, right) => left.minWidth - right.minWidth)
    .filter((breakpoint) => size.width >= breakpoint.minWidth)
    .map((breakpoint) => breakpoint.key);

  return {
    ...size,
    breakpoint: matchedBreakpoints[matchedBreakpoints.length - 1] ?? fallback,
    matchedBreakpoints,
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

export function summarizeMediaQuery(query: string, fallback = false, win: Window | null = getWindow()): MediaQuerySummary {
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
  win: Window | null = getWindow()
): MediaQuerySummary[] {
  return queries.map((query) => summarizeMediaQuery(query, fallback, win));
}

export function prefersDarkColorScheme(win: Window | null = getWindow()): boolean {
  return matchesMediaQuery("(prefers-color-scheme: dark)", false, win);
}

export function prefersReducedMotion(win: Window | null = getWindow()): boolean {
  return matchesMediaQuery("(prefers-reduced-motion: reduce)", false, win);
}

export function hasCoarsePointer(win: Window | null = getWindow()): boolean {
  return matchesMediaQuery("(pointer: coarse)", false, win);
}

export function hasHoverSupport(win: Window | null = getWindow()): boolean {
  return matchesMediaQuery("(hover: hover)", false, win);
}

export function isStandaloneDisplayMode(win: Window | null = getWindow(), nav: Navigator | null = getNavigator()): boolean {
  const standaloneNavigator = nav as NavigatorWithStandalone | null;
  return matchesMediaQuery("(display-mode: standalone)", false, win) || standaloneNavigator?.standalone === true;
}

export function isTouchDevice(win: Window | null = getWindow(), nav: Navigator | null = getNavigator()): boolean {
  return Boolean((win && "ontouchstart" in win) || (nav?.maxTouchPoints ?? 0) > 0);
}

export function getViewportSummary(win: Window | null = getWindow(), nav: Navigator | null = getNavigator()): ViewportSummary {
  const size = getViewportSize(win);

  return {
    ...size,
    orientation: getViewportOrientation(size),
    devicePixelRatio: getDevicePixelRatio(win),
    touch: isTouchDevice(win, nav),
  };
}

export function getBrowserPlatform(userAgent = getUserAgent()): BrowserEnvironmentSummary["platform"] {
  if (isMobileUserAgent(userAgent)) {
    return "mobile";
  }

  if (isWindowsUserAgent(userAgent)) {
    return "windows";
  }

  if (isMacUserAgent(userAgent)) {
    return "mac";
  }

  return "unknown";
}

export function summarizeBrowserCapabilities(
  win: Window | null = getWindow(),
  nav: Navigator | null = getNavigator()
): BrowserCapabilitySummary {
  return {
    browser: Boolean(win && getDocument()),
    online: isOnline(nav),
    offline: isOffline(nav),
    touch: isTouchDevice(win, nav),
    coarsePointer: hasCoarsePointer(win),
    hover: hasHoverSupport(win),
    clipboard: Boolean(nav?.clipboard),
    cookieEnabled: Boolean(nav?.cookieEnabled),
    languages: getNavigatorLanguages(nav),
    standalone: isStandaloneDisplayMode(win, nav),
  };
}

export function summarizeBrowserEnvironment(
  win: Window | null = getWindow(),
  nav: Navigator | null = getNavigator()
): BrowserEnvironmentSummary {
  const userAgent = getUserAgent(nav);

  return {
    ...getViewportSummary(win, nav),
    browser: Boolean(win && getDocument()),
    online: isOnline(nav),
    offline: isOffline(nav),
    userAgent,
    platform: getBrowserPlatform(userAgent),
    prefersDark: prefersDarkColorScheme(win),
    prefersReducedMotion: prefersReducedMotion(win),
  };
}

export function getLocationSnapshot(loc: Location | null = getLocation()): LocationSnapshot {
  return {
    href: loc?.href ?? "",
    origin: loc?.origin ?? "",
    protocol: loc?.protocol ?? "",
    host: loc?.host ?? "",
    hostname: loc?.hostname ?? "",
    port: loc?.port ?? "",
    pathname: loc?.pathname ?? "",
    search: loc?.search ?? "",
    hash: loc?.hash ?? "",
  };
}

export function reloadPage(loc: Location | null = getLocation()): void {
  loc?.reload();
}

export function reloadPageAfterDelay(delayMs: number, loc: Location | null = getLocation()): void {
  createTimeout(() => reloadPage(loc), delayMs);
}
