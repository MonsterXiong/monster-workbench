import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execSync } from "node:child_process";

const root = process.cwd();
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const currentVersion = pkg.version;
const releaseStagePaths = [
  "package.json",
  "package-lock.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "CHANGELOG.md",
  "CHANGELOG.zh-CN.md",
  ".github/release-notes.md",
  ".github/release-notes.zh-CN.md",
  ".github/workflows/release.yml",
  ".gitattributes",
  "src-tauri/sidecars/python"
];

console.log(`=== Monster Tools One-Click Release System ===`);
console.log(`Current Version: v${currentVersion}\n`);

// 自动计算建议的版本号
const [major, minor, patch] = currentVersion.split(".").map(Number);
const suggestPatch = `${major}.${minor}.${patch + 1}`;
const suggestMinor = `${major}.${minor + 1}.0`;
const suggestMajor = `${major + 1}.0.0`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function quoteGitPath(filePath) {
  return JSON.stringify(filePath);
}

function getOutput(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function runCommand(command) {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: "inherit" });
}

function assertMainBranch() {
  const branch = getOutput("git branch --show-current");
  if (branch !== "main") {
    throw new Error(`发布必须在 main 分支执行，当前分支是 ${branch || "(detached)"}。`);
  }
}

function assertCleanWorktree() {
  const status = getOutput("git status --porcelain");
  if (status) {
    throw new Error(
      [
        "发布前工作区必须干净，避免把未审查改动混入版本提交。",
        "请先提交、暂存到其他分支，或清理以下变更：",
        status
      ].join("\n")
    );
  }
}

function assertValidVersion(version) {
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`版本号格式不合法: ${version}`);
  }
}

function assertTagDoesNotExist(version) {
  try {
    getOutput(`git rev-parse -q --verify refs/tags/v${version}`);
    throw new Error(`Git Tag v${version} 已存在，请选择新的版本号。`);
  } catch (error) {
    if (error.status === 0 || error.message.includes("已存在")) {
      throw error;
    }
  }
}

function runReleasePreflight() {
  if (process.env.SKIP_RELEASE_PREFLIGHT === "1") {
    console.warn("已跳过发布前本地门禁：SKIP_RELEASE_PREFLIGHT=1");
    return;
  }

  console.log("\n--- 发布前本地门禁 ---");
  runCommand("npm run verify");
  runCommand("npm run test:ai-sidecar");
  runCommand("npm run test:ai-sidecar:stress");
  runCommand("npm run tauri:build:no-bundle");
}

async function main() {
  try {
    assertMainBranch();
    assertCleanWorktree();

    console.log("建议的升级版本:");
    console.log(`1) Patch: v${suggestPatch}`);
    console.log(`2) Minor: v${suggestMinor}`);
    console.log(`3) Major: v${suggestMajor}`);
    console.log("4) 自定义版本号");

    const choice = await askQuestion("\n请选择发布类型 (输入 1/2/3/4, 默认 1): ");
    let newVersion = suggestPatch;

    if (choice === "2") {
      newVersion = suggestMinor;
    } else if (choice === "3") {
      newVersion = suggestMajor;
    } else if (choice === "4") {
      const custom = await askQuestion("请输入自定义版本号 (例如 1.2.3): ");
      if (custom.trim()) {
        newVersion = custom.trim().replace(/^v/, "");
      }
    }

    assertValidVersion(newVersion);
    assertTagDoesNotExist(newVersion);

    console.log(`\n准备发布版本: v${newVersion}`);
    const confirm = await askQuestion("确认继续吗？(y/n, 默认 y): ");
    if (confirm.toLowerCase() === "n") {
      console.log("发布已取消。");
      rl.close();
      process.exit(0);
    }

    runReleasePreflight();

    // 1. 更新 package.json 版本号
    pkg.version = newVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log("✓ 已更新 package.json 版本号");

    // 2. 同步版本号到 Tauri & Cargo
    console.log("正在同步版本号到 Tauri & Cargo...");
    execSync("node scripts/sync-version.js", { stdio: "inherit" });

    // 3. 运行交互式 Changelog 日志录入
    console.log("\n--- 录入发布日志 ---");
    execSync("node scripts/changelog.js", { stdio: "inherit" });

    rl.close();

    // 4. Git 自动暂存、提交与打标签
    console.log("\n正在暂存和提交代码...");
    execSync(`git add -- ${releaseStagePaths.map(quoteGitPath).join(" ")}`, { stdio: "inherit" });
    const releaseCommitMessage = `chore：发布新版本 v${newVersion}`;
    execSync(`node scripts/check-commit-message.js ${quoteGitPath(releaseCommitMessage)}`, { stdio: "inherit" });
    execSync(`git commit -m ${quoteGitPath(releaseCommitMessage)}`, { stdio: "inherit" });
    console.log(`✓ Git 提交成功`);

    console.log(`正在创建 Git Tag: v${newVersion}...`);
    execSync(`git tag v${newVersion}`, { stdio: "inherit" });
    console.log(`✓ Git Tag v${newVersion} 创建成功`);

    // 5. 提示推送到线上
    const rlPush = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const doPush = await new Promise((resolve) => {
      rlPush.question("\n是否立即推送到远端仓库 (执行 git push & git push --tags)？(y/n, 默认 y): ", resolve);
    });
    rlPush.close();

    if (doPush.toLowerCase() !== "n") {
      console.log("正在推送到远端仓库...");
      try {
        execSync("git push", { stdio: "inherit" });
        execSync(`git push origin v${newVersion}`, { stdio: "inherit" });
        console.log("\n🎉 推送成功！GitHub Actions 已经开始为您构建和发布新版本包！");
      } catch (e) {
        console.warn("\n⚠ 推送失败，可能是由于本地尚未关联远端仓库或没有网络连接。");
        console.warn("请在关联远程仓库后手动执行: git push && git push origin --tags");
      }
    } else {
      console.log(`\n发布本地就绪！请稍后手动执行: git push && git push origin v${newVersion}`);
    }

  } catch (err) {
    console.error("发布过程中出错:", err);
    rl.close();
    process.exit(1);
  }
}

main();
