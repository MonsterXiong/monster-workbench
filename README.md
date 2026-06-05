# Monster Tools

`monster-tools` 是一个基于 **Tauri v2 + Vue 3 + Vite** 的桌面端应用，集成了自动化双语 Changelog 交互式管理与 GitHub Actions 全平台（Windows, macOS, Linux）整体原生自动更新发布流。

## 特性

- **整体原生更新**：使用 Tauri v2 原生安全更新机制（`@tauri-apps/plugin-updater`），整包替换可执行程序，不再依赖复杂不稳定的资源热更新。
- **一键自动化发布**：通过 `npm run release` 一个指令，自动提示 SemVer 版本选择、跨前后端同步版本号、唤起交互式双语 Changelog 编写、自动暂存并创建 Git Tag，并能一键推送到 GitHub 远端触发 CI/CD。
- **双语更新日志自动管理**：支持交互式生成 `CHANGELOG.md` (英文) 与 `CHANGELOG.zh-CN.md` (中文)，并为 CI 构建自动提供单次 Release 的更新概要。
- **全平台 CI/CD 打包流水线**：通过 GitHub Actions 自动编译出 Windows (`.msi`, `.exe`)、macOS (Intel/M系列通用 `.dmg` 镜像) 和 Linux (`.deb` 安装包)。

---

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发调试

启动本地 Vue 开发服务，并拉起调试版 Tauri 窗口：

```bash
npm run tauri:dev
```

---

## 一键发布新版本

当您需要发布新版本时，仅需在终端运行以下一行指令：

```bash
npm run release
```

### 该指令会自动执行以下流程：
1. **SemVer 建议**：计算并推荐 Patch、Minor、Major 版本供您选择（也可输入自定义版本）。
2. **改写版本**：更新 `package.json` 中的版本号。
3. **版本同步**：自动将新版本同步到 `tauri.conf.json` 和 `Cargo.toml`。
4. **日志交互**：在终端打印最近 5 次 Git 提交参考，交互式引导您录入中文和英文更新内容，自动追加到中英文 Changelog 文件。
5. **Git Commit**：自动暂存文件并进行 Git Commit 封包。
6. **创建 Tag**：在本地创建对应的 `v<版本号>` 的 Git Tag。
7. **推送上线**：询问并自动一键推送到您的 GitHub 远程仓库（自动执行 `git push` 及 `git push origin v<版本号>`）。

---

## 生产部署前配置

在推送到 GitHub 进行自动发布前，需要确保以下配置完成：

### 1. 替换更新端点
在 `src-tauri/tauri.conf.json` 中：
* 将 `OWNER/REPO` 替换为您真实的 GitHub 用户名/仓库名。
* 将 `REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY` 替换为您生成的更新签名公钥。

### 2. 生成签名密钥 (以支持自动更新)
```bash
npx tauri signer generate -w ~/.tauri/monster-tools.key
```
将生成的 **Public Key (公钥)** 写入 `src-tauri/tauri.conf.json` 中的 `plugins.updater.pubkey` 字段。

在 GitHub 仓库的 **Settings -> Secrets and variables -> Actions** 中配置以下两个 GitHub Secrets 环境变量：
* `TAURI_SIGNING_PRIVATE_KEY`（上面生成的 `.key` 文件中的私钥内容）
* `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（生成密钥时设置的密码）

---

## 许可协议

本项目基于 **[MIT License](file:///c:/Users/刘雄成/Desktop/monster-workbench/LICENSE)** 协议开源。
