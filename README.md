# Monster Tools

`monster-tools` 是一个基于 **Tauri v2 + Vue 3 + Vite** 的本地桌面工具箱。当前重点是把 AI Provider 配置、聊天/生图能力、图片工作台、文件/导航/系统诊断和常用工具收敛到同一个受控客户端里。

## 特性

- **AI 模型工作台**：管理 OpenAI-compatible / Anthropic Messages 等 Provider 配置，支持能力绑定、连接诊断和原子能力测试。
- **AI 图片工作台**：支持生成、审片、参考图、局部重绘、资产导入、评分、收藏、版本链和受控资产落盘。
- **本地工具集合**：包含文件管理、导航启动台、系统能力诊断、常用转换工具和组件沙箱。
- **受控桌面边界**：通过 Rust command/service/infra 管理 SQLite、文件、系统能力和 Python sidecar，前端不直连底座能力。
- **原生发布更新**：使用 Tauri v2 原生 updater，发布由 `npm run release` 和 GitHub Actions 流水线驱动。

---

## 本地开发

开发前建议先阅读：

- [AGENTS.md](AGENTS.md)：AI / 人类协作的全局红线
- [docs/engineering-playbook.md](docs/engineering-playbook.md)：架构、目录、分层、质量门禁与完成标准
- [docs/architecture-current-state.md](docs/architecture-current-state.md)：当前架构事实、运行时边界和风险点

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发调试

启动本地 Vue 开发服务，并拉起调试版 Tauri 窗口：

```bash
npm run tauri:dev
```

### 3. 提交前校验

```bash
npm run verify
npm run check:commit-message
```

其中 `npm run check:architecture` 会检查 Tauri / IPC / HTTP / SQLite 是否越层，并防止 SQL/FS 插件、capability 与宽 HOME asset scope 回引；`npm run typecheck` 会执行 TypeScript 类型校验。Commit message 必须符合 `类型：中文概要`，例如 `docs：更新发布命令规范文档`。本地 hook 会在 `npm install` 时自动启用，如未生效可手动运行 `npm run setup:git-hooks`。

涉及 AI sidecar / 模型提供商测试能力时，额外运行：

```bash
npm run test:ai-sidecar
npm run test:ai-sidecar:stress
```

---

## 发布

发布前建议先跑：

```bash
npm run verify
npm run tauri:build:no-bundle
```

发布新版本：

```bash
npm run release
```

该脚本会处理 SemVer 版本、`package.json` / `tauri.conf.json` / `Cargo.toml` 同步、双语 Changelog、提交和 Tag。发布测试命令见 [AGENTS.md](AGENTS.md) 的常用命令表。

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

本项目基于 [MIT License](LICENSE) 协议开源。
