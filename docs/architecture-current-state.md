# Monster Workbench 当前架构说明

> 更新日期：2026-06-13
> 定位：只记录当前有效架构事实、边界和后续风险点；已删除的旧独立创作工作台、任务队列、资产库和常驻运行时不再作为当前项目事实。

## 1. 架构摘要

`monster-workbench` 是 Tauri v2 桌面客户端 **Monster Tools**。

- 前端：Vue 3、Pinia、Vue Router、Vite、TailwindCSS、Element Plus 与项目内 `Base*` 组件。
- 桌面控制面：Rust / Tauri command、service、infra、SQLite、本地文件、系统能力和更新机制。
- AI 能力：保留 `/ai` 工作台、AI Provider 配置、连接测试、聊天测试、生图测试、队列与取消；Python 只作为 provider tester / adapter 脚本被 Rust 调用。
- 数据与文件：应用配置、上传文件、日志、导航库、AI 生成文件和测试日志继续使用既有本地目录；前端只通过受控 service 访问。

标准调用链：

```text
Vue Page / Component
  -> Pinia Store
  -> Frontend Service
  -> callTauri / Native Gateway
  -> Rust Command
  -> Rust Service
  -> Infra / DB / File / Python Tester
```

硬边界：

- Vue 不直连 Python、SQLite、文件系统、裸 `invoke()` 或原始 `fetch()`。
- 页面、组件、布局不直接导入 `src/services/*`；需要底座能力时走 Store -> Service。
- Rust 负责 IPC、权限、路径校验、SQLite 可信状态、事件桥接和更新。
- Python provider tester / adapter 不拥有 Tauri capability，不绕过 Rust 访问用户文件或数据库。
- sub2api / cockpit 只作为 OpenAI-compatible 模型网关，不保存业务状态。

## 2. 前端分层

### 2.1 应用壳层

- `src/main.ts`：注册 Pinia / Router / 全局基础组件，初始化设置和后台任务监听。
- `src/App.vue`：挂载全局布局。
- `src/layouts/Layout.vue`：桌面主壳层，装配 Sidebar、Header、内容出口、更新弹窗、toast、message、confirm 和 global loading。
- `src/router/index.ts`：hash history，路由页面懒加载。

### 2.2 页面层

页面只做视图装配和交互表达，不直接访问 service、Tauri、SQLite、Python 或原始 HTTP。

| 路由 | 页面 | 当前角色 |
|---|---|---|
| `/workspace` | `views/workspace/WorkspacePage.vue` | 工作台入口 |
| `/system` | `views/system/SystemPage.vue` | 系统状态、日志、错误监控 |
| `/tools` | `views/tools/ToolsPage.vue` | 工具箱 |
| `/navigation` | `views/navigation/NavigationPage.vue` | 导航收藏 |
| `/ai` | `views/ai/AiPage.vue` | AI Provider / Chat / Image / Prompt 工作台 |
| `/settings` | `views/settings/SettingsPage.vue` | 设置与诊断 |
| `/file-manager` | `views/file-manager/FileManagerPage.vue` | 上传文件管理 |
| `/playground` | `views/playground/PlaygroundPage.vue` | 组件与工作流调试入口 |
| `/utils-docs` | `views/utils-docs/UtilsDocsPage.vue` | 工具函数文档展示 |

旧独立创作工作台路由和对应页面已经移除。

### 2.3 Store 层

Store 是前端业务编排层，可以调用模块 service，但不能直接导入 `services/tauri`。

| 区域 | 当前事实 | 后续注意 |
|---|---|---|
| AI | `src/stores/ai.ts` 是 facade，分域 store 包括 provider、session、queue、prompt、chat runtime、image runtime、provider task runtime | 新 runtime 逻辑继续放到分域 store / helper，避免回流到 facade |
| Background task | `background-task` 只监听公共 `task-progress` 事件，当前主要服务更新下载进度展示 | 不重新承载创作任务状态机 |
| Native event | `native-event` 只封装 Tauri event listener | 页面通过 store 消费事件，不直接监听底座 |
| Settings/System/Navigation/File | 各自通过对应 service 进入 Rust | 继续保持 browser mock 与 Tauri contract 对齐 |

### 2.4 Service 层

Service 是前端唯一允许接触底座、Tauri、HTTP 和浏览器/桌面差异的层。

| 文件 | 职责 |
|---|---|
| `src/services/tauri.ts` | 唯一 `invoke()` / `callTauri()` 网关；Tauri runtime 调 Rust，浏览器 dev 调 mock |
| `src/services/request.ts` | 唯一裸 `fetch()` 封装 |
| `src/services/tauri.mock.ts` | 浏览器降级 mock，维持 service contract |
| `*.service.ts` | 模块服务外观，向 Store 暴露稳定 API |

