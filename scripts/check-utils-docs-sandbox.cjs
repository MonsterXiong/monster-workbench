const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const CONTENT_FILE = path.join(ROOT, "src/views/utils-docs/utilsDocsContent.ts");
const UTILS_FILE = path.join(ROOT, "src/utils/index.ts");
const SANDBOX_POLICY_FILE = path.join(ROOT, "src/views/utils-docs/sandboxPolicy.ts");

class MemoryStorage {
  constructor(seed = {}) {
    this.map = new Map(Object.entries(seed));
  }

  get length() {
    return this.map.size;
  }

  key(index) {
    return Array.from(this.map.keys())[index] ?? null;
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(String(key), String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

function installBrowserMocks() {
  const btoa = (value) => Buffer.from(String(value), "binary").toString("base64");
  const atob = (value) => Buffer.from(String(value), "base64").toString("binary");
  const localStorage = new MemoryStorage({
    "user:theme": "dark",
    "cache:last-open": "",
  });
  const sessionStorage = new MemoryStorage();
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
    reload() {},
  };
  const mockElement = {
    id: "mock-element",
    style: {},
    classList: {
      add() {},
      remove() {},
      contains() {
        return false;
      },
    },
    appendChild() {},
    click() {},
    closest() {
      return null;
    },
    contains() {
      return false;
    },
    matches() {
      return false;
    },
    remove() {},
    setAttribute() {},
    getBoundingClientRect() {
      return { top: 10, left: 10, right: 210, bottom: 110, width: 200, height: 100, x: 10, y: 10 };
    },
  };
  const document = {
    body: mockElement,
    documentElement: mockElement,
    activeElement: mockElement,
    createElement() {
      return { ...mockElement };
    },
    querySelector() {
      return mockElement;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
  };
  const navigator = {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) UtilsDocsSandboxCheck/1.0",
    platform: "Win32",
    language: "zh-CN",
    languages: ["zh-CN", "en-US"],
    onLine: true,
    maxTouchPoints: 0,
    cookieEnabled: true,
    clipboard: undefined,
  };
  const window = {
    localStorage,
    sessionStorage,
    location: mockLocation,
    document,
    navigator,
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 1,
    btoa,
    atob,
    dispatchEvent() {
      return true;
    },
    matchMedia(query) {
      return {
        media: query,
        matches: query.includes("min-width") || query.includes("hover"),
        addEventListener() {},
        removeEventListener() {},
      };
    },
    open() {
      return null;
    },
  };

  const globals = {
    atob,
    btoa,
    document,
    localStorage,
    location: mockLocation,
    navigator,
    sessionStorage,
    window,
  };

  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(global, key, {
      configurable: true,
      enumerable: true,
      value,
      writable: true,
    });
  }
}

function createTsLoader() {
  const cache = new Map();

  function resolveModule(specifier, baseFile) {
    if (specifier.startsWith("@/")) {
      specifier = path.join(ROOT, "src", specifier.slice(2));
    } else if (specifier.startsWith(".")) {
      specifier = path.resolve(path.dirname(baseFile), specifier);
    } else {
      return specifier;
    }

    const candidates = [
      specifier,
      `${specifier}.ts`,
      `${specifier}.js`,
      path.join(specifier, "index.ts"),
      path.join(specifier, "index.js"),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }

    throw new Error(`Cannot resolve module "${specifier}" from "${baseFile}"`);
  }

  function loadTsModule(file) {
    file = path.resolve(file);
    if (cache.has(file)) {
      return cache.get(file).exports;
    }

    const mod = { exports: {} };
    cache.set(file, mod);

    const source = fs.readFileSync(file, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: file,
    }).outputText;
    const localRequire = (specifier) => {
      const resolved = resolveModule(specifier, file);
      return resolved.endsWith(".ts") ? loadTsModule(resolved) : require(resolved);
    };

    new Function("require", "exports", "module", "__filename", "__dirname", output)(
      localRequire,
      mod.exports,
      mod,
      file,
      path.dirname(file)
    );
    return mod.exports;
  }

  return loadTsModule;
}

