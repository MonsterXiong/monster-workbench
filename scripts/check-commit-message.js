import fs from "node:fs";
import { execSync } from "node:child_process";

const allowedTypes = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "release",
  "revert"
];

const typePattern = allowedTypes.join("|");
const messagePattern = new RegExp(`^(${typePattern})：(?=\\S)(?=.*[\\u4e00-\\u9fff]).+`, "u");

function printUsage() {
  console.log(
    [
      "用法:",
      "  node scripts/check-commit-message.js --latest",
      "  node scripts/check-commit-message.js --file .git/COMMIT_EDITMSG",
      "  node scripts/check-commit-message.js \"docs：更新规范文档\"",
      "",
      "格式:",
      `  类型：中文概要`,
      "",
      `允许类型: ${allowedTypes.join(", ")}`
    ].join("\n")
  );
}

function getMessageFromArgs(args) {
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const fileIndex = args.indexOf("--file");
  if (fileIndex !== -1) {
    const filePath = args[fileIndex + 1];
    if (!filePath) {
      throw new Error("缺少 --file 参数值。");
    }
    const content = fs.readFileSync(filePath, "utf8");
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#")) ?? "";
  }

  if (args.includes("--latest")) {
    return execSync("git log -1 --pretty=%s", { encoding: "utf8" }).trim();
  }

  return args.join(" ").trim();
}

function validateCommitMessage(message) {
  if (!message) {
    return "提交信息不能为空。";
  }

  if (!messagePattern.test(message)) {
    return [
      `提交信息不符合规范: ${message}`,
      "必须使用 `类型：中文概要` 格式，例如 `docs：更新发布命令规范文档`。",
      `允许类型: ${allowedTypes.join(", ")}`
    ].join("\n");
  }

  return "";
}

try {
  const message = getMessageFromArgs(process.argv.slice(2));
  const error = validateCommitMessage(message);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`✓ 提交信息符合规范: ${message}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
