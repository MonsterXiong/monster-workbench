# Monster Workbench 当前架构说明

> 生成日期：2026-06-11
> 分析范围：基于当前工作区代码与文档，不等同于干净 `main` 分支快照。
> 验证佐证：本次分析期间执行 `npm run check:architecture`，结果通过。

本文面向后续架构升级与业务调整，重点说明当前项目的分层方式、核心架构、关键业务流、数据边界、风险点和升级建议。本文不包含代码实现方案。

---

## 1. 一页摘要

`monster-workbench` 是一个 Tauri v2 桌面客户端，前端是 `Vue 3 + Pinia + Vue Router + Vite + TailwindCSS + Element Plus/Base*`，后端是 Rust/Tauri 控制面，当前已经引入 Python sidecar 作为 AI Provider 测试脚本和创作 workflow 常驻 stub。

当前最重要的架构结论：

1. 标准调用链已经明确，并且通过脚本检查：

   ```text
   Vue Page/Component
     -> Pinia Store
     -> Frontend Service
     -> callTauri / Native Gateway
     -> Rust Command
     -> Rust Service
     -> Infra / SQLite / File / Python Sidecar
   ```

2. Rust 是桌面控制面，负责 Tauri IPC、权限边界、路径校验、SQLite 可信状态、事件桥接、sidecar 生命周期、更新和系统能力。
3. Vue 是展示与交互面，负责页面、表单、任务看板、资产展示、人工确认和实时状态呈现。
4. Python 当前有两条链路：
   - `ai_provider_tester.py`：一次性脚本，服务现有 AI Provider 连接测试、对话测试、生图测试。
   - `creative_health_server.py`：常驻 sidecar stub，服务持续型 AI 创作系统的 workflow 过渡验证。
5. 数据层有两个 SQLite 分支：
   - `monster_workbench.db`：创作任务、资产、批处理、Goal、model_runs、test_logs 等。
   - `navigation.db`：导航收藏。
6. 创作系统当前处于 Goal 00-13 后的硬化阶段：任务、资产、Goal、多 Agent stub、批量 mock/prompt/real-image demo 链路已经有代码痕迹和验证记录；下一阶段应该从“功能闭环验证”转向“领域拆分、迁移体系、正式 Python workflow runtime、资产版本治理”。

---

## 2. 总体架构图

```mermaid
flowchart TB
  subgraph UI["Vue UI 层"]
    Pages["views/* 页面"]
    Components["components/common Base* 与页面私有组件"]
    Layout["layouts/Layout.vue 桌面壳层"]
  end

  subgraph State["前端状态/编排层"]
    Stores["Pinia Stores"]
    Composables["UI Composables"]
    Utils["utils/* 纯工具函数"]
  end

  subgraph FrontendServices["前端服务层"]
    TauriGateway["services/tauri.ts callTauri"]
    RuntimeGuard["services/runtime.ts 运行时判断"]
    RequestClient["services/request.ts HTTP 封装"]
    DomainServices["*.service.ts 模块服务"]
    BrowserMock["services/tauri.mock.ts 浏览器 Mock"]
  end

  subgraph Tauri["Rust / Tauri 控制面"]
    Main["main.rs 插件/窗口/托盘/状态注册"]
    Commands["commands/* IPC 薄代理"]
    RustServices["services/* 业务服务"]
    Infra["infra/* 路径/DB/文件/日志/脱敏"]
  end

  subgraph Data["本地数据与资产"]
    MainDb["monster_workbench.db"]
    NavDb["navigation.db"]
    Uploads["~/.monster-tools/uploads"]
    Logs["~/.monster-tools/logs"]
    Generated["~/.monster-tools/ai/generated"]
    Config["~/.monster-tools/config.json"]
  end

  subgraph Python["Python 执行面"]
    ProviderTester["ai_provider_tester.py"]
    CreativeServer["creative_health_server.py"]
  end

  subgraph Provider["外部模型/网关"]
    OpenAICompatible["OpenAI-compatible Provider"]
    Gateway["sub2api/cockpit 等模型网关"]
  end

  Pages --> Stores
  Components --> Stores
  Layout --> Stores
  Stores --> DomainServices
  Composables --> Stores
  DomainServices --> TauriGateway
  DomainServices --> RequestClient
  TauriGateway -->|Tauri runtime| Commands
  TauriGateway -->|Browser dev| BrowserMock
  Main --> Commands
  Commands --> RustServices
  RustServices --> Infra
  Infra --> MainDb
  Infra --> NavDb
  Infra --> Uploads
  Infra --> Logs
  Infra --> Generated
  RustServices --> Config
  RustServices --> ProviderTester
  RustServices --> CreativeServer
  ProviderTester --> OpenAICompatible
  CreativeServer --> Gateway
```

---

## 3. 前端架构分层

### 3.1 应用启动层

主要文件：

- `src/main.ts`
- `src/App.vue`
- `src/router/index.ts`
- `src/layouts/Layout.vue`

启动流程：

```mermaid
sequenceDiagram
  participant Main as src/main.ts
  participant App as App.vue
  participant Pinia as Pinia
  participant Router as Vue Router
  participant Settings as useSettingStore
  participant Bg as useBackgroundTaskStore
  participant DOM as #app

  Main->>App: createApp(App)
  Main->>Pinia: app.use(createPinia())
  Main->>Router: app.use(router)
  Main->>Main: 注册全局 Base* 组件
  Main->>Settings: initSettings()
  Settings-->>Main: 主题/语言/更新配置就绪
  Main->>Bg: initTaskListener()
  Bg-->>Main: task-progress 监听就绪
  Main->>DOM: app.mount("#app")
```

当前事实：

- `main.ts` 承担应用装配、全局基础组件注册、全局异常处理、设置初始化和后台任务监听初始化。
- `App.vue` 只挂载 `Layout`，保持入口壳层轻薄。
- `router/index.ts` 使用 hash history，并且路由页面懒加载。
- `Layout.vue` 是桌面主壳层：Sidebar、AppHeader、AppContent、router-view、UpdateModal、Toast、Message、ConfirmDialog、GlobalLoading 都在这里统一装配。

### 3.2 页面层 `src/views`

当前路由模块：

| 路由 | 页面 | 业务角色 |
|---|---|---|
| `/workspace` | `views/workspace/WorkspacePage.vue` | 工作台入口，当前提供创作系统入口卡片 |
| `/system` | `views/system/SystemPage.vue` | 系统状态、日志终端、错误监控 |
| `/tools` | `views/tools/ToolsPage.vue` | 工具箱：目录、端口、JSON、Base64、时间戳等 |
| `/navigation` | `views/navigation/NavigationPage.vue` | 导航收藏、分类、排序、导入导出 |
| `/ai` | `views/ai/AiPage.vue` | AI Provider 配置、对话、生图、提示词库、功能面板 |
| `/creative` | `views/creative/CreativePage.vue` | 持续型 AI 创作系统工作台/演示台 |
| `/settings` | `views/settings/SettingsPage.vue` | 外观、数据、诊断设置 |
| `/file-manager` | `views/file-manager/FileManagerPage.vue` | 上传文件管理、预览、批量删除、拖拽上传 |
| `/playground` | `views/playground/PlaygroundPage.vue` | 基础组件与工作流调试入口 |
| `/utils-docs` | `views/utils-docs/UtilsDocsPage.vue` | 工具函数文档展示 |
| `/403` `/500` `*` | error pages | 错误页 |

页面层的职责：

- 装配 store 状态和页面私有组件。
- 处理页面级交互，例如弹窗、确认、toast、查询参数。
- 不直接访问 Tauri、SQLite、Python、原始 HTTP。

当前值得注意的页面：

- `views/creative/CreativePage.vue` 当前已经是三栏工作台壳层，装配 `CreativeAssetSidebar`、`CreativeWorkspace`、`CreativeAgentMonitor`。
- `CreativeWorkflowDemo.vue` 当前主要位于中间工作区内部，更准确的定位是“项目中心 orchestration shell”：承载 prompt workflow、review stub、domain assets、Goal fan-out、batch mock/prompt/real-image、项目历史等多个业务域；左右栏已首轮接入当前项目、资产分类计数、任务队列和执行活动，但仍属于轻量项目/监控壳层，不是完整资产库或正式 Agent 控制台。
- `views/ai/AiPage.vue` 是 AI 工作台壳层，按 tab 组合 `AiProviderPanel`、`AiChatPanel`、`AiImagePanel`、`AiPromptPanel`、`AiFeaturePanel`。

### 3.3 组件层

组件分两类：

