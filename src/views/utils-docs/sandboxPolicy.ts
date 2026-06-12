import * as monsterUtils from "@/utils";

export const blockedExpressionPatterns = [
  /\bfetch\s*\(/i,
  /\bXMLHttpRequest\b/i,
  /\bWebSocket\b/i,
  /\bEventSource\b/i,
  /\bimportScripts\s*\(/i,
  /\beval\s*\(/i,
  /\bFunction\s*\(/i,
  /\bpostMessage\s*\(/i,
  /\bself\b/i,
  /\bglobalThis\b/i,
  /\blocalStorage\b/i,
  /\bsessionStorage\b/i,
  /\bindexedDB\b/i,
  /\bcaches\b/i,
  /\bcookie\b/i,
  /\bconstructor\b/i,
  /\bwhile\s*\(/i,
  /\bfor\s*\(\s*;\s*;\s*\)/i,
] as const;

const mockNavigator = {
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MonsterUtilsDocs/1.0",
  platform: "Win32",
  language: "zh-CN",
  languages: ["zh-CN", "en-US"],
  onLine: true,
  cookieEnabled: true,
  maxTouchPoints: 0,
  clipboard: undefined,
};

const mockLocation = {
  href: "https://example.com/tools/utils-docs?page=1#array",
  origin: "https://example.com",
  protocol: "https:",
  host: "example.com",
  hostname: "example.com",
  port: "",
  pathname: "/tools/utils-docs",
  search: "?page=1",
  hash: "#array",
  reload: () => undefined,
};

const mockElement = {
  id: "mock-element",
  style: {},
  classList: {
    add: () => undefined,
    remove: () => undefined,
    contains: () => false,
  },
  appendChild: () => undefined,
  click: () => undefined,
  closest: () => null,
  contains: () => false,
  matches: () => false,
  remove: () => undefined,
  setAttribute: () => undefined,
  getBoundingClientRect: () => ({
    top: 10,
    left: 10,
    bottom: 110,
    right: 210,
    width: 200,
    height: 100,
    x: 10,
    y: 10,
  }),
};

const mockDocument = {
  body: mockElement,
  activeElement: mockElement,
  documentElement: mockElement,
  createElement: () => ({ ...mockElement }),
  querySelector: () => mockElement,
  querySelectorAll: () => [],
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};

const mockWindow = {
  innerWidth: 1440,
  innerHeight: 900,
  devicePixelRatio: 1,
  navigator: mockNavigator,
  location: mockLocation,
  document: mockDocument,
  matchMedia: (query: string) => ({
    media: query,
    matches: query.includes("min-width") || query.includes("hover"),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }),
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};

export function createSandboxExpressionContext(extraContext: Record<string, unknown> = {}) {
  return {
    ...monsterUtils,
    Array,
    Date,
    Error,
    Map,
    Math,
    Number,
    Object,
    Promise,
    RegExp,
    Set,
    String,
    URL,
    URLSearchParams,
    console: {
      log: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    document: mockDocument,
    element: mockElement,
    location: mockLocation,
    mockDocument,
    mockElement,
    mockLocation,
    mockNavigator,
    mockWindow,
    navigator: mockNavigator,
    window: mockWindow,
    ...extraContext,
  };
}

export function stringifySandboxResult(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    value,
    (_key, currentValue) => {
      if (currentValue instanceof Error) return { name: currentValue.name, message: currentValue.message };
      if (typeof currentValue === "bigint") return currentValue.toString();
      if (typeof currentValue === "function") return `[Function ${currentValue.name || "anonymous"}]`;
      if (currentValue && typeof currentValue === "object") {
        if (seen.has(currentValue)) return "[Circular]";
        seen.add(currentValue);
      }
      return currentValue;
    },
    2
  ) ?? String(value);
}

export function assertSafeExpression(expression: string) {
  const blockedPattern = blockedExpressionPatterns.find((pattern) => pattern.test(expression));

  if (blockedPattern) {
    throw new Error(`参数表达式包含沙箱禁用内容：${blockedPattern.source}`);
  }
}

export function evaluateSandboxExpression(expression: string, context = createSandboxExpressionContext()): unknown {
  const trimmed = expression.trim();
  if (!trimmed) return undefined;

  assertSafeExpression(trimmed);

  try {
    const names = Object.keys(context);
    const values = Object.values(context);
    return new Function(...names, `return (${trimmed});`)(...values);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`参数表达式解析失败：${error.message}`);
    }

    throw new Error("参数表达式解析失败");
  }
}