涉及 Tauri / IPC / HTTP / DB / 文件能力边界时必须运行：

```bash
npm run check:architecture
```

## 3. Rust / Tauri 分层

目录职责：

```text
src-tauri/src/
├── main.rs       # Tauri 入口，插件、窗口/托盘、service 注入、command 注册
├── commands/    # IPC 薄代理
├── services/    # 业务服务与运行时控制面
└── infra/       # DB、文件、路径、日志、脱敏、错误模型
```

### 3.1 main.rs

`main.rs` 负责：

- 注册 Tauri 插件：dialog、opener、process、updater。
- 通过 `WebviewUrl::App("index.html".into())` 创建主窗口。
- 初始化 `PathProvider` 和各 service。
- `app.manage(Mutex<Service>)` 注入共享状态。
- 初始化运行时 schema。
- 注册 tray、窗口关闭转隐藏、IPC commands。

### 3.2 Command 层

当前 command 域：

```text
commands/app.rs
commands/auth.rs
commands/config.rs
commands/database.rs
commands/file.rs
commands/navigation.rs
commands/system.rs
commands/updater.rs
commands/ai.rs
```

Command 保持薄代理：取 `State<Mutex<Service>>`，调用 service，返回序列化结果。

### 3.3 Service 层

| Service | 当前职责 |
|---|---|
| `AiProviderService` | AI Provider 工作台诊断、队列、取消、Python tester 调用、生图输出管理、provider adapter 对接 |
| `TaskService` | 公共 `task-progress` 事件服务，当前用于 `trigger_update_download` 的下载进度模拟/通知 |
| `DatabaseService` | DB 导入导出、重置、状态检查、运行时 `test_logs` 初始化 |
| `AppService` / `ConfigService` / `AuthService` | 应用路径、偏好配置、管理员密码验证 |
| `FileService` / `SystemService` / `LogService` | 文件、系统、日志和诊断能力 |
| `NavigationService` | 导航库初始化、列表、增删改、排序、导入和文件引用检查 |

### 3.4 Infra 层

当前 infra 域：

```text
crypto.rs
db.rs
db_nav.rs
fs.rs
http.rs
logger.rs
path.rs
sensitive.rs
```

生产 API 面应只保留 service/command 真实需要的方法；测试 helper 尽量放在 `#[cfg(test)]` 范围内。

## 4. 数据与资源

| 类型 | 位置 | 管理方 |
|---|---|---|
| 应用数据根 | `~/.monster-tools` | `PathProvider` |
| 偏好配置 | `~/.monster-tools/config.json` | `ConfigService` |
| 上传文件 | `~/.monster-tools/uploads/*` | `FileService` |
| 日志 | `~/.monster-tools/logs` | `LogService` / `LoggerInfra` |
| AI 生成文件 | `~/.monster-tools/ai/generated` | `AiProviderService` |
| 主库 | `monster_workbench.db` | `DatabaseService` / `DbInfra` |
| 导航库 | `navigation.db` | `NavigationService` / `DbNavInfra` |

当前 `DatabaseService::init_runtime_schema()` 只初始化 `test_logs` 相关表；已删除的创作任务、资产、批量任务和模型审计表不再是运行时 schema 的一部分。

Tauri bundle resources 当前只保留：

```text
../src/config/ai-provider-registry.json
sidecars/python/ai_provider_tester.py
sidecars/python/provider_adapters.py
```

## 5. AI Provider 工作台

AI Provider 工作台是当前保留的 AI 能力入口：

- 通过 `AiProviderService` 与 `ai_provider_tester.py` 做 provider 连接、模型列表、chat、生图测试。
- `src-tauri/sidecars/python/provider_adapters.py` 是 Provider Adapter 层，包含 OpenAI-compatible adapter 与 Anthropic Messages adapter。
- `src/config/ai-provider-registry.json` 是 provider preset、adapter id 与 `models/chat/image` capability 的共享静态 registry。
- 前端与 Rust 测试入口按 `models/chat/image` capability 做最小动作拦截；chat-only 协议不进入生图或模型列表测试。
- Rust 内保留内存队列、取消、并发、超时、输出限制和脱敏。
- AI Provider 工作台不写旧工作台任务、资产或模型审计表。

## 6. 大文件与拆分优先级

当前仍有大文件，但不是都需要马上拆。优先级按“职责扩张是否影响验证”排序：