1. 全局基础组件：`src/components/common/Base*.vue`
   - 负责一致的桌面 UI 原子能力：按钮、输入、表格、面板、时间线、分页、弹窗、状态、上传、布局等。
   - 在 `main.ts` 中集中注册高频基础组件。
2. 页面私有组件：`src/views/<module>/components/*`
   - 例如 `views/navigation/components/*`、`views/file-manager/components/*`、`views/system/components/*`。
   - 只服务单个页面，不跨模块扩散。

### 3.4 Store 层

Store 是当前前端业务编排层。核心 store 如下：

| Store | 主要职责 | 典型下游服务 |
|---|---|---|
| `app` | 应用版本、本地数据目录、布局偏好 | `app.service` |
| `settings` | 主题、语言、自动更新、数据备份恢复 | `config.service`、`system.service` |
| `update` | 更新检查、更新弹窗、更新包下载进度 | `app-updater`、`updater.service`、`task` |
| `system` | DB 状态、日志、诊断导出、错误监控联动 | `system.service`、`logger` |
| `navigation` | 导航分页、分类、增删改、排序、导入导出 | `navigation.service` |
| `file-manager` | 上传文件列表、预览、批量删除、拖拽上传 | `file-manager.service` |
| `tools` | 工具箱各工具状态与系统工具调用 | `tools.service` |
| `ai` | AI façade，协调 provider/session/queue/image/prompt | `ai.service`、`config.service`、`system.service` |
| `background-task` | 全局后台任务进度 | `background-task.service` |
| `creative-project` | 当前项目、项目索引、种子、历史聚合 | `creative-project.service` |
| `creative-task` | prompt/review workflow 与任务事件 | `creative-task.service` |
| `creative-asset` | domain asset 草稿、关系与运行态 | `creative-asset.service` |
| `creative-goal` | goal 状态、fan-out、停止 | `creative-goal.service` |
| `creative-batch` | batch snapshot、分页任务、暂停/恢复/取消 | `creative-batch.service` |
| `window` | 桌面窗口控制状态 | `window-control` |
| `error-monitor` | 从日志中解析错误，记录处理状态 | `error-monitor.service` |
| `native-event` | Tauri 事件监听轻包装 | `native-event.service` |

当前仍需持续观察的中心点：

- `src/stores/ai.ts`：当前已收缩为 façade，主要负责 provider/session/queue/image/prompt 之间的协调。
- `src/views/creative/components/CreativeWorkflowDemo.vue`：当前已从综合大模板收敛为 orchestrator shell，但仍是 `/creative` 中央工作区的主要跨域编排点。

创作域 store 本身已经基本拆到位；后续更值得关注的是 façade 协调层和页面壳层是否继续膨胀。

### 3.5 Frontend Service 层

Service 是前端唯一允许接触底座、Tauri、HTTP 和浏览器/桌面差异的层。

关键服务：

| 文件 | 职责 |
|---|---|
| `services/tauri.ts` | `callTauri()` 唯一 IPC 网关；Tauri runtime 调 `invoke`，浏览器 dev 调 `tauri.mock.ts` |
| `services/tauri.mock.ts` | 浏览器离线 mock；模拟导航、设置、AI 队列、creative tasks、batch jobs、events |
| `services/runtime.ts` | 判断是否在 Tauri runtime |
| `services/request.ts` | 唯一裸 `fetch` 包装；支持 timeout、params、JSON/text 解析 |
| `services/app-updater.ts` | Tauri updater 插件封装 |
| `services/system.service.ts` | 系统能力聚合：路径、DB、文件、进程、日志、诊断、文件对话框、浏览器降级 |
| `services/background-task.service.ts` | `task-progress` 事件监听 |
| `services/creative-task.service.ts` | 创作任务、任务事件、prompt/review workflow 的前端服务外观 |
| `services/creative-project.service.ts` | 创作项目实体的前端服务外观 |
| `services/creative-asset.service.ts` | 创作资产与资产关系的前端服务外观 |
| `services/creative-goal.service.ts` | 创作目标与 multi-agent stub 的前端服务外观 |
| `services/creative-batch.service.ts` | batch job 创建、控制、分页与快照 |
| `services/ai.service.ts` | AI Provider 测试/队列/取消的前端服务外观 |
| `services/navigation.service.ts` | 导航数据库 CRUD、备份、图片 URL、打开链接 |
| `services/file-manager.service.ts` | 上传文件列表、删除、引用检查、拖拽上传 |
| `services/config.service.ts` | 偏好配置读写 |
| `services/database.service.ts` | DB 备份导入导出重置 |

Service 层的关键模式：

```mermaid
flowchart LR
  Store["Pinia Store"] --> DomainService["模块 service"]
  DomainService --> Runtime{"isTauriRuntime?"}
  Runtime -->|是| CallTauri["callTauri(command,args)"]
  Runtime -->|否 dev| Mock["tauri.mock.ts"]
  CallTauri --> RustCommand["Rust #[tauri::command]"]
  Mock --> Store
```

---

## 4. Rust / Tauri 后端分层

### 4.1 后端目录职责

```text
src-tauri/src/
├─ main.rs       # Tauri 入口，插件/窗口/托盘/状态/command 注册
├─ commands/    # IPC 命令薄代理
├─ services/    # Rust 业务服务
└─ infra/       # 路径、DB、文件、日志、脱敏、错误模型等基础设施
```

### 4.2 `main.rs` 控制面

`main.rs` 当前承担：

- 注册 Tauri 插件：dialog、opener、process、updater。
- 创建主窗口，必须通过 `WebviewUrl::App("index.html".into())` 加载前端入口。
- 初始化 `PathProvider`。
- 创建各 Rust service，并通过 `app.manage(Mutex<Service>)` 注入全局状态。
- 初始化 runtime schema。
- 创建托盘与窗口关闭转隐藏行为。
- 集中注册所有 `invoke_handler` commands。

当前被注入的服务包括：

```text
AppService
ConfigService
FileService
TaskService
AuthService
BatchJobService
DatabaseService
GoalService
LogService
SystemService
NavigationService
AiProviderService
SidecarLifecycleService
WorkerQueueService
```

### 4.3 Command 层

Command 层目录：

```text
commands/
├─ app.rs
├─ ai.rs
├─ auth.rs
├─ config.rs
├─ creative_batch.rs
├─ creative_goal.rs
├─ creative_project.rs
├─ creative_sidecar.rs
├─ creative_task.rs
├─ database.rs
├─ file.rs
├─ navigation.rs
├─ system.rs
├─ updater.rs
└─ worker_queue.rs
```

设计原则：

- Command 是 IPC 薄代理。
- 从 `State<Mutex<Service>>` 中取出 service。
- 调用 service 方法。
- 将 `AppError` 转成 JSON 字符串或返回序列化结构。

当前命名边界的一个重要现状：

- `commands/database.rs` 当前已经收回为窄边界，主要处理 DB 导入导出、重置和状态检查。
- Creative 运行时命令已按领域拆到 `creative_task`、`creative_goal`、`creative_batch`、`creative_project`、`creative_sidecar`、`worker_queue` 等命名空间。

### 4.4 Service 层

主要 Rust service：

| Service | 当前职责 |
|---|---|
| `AppService` | 版本号、本地数据目录 |
| `ConfigService` | `config.json` 偏好配置读写与校验 |
| `FileService` | 文件选择、上传、列出、删除、目录生成/读取，上传路径沙箱校验 |
| `DatabaseService` | DB 导出、导入、重置、runtime schema 初始化 |
| `NavigationService` | 导航数据 CRUD，忽略前端传入 db path，统一落到应用数据目录 |
| `SystemService` | 打开路径、窗口控制、进程查询/杀进程、文本文件、诊断报告 |
| `LogService` | 日志读写、清空、导出 |
| `AuthService` | 管理密码校验 |
| `AiProviderService` | AI Provider 测试队列、Python 测试脚本、取消、并发控制、生图输出目录 |
| `TaskService` | creative tasks/assets/task_events，prompt workflow，review stub，事件 emit |
| `GoalService` | creative goal、role、fan-out task、stop goal |
| `BatchJobService` | batch job 创建、启动、暂停、恢复、取消、supervisor、mock/prompt/generate worker |
| `SidecarLifecycleService` | Python 常驻 sidecar stub 生命周期、health、token、任务提交 |
| `WorkerQueueService` | claim/cancel/checkpoint/recovery 骨架 |

### 4.5 Infra 层

主要 infra：

