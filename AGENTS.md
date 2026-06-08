# AI 助手项目开发规则 (AGENTS.md)

本项目为 **Tauri v2 桌面客户端**（Monster Workbench），任何 AI 编码助手在阅读、编写、修改或维护此项目时，**必须严格遵守**以下规则。本文件作为每次任务的**首读入口**，包含不可违反的全局红线与按需跳转的文档导航。

---

## 0. 规则优先级

当规则冲突时，按以下顺序执行：

1. 用户当前明确指令
2. 本 `AGENTS.md`
3. `docs/` 专题规范 与 `docs/ai/` 治理文档
4. 项目现有代码风格
5. 通用最佳实践

如果用户指令可能破坏安全、稳定性、权限或现有架构，AI 必须说明风险并给出更安全的替代方案。

---

## 1. 核心技术架构约束 🔴

*   **仅限单体整体更新**：所有应用更新必须依赖 Tauri 原生更新机制（`@tauri-apps/plugin-updater`），禁止引入任何自定义"Vue 资源热更新"逻辑。
*   **启动路径限制**：`src-tauri/src/main.rs` 必须直接加载 `WebviewUrl::App("index.html".into())`。
*   **严控 Rust 依赖体积**：禁止在 `Cargo.toml` 中引入无关外部依赖（已剔除的 `reqwest`、`zip`、`sha2`、`hex` 等严禁加回）。`serde` 和 `serde_json` 仅作为序列化基础库。

---

## 2. 分层架构硬性约束 🔴

必须严守以下标准调用链：

```
Vue Component -> Pinia Store -> Frontend Service -> callTauri / Native Service Gateway -> Rust Command -> Rust Service -> DB/Repo
```

**三条禁令**：
- ❌ 页面组件直接调用 `@tauri-apps/api/*`
- ❌ 页面组件直接访问 SQLite 或原始网络请求
- ❌ Store 内编写复杂底层逻辑
- ❌ 页面、组件、布局层直接导入 `src/services/*` 或绕过 Store 调用底座服务
- ❌ Composable 直接导入 `src/services/*` 承担底座适配
- ❌ Store 直接导入 `services/tauri` 网关，必须使用模块 Service

数据库与持久化能力应向 Rust Command / Service / DB-Repo 收敛，避免前端直驱 SQLite 造成运行时差异和权限边界不清。当前已移除前端 SQL 插件与 SQL capability，禁止重新引入 `@tauri-apps/plugin-sql`、`tauri-plugin-sql` 或任何前端 SQL 直驱通道。

文件读写能力必须由 Rust Command / Service 做路径、扩展名、大小与沙箱校验后暴露给前端。禁止直接依赖、注册或开放 `@tauri-apps/plugin-fs`、`tauri-plugin-fs`、`fs:default`，禁止把 `assetProtocol.scope` 放宽到整个 `$HOME/**/*`。

---

## 3. 开发命令 🔴

| 命令 | 用途 | 何时必须执行 |
|------|------|-------------|
| `npm run tauri:dev` | 本地开发调试（前端+Rust 联调） | 日常开发，禁止仅用 `npm run dev` |
| `npm run check:architecture` | 分层架构红线检查 | 涉及 Tauri / IPC / HTTP / DB 边界时 |
| `npm run typecheck` | TypeScript 类型校验 | **每次代码变更后必须执行** |
| `npm run verify` | 架构检查 + TypeScript 校验 | 普通前端任务完成前推荐执行 |
| `npx tauri build --no-bundle` | 发布级编译测试 | 修改 Rust / capabilities 后 |
| `npm run release` | 一键发布（版本号+Tag+日志） | 版本发布时，禁止手动改版本号 |

---

## 4. Git 提交规范 🔴

*   Commit 消息概要**必须使用简体中文**（如 `feat: 新增...`、`fix: 修复...`）。
*   CI/CD 由 `v*` / `app-v*` 格式 Tag 触发，禁止修改 `.github/workflows/release.yml` 触发逻辑。

---

## 5. AI 助手交互准则 🔴

*   内部推理与最终回复**必须完全使用简体中文**。
*   遵循 TypeScript / Vue 3 最佳实践，不引入无用导入。
*   每次修改完必须运行 `npm run typecheck`。

### 默认工作方式

*   先理解现有实现，再修改。
*   优先复用现有组件、工具、类型、store、request 封装。
*   小步修改，避免大范围无关重构。
*   保持变更可回滚、可审查。
*   不引入新依赖，除非用户明确要求。
*   不擅自升级核心依赖。
*   不删除看似无用但可能有业务意义的代码。
*   不格式化无关文件。
*   信息不足时明确说明假设，不得编造。

---

## 6. 样式与组件规范速查 🔴