function getDefaultParamValue(paramName, type) {
  const name = paramName.toLowerCase();
  const normalizedType = type.toLowerCase();

  if (name.includes("getchildren")) return "item => item.children";
  if (name.includes("getparentid")) return "item => item.parentId";
  if (name.includes("getid") || name.includes("getkey")) return "item => item.id";
  if (name.includes("equals")) return "(left, right) => Object.is(left, right)";
  if (name.includes("mapper")) return "(item) => item";
  if (name.includes("validators")) return "[(value) => value ? null : 'required']";
  if (name.includes("validator")) return "(value) => value ? null : 'required'";
  if (name.includes("schema")) {
    return "createRecordValidationSchema({ name: [createRequiredValidator('required')] }, { name: 'Name' })";
  }
  if (name.includes("options")) return "{}";
  if (name.includes("breakpoints")) return "[{ key: 'sm', minWidth: 640 }, { key: 'lg', minWidth: 1024 }]";
  if (name.includes("queries")) return "['(prefers-color-scheme: dark)']";
  if (name.includes("searchparams")) return "new URLSearchParams('?page=1&tag=utils')";
  if (name.includes("url")) return "'https://example.com/tools?page=1'";
  if (name.includes("path")) return "'C:/workspace/project/file.txt'";
  if (name.includes("text") || name.includes("message")) return "'Monster Tools'";
  if (name.includes("key")) return "'id'";
  if (name.includes("count") || name.includes("total") || name.includes("page") || name.includes("size")) return "10";
  if (normalizedType.includes("string")) return "''";
  if (normalizedType.includes("number")) return "0";
  if (normalizedType.includes("boolean")) return "false";
  if (normalizedType.includes("[]") || normalizedType.includes("array") || normalizedType.includes("readonly")) return "[]";
  if (normalizedType.includes("record") || normalizedType.includes("object")) return "{}";
  return "undefined";
}

function getSandboxArgExpressions(fn) {
  const params = fn.params ?? [];

  if (params.length === 0) {
    return fn.defaultTestArgs ?? [];
  }

  return params.map((param, index) => fn.defaultTestArgs?.[index] ?? getDefaultParamValue(param.name, param.type));
}

function formatFailure(failure) {
  const lines = [`- ${failure.moduleKey}.${failure.functionName}: ${failure.phase}`];
  if (failure.message) lines.push(`  ${failure.message}`);
  if (failure.args?.length) lines.push(`  args: ${failure.args.join(" | ")}`);
  return lines.join("\n");
}

async function main() {
  installBrowserMocks();

  const loadTsModule = createTsLoader();
  const { utilityDocs } = loadTsModule(CONTENT_FILE);
  const monsterUtils = loadTsModule(UTILS_FILE);
  const {
    assertSafeExpression,
    createSandboxExpressionContext,
    evaluateSandboxExpression,
    stringifySandboxResult,
  } = loadTsModule(SANDBOX_POLICY_FILE);

  const expressionContext = createSandboxExpressionContext(monsterUtils);
  const failures = [];
  let passedCount = 0;
  let skippedCount = 0;

  for (const entry of utilityDocs) {
    for (const fn of entry.functions) {
      if (fn.sandbox?.enabled === false) {
        skippedCount += 1;
        continue;
      }

      const targetFn = monsterUtils[fn.name];
      const args = getSandboxArgExpressions(fn);

      if (typeof targetFn !== "function") {
        failures.push({
          moduleKey: entry.key,
          functionName: fn.name,
          phase: "missing export",
          message: "No function export with this name exists in src/utils/index.ts.",
          args,
        });
        continue;
      }

      let evaluatedArgs;
      try {
        evaluatedArgs = args.map((value) => evaluateSandboxExpression(value, expressionContext));
      } catch (error) {
        failures.push({
          moduleKey: entry.key,
          functionName: fn.name,
          phase: "argument evaluation",
          message: error instanceof Error ? error.message : String(error),
          args,
        });
        continue;
      }

      try {
        const result = await targetFn(...evaluatedArgs);

        if (result === undefined) {
          failures.push({
            moduleKey: entry.key,
            functionName: fn.name,
            phase: "undefined result",
            message: "Runnable docs examples must return a displayable value or be marked sandbox disabled.",
            args,
          });
          continue;
        }

        stringifySandboxResult(result);
        passedCount += 1;
      } catch (error) {
        failures.push({
          moduleKey: entry.key,
          functionName: fn.name,
          phase: "function execution",
          message: error instanceof Error ? error.message : String(error),
          args,
        });
      }
    }
  }

  const blockedExpressions = [
    'fetch("https://example.com")',
    'eval("1")',
    'Function("return 1")',
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "while(true){}",
    "self",
    "globalThis",
  ];

  for (const expression of blockedExpressions) {
    try {
      assertSafeExpression(expression);
      failures.push({
        moduleKey: "sandbox",
        functionName: "policy",
        phase: "unsafe expression allowed",
        message: `Expression should be blocked: ${expression}`,
      });
    } catch {
      // Expected: unsafe expressions must be blocked before evaluation.
    }
  }

  if (failures.length > 0) {
    console.error("\n[UTILS_DOCS_SANDBOX] Failed: runnable utils docs examples must execute safely.\n");
    console.error(failures.map(formatFailure).join("\n"));
    console.error("\nFix defaultTestArgs, sandbox context, or explicit sandbox policy before merging.\n");
    process.exit(1);
  }

  console.log(
    `[UTILS_DOCS_SANDBOX] Passed: ${passedCount} runnable functions, ${skippedCount} skipped functions, ${blockedExpressions.length} blocked expressions.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
