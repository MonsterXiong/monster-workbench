import { getDocument, getNavigator, getNavigatorLanguages, getUserAgent, getWindow, isMacUserAgent, isMobileUserAgent, isOffline, isOnline, isWindowsUserAgent } from "./platform";
import { getViewportSummary, hasCoarsePointer, hasHoverSupport, prefersDarkColorScheme, prefersReducedMotion, isStandaloneDisplayMode, isTouchDevice } from "./viewport";
import type { BrowserCapabilitySummary, BrowserEnvironmentSummary, BrowserPlatform } from "./types";

export function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function getBrowserPlatform(userAgent = getUserAgent()): BrowserPlatform {
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

/** 探测当前浏览器支持的高级特性能力。 */
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

/** 提取浏览器核心环境指标（如内核、平台、UA）。 */
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