| Infra | 当前职责 |
|---|---|
| `path.rs` | 统一定位 `~/.monster-tools` 与 `monster_workbench.db` |
| `db.rs` | 主 DB 导入/导出/重置，SQLite 文件校验 |
| `db_nav.rs` | `navigation.db` 建表、CRUD、自愈列补充 |
| `creative_db_schema.rs` + `creative_*_repo.rs` + `creative_db_tests.rs` | creative schema、repo 查询写入、旧库兼容回归 |
| `fs.rs` | 测试文件、目录结构生成、目录树读取 |
| `logger.rs` | 日志目录读写、脱敏、路径穿透防护 |
| `sensitive.rs` | 密钥、token、authorization、password 等脱敏 |
| `http.rs` | 基础连接检查 |
| `crypto.rs` | 加密/哈希相关基础能力，当前标记 dead_code |
| `mod.rs` | `AppError` / `AppResult` 统一错误模型 |

---

## 5. 数据与资产架构

### 5.1 存储位置

| 数据/资产 | 存储位置 | 管理方 | 说明 |
|---|---|---|---|
| 应用本地数据根目录 | `~/.monster-tools` | `PathProvider` | 上传、日志、配置、AI 生成文件的主要根 |
| 偏好配置 | `~/.monster-tools/config.json` | `ConfigService` | 主题、语言、自动更新、AI 配置等前端状态的后端持久化容器 |
| 上传文件 | `~/.monster-tools/uploads/images` / `uploads/files` | `FileService` | 文件类型、扩展名、大小、相对路径都有校验 |
| 日志 | `~/.monster-tools/logs` | `LogService` / `LoggerInfra` | 写入前脱敏，拒绝路径穿透文件名 |
| AI 生成缓存 | `~/.monster-tools/ai/generated` | `AiProviderService` | 生图测试输出；有最大文件数与过期清理 |
| 主 SQLite | `monster_workbench.db` | `DatabaseService` / `creative_db_schema` / `creative_*_repo` | 创作系统、model_runs、test_logs |
| 导航 SQLite | `navigation.db` | `NavigationService` / `DbNavInfra` | 导航收藏独立库 |

### 5.2 Creative 主库核心表

当前 `creative_db_schema::init_schema()` 维护：

```mermaid
erDiagram
  creative_tasks {
    integer id PK
    text project_id
    integer goal_id FK
    integer batch_job_id FK
    text task_type
    text status
    integer priority
    text payload_json
    text result_json
    text error_message
    integer retry_count
    integer max_retries
    integer parent_task_id FK
    integer asset_id FK
    integer sequence_no
    text created_at
    text updated_at
    text started_at
    text finished_at
  }

  task_events {
    integer id PK
    integer task_id FK
    text event_type
    text message
    text payload_json
    text created_at
  }

  assets {
    integer id PK
    text project_id
    text asset_type
    text title
    text content
    text file_path
    text thumbnail_path
    text metadata_json
    text status
    text created_at
    text updated_at
  }

  asset_links {
    integer id PK
    integer source_asset_id FK
    integer target_asset_id FK
    text link_type
    text created_at
  }

  model_runs {
    integer id PK
    text project_id
    integer task_id FK
    integer asset_id FK
    text provider_id
    text provider_type
    text model
    text request_type
    text status
    integer duration_ms
    text prompt_hash
    text prompt_version_id
    integer input_token_count
    integer output_token_count
    real cost_estimate
    text error_code
    text error_message
    text metadata_json
    text created_at
    text finished_at
  }

  batch_jobs {
    integer id PK
    text project_id
    text name
    text batch_type
    text status
    integer total_count
    integer concurrency
    integer max_retries
    text prompt_template
    text provider_id
    text model
    text image_size
    text budget_json
    text created_at
    text updated_at
    text started_at
    text finished_at
  }

  creative_goals {
    integer id PK
    text project_id
    text title
    text description
    text status
    text budget_json
    text created_at
    text updated_at
    text started_at
    text finished_at
    text stopped_at
  }

  creative_goal_roles {
    integer id PK
    integer goal_id FK
    text role_key
    text task_type
    text description
    integer task_count
    text budget_json
    text created_at
    text updated_at
  }

  creative_tasks ||--o{ task_events : has
  creative_tasks }o--o| assets : output_asset
  creative_tasks }o--o| creative_tasks : parent_task
  batch_jobs ||--o{ creative_tasks : owns
  creative_goals ||--o{ creative_tasks : owns
  creative_goals ||--o{ creative_goal_roles : has
  assets ||--o{ asset_links : source
  assets ||--o{ asset_links : target
  creative_tasks ||--o{ model_runs : records
  assets ||--o{ model_runs : traces
```

### 5.3 当前数据模型特点

优点：

- `task_events` 与 `creative_tasks` 分离，适合进度和审计。
- `model_runs` 已经预留 provider、model、token、cost、错误分类等观测字段。
- 大图不进 DB，`assets.file_path` / `thumbnail_path` 只存路径。
- `asset_links` 支持 `derived_from`、`uses_character`、`uses_scene`、`part_of` 等资产关系。
- `batch_jobs` 与 `creative_tasks.batch_job_id/sequence_no` 支持批量任务分页与状态统计。

当前不足：

- 没有独立 `projects` 表，`project_id` 仍是字符串维度，适合 demo，不适合正式多项目治理。
- creative schema 已切换到最小版本化 migration 框架：当前通过 `schema_migrations` 记录版本，并落地了 `bootstrap_creative_schema` 与 `add_creative_task_goal_batch_columns` 两个幂等迁移；但迁移前备份、破坏性变更审批与更细粒度领域迁移仍未完全正式化。
- `asset_version`、`parent_asset_id`、`source_task_id` 等 provenance 字段主要依赖 `metadata_json` 与 `asset_links` 表达，正式化后建议结构化。
- `task_status` 没有 DB-level enum 约束，状态合法性主要靠 service 层约束。

---

## 6. 核心业务域

### 6.1 基础桌面壳层

范围：

- 应用启动。
- 全局布局。
- 侧边栏路由。
- 主题、语言、布局偏好。
- 更新弹窗。
- 全局 Toast / Message / Confirm / Loading。
- 窗口最小化、最大化、关闭隐藏、托盘。

关键路径：

```text
main.ts -> App.vue -> Layout.vue -> Sidebar/AppHeader/AppContent/router-view
```

后端支持：

```text
main.rs -> app/window/updater commands -> AppService/SystemService/Updater
```

### 6.2 系统诊断与日志

范围：

- DB 状态检查。
- 本地数据目录展示。
- 日志读取、过滤、清空、导出。
- 错误监控，从日志行解析错误并维护 review 状态。
- 系统诊断导出。

关键路径：

```text
SystemPage
  -> useSystemStore
  -> system.service / logger
  -> commands::system
  -> SystemService / LogService
  -> LoggerInfra / DbInfra / PathProvider
```

### 6.3 文件上传与文件管理

范围：

- 选择文件、上传文件。
- 图片预览。
- 列出上传文件。
- 删除文件前检查导航引用。
- 强制删除时清理导航引用。
- 桌面拖拽上传。

关键路径：

```text
FileManagerPage
  -> useFileManagerStore
  -> file-manager.service
  -> file/upload/list/delete/check references commands
  -> FileService + NavigationService
  -> ~/.monster-tools/uploads
```

安全边界：

- 上传路径只允许落到 `uploads/images` 或 `uploads/files`。
- 图片有扩展名白名单和 20MB 大小限制。
- 普通文件拒绝脚本/可执行扩展名。
- 删除时拒绝绝对路径、`..` 和非 uploads 根路径。

### 6.4 导航收藏

范围：

- 导航条目 CRUD。
- 分类、精选、热门、点击量。
- 排序。
- 备份导入导出。
- logo/background 图片引用。

关键路径：

```text
NavigationPage
  -> useNavigationStore
  -> navigation.service
  -> commands::navigation
  -> NavigationService
  -> DbNavInfra
  -> ~/.monster-tools/navigation.db
```

注意：

- 前端仍传 `appStore.localPath` 给 navigation service，但 Rust `NavigationService` 当前忽略不可信参数，统一使用 `PathProvider` 定位 app dir。

### 6.5 工具箱

范围：

- 目录生成。
- 目录树读取。
- 端口进程查询和杀进程。
- 进程名查询和杀进程。
- JSON、Base64、时间戳等前端工具。

关键路径：

```text
ToolsPage
  -> useToolsStore
  -> tools.service / system.service
  -> commands::file / commands::system
  -> FileService / SystemService
```

### 6.6 AI Provider 工作台

范围：

- Provider 配置。
- 多模型配置。
- 模型列表查询。
- 聊天测试。
- 图片生成测试。
- 后端队列状态。
- 会话与提示词库。
- 生成结果文件打开、导出等。

核心链路：