| 优先级 | 文件 | 当前体量 | 判断 | 建议方向 |
|---|---:|---:|---|---|
| P0 | `src-tauri/src/services/ai_service.rs` | 约 2136 行 | 当前最大后端热区，队列、任务注册、取消、provider registry 与 provider config 校验仍集中；Python 进程、输出清理、DTO 已完成首轮抽离 | 下一步保持 command/DTO 不变，继续拆内部 `queue`、`task_registry`、`cancel_registry`、`registry` 模块 |
| P1 | `src/views/ai/components/AiImagePanel.vue` | 约 1306 行 | 已完成首轮 UI 拆分，但父组件仍承担工作区编排、会话动作、预览状态、重试/取消 | 新增生图功能前继续抽稳定 action/helper；父组件只保留页面编排 |
| P1 | `src/stores/ai-image-runtime.ts` | 约 642 行 | 生图消息、pending recovery、结果 patch、取消/失败分支仍偏宽 | 按 recovery、result patch、cancel sync、message builder 拆 helper |
| P1 | `src/views/utils-docs/utilsDocsContent.ts` | 约 1784 行 | 内容型/疑似生成文件 | 先确认生成链路；若是生成物，不手拆内容，维护生成脚本与质量检查 |
| P2 | `src/components/common/BaseDateRange.vue` | 约 912 行 | 公共组件交互集中，但 API 稳定 | 只在触碰功能时拆 preset、range validation、面板 UI |
| P2 | `src/views/ai/components/image/AiImageMessageList.vue` | 约 731 行 | 新拆出的 message/result display 仍偏宽 | 后续拆 result card、gallery、pending/failed card |
| P2 | `src/services/tauri.mock.ts` | 约 533 行 | 浏览器 mock 聚合多个领域 | 按 app/file/system/navigation/ai 拆 mock handler，保持 `callTauri` contract |

`Base*` 组件和 `utils/*` 中的中大型文件，如果 API 稳定、语义单一、演示/检查覆盖明确，不为行数机械拆分。

## 7. 已移除范围

以下能力已经从当前架构中移除：

- 旧独立创作工作台路由、侧栏入口、工作台卡片、页面组件、专属 i18n。
- 旧独立创作工作台前端 service、store、types、formatter composable。
- 旧独立创作工作台后端 commands、services、repos、schema。
- 旧常驻运行时脚本及其测试。
- 旧工作台边界检查脚本、浏览器 mock 验证脚本和历史执行包。
- 旧工作台专题文档、多 Agent、任务队列、资产库、运行时路线文档。

公共 AI Provider 工作台、provider tester、provider adapter、公共 UI、公共 Store / Service 和 Tauri 更新机制不属于本次移除范围。

## 8. 当前风险点

1. `AiProviderService` 是当前最大后端热点；已抽出 `ai_provider_types.rs`、`ai_provider_process.rs`、`ai_provider_output.rs`，下一步拆队列/任务注册时必须保护队列、取消、并发、输出限制和脱敏回归。
2. AI 生图前端热点已完成首轮 UI 拆分；继续加功能前应保持新增 UI 先抽组件，父组件只做工作区编排。
3. AI runtime helper 仍需继续收窄 pending image recovery 与 `generateImageMessage` 成功/失败分支。
4. Browser mock 必须继续跟 Tauri contract 对齐，避免只在浏览器成立。
5. Python provider tester / adapter 改动后必须运行 `npm run test:ai-sidecar`。
6. 文档不得继续引用已删除的旧工作台体系；未闭环事项写入 `agent/open-loops.md`。

## 9. 质量门禁

| 场景 | 必跑 |
|---|---|
| 前端 / TS / Vue 改动 | `npm run typecheck` |
| Tauri / IPC / HTTP / DB / 文件边界 | `npm run check:architecture` |
| 普通前端任务完成前 | `npm run verify` |
| Rust service / command / infra 改动 | `cargo check --manifest-path .\src-tauri\Cargo.toml` |
| Rust / capabilities / 打包链路 | `npm run tauri:build:no-bundle` |
| Python provider 测试链路 | `npm run test:ai-sidecar`，必要时 `npm run test:ai-sidecar:stress` |
| release 前 | `npm run release:test`，正式前 `npm run release:test:full` |

## 10. 文档入口

- 全局红线：[AGENTS.md](../AGENTS.md)
- 分层目录规范：[architecture.md](architecture.md)
- 工程流程：[engineering-playbook.md](engineering-playbook.md)
- 前端样式：[frontend-style.md](frontend-style.md)
- 文案/i18n：[i18n.md](i18n.md)
- Rust 后端：[rust-backend.md](rust-backend.md)
- AI 文档入口：[ai/index.md](ai/index.md)
- 未闭环事项：[../agent/open-loops.md](../agent/open-loops.md)
