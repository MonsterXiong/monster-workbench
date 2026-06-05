# AI 助手项目开发规则 (AGENTS.md)

本项目为特定的 Tauri v2 桌面客户端，任何 AI 编码助手（包括但不限于 Antigravity 等）在阅读、编写、修改或维护此项目时，**必须严格遵守**以下规则与架构约束。

---

## 1. 核心技术架构约束

*   **仅限单体整体更新**：本项目已重构为纯粹的单体桌面应用。所有的应用更新必须依赖 Tauri 原生更新机制（`@tauri-apps/plugin-updater`），禁止开发、引入或还原任何基于 `web-assets.zip`、解压以及将 WebView 重定向到本地外部目录的自定义“Vue 资源热更新”逻辑。
*   **启动路径限制**：`src-tauri/src/main.rs` 启动窗口时，必须直接加载内置编译的前端静态资源 `WebviewUrl::App("index.html".into())`。
*   **严控 Rust 依赖体积**：
    *   为了确保 Cargo 编译速度和二进制包体积，除非有明确的重构方案，禁止在 `src-tauri/Cargo.toml` 中引入与基础功能无关的外部依赖库（已剔除的 `reqwest`、`zip`、`sha2`、`hex` 等严禁加回）。
    *   保证 `serde` 和 `serde_json` 仅作为基础宏编译与序列化所需的库。

---

## 2. 版本控制与发布流规范

*   **必须一键发布**：所有的版本升级、日志更新与 Git Tag 动作，**必须统一通过运行以下命令执行**：
    ```bash
    npm run release
    ```
    严禁手动在 `package.json` 中修改版本号而不去同步 `tauri.conf.json` 和 `Cargo.toml`。
*   **双语日志维护**：
    *   每次执行 release 脚本时，必须引导开发者录入中英双语的日志。
    *   系统会自动维护 `CHANGELOG.md` 和 `CHANGELOG.zh-CN.md`。

---

## 3. Git 提交与注释规范

*   **Commit 概要中文化**：向 Git 仓库提交任何代码修改时，Commit 消息的概要描述**必须首选使用中文（简体）**（例如 `feat: 新增...`，`fix: 修复...`）。
*   **CI/CD 触发契机**：GitHub Actions 在监测到符合 `v*` 或者是 `app-v*` 格式的 Tag 推送时，会触发全平台编译打包并创建 Release。请确保不要随意修改 `.github/workflows/release.yml` 的触发逻辑。

---

## 4. AI 助手交互准则

*   **中文化内部推理**：AI 助手在处理用户需求时，内部思考过程（Thought Process）与最终回复**必须完全使用简体中文**。
*   **代码规范**：所有新增的文件与代码，应当遵循 TypeScript/Vue 3 的最佳实践，保持函数及逻辑块的简洁，确保不引入无用导入，且每次修改完必须运行 `npm run typecheck` 进行校验。