```mermaid
sequenceDiagram
  participant UI as AiPage/AiProviderPanel/AiChatPanel/AiImagePanel
  participant Store as useAiStore
  participant Service as ai.service.ts
  participant IPC as callTauri
  participant Command as commands::ai
  participant Rust as AiProviderService
  participant Py as ai_provider_tester.py
  participant Provider as OpenAI-compatible Provider
  participant Files as ~/.monster-tools/ai/generated

  UI->>Store: testProvider / sendChatMessage / generateImageMessage
  Store->>Service: enqueueProviderTest / get task / queue status
  Service->>IPC: callTauri("enqueue_ai_provider_test")
  IPC->>Command: invoke command
  Command->>Rust: enqueue_provider_test()
  Rust->>Rust: AiProviderTestQueue 控制并发
  Rust->>Py: spawn python + stdin JSON
  Py->>Provider: /models /chat/completions /images/generations
  Provider-->>Py: JSON / image url / b64_json
  Py->>Files: 生图测试保存图片
  Py-->>Rust: stdout JSON
  Rust-->>Command: AiProviderTestResult
  Command-->>Service: task/result
  Service-->>Store: normalize image paths to asset URL
  Store-->>UI: 队列/会话/图片状态更新
```

特点：

- AI Provider 测试是一次性 Python 脚本，不是常驻 workflow engine。
- Rust 侧有全局队列、运行槽、配置级串行/并发、取消 token。
- 生图测试输出文件落到 `~/.monster-tools/ai/generated`，前端通过 `convertFileSrc()` 展示。
- Python sidecar 对响应体大小、图片 base64、图片 URL 安全、敏感信息脱敏有防护。

### 6.7 持续型 AI 创作系统

当前创作系统已经具备以下骨架：

| 能力 | 当前入口 | 后端能力 | 状态 |
|---|---|---|---|
| `generate_image_prompt` workflow | `/creative` prompt tab | `TaskService` + `SidecarLifecycleService` + `creative_health_server.py` | 已有最小闭环 |
| review / revision stub | `/creative` prompt/review 区域 | `TaskService::run_review_asset_quality_stub` | stub |
| 领域资产 | `/creative` assets tab | `TaskService::create_creative_asset/link` | demo/stub |
| Goal + 多 Agent stub | `/creative` goal tab | `GoalService::create_goal_multi_agent_stub` | fan-out stub |
| Batch mock | `/creative` batch tab | `BatchJobService` mock worker | demo |
| Batch prompt | `/creative` batch tab | `BatchJobService` prompt worker + model_runs | demo |
| Batch real image | `/creative` batch tab | `BatchJobService` image worker + file path/thumbnail/model_runs | demo |
| Worker queue skeleton | command/service | `WorkerQueueService` | 骨架 |

---

## 7. 关键流程图

### 7.1 标准 Tauri IPC 调用

```mermaid
sequenceDiagram
  participant Component as Vue Component
  participant Store as Pinia Store
  participant Service as Frontend Service
  participant Gateway as services/tauri.ts
  participant Mock as tauri.mock.ts
  participant Command as Rust Command
  participant RustService as Rust Service
  participant Infra as Infra/DB/File

  Component->>Store: 用户操作
  Store->>Service: 领域动作
  Service->>Gateway: callTauri(command,args)
  alt Tauri runtime
    Gateway->>Command: invoke(command,args)
    Command->>RustService: lock state + call method
    RustService->>Infra: 读写 DB/文件/系统能力
    Infra-->>RustService: AppResult<T>
    RustService-->>Command: Result<T,String>
    Command-->>Gateway: payload
  else Browser dev
    Gateway->>Mock: mockCallTauri(command,args)
    Mock-->>Gateway: mock payload
  end
  Gateway-->>Service: data/error
  Service-->>Store: normalized data
  Store-->>Component: reactive state
```

### 7.2 `generate_image_prompt` 最小创作 workflow

```mermaid
sequenceDiagram
  participant UI as Creative Workspace
  participant Store as useCreativeTaskStore
  participant Service as creative-task.service.ts
  participant Command as run_generate_image_prompt_workflow
  participant TaskSvc as TaskService
  participant Sidecar as SidecarLifecycleService
  participant Py as creative_health_server.py
  participant Repo as creative_task_repo / creative_asset_repo
  participant Event as Tauri Event

  UI->>Store: runGenerateImagePromptWorkflow(input)
  Store->>Service: runGenerateImagePromptWorkflow(input)
  Service->>Command: callTauri(...)
  Command->>TaskSvc: run_generate_image_prompt_workflow(input, sidecar)
  TaskSvc->>Repo: create task queued/running
  TaskSvc->>Event: emit creative-task-created/status/event
  TaskSvc->>Sidecar: submit_generate_image_prompt(request)
  Sidecar->>Sidecar: ensure_dev_server()
  Sidecar->>Py: POST /tasks with X-Monster-Token
  Py-->>Sidecar: asset payload
  Sidecar-->>TaskSvc: GenerateImagePromptSidecarResponse
  TaskSvc->>Repo: create asset image_prompt
  TaskSvc->>Repo: append task_events
  TaskSvc->>Repo: update task succeeded + asset_id
  TaskSvc->>Event: emit creative-task-status-changed/event
  Command-->>Service: task + asset + events
  Service-->>Store: result
  Event-->>Store: live activity update
  Store-->>UI: prompt asset + timeline
```

### 7.3 Review / Revision Stub

```mermaid
flowchart TD
  A["用户触发资产审查"] --> B["useCreativeTaskStore.runReviewAssetQualityStub"]
  B --> C["creative-task.service.ts callTauri('run_review_asset_quality_stub')"]
  C --> D["TaskService 创建 review task"]
  D --> E["读取 source asset / 构造 review result"]
  E --> F["创建 review_result asset"]
  F --> G{"review pass?"}
  G -->|通过| H["review task -> succeeded"]
  G -->|未通过| I["创建 revise_asset_quality draft task"]
  I --> J["review task -> manual_approval"]
  H --> K["写 task_events 并 emit creative-task-event"]
  J --> K
  K --> L["前端展示审查结果/返工任务"]
```

### 7.4 Goal + Multi-Agent Stub

```mermaid
flowchart TB
  UI["Creative Goal 表单"] --> Store["useCreativeGoalStore.runGoalMultiAgentStub"]
  Store --> Service["creative-goal.service.ts createGoalMultiAgentStub"]
  Service --> Command["create_goal_multi_agent_stub"]
  Command --> GoalSvc["GoalService"]
  GoalSvc --> Goal["create creative_goal status=running"]
  GoalSvc --> Roles["create creative_goal_roles"]
  Roles --> Fanout["按 role.task_count 创建 queued creative_tasks"]
  Fanout --> Events["写 goal_fanout_created task_events"]
  GoalSvc --> Merge["创建 merge/review draft task"]
  GoalSvc --> Snapshot["get_goal_status"]
  Snapshot --> UIState["前端展示 goal/roles/tasks/status"]
```

当前限制：

- `GoalService` 对 fan-out 总任务数有 stub 上限。
- 合并任务仍是 draft/stub，不是正式多 Agent 合并审查。
- 没有真正的并行 Agent runtime；当前是数据结构和 UI/任务模型预演。

### 7.5 Batch Image Demo

```mermaid
sequenceDiagram
  participant UI as Creative Batch UI
  participant Store as useCreativeBatchStore
  participant Service as creative-batch.service.ts
  participant BatchSvc as BatchJobService
  participant Repo as creative_batch_repo / creative_task_repo / creative_asset_repo / creative_model_run_repo
  participant Supervisor as Batch Supervisor Thread
  participant Worker as Mock/Prompt/Image Worker
  participant AiSvc as AiProviderService
  participant Event as Tauri Event

  UI->>Store: createBatchImageJob(input)
  Store->>Service: createBatchImageJob
  Service->>BatchSvc: callTauri -> create_batch_image_job
  BatchSvc->>Repo: create batch_job
  BatchSvc->>Repo: create N creative_tasks queued
  BatchSvc->>Event: batch-job-created
  UI->>Store: startBatchJob(id)
  Store->>Service: startBatchJob
  Service->>BatchSvc: callTauri -> start_batch_job
  BatchSvc->>Repo: batch status running
  BatchSvc->>Supervisor: spawn if needed
  loop supervisor tick
    Supervisor->>Repo: 查询 queued/running
    Supervisor->>Repo: claim tasks up to concurrency
    Supervisor->>Event: creative-task-status-changed running
    Supervisor->>Worker: run task worker
    alt demo.image.mock
      Worker->>Repo: mock result / retry / failed / succeeded
    else demo.image.prompt
      Worker->>AiSvc: provider chat request
      Worker->>Repo: create demo_image_prompt asset + model_run
    else demo.image.generate
      Worker->>AiSvc: provider image request
      Worker->>Repo: create demo_image asset + file_path/thumbnail + model_run
    end
    Worker->>Event: creative-task-event/status
    Supervisor->>Event: batch-job-progress
  end
  Event-->>Store: refresh current batch page
  Store-->>UI: stats/table/image wall
```