*   UI 组件开发必须优先复用项目现有 `Base*` 基础组件与 Element Plus 封装组件；自定义界面基于原生 TailwindCSS 和 scoped CSS，并必须支持深色模式 (`.dark`)。
*   保持 Windows WebView2 下中文字体 ClearType 清晰度。
*   接口命名：前端 `camelCase` ↔ Rust `snake_case`，IPC 调用统一走 `callTauri()` 封装，页面/组件/布局不得直接导入 Tauri 插件或 `src/services/*`。

---

## 7. 安全底线 🔴

AI 不得：

*   在前端硬编码密钥、token、密码、API key。
*   泄露环境变量或在日志中输出敏感信息。
*   使用 `v-html` 渲染不可信内容。
*   绕过登录、权限、审计逻辑。
*   把用户输入直接拼接为 HTML 或未编码 URL。

---

## 8. 禁止行为 🔴

未经用户明确要求，AI 不得：

*   替换技术栈或重写项目架构。
*   引入大型依赖或修改锁文件。
*   重命名大量文件或格式化无关文件。
*   修改 CI/CD、权限模型、生产环境配置。
*   引入新的开箱即用 UI 框架或绕过现有 `Base*` 组件体系。
*   擅自升级核心依赖（Vue / Tauri）。
*   为了"更现代"而做无需求重构。
*   修改构建、鉴权、部署配置。

---

## 9. 文档维护原则

*   高频、全局、稳定规则才进入 `AGENTS.md`。
*   具体、低频、可变化规则进入 `docs/` 或 `docs/ai/`。
*   临时讨论不得直接写入规则。
*   已废弃规则必须标记或删除。
*   文档必须与代码事实一致。
*   目标：让 AI 犯错越来越少，而非文档越来越多。

规则晋升路径：`聊天临时约定` → `docs/ai/*.md` → `docs/*.md` → `AGENTS.md`。

规则需要经过真实任务验证才值得沉淀。详见 [maintenance.md](docs/ai/maintenance.md)。

---

## 📚 10. 开发规范文档导航

以下规范文档按主题拆分。**AI 助手根据当前任务类型按需读取对应文档**，无需每次全量阅读。

### 🔴 高优先级 — 几乎所有任务都需要

| 文档 | 适用场景 | 路径 |
|------|---------|------|
| **快速迭代工程手册** | 新任务启动、跨模块开发、质量门禁选择 | [engineering-playbook.md](docs/engineering-playbook.md) |
| **架构与目录规范** | 新增页面/模块、目录调整、组件拆分 | [architecture.md](docs/architecture.md) |
| **样式与视觉规范** | UI 开发、样式调整、基础组件使用 | [frontend-style.md](docs/frontend-style.md) |
| **国际化规范** | 任何涉及文案的改动 | [i18n.md](docs/i18n.md) |

### 🟡 中优先级 — 涉及特定层级时读取

| 文档 | 适用场景 | 路径 |
|------|---------|------|
| **错误码日志规范** | 新增/修改 service / store / composable | [error-code.md](docs/error-code.md) |
| **Rust 后端规范** | 涉及 Rust 侧代码改动 | [rust-backend.md](docs/rust-backend.md) |
| **请求与 Tauri 兼容** | HTTP 请求封装、Tauri 运行时降级 | [request-and-tauri.md](docs/request-and-tauri.md) |
| **全局组件注册** | 新增公共组件、修改 main.ts 注册 | [global-components.md](docs/global-components.md) |

### 🟢 低优先级 — 特定功能开发时参考

| 文档 | 适用场景 | 路径 |
|------|---------|------|
| **路由与异步规范** | 路由配置、异步加载状态 | [routing-and-async.md](docs/routing-and-async.md) |
| **UI 模式与数据一致性** | 弹窗设计、自动更新流、目录遍历、文件-DB 关联 | [ui-patterns.md](docs/ui-patterns.md) |

### 🔵 AI 协作治理 — 元规范

| 文档 | 适用场景 | 路径 |
|------|---------|------|
| **AI 文档索引** | 理解文档体系、按需阅读指引 | [index.md](docs/ai/index.md) |
| **代码审查清单** | 任务完成后的自检 | [review-checklist.md](docs/ai/review-checklist.md) |
| **架构决策记录** | 理解"为什么这么做" | [decisions.md](docs/ai/decisions.md) |
| **文档维护方法论** | 新增/修改/删除规则时 | [maintenance.md](docs/ai/maintenance.md) |

### 按需读取策略示例

```
任务："新增一个工具箱子页面"
→ 必读: architecture.md + frontend-style.md + i18n.md
→ 可选: global-components.md（如需新增公共组件）

任务："修复 Rust 命令层报错"
→ 必读: rust-backend.md + error-code.md

任务："给某个 Service 加日志"
→ 必读: error-code.md

任务："理解某个架构决策的背景"
→ 必读: docs/ai/decisions.md

任务完成后：
→ 参考: docs/ai/review-checklist.md（自检）
```
