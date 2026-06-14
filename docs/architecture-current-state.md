# Monster Workbench 当前架构说明

> 更新日期：2026-06-14
> 定位：只记录当前有效架构事实、边界和后续风险点；已删除的旧独立创作工作台、任务队列、资产库和常驻运行时不再作为当前项目事实。

## 1. 架构摘要

`monster-workbench` 是 Tauri v2 桌面客户端 **Monster Tools**。

- 前端：Vue 3、Pinia、Vue Router、Vite、TailwindCSS、Element Plus 与项目内 `Base*` 组件。
- 桌面控制面：Rust / Tauri command、service、infra、SQLite、本地文件、系统能力和更新机制。
- AI 能力：保留 `/ai` 工作台、AI Provider 配置诊断、队列与取消；只有 Provider 配置诊断与 `/ai?tab=features` 原子能力测试允许直连 `generate_ai_content`，`/ai` 对话/生图和 `/image-workbench` 图片工作台统一走不携带完整 provider config 的业务生成入口；Rust 侧新增 generation task registry 与 `ai_generation_tasks` 持久任务表，业务可通过 `enqueue_ai_business_generation` 提交轻量任务并用 `get_ai_generation_task` 轮询结果，取消走 `cancel_ai_generation_task`，Tauri 启动会恢复 queued/running 业务生成；`/image-workbench` 文生图由 `start_image_workbench_job_runner` 启动 Rust 后端 runner，通过 DB task claim/lease 推进持久 job/task，并写入受控 asset / metadata / model_run；当前已完成 job/task/asset/metadata/template/model_run 合约、历史/资产库/模板/收藏/取消/重试工作台骨架、浏览器/mock 文生图闭环、真实 Tauri 失败/取消路径、DB 租约恢复/失败审计补强、Provider 可达性诊断和真实 Provider 成功资产落库闭环；Python 只作为 provider tester / adapter 脚本被 Rust 调用。
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
- 当前 Python sidecar 是短生命周期脚本运行时；后续若升级为长驻 worker 或 `externalBin` 二进制 sidecar，也必须保持 Rust Service 作为唯一调度控制面，统一承接启动、停止、超时、取消、并发槽位、heartbeat/lease、日志脱敏和 artifact 输出目录授权，worker 不得直接持有 Tauri capability、主库写权限、偏好配置写权限或任意文件访问权。

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
| `/image-workbench` | `views/image-workbench/ImageWorkbenchPage.vue` | 图片工作台，通过共享 AI Provider 能力执行文生图，并管理历史作业、任务状态、持久资产、模板和模型调用审计 |
| `/settings` | `views/settings/SettingsPage.vue` | 设置与诊断 |
| `/file-manager` | `views/file-manager/FileManagerPage.vue` | 上传文件管理 |
| `/playground` | `views/playground/PlaygroundPage.vue` | 组件与工作流调试入口 |
| `/utils-docs` | `views/utils-docs/UtilsDocsPage.vue` | 工具函数文档展示 |

旧 `/creative` 独立创作工作台路由和对应页面已经移除；当前 `/image-workbench` 是新接入的图片工作台，不等同于恢复旧 Creative 体系。

### 2.3 Store 层

Store 是前端业务编排层，可以调用模块 service，但不能直接导入 `services/tauri`。

| 区域 | 当前事实 | 后续注意 |
|---|---|---|
| AI | `src/stores/ai.ts` 是 facade，分域 store 包括 provider、session、queue、prompt、chat runtime、image runtime、provider task runtime；Provider task runtime 和 `/ai?tab=features` 只承接测试/诊断直连，Chat/Image 业务生成默认走 `aiService.runBusinessGenerationTask()`，即 `enqueue_ai_business_generation` 入队后轮询 `get_ai_generation_task` | 新 runtime 逻辑继续放到分域 store / helper，避免回流到 facade |
| Image Workbench | `src/stores/image-workbench.ts` 通过 `image-workbench.service.ts` 访问 Tauri contract、job/history/asset/template、task 状态和资产记录，并通过 `start_image_workbench_job_runner` 启动 Rust 后端 runner 执行 `txt2img` 业务生成 | 后续下载、导入参考图、后台 worker 和增强能力不得绕过 Store -> Service -> callTauri |
| Background task | `background-task` 只监听公共 `task-progress` 事件，当前主要服务更新下载进度展示 | 不重新承载创作任务状态机 |
| Native event | `native-event` 只封装 Tauri event listener | 页面通过 store 消费事件，不直接监听底座 |
| Settings/System/Navigation/File | 各自通过对应 service 进入 Rust | 继续保持 browser mock 与 Tauri contract 对齐 |