Batch 当前核心语义：

- `batch_jobs.status` 表示批次状态。
- 每个子任务是 `creative_tasks`，通过 `batch_job_id` 和 `sequence_no` 归属。
- 并发由 Rust supervisor 控制，不由 Vue 控制。
- prompt 和 image 任务都会记录 `model_runs`。
- real image 任务通过文件路径和缩略图路径回填结果，不向前端传大 base64。
- 连续失败预算可以触发自动暂停。

### 7.6 Worker Queue Skeleton

```mermaid
flowchart LR
  A["queued creative_task"] --> B["WorkerQueueService.claim_next_task"]
  B --> C["status -> running"]
  C --> D["worker 执行"]
  D --> E{"用户取消?"}
  E -->|是| F["request_cancel: running -> cancelling"]
  F --> G["worker check_cancel_checkpoint"]
  G --> H["cancelling/cancelled"]
  D --> I{"应用中断?"}
  I -->|启动恢复| J["recover_interrupted_tasks"]
  J --> K["running -> retrying 或 failed"]
  J --> L["cancelling -> cancelled"]
```

当前定位：

- 这是未来 Python worker pool 的队列语义骨架。
- 还不是完整远程 worker / Redis / 分布式队列。
- 与项目规则一致：优先 SQLite-backed local queue。

---

## 8. 安全与权限边界

当前明确红线：

- Vue 不直连 Python。
- Vue 不直接 `invoke()`。
- 非 `src/services/` 不导入 `@tauri-apps/*`。
- 非 `src/services/request.ts` 不裸 `fetch()`。
- 非 `src/services/tauri.ts` 不裸 `invoke()`。
- Store 不直接导入 `services/tauri`。
- 禁止前端 SQL / FS 插件。
- 禁止放宽 `assetProtocol.scope` 到 `$HOME/**/*`。
- 更新只走 Tauri updater。
- `main.rs` 必须用 `WebviewUrl::App("index.html".into())`。

当前已有防护：

| 风险 | 当前防护 |
|---|---|
| 前端越层调用 | `scripts/check-architecture.js` |
| 浏览器预览崩溃 | `isTauriRuntime()` + `tauri.mock.ts` |
| 文件路径穿透 | Rust `FileService` / `LoggerInfra` / `DbInfra` 校验 |
| 上传恶意文件 | 扩展名黑名单/白名单 + 大小限制 |
| 日志泄密 | `sensitive.rs` 和 Python/Rust 双侧脱敏 |
| Python 端口暴露 | sidecar 仅监听 `127.0.0.1` 且要求 runtime token |
| 大图污染前端状态 | 文件落盘，前端拿 file path / thumbnail |
| Provider SSRF/内网图 URL | `ai_provider_tester.py` 对非本地 provider 的图片 URL host 做限制 |
| DB 备份误导入 | `.db` 后缀、SQLite header、大小限制 |

---

## 9. 当前架构强项

1. 分层边界清楚，并且有自动检查。
2. Tauri 原生能力已经收敛到前端 service 层。
3. Rust service/infra 基本分层清楚，command 大多是薄代理。
4. 浏览器 Mock 能支撑前端快速调试，避免 Tauri runtime 缺失导致页面崩溃。
5. AI Provider 测试链路有队列、取消、并发、超时、输出限制和脱敏。
6. 创作系统数据模型已经有任务、事件、资产、资产关系、model_runs、batch、goal 的核心骨架。
7. 大对象策略基本正确：图片落盘，DB 存 metadata/path，事件 payload 不传大图。
8. Rust 对路径、日志、备份、上传、sidecar 启动环境都有较多安全考虑。
9. `check:architecture` 当前通过，说明至少静态红线未被破坏。

---

## 10. 当前架构压力点

### 10.1 Creative store 拆分已基本完成

此前 `useTaskStore` 曾同时承载后台任务、prompt/review workflow、domain assets、goal、batch 和项目索引。当前这条集中点已经基本拆开：

```text
creative-task.store.ts
creative-asset.store.ts
creative-goal.store.ts
creative-batch.store.ts
creative-project.store.ts
background-task.store.ts
```

当前更真实的剩余压力点不是 store 命名边界，而是：

- `/creative` 页面编排壳仍负责三栏共享状态与工作区装配。
- creative store 之间仍存在跨域编排。
- 左右栏已从静态占位进入真实状态接线，但仍需继续决定正式资产库 / Agent 监控台的产品深度。

### 10.2 AI store 主拆分已完成，剩余压力在 façade 协调层

此前 `useAiStore` 曾同时承载 provider、session、prompt library、queue、chat/image runtime。当前主拆分已经落地：

```text
ai-provider.store.ts
ai-session.store.ts
ai-session-runtime.ts
ai-image.store.ts
ai-image-runtime.ts
ai-prompt-library.store.ts
ai-queue.store.ts
ai-chat-runtime.ts
ai-provider-runtime.ts
```

当前更真实的剩余压力点是 `src/stores/ai.ts` 仍作为 façade 负责跨 store 编排，而不是旧的“大一统 store”问题。

### 10.3 `commands/database.rs` 已恢复为窄命名边界

此前 `database.rs` 曾混入 creative task、batch、goal、sidecar 和 worker queue。当前已恢复为只处理 DB 导入导出与状态检查：

```text
commands/database.rs          # 只保留 export/import/reset/status
```

creative 相关命令当前已经分别位于：

```text
commands/creative_task.rs
commands/creative_goal.rs
commands/creative_batch.rs
commands/creative_project.rs
commands/creative_sidecar.rs
commands/worker_queue.rs
```

### 10.4 `creative_db` 已完成去 façade 化

此前 `creative_db.rs` / `CreativeDbInfra` 曾同时承载 schema 初始化、领域 CRUD 和测试入口。当前阶段已经完成三步收口：

- `CreativeDbInfra` 已从 crate 生产与测试调用面移除。
- creative 领域共享类型已迁到 `src-tauri/src/infra/creative_types.rs`。
- `creative_db.rs` test-only 模块壳已删除，测试直接接到 `creative_db_tests.rs`。

当前创作域数据访问的真实形态更接近：

```text
creative_db_schema.rs
creative_task_repo.rs
creative_asset_repo.rs
creative_project_repo.rs
creative_goal_repo.rs
creative_batch_repo.rs
creative_model_run_repo.rs
creative_db_tests.rs
```

建议未来按领域拆 repo：

```text
infra/creative/schema.rs
infra/creative/task_repo.rs
infra/creative/event_repo.rs
infra/creative/asset_repo.rs
infra/creative/model_run_repo.rs
infra/creative/batch_repo.rs
infra/creative/goal_repo.rs
```

### 10.5 正式 migration 体系仍需继续硬化

当前 creative schema 已经有最小版本化迁移骨架，但距离生产级迁移治理还有差距：

- [x] `schema_migrations` 表。
- [x] 版本号。
- [x] 幂等 migration。
- [ ] 破坏性迁移审批。
- [ ] migration dry-run / backup。
- [ ] 覆盖更多历史旧库形态的兼容测试。

### 10.6 Python execution plane 仍是 stub

当前 `creative_health_server.py` 是健康和最小任务 stub，不是正式 workflow engine。未来正式系统需要：

- workflow runtime。
- worker loop。
- provider clients。
- prompt builder。
- review/revision agent。
- context builder。
- consistency analysis。
- asset ingestion。
- structured error model。
- budget / cancel / retry / checkpoint。

但仍应保持：Vue 不知道 Python 端口和 token，Rust 继续作为唯一入口。

### 10.7 项目域模型不足

当前已经有 `creative_projects` 表，但项目域仍处于“seed bootstrap + 聚合视图”的过渡态。面向业务调整时，仍有这些限制：

- 项目重命名。
- 项目归档。
- 项目成员/权限。
- 项目级预算。
- 项目级资产索引。
- 项目级 settings。
- 项目导入导出。

后续仍需要把 `creative_projects` 从“已有实体”继续推进成“真正的项目中心事实源”。

建议新增正式 `creative_projects`，再把现有 `project_id` 逐步迁移到 FK 或稳定 ID 策略。

### 10.8 文档状态需要收敛

Goal 00-13 真实 Tauri 验证闭环已经完成；后续待办统一收敛到 `agent/open-loops.md` 与真实回归缺口，不再重新打开已完成 Goal 的收口条目。

