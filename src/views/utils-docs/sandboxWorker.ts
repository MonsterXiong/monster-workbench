import * as monsterUtils from "@/utils";

interface SandboxRequest {
  id: number;
  fnName: string;
  argsStrings: string[];
}

const blockedExpressionPatterns = [
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
];

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
  classList: {
    add: () => undefined,
    remove: () => undefined,
    contains: () => false,
  },
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
  createElement: () => mockElement,
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

const expressionContext = {
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
};

function stringifyExample(value: unknown): string {
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

function assertSafeExpression(expression: string) {
  const blockedPattern = blockedExpressionPatterns.find((pattern) => pattern.test(expression));

  if (blockedPattern) {
    throw new Error(`参数表达式包含沙箱禁用内容：${blockedPattern.source}`);
  }
}

function evaluateExpression(expression: string): unknown {
  const trimmed = expression.trim();
  if (!trimmed) return undefined;

  assertSafeExpression(trimmed);

  try {
    const names = Object.keys(expressionContext);
    const values = Object.values(expressionContext);
    return new Function(...names, `return (${trimmed});`)(...values);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`参数表达式解析失败：${error.message}`);
    }

    throw new Error("参数表达式解析失败");
  }
}

self.onmessage = async (event: MessageEvent<SandboxRequest>) => {
  const { id, fnName, argsStrings } = event.data;

  try {
    const targetFn = (monsterUtils as Record<string, unknown>)[fnName];
    if (typeof targetFn !== "function") {
      throw new Error(`无法找到目标函数 ${fnName}。`);
    }

    const args = argsStrings.map((value) => evaluateExpression(value));
    const result = await targetFn(...args);
    self.postMessage({ id, success: true, result: stringifyExample(result !== undefined ? result : "undefined") });
  } catch (error) {
    self.postMessage({ id, success: false, error: error instanceof Error ? error.message : String(error) });
  }
};
