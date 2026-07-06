import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const version = pkg.version;

// 获取当前日期 YYYY-MM-DD
const date = new Date().toISOString().split("T")[0];

console.log(`=== Monster Tools Changelog Generator ===`);
console.log(`Current Version: v${version}`);
console.log(`Release Date: ${date}\n`);

// 自动获取自上一个 Tag 以来的所有 commits。如果没有 Tag，就获取最近 5 次 commits
let commits = [];
try {
  const lastTag = execSync("git describe --tags --abbrev=0", { encoding: "utf8" }).trim();
  console.log(`Detected Last Tag: ${lastTag}`);
  const gitLog = execSync(`git log ${lastTag}..HEAD --oneline`, { encoding: "utf8" });
  commits = gitLog.split("\n").map(l => l.trim()).filter(l => l.length > 0);
} catch (e) {
  console.log("No previous tags found. Fetching recent commits...");
  const gitLog = execSync("git log -n 5 --oneline", { encoding: "utf8" });
  commits = gitLog.split("\n").map(l => l.trim()).filter(l => l.length > 0);
}

// 过滤掉噪音 commit (以 release 开头或无用信息)
const cleanLogs = commits
  .map(c => {
    return c.replace(/^[a-f0-9]+\s+/, "").trim();
  })
  .filter(msg => {
    if (
      msg.startsWith("release:") ||
      msg.startsWith("release：") ||
      msg.startsWith("chore: 发布新版本") ||
      msg.startsWith("chore：发布新版本") ||
      msg.startsWith("发布新版本") ||
      msg.startsWith("docs: 在AGENTS.md中增加") ||
      msg.startsWith("docs：在AGENTS.md中增加")
    ) {
      return false;
    }
    return msg.length > 0;
  });

// 如果没有记录，给个默认兜底
if (cleanLogs.length === 0) {
  cleanLogs.push("优化与小功能维护 (Minor improvements and maintenance)");
}

console.log(`\n--- Extracted Changes ---`);
cleanLogs.forEach(log => console.log(`- ${log}`));

const logBody = cleanLogs.map(l => l.startsWith("- ") ? l : `- ${l}`).join("\n");

function formatEntry(content) {
  const header = `## [v${version}] - ${date}`;
  return `${header}\n\n${content}\n\n`;
}

const newEntry = formatEntry(logBody);

// 更新 CHANGELOG.zh-CN.md
const zhPath = path.join(root, "CHANGELOG.zh-CN.md");
let currentZh = "";
if (fs.existsSync(zhPath)) {
  currentZh = fs.readFileSync(zhPath, "utf8");
} else {
  currentZh = `# 更新日志\n\n`;
}
const indexZh = currentZh.indexOf("\n\n");
let updatedZh = "";
if (indexZh !== -1) {
  updatedZh = currentZh.slice(0, indexZh + 2) + newEntry + currentZh.slice(indexZh + 2);
} else {
  updatedZh = currentZh + "\n" + newEntry;
}
fs.writeFileSync(zhPath, updatedZh, "utf8");
console.log("✓ Updated: CHANGELOG.zh-CN.md");

// 更新 CHANGELOG.md
const enPath = path.join(root, "CHANGELOG.md");
let currentEn = "";
if (fs.existsSync(enPath)) {
  currentEn = fs.readFileSync(enPath, "utf8");
} else {
  currentEn = `# Changelog\n\n`;
}
const indexEn = currentEn.indexOf("\n\n");
let updatedEn = "";
if (indexEn !== -1) {
  updatedEn = currentEn.slice(0, indexEn + 2) + newEntry + currentEn.slice(indexEn + 2);
} else {
  updatedEn = currentEn + "\n" + newEntry;
}
fs.writeFileSync(enPath, updatedEn, "utf8");
console.log("✓ Updated: CHANGELOG.md");

// 输出到临时发布包
const githubDir = path.join(root, ".github");
if (!fs.existsSync(githubDir)) {
  fs.mkdirSync(githubDir, { recursive: true });
}
fs.writeFileSync(path.join(githubDir, "release-notes.md"), `${logBody}\n`, "utf8");
fs.writeFileSync(path.join(githubDir, "release-notes.zh-CN.md"), `${logBody}\n`, "utf8");

console.log("Changelog auto-generation completed successfully!\n");