---

## 11. 面向业务调整的影响矩阵

| 调整类型 | 应优先触碰的层 | 注意事项 | 必跑检查 |
|---|---|---|---|
| 新增页面 | `views/<module>`、`router`、`locales`、必要 store/service | 页面不直连 service，用户文案进 i18n | `npm run typecheck` |
| 新增 Tauri 能力 | frontend service、Rust command、Rust service、mock | command 必须注册到 `main.rs`，同步 `tauri.mock.ts` | `npm run check:architecture`、`npm run typecheck`、必要时 `tauri:build:no-bundle` |
| 新增 creative workflow | `creative-task.service.ts`、creative store、Rust Task/Workflow service、Python sidecar | Vue 不直连 Python；任务、事件、资产必须落库 | `check:architecture`、`typecheck`、Rust tests |
| 新增 batch 类型 | `creative-batch.service.ts`、`BatchJobService`、UI mode、mock | 明确 retry/cancel/concurrency/model_runs/asset 输出 | `check_batch_demo_boundaries`、Rust batch tests |
| 新增资产类型 | `TaskService` 校验、`creative_asset_repo`、UI 映射、i18n | 不覆盖旧资产；关系进 `asset_links` | `typecheck`、creative_db tests |
| 新增 DB 字段 | `creative_db_schema.rs` / 对应 repo / 未来 migration | 优先 nullable/default；旧库兼容测试 | `cargo test creative_db_tests` |
| 新增 Provider 能力 | `ai_provider_tester.py` / Rust AiProviderService / AI store | 不把业务流程写进 provider gateway | AI sidecar tests |
| 新增文件能力 | `FileService`/`SystemService` | 路径白名单、大小、扩展名、asset scope | `check:architecture`、Rust tests |
| 修改更新机制 | updater service / Tauri updater config | 禁止自定义 Vue 热更新 | `tauri:build:no-bundle` |

---

## 12. 建议升级路线

### 阶段 A：架构硬化，不改业务体验

目标：降低后续业务调整成本。

建议：

1. 继续收敛 `/creative` 三栏工作台：中间 `CreativeWorkflowDemo.vue` 已接近 orchestration shell，左右栏已接入真实项目/资产/任务活动，后续重点是确认正式资产库与 Agent 监控台的产品深度。
2. 继续收敛 `src/stores/ai.ts` façade，避免新的 session / queue / image runtime 逻辑重新回流到单一入口。
3. 继续收敛 `TaskService` 与 `BatchJobService` 的 orchestration 边界，尽量让 asset CRUD、goal CRUD、batch snapshot 等稳定职责停留在对应 repo/service。
4. 在现有 `schema_migrations` 基础上继续补齐旧库兼容回归、备份策略与更细粒度 migration 约束。
5. 持续同步 `agent/open-loops.md` 与本文件，避免“代码已经推进、当前状态文档仍停留在旧阶段”。

### 阶段 B：正式项目与资产域

目标：让创作系统从“seed bootstrap + 聚合统计”进入正式项目生命周期和资产治理。

建议：

1. 继续完善 `creative_projects`：补项目编辑、归档、筛选、导入导出与更稳定的项目键策略。
2. 引入正式 asset version/provenance 字段或配套表。
3. 明确 `asset_type`、`link_type`、`task_type` 的枚举文档。
4. 增加项目级导入导出和备份策略。
5. 将 UI 中的 seed bootstrap 继续过渡为真实项目查询与管理视图。

### 阶段 C：Python workflow runtime

目标：把当前 sidecar stub 升级为真实执行面。

建议：

1. 保持 Rust 作为唯一入口。
2. Python 只监听 localhost + runtime token。
3. Python worker 通过 Rust/DB 协议消费任务，不让 Vue 直连。
4. 引入标准 task claim / heartbeat / checkpoint / cancel / retry。
5. 输出资产统一经 Rust 授权路径落盘和入库。

### 阶段 D：多 Agent 与审查返工

目标：从 fan-out stub 进入可审计协作。

建议：

1. 明确 Agent role 模型。
2. 引入 goal decomposition。
3. 引入 merge/review task 正式状态。
4. review result 和 revision draft 不覆盖源资产。
5. 所有模型调用写 `model_runs`。

### 阶段 E：生产级批量生成

目标：让 1000 级批量任务可控、可恢复、可暂停、可审计。

建议：

1. supervisor 与 worker loop 解耦。
2. batch stats 增量更新。
3. 大图缩略图懒加载。
4. 预算、熔断、限流、重试策略配置化。
5. 失败分类与 provider 观测仪表化。

---

## 13. 面向架构评审的核心问题

后续做升级评审时，建议按这些问题推进：

1. `creative_projects` 是否已经足够承接正式项目生命周期，还是仍需补充更稳定的项目键策略？
2. `creative_db_schema.rs` 与各 repo 是否先继续细分，还是先上 migration 治理？
3. `/creative` 三栏工作台中，哪些内容应视为正式工作台，哪些仍应留在验证/展示壳层？
4. Python worker 是由 Rust 主动提交任务，还是 Python 拉取 SQLite-backed queue？
5. model_runs 是否作为所有 AI 调用的强制审计点？
6. asset provenance 是继续放 `metadata_json`，还是结构化成字段/表？
7. Batch supervisor 是否继续留在 Rust，还是逐步移到 Python worker runtime？
8. 真实 provider 网关配置是否完全复用 AI Provider 工作台，还是建立 creative provider profile？
9. review/revision 是否需要人工审批表？
10. 当前 `tauri.mock.ts` 是否继续承担完整浏览器演示，还是收敛为最小 contract mock？

---

## 14. 当前推荐结论

当前架构已经具备较完整的“桌面控制面 + 前端工作台 + 本地 SQLite 状态 + Python AI 执行面”的雏形。它最适合的下一步不是继续堆功能，而是做一次 post-goal architecture hardening：

1. 先继续收敛 `/creative` 中央 orchestration shell 与 `ai.ts` façade。
2. 再固化 migration、project/asset/version/provenance 领域模型。
3. 再把 Python sidecar 从 health stub 升级为正式 workflow runtime。
4. 最后引入真正的多 Agent 协作、审查返工和生产级批量生成。

如果继续在现有 `CreativeWorkflowDemo.vue`、`src/stores/ai.ts`、Rust `TaskService` 和 `BatchJobService` 上无约束叠业务，短期会很快，长期会让任务状态、资产版本、批量恢复、多 Agent 合并和 provider 审计越来越难验证。

## 2026-06-11 补充：creative_types 首轮迁出

- 已新增 `src-tauri/src/infra/creative_types.rs`，把 creative 领域的共享实体、输入 DTO 与 filter DTO 从旧 `creative_db.rs` 承载面中迁出。
- repo / service / command 当前已直接从 `creative_types.rs` 引用共享类型。
- `creative_db.rs` 已删除，测试直接接入 `creative_db_tests.rs`。
- 本轮验证通过：`cargo test --manifest-path .\\src-tauri\\Cargo.toml init_schema_is_idempotent -- --nocapture`、`npm run verify`。
- 这意味着旧 `creative_db.rs` 集中点已经实质拆除，后续焦点转向 repo/test 边界与 migration 治理。

## 2026-06-11 补充：creative_projects 接线进展

- `creative_projects` 已具备 Rust command/service/repo、frontend service、Pinia state 和 browser mock 的最小闭环。
- `/creative` 的项目中心当前已经从单纯的 seed project card 演示，过渡到“SQLite 真实项目记录 + task/asset/goal/batch 聚合统计”的混合态展示。
- 这意味着项目域已经从 `projectId` 聚合，继续走向“项目实体 + 聚合视图”的过渡态；后续仍需把项目编辑、归档和导入导出补齐到完整生命周期。

## 2026-06-11 补充：creative-asset.store 接线完成

- 已新增并接通 `src/stores/creative-asset.ts`，把 domain asset draft、资产关系创建与 domain asset 运行状态从 `useTaskStore` 中抽离。
- `src/views/creative/components/CreativeWorkflowDemo.vue` 当前通过 `useCreativeAssetStore + useCreativeTaskStore + useCreativeGoalStore + useCreativeBatchStore + useCreativeProjectStore` 协作，`/creative` 页面已不再依赖 `useTaskStore`。
- `useTaskStore` 当前已基本收缩为 background task progress store，下一步更适合把这部分正式命名并独立为 `background-task.store.ts`。
## 2026-06-11 补充：creative-asset / background-task.store 完成

