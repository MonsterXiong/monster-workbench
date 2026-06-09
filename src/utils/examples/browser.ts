import {
  getLocationSnapshot,
  summarizeBrowserCapabilities,
  summarizeBrowserEnvironment,
  summarizeMediaQueries,
  summarizeViewportBreakpoints,
} from "../browser";
import {
  createClipboardCopyReport,
  createClipboardCopyResult,
  formatClipboardCopyResult,
  summarizeClipboardCopyResult,
} from "../clipboard";
import {
  summarizeRectInViewport,
} from "../dom";

const mockWindow = {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1.25,
  matchMedia: (query: string) => ({
    matches: query.includes("hover") || query.includes("min-width"),
  }),
  document: {},
} as unknown as Window;

const mockNavigator = {
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  onLine: true,
  maxTouchPoints: 0,
  clipboard: {},
  cookieEnabled: true,
  languages: ["zh-CN", "en-US"],
} as unknown as Navigator;

const mockLocation = {
  href: "https://example.com/playground?tab=utils#array",
  origin: "https://example.com",
  protocol: "https:",
  host: "example.com",
  hostname: "example.com",
  port: "",
  pathname: "/playground",
  search: "?tab=utils",
  hash: "#array",
} as Location;

export const browserUtilityExamples = {
  environment: summarizeBrowserEnvironment(mockWindow, mockNavigator),
  capabilities: summarizeBrowserCapabilities(mockWindow, mockNavigator),
  breakpoints: summarizeViewportBreakpoints([
    { key: "sm", minWidth: 640 },
    { key: "lg", minWidth: 1024 },
  ], mockWindow),
  mediaQueries: summarizeMediaQueries(["(hover: hover)", "(prefers-reduced-motion: reduce)"], false, mockWindow),
  location: getLocationSnapshot(mockLocation),
  clipboardResult: createClipboardCopyResult(true, "clipboard-api", "hello"),
  clipboardSummary: summarizeClipboardCopyResult(createClipboardCopyResult(true, "clipboard-api", "hello")),
  clipboardReport: createClipboardCopyReport(createClipboardCopyResult(false, "none", "secret", new Error("denied"))),
  clipboardText: formatClipboardCopyResult(createClipboardCopyResult(false, "none", "secret", new Error("denied"))),
  rect: summarizeRectInViewport({
    left: 10,
    top: 20,
    right: 110,
    bottom: 120,
    width: 100,
    height: 100,
  } as DOMRect, mockWindow),
};

export const browserUtilityBoundaryCases = [
  {
    key: "ssr-safe-browser",
    title: "browser summary with mocks",
    input: "summarizeBrowserEnvironment(mockWindow, mockNavigator)",
    expected: browserUtilityExamples.environment.platform,
  },
  {
    key: "clipboard-denied",
    title: "clipboard denied report",
    input: "createClipboardCopyReport(failedResult)",
    expected: browserUtilityExamples.clipboardReport.text,
  },
  {
    key: "viewport-breakpoint",
    title: "viewport breakpoint",
    input: "summarizeViewportBreakpoints([{ lg: 1024 }])",
    expected: browserUtilityExamples.breakpoints.breakpoint,
  },
  {
    key: "rect-visible",
    title: "rect in viewport",
    input: "summarizeRectInViewport(rect)",
    expected: String(browserUtilityExamples.rect.partiallyVisible),
  },
];
