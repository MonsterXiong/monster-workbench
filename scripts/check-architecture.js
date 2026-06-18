import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const SRC_TAURI_DIR = path.join(ROOT, "src-tauri");
const SIDECAR_PYTHON_DIR = path.join(SRC_TAURI_DIR, "sidecars", "python");
const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".vue"]);
const SIZE_BUDGET_EXTENSIONS = new Set([".ts", ".tsx", ".vue", ".js", ".cjs", ".rs"]);
const PROJECT_RULE_FILES = [
  "package.json",
  "src-tauri/Cargo.toml",
  "src-tauri/src/main.rs",
  "src-tauri/capabilities/default.json",
  "src-tauri/tauri.conf.json",
];

const rules = [
  {
    name: "Tauri 原生 API 只能在 src/services 中导入",
    pattern: /@tauri-apps\//,
    allow(file) {
      return normalize(file).startsWith("src/services/");
    },
  },
  {
    name: "页面、组件和布局不能直接导入 src/services",
    pattern: /\bfrom\s+["'][^"']*services\//,
    allow(file) {
      const normalized = normalize(file);
      return !(
        normalized.startsWith("src/views/") ||
        normalized.startsWith("src/components/") ||
        normalized.startsWith("src/layouts/")
      );
    },
  },
  {
    name: "Composables 不能直接导入 src/services",
    pattern: /\bfrom\s+["'][^"']*services\//,
    allow(file) {
      return !normalize(file).startsWith("src/composables/");
    },
  },
  {
    name: "Store 不能直接导入 Tauri 网关，应使用模块 Service",
    pattern: /\bfrom\s+["'][^"']*services\/tauri["']/,
    allow(file) {
      return !normalize(file).startsWith("src/stores/");
    },
  },
  {
    name: "invoke() 只能由 src/services/tauri.ts 封装",
    pattern: /\binvoke\s*\(/,
    allow(file) {
      return normalize(file) === "src/services/tauri.ts";
    },
  },
  {
    name: "fetch() 只能由 src/services/request.ts 封装",
    pattern: /\bfetch\s*\(/,
    allow(file) {
      return normalize(file) === "src/services/request.ts";
    },
  },
  {
    name: "callTauri() 只能在 src/services 中使用",
    pattern: /\bcallTauri\s*\(/,
    allow(file) {
      return normalize(file).startsWith("src/services/");
    },
  },
  {
    name: "AI Provider 直连生成只能用于 AI 功能测试面板",
    pattern: /\baiService\.generateDirectContent\s*\(/,
    allow(file) {
      return normalize(file) === "src/stores/ai-generation.ts";
    },
  },
  {
    name: "AI Provider 配置直连只能用于 Provider 测试运行时",
    pattern: /\baiService\.(?:testProvider|enqueueProviderTest)\s*\(/,
    allow(file) {
      return normalize(file) === "src/stores/ai-provider-runtime.ts";
    },
  },
  {
    name: "禁止前端 SQLite 直驱",
    pattern: /Database\.load|plugin-sql/,
    allow() {
      return false;
    },
  },
];

const projectRules = [
  {
    name: "已移除 tauri-plugin-sql，禁止重新引入前端 SQL 插件",
    pattern: /@tauri-apps\/plugin-sql|tauri-plugin-sql|tauri_plugin_sql|sql:default|sql:allow-/,
  },
  {
    name: "已移除直接 FS 插件能力，文件读写必须走 Rust Command + Service 校验",
    pattern: /@tauri-apps\/plugin-fs|tauri-plugin-fs|tauri_plugin_fs|fs:default/,
  },
  {
    name: "assetProtocol 禁止放开整个 HOME 目录",
    pattern: /\$HOME\/\*\*/,
  },
];

const sizeBudgetRules = [
  {
    name: "路由 Page 入口应只做页面装配，继续拆到私有 components / composables / store",
    pattern: /^src\/views\/.+Page\.vue$/,
    maxLines: 650,
  },
  {
    name: "Vue 组件应保持组件化，复杂区块继续拆到局部组件或 composable",
    pattern: /^src\/(?:views|components)\/.+\.vue$/,
    maxLines: 650,
  },
  {
    name: "Pinia Store 应保持轻量业务编排，复杂流程继续拆 runtime/helper",
    pattern: /^src\/stores\/.+\.ts$/,
    maxLines: 650,
  },
  {
    name: "前端 Service/Mock 应按领域拆分，避免单文件承载过多命令",
    pattern: /^src\/services\/.+\.(?:ts|js)$/,
    maxLines: 650,
  },
  {
    name: "Rust Service/Repo 应按能力拆分，避免业务、仓储、状态机挤在单文件",
    pattern: /^src-tauri\/src\/(?:services|infra)\/.+\.rs$/,
    maxLines: 800,
  },
  {
    name: "通用工具模块应按职责拆分，避免单文件工具桶继续膨胀",
    pattern: /^src\/utils\/.+\.ts$/,
    maxLines: 700,
  },
];

const generatedOrBulkContentFiles = new Set([
  "src/views/utils-docs/utilsDocsContent.ts",
]);

const oversizedFileBaselines = new Map(
  Object.entries({
    "src-tauri/src/services/image_workbench_service.rs": 1620,
    "src-tauri/src/services/ai_service.rs": 1318,
    "src-tauri/src/infra/image_workbench_repo.rs": 980,
    "src/services/mocks/image-workbench.mock.ts": 849,
    "src/views/image-workbench/ImageWorkbenchPage.vue": 944,
    "src/views/ai/components/image/AiImageMessageList.vue": 792,
    "src/stores/image-workbench.ts": 798,
    "src/components/common/BaseDateRange.vue": 1042,
    "src/components/common/BaseSlider.vue": 795,
    "src/components/common/BaseUpload.vue": 792,
    "src/components/common/BaseTable.vue": 764,
    "src/components/common/BaseTree.vue": 695,
    "src/views/ai/components/AiChatPanel.vue": 707,
    "src/views/playground/components/playgroundFormDemos/components/FormChoiceControlsDemo.vue": 757,
    "src/utils/object/diff.ts": 904,
    "src/utils/tree/lookup.ts": 748,
  })
);

function normalize(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, "/");
}

function normalizeFromSrcTauri(file) {
  return path.relative(SRC_TAURI_DIR, file).replaceAll(path.sep, "/");
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function walkSourceFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "target" || entry.name === "gen") {
        continue;
      }
      files.push(...walkSourceFiles(fullPath));
      continue;
    }

    if (SIZE_BUDGET_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function countLogicalLines(content) {
  if (!content) {
    return 0;
  }
  const lines = content.split(/\r\n|\r|\n/);
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines.length;
}

function isExcludedFromSizeBudget(relativeFile) {
  return (
    generatedOrBulkContentFiles.has(relativeFile) ||
    relativeFile.includes("/__tests__/") ||
    /(?:^|\/)(?:test_|stress_).+\.(?:ts|tsx|js|cjs|rs)$/.test(relativeFile) ||
    /(?:_tests|\.test|\.spec)\.(?:ts|tsx|js|cjs|rs)$/.test(relativeFile)
  );
}

function getSizeBudgetRule(relativeFile) {
  return sizeBudgetRules.find((rule) => rule.pattern.test(relativeFile));
}

function isProductionSidecarPythonFile(fileName) {
  return (
    fileName.endsWith(".py") &&
    !fileName.startsWith("test_") &&
    !fileName.startsWith("stress_")
  );
}

function getTauriBundleResources() {
  const tauriConfPath = path.join(SRC_TAURI_DIR, "tauri.conf.json");
  if (!fs.existsSync(tauriConfPath)) {
    return new Set();
  }

  const config = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
  const resources = Array.isArray(config?.bundle?.resources) ? config.bundle.resources : [];
  return new Set(resources.map((item) => String(item).replaceAll("\\", "/")));
}

function findLocalPythonImports(file, localModules) {
  const content = fs.readFileSync(file, "utf8");
  const imports = [];
  const fromPattern = /^\s*from\s+([A-Za-z_][A-Za-z0-9_]*)\s+import\s+/gm;
  const importPattern = /^\s*import\s+([A-Za-z_][A-Za-z0-9_]*)/gm;

  for (const match of content.matchAll(fromPattern)) {
    if (localModules.has(match[1])) {
      imports.push(match[1]);
    }
  }

  for (const match of content.matchAll(importPattern)) {
    if (localModules.has(match[1])) {
      imports.push(match[1]);
    }
  }

  return imports;
}

const violations = [];

for (const file of walk(SRC_DIR)) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rule of rules) {
    if (rule.allow(file)) continue;

    lines.forEach((line, index) => {
      if (rule.pattern.test(line)) {
        violations.push({
          rule: rule.name,
          file: normalize(file),
          line: index + 1,
          code: line.trim(),
        });
      }
    });
  }
}

for (const relativeFile of PROJECT_RULE_FILES) {
  const file = path.join(ROOT, relativeFile);
  if (!fs.existsSync(file)) continue;

  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rule of projectRules) {
    lines.forEach((line, index) => {
      if (rule.pattern.test(line)) {
        violations.push({
          rule: rule.name,
          file: relativeFile,
          line: index + 1,
          code: line.trim(),
        });
      }
    });
  }
}

if (fs.existsSync(SIDECAR_PYTHON_DIR)) {
  const resources = getTauriBundleResources();
  const sidecarFiles = fs
    .readdirSync(SIDECAR_PYTHON_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isProductionSidecarPythonFile(entry.name))
    .map((entry) => path.join(SIDECAR_PYTHON_DIR, entry.name));
  const localModules = new Set(
    sidecarFiles.map((file) => path.basename(file, ".py"))
  );

  for (const file of sidecarFiles) {
    const resourcePath = normalizeFromSrcTauri(file);
    if (!resources.has(resourcePath)) {
      violations.push({
        rule: "生产 Python sidecar 模块必须加入 Tauri bundle resources",
        file: "src-tauri/tauri.conf.json",
        line: 1,
        code: `缺少 ${resourcePath}`,
      });
    }
  }

  for (const resource of resources) {
    if (!resource.startsWith("sidecars/python/") || !resource.endsWith(".py")) {
      continue;
    }
    const file = path.join(SRC_TAURI_DIR, ...resource.split("/"));
    if (!fs.existsSync(file)) {
      violations.push({
        rule: "Tauri bundle resources 不能引用不存在的 Python sidecar 文件",
        file: "src-tauri/tauri.conf.json",
        line: 1,
        code: resource,
      });
    }
  }

  for (const file of sidecarFiles) {
    for (const moduleName of findLocalPythonImports(file, localModules)) {
      const resourcePath = `sidecars/python/${moduleName}.py`;
      if (!resources.has(resourcePath)) {
        violations.push({
          rule: "Python sidecar 本地 import 必须随 Tauri 打包",
          file: normalize(file),
          line: 1,
          code: `import ${moduleName} -> ${resourcePath}`,
        });
      }
    }
  }
}

const sizeBudgetFiles = [
  ...walkSourceFiles(SRC_DIR),
  ...walkSourceFiles(path.join(SRC_TAURI_DIR, "src")),
];

for (const file of sizeBudgetFiles) {
  const relativeFile = normalize(file);
  if (isExcludedFromSizeBudget(relativeFile)) {
    continue;
  }

  const rule = getSizeBudgetRule(relativeFile);
  if (!rule) {
    continue;
  }

  const content = fs.readFileSync(file, "utf8");
  const lineCount = countLogicalLines(content);
  const baseline = oversizedFileBaselines.get(relativeFile);
  const maxLines = baseline ?? rule.maxLines;

  if (lineCount > maxLines) {
    violations.push({
      rule: baseline
        ? `${rule.name}；该文件已列入体量债务基线，不能继续增长`
        : rule.name,
      file: relativeFile,
      line: maxLines + 1,
      code: `${lineCount} 行，预算 ${maxLines} 行`,
    });
  }
}

if (violations.length > 0) {
  console.error("\n[ARCH_CHECK] 分层架构检查失败：\n");
  for (const item of violations) {
    console.error(`- ${item.rule}`);
    console.error(`  ${item.file}:${item.line}`);
    console.error(`  ${item.code}`);
  }
  console.error("\n请将底座能力、IPC、网络请求或 SQLite 访问收拢到 src/services/ 后再重试。\n");
  process.exit(1);
}

console.log("[ARCH_CHECK] 分层架构检查通过");