- 已新增 `src/stores/creative-asset.ts`，把 domain asset draft、资产关系创建与运行状态从 `useTaskStore` 中抽离。
- 已新增 `src/stores/background-task.ts`，并让 `src/stores/task.ts` 退化为兼容导出壳；当前全局后台任务进度已正式收口到 `background-task.store.ts`。
- `src/views/creative/components/CreativeWorkflowDemo.vue` 当前已经不再依赖 `useTaskStore`，`/creative` 页面所有业务域都已各自进入独立 store，`useTaskStore` 不再承载创作域职责。
## 2026-06-11 补充：background-task.store 收口完成

- `src/stores/task.ts` 兼容别名文件已经移除，仓库内不再保留 `useTaskStore` 入口。
- `src/main.ts`、`src/layouts/components/AppHeader.vue` 与 `src/stores/update.ts` 已统一切到 `useBackgroundTaskStore`。
- 当前 `background-task.store.ts` 已成为全局后台任务进度的唯一 store 命名，`/creative` 页面不再与全局任务提示共享历史 store 语义。
## 2026-06-11 补充：ai-session.store 接线进展

- 已新增 `src/stores/ai-session.ts`，正式承接 session 生命周期、active session、chat/image session 列表，以及 create/select/remove/rename/duplicate。
- `src/stores/ai.ts` 当前已改为通过 `useAiSessionStore` 读取 session 状态，并复用 session store 提供的 message mutation helper，不再保留第二套本地 session/message 写入实现。
- 这意味着 AI 域现在已经完成 `provider -> session` 两层拆分，下一步更适合继续聚焦 `image / queue / message recovery/export` 的剩余职责。

## 2026-06-11 补充：ai-queue.store 接线进展

- 已新增 `src/stores/ai-queue.ts`，正式承接 provider test queue、本地 testQueue、backendQueueStatus、activeAction、isTesting，以及本地队列收敛 helper。
- `src/stores/ai.ts` 当前已改为通过 `useAiQueueStore` 读取和维护队列状态，不再直接本地持有 queue refs 与第二套队列同步逻辑。
- 这意味着 AI 域现在已经完成 `provider -> session -> queue` 三层初步拆分，下一步更适合继续聚焦 `image / message recovery-export` 的剩余职责。

## 2026-06-11 补充：ai.ts façade 收口完成

- `src/stores/ai.ts` 已从旧的大一统实现切换为 façade 角色：自身只保留 load/hydrate、provider test orchestration、chat send/export 与跨 store 协调。
- provider/config 继续由 `ai-provider.ts` 承接；session 生命周期由 `ai-session.ts` 承接；queue 状态由 `ai-queue.ts` 承接；prompt library 由 `ai-prompt-library.ts` 承接；image runtime 由 `ai-image.ts` 承接。
- 本轮验证通过 `npm run typecheck` 与 `npm run check:architecture`，说明 AI 域已经从“代码上新增 store”继续推进到“主 façade 真正消费拆分后的 store”。

## 2026-06-11 补充：ai-provider-runtime.store 接线完成

- 已新增并正式接通 src/stores/ai-provider-runtime.ts，承接 AI provider test runtime orchestration：efreshBackendQueueStatus、cancelBackendQueuedTests、cancelBackendQueuedTest、	estProvider 与相关 polling/runtime config helper。
- src/stores/ai.ts 当前已通过 useAiProviderRuntimeStore 委托上述运行时职责，自身继续保留 façade、session hydrate/persist、chat send/export 与跨 store 协调，不再保留第二套 provider test runtime 实现。
- 当前 src/stores/ai.ts 约 711 行，src/stores/ai-provider-runtime.ts 约 323 行；本轮验证 
pm run typecheck 与 
pm run check:architecture 均通过，说明 AI 域已继续从“大 façade 内嵌 runtime”推进到“facade + runtime store”结构。

## 2026-06-11 补充：ai-chat-runtime.store 与 ai-session-storage helper 接线完成

- 已新增 src/stores/ai-chat-runtime.ts，正式承接 chat send/export 运行时职责：sendChatMessage、exportChatSession 与内部 typewriter / export formatting helper。
- 已新增 src/services/ai-session-storage.ts，集中承接 session 偏好持久化与 hydrate helper：persistAiSessions、
ormalizeAiSessions。
- src/stores/ai.ts 当前通过 useAiChatRuntimeStore 委托 chat send/export，并通过 i-session-storage helper 完成 session 读写收口；自身继续保留 façade、session/UI 协调、provider runtime 委托与初始 hydrate 编排。
- 当前 src/stores/ai.ts 已进一步收缩到约 323 行，src/stores/ai-chat-runtime.ts 约 244 行，src/services/ai-session-storage.ts 约 200 行；本轮验证 
pm run typecheck 与 
pm run check:architecture 均通过。

## 2026-06-11 补充：ai-session-runtime.store 接线完成

- 已新增 src/stores/ai-session-runtime.ts，正式承接 AI session 的 create/select/delete/rename/duplicate、active model config 同步与 loadConfig 协调。
- src/stores/ai.ts 当前通过 useAiSessionRuntimeStore 委托 session runtime 职责，自身继续保留 façade + provider runtime + chat runtime + image runtime 的组合入口。
- 当前 src/stores/ai.ts 已进一步缩减到约 228 行，src/stores/ai-session-runtime.ts 约 144 行；本轮验证 
pm run typecheck 与 
pm run check:architecture 均通过。

## 2026-06-11 AI 域继续收口

- `src/stores/ai-image.ts` 已移除本地 `patchAiPreferenceState` / `SESSIONS_KEY` / `persistSessions()`，统一改用 `src/services/ai-session-storage.ts` 的 `persistAiSessions()`。
- `src/stores/ai-image.ts` 与 `src/stores/ai-provider-runtime.ts` 共享了新的 `src/services/ai-provider-queue-sync.ts`，把后端队列状态同步、任务回填和测试状态更新收敛到一个 helper。
- 最新验证再次通过：`npm run typecheck`、`npm run check:architecture`。

## 2026-06-11 AI 图片域 state/runtime 拆分完成

- `src/stores/ai-image.ts` 已收缩为纯状态 store，当前只持有 `imageDraftSize`。
- 已新增 `src/stores/ai-image-runtime.ts`，正式承接 image message recovery、cancel、backend polling、generate orchestration 与打开落盘目录等运行时职责。
- `src/stores/ai.ts` 当前通过 `useAiImageRuntimeStore` 暴露图片运行时动作，通过 `useAiImageStore` 暴露图片尺寸状态；`src/stores/ai-provider-runtime.ts` 与 `src/stores/ai-session-runtime.ts` 也已改接新的 image runtime store。
- 本轮验证再次通过：`npm run typecheck`、`npm run check:architecture`。

## 2026-06-11 Creative 前端服务再拆一层

- 已新增 `src/services/creative-task.service.ts` 与 `src/services/creative-batch.service.ts`，把 Creative 业务从 `src/services/task.service.ts` 中进一步拆出。
- `creative-task.ts`、`creative-asset.ts`、`creative-goal.ts`、`creative-project.ts`、`creative-batch.ts` 已切到新的窄服务；当前 `task.service.ts` 在前端仅剩后台任务进度监听这一条非 Creative 通道。
- 本轮验证再次通过：`npm run typecheck`、`npm run check:architecture`。

## 2026-06-11 后台任务通道独立

- 已新增 `src/services/background-task.service.ts`，把 `task-progress` 监听从 `src/services/task.service.ts` 中独立出来。
- `src/stores/background-task.ts` 已切换到新的 `backgroundTaskService`；`src/services/task.service.ts` 现仅保留兼容入口 `taskService.listenTaskProgress`，不再承载 Creative 业务调用。
- 这一步让前端 service 面进一步从“历史大入口”走向“按域命名的窄服务”。
- 本轮验证再次通过：`npm run typecheck`、`npm run check:architecture`。

## 2026-06-11 补充：CreativeWorkflowDemo 页面层首轮拆分

- 已把 CreativeWorkflowDemo.vue 中的“项目列表筛选区”切到现有独立组件 src/views/creative/components/tabs/CreativeProjectList.vue。
- 已新增 src/views/creative/components/tabs/CreativeTabHistory.vue，把项目历史时间线（tasks/assets/goals/batch milestones）从主页面组件中抽离。
- 当前 CreativeWorkflowDemo.vue 仍然是 /creative 的主要 orchestration shell，但项目列表过滤逻辑和历史渲染逻辑已经不再内嵌在主页面文件中。
- 这说明页面层拆分已经开始落地，下一步更适合继续拆 prompt / assets / goal / batch 四个 workspace 分区，而不是回到 store/service 边界重做一轮。
- 本轮验证通过：`npm run typecheck`、`npm run check:architecture`。