### 2.4 Service 层

Service 是前端唯一允许接触底座、Tauri、HTTP 和浏览器/桌面差异的层。

| 文件 | 职责 |
|---|---|
| `src/services/tauri.ts` | 唯一 `invoke()` / `callTauri()` 网关；Tauri runtime 调 Rust，浏览器 dev 调 mock |
| `src/services/request.ts` | 唯一裸 `fetch()` 封装 |
| `src/services/tauri.mock.ts` | 浏览器降级 mock 聚合入口，分发到领域 mock handler 并维持 service contract |
| `src/services/mocks/*.mock.ts` | 成组 Tauri command 的浏览器 mock handler；当前包含 AI Provider 与 Image Workbench；图片工作台浏览器 mock 也通过 AI Provider mock 的 `enqueue_ai_business_generation` / `get_ai_generation_task` / `cancel_ai_generation_task` 推进生成任务 |
| `src/services/image-workbench.service.ts` | 图片工作台前端服务外观，唯一触达 `image_workbench` Tauri commands 的前端入口 |
| `*.service.ts` | 模块服务外观，向 Store 暴露稳定 API |

浏览器 mock 与桌面端配置应尽量保持一致：开发时可运行 `npm run mock:sync-config` 从桌面端 `~/.monster-tools/config.json` 生成 `public/mock/preference-config.json`，浏览器 mock 在没有本地 `localStorage` 偏好时会自动使用该 seed；生成脚本必须清空 `apiKey/token/password/secret` 并关闭 `rememberApiKey`，该 seed 文件已被 Git 忽略。

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
commands/image_workbench.rs
commands/navigation.rs
commands/system.rs
commands/updater.rs
commands/ai.rs
```

Command 保持薄代理：取 `State<Mutex<Service>>`，调用 service，返回序列化结果。

### 3.3 Service 层

| Service | 当前职责 |
|---|---|
| `AiProviderService` | AI Provider 工作台诊断入口，队列、任务注册、配置校验、Python 进程和输出清理由内部 `ai_provider_*` 模块承接 |
| `ImageWorkbenchService` | 图片工作台本地 job/task/asset/metadata/model_run 合约、输入校验与 repo 调用 |
| `ImageWorkbenchAssetPathPolicy` | 图片工作台资产路径白名单、生成目录校验、持久资产复制 |
| `TaskService` | 公共 `task-progress` 事件服务，当前用于 `trigger_update_download` 的下载进度模拟/通知 |
| `DatabaseService` | DB 导入导出、重置、状态检查、运行时 `test_logs` 与 `image_workbench_*` schema 初始化 |
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
image_workbench_repo.rs
image_workbench_schema.rs
image_workbench_types.rs
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
| AI 临时生成文件 | `~/.monster-tools/ai/generated` | `AiProviderService` |
| AI 业务生成任务 | `monster_workbench.db` 中的 `ai_generation_tasks` | `AiProviderService` / `AiGenerationRepo` |
| 图片工作台持久资产 | `~/.monster-tools/ai/image-workbench/assets` | `ImageWorkbenchService` |
| 主库 | `monster_workbench.db` | `DatabaseService` / `DbInfra` |
| 图片工作台表 | `monster_workbench.db` 中的 `image_workbench_*` | `ImageWorkbenchService` / `ImageWorkbenchRepo` |
| 导航库 | `navigation.db` | `NavigationService` / `DbNavInfra` |

当前 `DatabaseService::init_runtime_schema()` 初始化 `test_logs`、`ai_generation_tasks` 与 `image_workbench_*` 表；已删除的旧 Creative 任务、批量任务和常驻运行时 schema 不再是当前事实。

Tauri bundle resources 当前只保留：

```text
../src/config/ai-provider-registry.json
sidecars/python/ai_provider_actions.py
sidecars/python/ai_provider_tester.py
sidecars/python/ai_provider_artifacts.py
sidecars/python/ai_provider_input.py
sidecars/python/ai_provider_results.py
sidecars/python/provider_anthropic_adapter.py
sidecars/python/provider_adapters.py
```

## 5. AI Provider 工作台

AI Provider 工作台是当前保留的 AI 能力入口，也是公共 AI 原子能力的 Provider 底座：

- 通过 `AiProviderService` 与 `ai_provider_tester.py` 做 provider 连接、模型列表、chat、生图测试，以及 `generate_ai_content` 原子生成入口。
- `src-tauri/sidecars/python/ai_provider_tester.py` 当前只保留主入口：读取输入、选择 adapter、调用 action handler、将异常转换为结构化结果并输出 JSON。
- `src-tauri/sidecars/python/ai_provider_input.py` 承接输入 payload 解析；`ai_provider_actions.py` 承接 models / chat / image / audio / video action handler；`ai_provider_results.py` 承接结果、脱敏预览和错误分类构造。
- `src-tauri/sidecars/python/ai_provider_artifacts.py` 承接图片 URL 安全判断、下载、Base64 解码、尺寸识别和本地 artifact 描述。
- `src-tauri/sidecars/python/provider_adapters.py` 是 Provider Adapter 入口与 OpenAI-compatible adapter；`provider_anthropic_adapter.py` 承接 Anthropic Messages adapter。
- `src/config/ai-provider-registry.json` 是 provider preset、adapter id 与 `models/chat/image/txt2img/audio/video` capability 的共享静态 registry。
- 前端与 Rust 入口按 capability 做最小动作拦截；chat-only 协议不进入生图、音频、视频或模型列表测试。
- `generate_ai_content` 当前统一暴露 `chat/image/audio/video` 直连测试能力：chat 返回文本，image 复用既有生图保存链路，audio 按 OpenAI-compatible `/audio/speech` 保存二进制产物，video 按 `/videos` 创建、先立即轮询一次再按间隔等待，并从同源 `/videos/{id}/content` 下载；该入口只允许 Provider 测试/原子能力测试使用。
- Provider 配置面板的连接、模型列表、聊天和生图按钮继续使用 `test_ai_provider` / `enqueue_ai_provider_test` 做诊断；`/ai?tab=features` 使用 `aiService.generateDirectContent` 做原子能力测试；业务生成入口 `/ai?tab=chat`、`/ai?tab=image` 默认走 `aiService.runBusinessGenerationTask()`，由 `enqueue_ai_business_generation` 提交轻量 generation task，再轮询 `get_ai_generation_task` 收敛结果；`/image-workbench` 走 `imageWorkbenchService.startJobRunner()` -> `start_image_workbench_job_runner`，由 Rust 后端 runner 调用业务生成入口并写入图片工作台专属表。前端只传 `providerConfigId`、prompt、model、options 和 requestId，不携带完整 provider config。
- `src/services/ai-provider-queue-sync.ts` 同步 Provider 诊断任务时也会同步 generation task，`/ai` Chat/Image runtime 和 `/ai?tab=features` 原子测试任务不再依赖旧 `AiProviderTestTask` polling 才能更新队列状态。
- 前端类型合同区分 `AiProviderTestAction` 与 `AiProviderRuntimeAction`：旧 Provider 诊断按钮只允许 `models/chat/image`，但 sidecar 结果、本地队列项和后端队列状态必须能表达 `chat/image/audio/video` 原子生成 action，避免业务消费队列状态时丢失音频/视频任务语义。
- 原子能力校验按 capability 收敛必要字段：非生图能力不依赖 `imageCount`；OpenAI-compatible 音频 `format` 只允许 `mp3/wav/opus/aac/flac/pcm`，异常值回退到 `mp3`，避免业务复用时把不可信格式带入请求或落盘扩展名。
- 音频/视频 artifact 落盘前会校验响应 `Content-Type`，并嗅探首块响应体：拒绝 `application/json`、`text/*`、HTML/XML 等非媒体响应，也拒绝伪装成 `audio/*` / `video/*` 的 JSON/HTML/XML 错误体，避免 Provider 以 HTTP 200 返回错误信息时被保存为媒体文件；`npm run test:ai-sidecar` 已覆盖音频和视频 JSON 媒体响应与 MIME 伪装失败契约。
- Rust 内保留内存队列、取消、并发、超时、输出限制和脱敏；当前已拆为 `ai_provider_queue.rs`、`ai_provider_task.rs`、`ai_generation_task.rs`、`ai_provider_config.rs`、`ai_provider_process.rs`、`ai_provider_output.rs` 等内部模块。直连 `generate_ai_content` 和业务入口 `generate_ai_business_content` 都会使用请求 `requestId` 注册 generation task 与 cancel token；`/ai` Chat/Image 业务生成还会写入 `ai_generation_tasks`，只持久 providerConfigId、prompt、model、options、requestId、结果和 artifact metadata，不持久完整 Provider config/API Key；业务 generation 完成/失败先落持久表再发布内存 task 终态，避免 UI 已见完成但 DB 仍为 running；业务取消语义走 `cancel_ai_generation_task(requestId)`，Provider 配置诊断取消继续走 `cancel_ai_provider_test_task(requestId)`。
- `/ai?tab=features` 测试面板通过 `src/stores/ai-generation.ts` 保存当前原子生成 `requestId`，取消按钮走 `aiService.cancelGeneration()` / `cancel_ai_generation_task(requestId)`；页面仍只调用聚合 Store，不直接导入 service。新原子请求开始时会清理上一条结果，避免取消或失败后误显示旧 artifact；浏览器/mock 已用 `cancel-smoke` 长任务验证取消按钮、取消提示和无成功 artifact 回落。
- 原子生成开始、成功、失败和取消时会同步写入前端本地队列项，`AiProviderRuntimeAction` 可在 Provider 队列面板里展示 `chat/image/audio/video` runtime action、完成消息和错误信息；`/ai` Chat/Image runtime 业务任务与 `/ai?tab=features` 测试任务不再依赖旧 `AiProviderTestTask` polling 才能收敛 UI 状态。
- `/ai` Chat/Image pending 恢复接入 generation task：会话加载时，Chat pending assistant 消息会通过 `get_ai_generation_task` 回填成功文本、失败或取消状态；Image pending 恢复同样优先查 generation task，再以旧 Provider test task 兜底。浏览器/mock 已验证完成的 Chat generation task 可把 pending assistant 消息恢复为 success。
- generation task 终态必须跨内存和持久表保持幂等：同 `requestId` 的 `success/failed/canceled` 不允许被重新排队或被后续 `complete/fail/cancel` 覆盖。业务生成 service 在进入内存 registry / Provider queue 前会先读取 `ai_generation_tasks` 返回的既有终态；阻塞式业务生成遇到已持久化成功结果会直接返回该结果，遇到失败/取消则返回对应错误。图片 pending message 首次持久化时即携带 `requestId`，避免刷新恢复和取消同步出现无请求 ID 的短窗口。
- `ai_service_generation_tests.rs` 使用本地 mock Provider 覆盖 Rust `AiProviderService.generate_content` 到 Python sidecar 的 `chat/image/audio/video` 端到端链路，验证请求参数、文本返回、图片/音频/视频 artifact 本地落盘、generation 取消入口的 running/queued 中止，以及业务 active binding 缓存按 `config.json` 修改失效。
- 2026-06-13 已用真实 Tauri WebView2 + localhost OpenAI-compatible mock Provider（无 API Key）通过 `/ai?tab=features` 页面上下文触发 Pinia Store -> `aiService.generateDirectContent` -> Tauri command -> Rust service -> Python sidecar -> Provider：`chat/image/audio/video` 均返回结构化结果，图片、音频和视频 artifact 均落盘并转换为 WebView 可访问 URL；视频 mock 只验证二进制保存、MIME 和同源 `/videos/{id}/content` 下载，不代表真实视频播放能力已验证。
- 2026-06-14 Windows Computer Use 已复核真实 `Monster Tools` 桌面窗口可启动并进入 `AI 模型工作台`，真实模型配置与 `Codex Local Gateway` / `localhost:4444/v1` 可见，API Key 为掩码显示；当前 Computer Use 对该 WebView 的坐标点击/滚动绑定不稳定，因此复杂 UI 点击流仍优先走 WebView2 CDP、浏览器 mock 或服务级测试复核。
- AI Provider 原子能力只输出结构化 `AiGenerationResult` 和 artifact，不写旧工作台任务、资产或模型审计表；需要业务持久化时由上层业务 Store/Service/Rust command 自己写入专属表。直连原子能力测试不写 `ai_generation_tasks` request_json，避免持久化完整 Provider config。
- 2026-06-14 起，前端 active config 缓存从旧 `chat/image` 扩展为 `AiActiveConfigIds` capability binding：`chat/image/txt2img/img2img/inpaint/upscale_2x/upscale_4x/person_consistency/audio/video` 均可绑定模型配置；`txt2img` 与旧 `image` 互为兼容，增强图片能力在未单独绑定时回落到图片配置。Rust 业务生成解析 active binding 时会按 `config.json` 修改时间和长度缓存偏好配置，配置保存后自动失效重读。`/ai?tab=features` 先选择模型配置再可选覆盖模型名，`/image-workbench` 使用 `txt2img` binding。
- 业务取消语义在前端统一为 `aiService.cancelGeneration(requestId)`；底层 Rust command 为 `cancel_ai_generation_task(requestId)`，会取消排队或 running sidecar 的生成请求并同步 generation task registry 终态。Provider 配置诊断继续保留 `cancelProviderTestTask` / `cancel_ai_provider_test_task` 语义。
- sidecar / worker 升级边界：当前短生命周期脚本继续通过 Rust `AiProviderService` 受控调用；如果引入长驻 worker、worker 池或二进制 sidecar，不能新增前端直连通道，也不能让 worker 自管业务状态。升级前必须定义 requestId、capability、heartbeat、lease/stale recovery、cancel ack、artifact path、stdout/stderr 输出上限和脱敏错误合同，并让业务 job/task 或 `ai_generation_tasks` 成为唯一可恢复事实源。

## 6. 图片工作台

`/image-workbench` 是当前新接入的图片工作台：

- 前端入口：`src/views/image-workbench/ImageWorkbenchPage.vue`、`src/stores/image-workbench.ts`、`src/services/image-workbench.service.ts`。
- 后端入口：`commands/image_workbench.rs`、`ImageWorkbenchService`、`ImageWorkbenchRepo`、`image_workbench_schema.rs`。
- 当前能力：读取 contract、创建 job 并拆 task、读取 job snapshot、历史 job 列表、最近资产列表、模板 CRUD、收藏资产、取消 job、重试失败任务、更新 task 状态、记录 asset / metadata / model_run。
- 当前文生图闭环：页面输入 prompt 后创建 job/tasks，Store 调用 `imageWorkbenchService.startJobRunner()` 后立即返回并轮询 job snapshot；Rust `ImageWorkbenchService` 后端 runner 对每个可领取的 queued/retrying/stale task 调用 `AiProviderService.run_business_generation_blocking()`，以 `txt2img` 能力生成 artifact，再写回 image workbench 专属 asset / metadata / model_run；浏览器/mock 已验证记录、历史、任务、图库和统计链路。真实 Tauri 环境已验证 DB 表、任务失败/取消和 Provider 失败诊断；DB claim/lease、重启恢复与失败 model_run 审计已由代码和定向测试补齐。2026-06-13 使用 active image config `ai-model-1780916920189-5krffy` / `gpt-image-2` 完成真实 Provider 成功 smoke，真实 DB 中 job `iw-job-1781361589184-1` 为 succeeded，并写入 asset / metadata / succeeded model_run。
- 资产入库边界：前端只记录带 `artifact.path` 的本地生成文件；Rust `ImageWorkbenchService` 拒绝 URL / data URL / 非受控路径，并把 `~/.monster-tools/ai/generated` 里的源文件复制到 `~/.monster-tools/ai/image-workbench/assets` 后再写入 DB，避免 Provider 缓存清理破坏工作台历史。
- 队列状态边界：task 状态机已限制合法转移，终态不能直接回流到 running/queued；failed -> retrying 会消耗 retry 次数；asset / metadata / model_run 使用事务写入。
- 恢复与审计边界：Tauri 启动和 Store 初始化都会调用恢复逻辑；Rust 将重启后遗留的 running/validating task 清租约并重排为 queued，queued/retrying task 保持可领取，再由后端 runner 继续推进。Provider 调用失败时也会写入脱敏后的 model_run，保留 provider/model/capability/status/latency/request/response/error 审计线索。当前真实 DB 已同时存在 cancelled、failed 和 succeeded job，其中 succeeded 链路包含真实 asset、metadata 和 model_run。
- 真实环境结论：2026-06-13 已启动真实 Tauri dev 并确认 `monster_workbench.db` 中 `image_workbench_*` 表存在；当前 root anyrouter 仍对 `/images/generations` 返回 404，但 active image config `localhost:4444` 的 `gpt-image-2` 已成功生成 PNG，并由 `ImageWorkbenchService` 复制到 `~/.monster-tools/ai/image-workbench/assets` 后写入真实 DB。2026-06-14 Windows Computer Use 可截图真实 `Monster Tools` 窗口并用键盘进入 AI 工作台，但坐标点击/滚动接口对 WebView 绑定不稳定，窗口视觉与交互复核作为单独观感项处理。
- 2026-06-14 起，`runTxt2imgBatch()` / `retryFailedTasks()` 先创建或恢复持久 job/task 快照，然后调用 `start_image_workbench_job_runner` 启动 Rust 后端 runner；页面点击不等待整批任务结束，前端只轮询轻量 snapshot。图片工作台 task 已有 DB claim_token / leased_until_ms 防重复领取，Tauri 启动和页面初始化会恢复未完成 job 并启动 runner；通用 `/ai` Chat/Image 业务生成已有 `ai_generation_tasks` 持久任务表和 Tauri 启动恢复，服务级测试已覆盖从持久 queued 任务恢复并继续生成，直连原子测试仍保持非持久。
- 未闭环：长耗时 worker heartbeat、受控导入参考图/蒙版、资产删除文件清理、下载/导出仍按 `agent/open-loops.md` 继续推进。
- 增强能力：图生图、局部重绘、人物一致性、高清放大已进入 mode / capability / UI 降级清单；Provider 原生入参、降级规则和真实 smoke 稳定前不直接生成。

## 7. 大文件与拆分优先级

当前仍有大文件，但不是都需要马上拆。优先级按“职责扩张是否影响验证”排序：

| 优先级 | 文件 | 当前体量 | 判断 | 建议方向 |
|---|---:|---:|---|---|
| P2 | `src/stores/ai-image-runtime.ts` | 约 288 行 | 已拆出 result patch、message builders、pending recovery 与 cancel sync；Store 只保留生成主编排、runtime config 和后端 task wait | 新增恢复/取消语义前继续放入 `ai-image-pending-recovery.ts` / `ai-image-cancel-sync.ts` |
| P2 | `src/views/ai/components/AiImagePanel.vue` | 约 634 行 | 已抽出尺寸规则、提示词草稿规则、消息展示元数据、预览弹窗 state、会话动作、生成 actions、草稿 state 和 pending state；父组件以装配为主 | 新增生图 UI 功能时优先扩展现有 helper，避免回流父组件 |
| P2 | `src-tauri/sidecars/python/ai_provider_tester.py` | 约 113 行 | 已拆出 artifact、input parser、result/error builder、action handlers；当前是 sidecar 主入口 | 新增 action 时先放到 `ai_provider_actions.py`，输出合同放到 `ai_provider_results.py` |
| P1 | `src-tauri/sidecars/python/provider_adapters.py` | 约 647 行 | 已拆出 `provider_anthropic_adapter.py`；当前保留 registry、共享请求工具和 OpenAI-compatible adapter | 新增非 OpenAI-compatible 协议前继续按 adapter family 拆分 |
| 不手拆 | `src/views/utils-docs/utilsDocsContent.ts` | 约 1784 行 | 已确认为 `scripts/generate-utils-docs.cjs` 更新的内容型生成产物，并由 `check:utils-docs` 做质量与 sandbox 检查 | 维护生成脚本、JSDoc 源和检查脚本，不按行数手工拆内容 |
| P1 | `src-tauri/src/infra/image_workbench_repo.rs` | 约 967 行 | 已拆出 `image_workbench_types.rs` 与 `image_workbench_repo_tests.rs`；当前只保留 DB 连接、mutation/query、状态重算和 row mapper，并已进入体量债务基线 | 后续增加搜索、模板、资产清理或 worker heartbeat 前，再按 query / mutations / row mapper 继续拆 |
| P1 | `src-tauri/src/services/image_workbench_service.rs` | 约 1463 行 | 已拆出 `image_workbench_asset_policy.rs` 与外置 service tests；当前仍是图片工作台后端热点，并已进入体量债务基线 | 引入长驻 worker、取消/重试/恢复 UI 扩展前，继续拆 task transition、asset recording builder |
| P2 | `src/views/ai/components/image/AiImageMessageList.vue` | 约 792 行 | 新拆出的 message/result display 仍偏宽，并已进入体量债务基线 | 后续拆 result card、gallery、pending/failed card |
| P2 | `src/components/common/BaseDateRange.vue` 等 `Base*` 基础组件 | 约 402-1042 行 | 公共组件 API 稳定、交互完整，行数偏大但不都代表职责失控 | 只在触碰功能时按 preset、validation、panel UI、data adapter 等自然边界拆 |
| P2 | `src/utils/object/diff.ts`、`src/utils/tree/lookup.ts` 等 utils | 约 748-904 行 | 工具函数偏算法/集合型，当前更适合靠测试与文档保护 | 不为行数机械拆；新增能力前先补用例，再按算法边界拆 |

`src/services/tauri.mock.ts` 已从约 880 行降到约 445 行，AI Provider 与 Image Workbench mock 已拆到 `src/services/mocks/ai-provider.mock.ts` 和 `src/services/mocks/image-workbench.mock.ts`；后续新增成组 command 时继续走分域 handler。`src-tauri/src/services/ai_service.rs` 已从约 2577 行降到约 967 行，并额外拆出 437 行的 `ai_generation_support.rs`；`ai_provider_queue.rs` 生产代码与队列测试已分离。`ImageWorkbenchRepo` 已拆出类型与测试，`ImageWorkbenchService` 已拆出资产路径 policy 和外置 service tests。`ai-image-runtime.ts` 已拆出图片尺寸、提示词尺寸指令、结果 patch、消息构造、pending recovery 与 cancel sync 到 `src/stores/ai-image-*.ts` helper。`ai_provider_tester.py` 已拆出 artifact、input parser、result builder 和 action handlers；相关新模块已加入 Tauri bundle resources。`provider_adapters.py` 已拆出 Anthropic Messages family 到 `provider_anthropic_adapter.py`。`AiImagePanel.vue` 已把尺寸选项、提示词草稿规则、消息元数据、预览弹窗 state、会话动作、生成 actions、草稿 state 和 pending state 拆到 `src/views/ai/components/image/aiImage*.ts` / `useAiImage*.ts` helper。

## 8. 已移除范围

以下能力已经从当前架构中移除：

- 旧 `/creative` 独立创作工作台路由、侧栏入口、工作台卡片、页面组件、专属 i18n。
- 旧独立创作工作台前端 service、store、types、formatter composable。
- 旧独立创作工作台后端 commands、services、repos、schema。
- 旧常驻运行时脚本及其测试。
- 旧工作台边界检查脚本、浏览器 mock 验证脚本和历史执行包。
- 旧工作台专题文档、多 Agent、任务队列、资产库、运行时路线文档。

公共 AI Provider 工作台、provider tester、provider adapter、公共 UI、公共 Store / Service 和 Tauri 更新机制不属于本次移除范围。

## 9. 当前风险点

1. AI Provider 后端已完成当前 P0 拆分；后续改动要保护 `ai_service.rs`、`ai_provider_queue.rs`、`ai_provider_task.rs`、`ai_provider_config.rs`、`ai_provider_process.rs`、`ai_provider_output.rs` 之间的内部 contract。
2. `/image-workbench` 已完成 schema / repo / command / service / store / route、浏览器/mock 文生图闭环、历史/资产库/模板/收藏/取消/重试、路径白名单、持久资产复制、状态机、事务写入、Rust 后端 runner、DB claim/lease、重启孤儿任务恢复、失败 model_run 审计和真实 Provider 成功落图落库；repo 类型/测试与 service 资产路径 policy 已完成首轮拆分。后续长耗时 worker heartbeat 和增强能力接入前必须继续保护 Provider 调用边界。
3. AI 生图前端热点已有 UI、helper、预览 state、会话动作和生成 actions 拆分；继续加功能前应保持新增草稿/pending 状态逻辑先抽 helper。
4. AI runtime helper 已拆出 image result patch、message builders、pending recovery 和 cancel sync；后续新增恢复/取消语义时继续放入对应 helper。
5. Browser mock 必须继续跟 Tauri contract 对齐，避免只在浏览器成立。
6. Python provider tester / adapter 改动后必须运行 `npm run check:architecture` 和 `npm run test:ai-sidecar`；新增生产 sidecar 模块必须同步加入 `tauri.conf.json` 的 bundle resources。
7. 业务生成必须走 `generate_ai_business_content` 或 `enqueue_ai_business_generation`，禁止前端业务 Store 调用 `generate_ai_content` 或携带完整 provider config；`npm run check:architecture` 已限制 `aiService.generateDirectContent` 只能出现在 AI 功能测试面板 Store，`aiService.testProvider` / `aiService.enqueueProviderTest` 只能出现在 Provider 测试运行时。
8. 业务生成请求不写旧 `AiProviderTestTask` 注册表；页面内完成/取消靠 generation task registry 与业务自身 job/task 收敛。`/ai` Chat/Image 业务生成通过 `ai_generation_tasks` 持久化 request/result 并在 Tauri 启动恢复 queued/running 任务；同 requestId 的终态任务必须幂等返回，不得重排队或覆盖终态；图片工作台通过自身 DB job/task、claim/lease 和启动恢复收敛。直连原子测试仍只做当前进程诊断，不持久化完整 Provider config。
9. 文档不得继续引用已删除的旧 Creative 体系；未闭环事项写入 `agent/open-loops.md`。

## 10. 质量门禁

| 场景 | 必跑 |
|---|---|
| 前端 / TS / Vue 改动 | `npm run typecheck` |
| Tauri / IPC / HTTP / DB / 文件边界、sidecar bundle resources | `npm run check:architecture` |
| 普通前端任务完成前 | `npm run verify` |
| Rust service / command / infra 改动 | `cargo check --manifest-path .\src-tauri\Cargo.toml` |
| AI Provider 队列 / 任务 / Python 调用边界 | `cargo test --manifest-path .\src-tauri\Cargo.toml ai_provider`；原子生成链路用 `cargo test --manifest-path .\src-tauri\Cargo.toml ai_service_generation_tests` |
| 图片工作台 schema / repo / service 改动 | `cargo test --manifest-path .\src-tauri\Cargo.toml image_workbench` |
| Rust / capabilities / 打包链路 | `npm run tauri:build:no-bundle` |
| Python provider 测试链路 | `npm run test:ai-sidecar`，必要时 `npm run test:ai-sidecar:stress` |
| release 前 | `npm run release:test`，正式前 `npm run release:test:full` |

## 11. 文档入口

- 全局红线：[AGENTS.md](../AGENTS.md)
- 分层目录规范：[architecture.md](architecture.md)
- 工程流程：[engineering-playbook.md](engineering-playbook.md)
- 前端样式：[frontend-style.md](frontend-style.md)
- 文案/i18n：[i18n.md](i18n.md)
- Rust 后端：[rust-backend.md](rust-backend.md)
- AI 文档入口：[ai/index.md](ai/index.md)
- 未闭环事项：[../agent/open-loops.md](../agent/open-loops.md)
