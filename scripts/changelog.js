import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
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

// 1. 获取最近 Git Commits 作为参考
console.log(`--- Recent Git Commits ---`);
try {
  const gitLog = execSync("git log -n 5 --oneline", { encoding: "utf8" });
  console.log(gitLog);
} catch (e) {
  console.log("No git commits found or git is not initialized.\n");
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestionMultiline(query) {
  return new Promise((resolve) => {
    console.log(query);
    const lines = [];
    rl.on("line", (line) => {
      if (line.trim() === "") {
        rl.removeAllListeners("line");
        resolve(lines.join("\n"));
      } else {
        lines.push(line);
      }
    });
  });
}

async function main() {
  try {
    const zhContent = await askQuestionMultiline(
      "请输入本次更新日志 (中文) [每行写一条，空行直接回车结束输入]:"
    );
    
    const enContent = await askQuestionMultiline(
      "Please enter the release notes (English) [one entry per line, press empty enter to finish]:"
    );

    rl.close();

    if (!zhContent.trim() && !enContent.trim()) {
      console.log("No log content entered. Aborting changelog update.");
      process.exit(0);
    }

    function formatEntry(content) {
      const header = `## [v${version}] - ${date}`;
      const formattedLines = content
        .split("\n")
        .filter(l => l.trim().length > 0)
        .map(l => l.startsWith("- ") ? l : `- ${l}`)
        .join("\n");
      
      return `${header}\n\n${formattedLines}\n\n`;
    }

    // 更新 CHANGELOG.zh-CN.md
    if (zhContent.trim()) {
      const zhPath = path.join(root, "CHANGELOG.zh-CN.md");
      let currentZh = "";
      if (fs.existsSync(zhPath)) {
        currentZh = fs.readFileSync(zhPath, "utf8");
      } else {
        currentZh = `# 更新日志\n\n`;
      }
      
      const newZhEntry = formatEntry(zhContent);
      const index = currentZh.indexOf("\n\n");
      let updatedZh = "";
      if (index !== -1) {
        updatedZh = currentZh.slice(0, index + 2) + newZhEntry + currentZh.slice(index + 2);
      } else {
        updatedZh = currentZh + "\n" + newZhEntry;
      }
      fs.writeFileSync(zhPath, updatedZh, "utf8");
      console.log("Updated: CHANGELOG.zh-CN.md");

      const distDir = path.join(root, "dist");
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      fs.writeFileSync(path.join(distDir, "release-notes.zh-CN.md"), zhContent, "utf8");
    }

    // 更新 CHANGELOG.md
    if (enContent.trim()) {
      const enPath = path.join(root, "CHANGELOG.md");
      let currentEn = "";
      if (fs.existsSync(enPath)) {
        currentEn = fs.readFileSync(enPath, "utf8");
      } else {
        currentEn = `# Changelog\n\n`;
      }

      const newEnEntry = formatEntry(enContent);
      const index = currentEn.indexOf("\n\n");
      let updatedEn = "";
      if (index !== -1) {
        updatedEn = currentEn.slice(0, index + 2) + newEnEntry + currentEn.slice(index + 2);
      } else {
        updatedEn = currentEn + "\n" + newEnEntry;
      }
      fs.writeFileSync(enPath, updatedEn, "utf8");
      console.log("Updated: CHANGELOG.md");

      const distDir = path.join(root, "dist");
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      fs.writeFileSync(path.join(distDir, "release-notes.md"), enContent, "utf8");
    }

    console.log("Changelog update completed successfully!");

  } catch (err) {
    console.error("Error updating changelogs:", err);
    rl.close();
    process.exit(1);
  }
}

main();
