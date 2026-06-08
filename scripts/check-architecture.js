import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".vue"]);
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

function normalize(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, "/");
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