## 2026-06-11 补充：CreativeWorkflowDemo prompt 分区抽离

- 已把 prompt workspace 分区从 CreativeWorkflowDemo.vue 中抽离到独立组件 src/views/creative/components/tabs/CreativeTabPrompt.vue。
- 当前 prompt 分区的表单输入、运行状态、事件时间线与 prompt asset 展示都已通过 props / emits 与主页面解耦。
- 这让 CreativeWorkflowDemo.vue 进一步朝“页面编排壳层”收敛，而不是继续同时承担所有 workspace 的细节模板。
- 本轮验证通过：npm run typecheck、npm run check:architecture。

## 2026-06-11 补充：CreativeWorkflowDemo assets 分区抽离

- 已把 assets workspace 分区从 CreativeWorkflowDemo.vue 中抽离到独立组件 src/views/creative/components/tabs/CreativeTabAssets.vue。
- 当前 assets 分区中的 review 表单、review 结果、domain assets 表单、domain state 与 link snapshot 已通过 props / emits 与主页面解耦。
- 这让 CreativeWorkflowDemo.vue 进一步从“综合大模板”收敛为按 workspace 装配状态和动作的 orchestration shell。
- 本轮验证通过：npm run typecheck、npm run check:architecture。

## 2026-06-11 补充：CreativeWorkflowDemo batch 分区抽离

- 已把 batch workspace 分区从 CreativeWorkflowDemo.vue 中抽离到独立组件 src/views/creative/components/tabs/CreativeTabBatch.vue。
- 当前 batch 分区中的配置表单、状态卡、活动时间线、分页任务表、结果表和图片墙都已通过 props / emits 与主页面解耦。
- 这让 CreativeWorkflowDemo.vue 进一步收敛为 orchestration shell；当前页面层剩余最明显的单块 workspace 主要是 goal 分区。
- 本轮验证通过：npm run typecheck、npm run check:architecture。

## 2026-06-11 补充：CreativeWorkflowDemo goal 分区抽离

- 已把 goal workspace 分区从 CreativeWorkflowDemo.vue 中抽离到独立组件 src/views/creative/components/tabs/CreativeTabGoal.vue。
- 当前 goal 分区中的目标表单、goal 状态卡、role timeline 与 fan-out task timeline 都已通过 props / emits 与主页面解耦。
- 叠加此前的 project list / history / prompt / assets / batch 拆分后，CreativeWorkflowDemo.vue 当前已基本收敛为“项目中心壳层 + workspace tab 装配 + 状态/动作编排”的 orchestration shell。
- 本轮验证通过：npm run typecheck、npm run check:architecture。

## 2026-06-11 补充：/creative 三栏壳层首轮接线

- `src/stores/creative-project.ts` 已新增 `activeCreativeProjectId`，当前项目不再只存在于 `CreativeWorkflowDemo.vue` 的本地 ref。
- `CreativeAssetSidebar.vue` 已接入真实 `creative-project` 索引状态：项目列表来自当前项目实体与任务/资产/Goal/Batch 聚合，资产分类和标签计数来自当前项目资产。
- `CreativeAgentMonitor.vue` 已接入真实任务与事件状态：队列来自当前项目历史任务和 batch paged tasks，日志来自 prompt/review/batch activity。
- `CreativeTaskForm.vue` 已改为使用当前 active project 创建 Goal 和 Batch，不再硬编码写入 `creative-main-project`。
- 本轮验证通过：`npm run verify`。

## 2026-06-11 补充：creative project Rust 后端首轮去集中化

- 已将 `src-tauri/src/services/creative_project_service.rs` 从 `CreativeDbInfra` 巨型 façade 切到直接调用 `creative_project_repo`。
- 已让 `src-tauri/src/infra/creative_project_repo.rs` 直接依赖 `creative_db_schema::init_schema()`，并在 repo 内部收口项目列表的非空过滤，不再经由 `CreativeDbInfra` 间接初始化。
- 这说明 Rust 后端的下一阶段硬化已经从“分析集中点”进入“按领域绕开巨型 façade”的真实推进，后续更适合继续评估 `goal / task / batch / worker_queue` 哪一块最值得优先切下一刀。
- 本轮验证通过：`npm run verify`、`cargo check --manifest-path .\\src-tauri\\Cargo.toml`。

## 2026-06-11 补充：goal / task / asset Rust 领域 repo 化继续推进

- `src-tauri/src/services/goal_service.rs` 已改为直接调用 `creative_goal_repo` 与 `creative_task_repo`，不再依赖 `CreativeDbInfra` 作为 goal 域入口。
- `src-tauri/src/services/task_service.rs` 已把任务、资产、关系、事件的常规 CRUD 与 workflow 持久化逻辑切到 `creative_task_repo` / `creative_asset_repo`。
- `src-tauri/src/infra/creative_task_repo.rs` 与 `src-tauri/src/infra/creative_asset_repo.rs` 已直接依赖 `creative_db_schema::init_schema()`，从而把 schema 初始化从巨型 façade 中继续下沉到领域 repo。
- 这一步让 Rust 后端的领域边界更接近当前文档推荐方向：service 负责流程编排，repo 负责写读和筛选，`CreativeDbInfra` 逐步退成遗留聚合入口而不是日常依赖中心。
- 本轮验证通过：`npm run verify`、`cargo check --manifest-path .\\src-tauri\\Cargo.toml`。

## 2026-06-11 补充：worker queue 继续去集中化

- `src-tauri/src/services/worker_queue_service.rs` 已改为直接调用 `creative_task_repo`，不再依赖 `CreativeDbInfra` 进行 claim / cancel / recovery。
- 这一步让 worker queue 这条运行时链路也切到了领域 repo，说明后端架构推进已经不只停留在 project / goal / task / asset，而是开始触到 recovery / cancellation 这类运行时职责。
- 当前更清晰的下一块后端集中点是 `batch_job_service.rs`：它仍然同时混合 batch 状态流转、task claim/update、asset 落库、model run 记录与 provider 交互。
- 本轮验证通过：`cargo check --manifest-path .\\src-tauri\\Cargo.toml`、`npm run verify`。

## 2026-06-11 补充：batch service 数据访问去集中化

- `src-tauri/src/services/batch_job_service.rs` 已去掉对 `CreativeDbInfra` 的直接依赖，当前 batch 顶层 CRUD、snapshot、分页任务、取消链路，以及 mock/prompt/generate worker 中的 task/event/asset/model_run 持久化都已改为直接调用领域 repo。
- 当前该服务主要通过 `creative_batch_repo`、`creative_task_repo`、`creative_asset_repo`、`creative_model_run_repo` 组织数据访问，`BatchJobService` 自身继续承担流程编排、事件发射、provider 调用和 supervisor 控制。
- `src-tauri/src/infra/creative_batch_repo.rs` 与 `src-tauri/src/infra/creative_model_run_repo.rs` 也已改为直接依赖 `creative_db_schema::init_schema()`，并在 repo 内部补齐本地 `non_empty_filter`，与 task/asset/goal/project repo 的收口方式保持一致。
- 这一步意味着 Rust Creative 运行时里最显著的“数据访问型集中点”已经继续后退，`batch_job_service.rs` 现在更像一个仍然偏宽的 orchestrator，而不是同时兼任数据 façade。
- 本轮验证通过：`cargo check --manifest-path .\\src-tauri\\Cargo.toml`、`npm run verify`。

## 2026-06-11 补充：生产代码已清空对 CreativeDbInfra 的直接依赖

- `src-tauri/src/services/database_service.rs` 的 runtime schema 初始化已从 `CreativeDbInfra::init_schema()` 切到 `creative_db_schema::init_schema()`。
- 叠加此前的 project / goal / task / asset / worker queue / batch 收口后，当前 `src-tauri/src/services/`、`src-tauri/src/commands/` 与 `src-tauri/src/main.rs` 生产代码层面已经不再直接引用 `CreativeDbInfra`。
- 这意味着 `CreativeDbInfra` 当前已经从“运行时聚合入口”进一步退回为“遗留兼容 façade + 类型承载文件 + creative_db 测试入口”。
- 当前更值得继续推进的下一层不是再追逐零散引用，而是评估：
  1. `creative_db_schema.rs` / `creative_db_tests.rs` 与 repo 的边界是否继续细分；
  2. `batch_job_service.rs` 剩余 orchestration 是否继续留在 Rust，还是为后续 Python runtime 正式化预留迁移边界。
- 本轮验证通过：`cargo check --manifest-path .\\src-tauri\\Cargo.toml`，并通过代码检索确认生产代码层面不再出现 `CreativeDbInfra` 直接引用。
