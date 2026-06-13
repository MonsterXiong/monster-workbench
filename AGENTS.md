# AI 助手项目开发规则

本项目是 **Tauri v2 桌面客户端 Monster Tools**（仓库/项目代号：`monster-workbench`）。本文件只保留全局红线与文档导航；具体做法按需阅读 `docs/` 与 `docs/ai/`。

---

## 0. 规则优先级

当规则冲突时，按以下顺序执行：

1. 用户当前明确指令
2. 本 `AGENTS.md`
3. `docs/` 专题规范与 `docs/ai/` 治理文档
4. 项目现有代码风格
5. 通用最佳实践

如果用户指令可能破坏安全、稳定性、权限或现有架构，AI 必须说明风险并给出更安全的替代方案。

---

## 1. 技术与更新红线

- 应用更新只允许走 Tauri 原生更新机制（`@tauri-apps/plugin-updater`），禁止引入自定义 Vue 资源热更新逻辑。
- `src-tauri/src/main.rs` 必须通过 `WebviewUrl::App("index.html".into())` 加载前端入口。
- Rust 依赖必须保持最小化；新增依赖需要明确业务必要性，不得为更新、下载、解压、哈希等通用任务引入 `reqwest`、`zip`、`sha2`、`hex`、单独 `tokio` 等重依赖。
- 禁止重新引入前端 SQL 直驱或前端文件系统直驱能力，包括 `@tauri-apps/plugin-sql`、`tauri-plugin-sql`、`@tauri-apps/plugin-fs`、`tauri-plugin-fs`、`sql:*`、`fs:default`。
- 禁止把 `assetProtocol.scope` 放宽到整个 `$HOME/**/*`。

---

## 2. 分层架构红线

标准调用链：

```text
Vue Component -> Pinia Store -> Frontend Service -> callTauri / Native Service Gateway -> Rust Command -> Rust Service -> DB/Repo
```

禁止事项：

- 页面、组件、布局层直接导入 `@tauri-apps/*`、`src/services/*`、SQLite 或原始网络请求。
- Composable 直接导入 `src/services/*` 承担底座适配。
- Store 直接导入 `src/services/tauri` 或编写复杂底层逻辑。
- 非 `src/services/tauri.ts` 直接调用 `invoke()`，非 `src/services/request.ts` 直接调用 `fetch()`，非 `src/services/` 直接调用 `callTauri()`。

涉及 Tauri / IPC / HTTP / DB / 文件能力边界时，必须运行：

```bash
npm run check:architecture
```

---

## 3. 常用命令

| 命令 | 用途 | 何时执行 |
|------|------|----------|
| `npm run tauri:dev` | 本地桌面联调 | 日常开发；不要只用 `npm run dev` 代替 |
| `npm run typecheck` | TypeScript / Vue 类型校验 | 每次代码变更后 |
| `npm run check:architecture` | 分层与 Tauri 边界检查 | 涉及底座、IPC、HTTP、DB、文件能力时 |
| `npm run verify` | 架构检查 + 类型校验 | 普通前端任务完成前推荐 |
| `npm run check:commit-message` | 最近一次提交信息格式检查 | 每次提交后；本地 commit-msg hook 和 release CI 也会执行 |
| `npm run tauri:build:no-bundle` | 发布级编译验证 | 修改 Rust、capabilities、打包链路后 |
| `npm run release:test` | GitHub Actions 快速发布测试 | 日常发布前 dry-run，不上传 Release |
| `npm run release:test:full` | GitHub Actions 完整发布测试 | 正式发版前验证安装包、更新包和签名链路 |
| `npm run release` | 一键发布 | 版本发布时；不要手动改版本号绕过脚本 |

---

## 4. 默认工作方式

- 先读现有实现，再做最小修改。
- 优先复用现有组件、工具、类型、Store、Service 和请求封装。
- 不引入新依赖、不升级核心依赖、不重写架构，除非用户明确要求。
- 不删除看似无用但可能有业务意义的代码，不格式化无关文件。
- 对用户可见的说明、文档和提交信息使用简体中文；Commit message 必须使用 `类型：中文概要` 格式，例如 `docs：更新发布命令规范文档`，类型使用 `feat/fix/docs/style/refactor/perf/test/build/ci/chore/release/revert`。
- 本地 Git hook 由 `.githooks/commit-msg` 执行提交信息校验；若 hook 未生效，先运行 `npm run setup:git-hooks`。
- CI/CD 由 `v*` / `app-v*` 格式 Tag 触发，禁止修改 `.github/workflows/release.yml` 的触发逻辑。

---

## 5. UI、文案与安全红线

- UI 开发优先复用项目 `Base*` 基础组件、Element Plus 封装组件和 `workbench-*` 样式原子类；自定义样式使用 TailwindCSS 与 scoped CSS，并支持 `.dark`。
- 用户可见业务文案按 `docs/i18n.md` 管理；涉及文案改动时同步检查 `zh-CN.ts` 和 `en-US.ts`。
- 保持 Windows WebView2 下中文字体 ClearType 清晰。
- 不在前端硬编码密钥、token、密码、API key，不在日志中输出敏感信息。
- 不使用 `v-html` 渲染不可信内容，不绕过登录、权限、审计逻辑。
- 不把用户输入直接拼接为 HTML 或未编码 URL。

---

## 6. 文档维护原则

- `AGENTS.md` 只放高频、全局、稳定红线；具体规则放入对应专题文档。
- 规则晋升路径：临时约定 → `docs/ai/*.md` → `docs/*.md` → `AGENTS.md`。
- 文档必须与代码事实一致；过期或不再需要的规则直接更新或删除，不保留会误导后续协作的痕迹。
- 重要任务结束前执行记忆收尾：判断是否需要更新 Codex 记忆库，并把未解决事项写入 `TODO.md` 或 `agent/open-loops.md`。

---

## 7. 文档导航

### 高频入口

| 文档 | 适用场景 |
|------|----------|
| [engineering-playbook.md](docs/engineering-playbook.md) | 新任务启动、跨模块开发、质量门禁选择 |
| [architecture.md](docs/architecture.md) | 页面/模块、目录、分层、组件拆分 |
| [frontend-style.md](docs/frontend-style.md) | UI、样式、基础组件、视觉调整 |
| [i18n.md](docs/i18n.md) | 用户可见文案、多语言词典 |

### 按层级读取

| 文档 | 适用场景 |
|------|----------|
| [error-code.md](docs/error-code.md) | Service / Store / Composable 日志与错误码 |
| [rust-backend.md](docs/rust-backend.md) | Rust 命令、Service、安全和依赖 |
| [request-and-tauri.md](docs/request-and-tauri.md) | HTTP 封装、Tauri 运行时降级、Mock |
| [global-components.md](docs/global-components.md) | 公共组件注册与类型声明 |
| [routing-and-async.md](docs/routing-and-async.md) | 路由、异步加载、状态呈现 |
| [ui-patterns.md](docs/ui-patterns.md) | 弹窗、更新、目录遍历、文件-DB 一致性 |

### AI 协作治理

| 文档 | 适用场景 |
|------|----------|
| [docs/ai/index.md](docs/ai/index.md) | 文档体系与按需阅读路线 |
| [docs/ai/review-checklist.md](docs/ai/review-checklist.md) | 任务完成后的自检 |
| [docs/ai/decisions.md](docs/ai/decisions.md) | 架构决策背景 |
| [docs/ai/maintenance.md](docs/ai/maintenance.md) | 新增、修改、删除规则 |

---
