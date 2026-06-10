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
