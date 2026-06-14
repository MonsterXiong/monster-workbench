const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const sourcePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.homedir(), ".monster-tools", "config.json");
const outputPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(process.cwd(), "public", "mock", "preference-config.json");

const SENSITIVE_KEY_PATTERN = /api[-_]?key|token|password|secret|credential|authorization/i;

function sanitizeConfig(value, key = "") {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeConfig(item));
  }

  if (!value || typeof value !== "object") {
    if (key === "rememberApiKey") {
      return false;
    }
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      return "";
    }
    return value;
  }

  const next = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    if (childKey === "rememberApiKey") {
      next[childKey] = false;
      continue;
    }
    if (SENSITIVE_KEY_PATTERN.test(childKey)) {
      next[childKey] = "";
      continue;
    }
    next[childKey] = sanitizeConfig(childValue, childKey);
  }
  return next;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

if (!fs.existsSync(sourcePath)) {
  console.error(`[MOCK_CONFIG_SYNC] 未找到桌面端配置文件: ${sourcePath}`);
  process.exit(1);
}

const source = readJson(sourcePath);
if (!source || typeof source !== "object" || Array.isArray(source)) {
  console.error("[MOCK_CONFIG_SYNC] 配置根节点必须是 JSON 对象");
  process.exit(1);
}

const sanitized = sanitizeConfig(source);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");

const modelCount = Array.isArray(sanitized.aiModelConfigs)
  ? sanitized.aiModelConfigs.length
  : 0;
console.log(`[MOCK_CONFIG_SYNC] 已生成浏览器 mock 配置 seed: ${outputPath}`);
console.log(`[MOCK_CONFIG_SYNC] 已脱敏 API Key / token / password / secret，共同步模型配置 ${modelCount} 个`);
