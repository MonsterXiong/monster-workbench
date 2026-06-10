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
