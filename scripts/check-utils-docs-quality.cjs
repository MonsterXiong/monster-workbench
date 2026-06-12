const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const CONTENT_FILE = path.join(ROOT, "src/views/utils-docs/utilsDocsContent.ts");
const TARGET_SCORE = 100;

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
    this.map.delete(String(key));
  }

  clear() {
    this.map.clear();
  }
}

function installBrowserMocks() {
  const btoa = (value) => Buffer.from(String(value), "binary").toString("base64");
  const atob = (value) => Buffer.from(String(value), "base64").toString("binary");
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
  };
  const localStorage = new MemoryStorage({
    "user:theme": "dark",
    "cache:last-open": "",
  });
  const sessionStorage = new MemoryStorage();
  const mockElement = {
    style: {},
    classList: {
      add() {},
      remove() {},
      contains() {
        return false;
      },
    },
    appendChild() {},
    remove() {},
    click() {},
    setAttribute() {},
    getBoundingClientRect() {
      return { top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0 };
    },
  };
  const document = {
    body: mockElement,
    documentElement: mockElement,
    activeElement: null,
    createElement() {
      return { ...mockElement };
    },
  };
  const window = {
    localStorage,
    sessionStorage,
    location: mockLocation,
    document,
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    btoa,
    atob,
    matchMedia(query) {
      return {
        media: query,
        matches: false,
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
    navigator: {
      userAgent: "Node.js UtilsDocsQualityCheck",
      onLine: true,
      maxTouchPoints: 0,
      cookieEnabled: true,
      languages: ["zh-CN", "en-US"],
    },
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

function getTargetCoverage(report) {
  return Math.max(1, Math.ceil(report.functionCount / 3));
}

installBrowserMocks();

const loadTsModule = createTsLoader();
const {
  getUtilityDocQualityReport,
  getUtilityDocStats,
  utilityDocs,
} = loadTsModule(CONTENT_FILE);

const reports = utilityDocs.map((entry) => ({
  entry,
  report: getUtilityDocQualityReport(entry),
}));
const failures = reports.filter(({ report }) => report.score !== TARGET_SCORE);

if (failures.length > 0) {
  console.error("\n[UTILS_DOCS_CHECK] Failed: every utils docs module must score 100.\n");

  for (const { entry, report } of failures) {
    const targetCoverage = getTargetCoverage(report);
    console.error(`- ${entry.key}: score ${report.score}`);
    console.error(`  functions: ${report.functionCount}`);
    console.error(`  examples: ${report.exampleCount}/${targetCoverage}`);
    console.error(`  boundary cases: ${report.boundaryCaseCount}/${targetCoverage}`);
    console.error(`  sandbox ready: ${report.sandboxReadyCount}/${report.functionCount}`);
    console.error(`  missing descriptions: ${report.missingDescriptionCount}`);
    console.error(`  missing param descriptions: ${report.missingParamDescriptionCount}`);
  }

  console.error("\nAdd examples, boundary cases, source indexes, or explicit sandbox policy before merging.\n");
  process.exit(1);
}

const stats = getUtilityDocStats(utilityDocs);
console.log(
  `[UTILS_DOCS_CHECK] Passed: ${stats.moduleCount} modules, ${stats.functionCount} functions, average score ${stats.averageQualityScore}.`
);
