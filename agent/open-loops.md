# Open Loops

本文只保留当前仍未闭环、且会影响后续推进的事项。已移除的旧独立创作工作台、批量任务、任务队列、资产库、常驻运行时和历史执行包事项不再记录。

## AI 工作台

- [x] 图片工作台 `/image-workbench` 已接入 schema / repo / command / service / store / route，并补齐历史作业、最近资产库、模板 CRUD、收藏、取消 job、重试失败任务、详情审计和浏览器/mock 文生图工作台闭环；资产路径白名单、data URL 禁止入库、任务状态机和 asset/metadata/model_run 事务写入已加固。真实测试已覆盖应用启动、Provider 配置探测、真实 DB 表存在性、取消/失败路径、重启后 running/queued 孤儿任务恢复、失败 model_run 审计，以及真实 Provider 成功生成后经 `ImageWorkbenchService` 复制到 `~/.monster-tools/ai/image-workbench/assets` 并写入真实 DB 的 asset/metadata/model_run 成功链路。
- [x] `/ai` Chat/Image 业务生成已从直连改为 `aiService.runBusinessGenerationTask()`：前端通过 `enqueue_ai_business_generation` 提交轻量 generation task，再轮询 `get_ai_generation_task` 收敛结果；业务只传 `providerConfigId`、prompt、model、options 和 requestId，不再携带完整 provider config；Provider 配置面板和 `/ai?tab=features` 保留直连，只承担连接、模型、聊天、生图和原子能力测试。
- [x] 2026-06-14 已把 active model config 从旧 `chat/image` 扩展为 capability binding 缓存：`chat/image/txt2img/img2img/inpaint/upscale_2x/upscale_4x/person_consistency/audio/video` 均可绑定模型配置；Rust 业务生成解析 `config.json` active binding 时按文件修改时间和长度缓存，配置保存后自动失效重读；`/ai?tab=features` 可按能力选择模型配置，`/image-workbench` 使用 `txt2img` binding，业务取消前端语义统一为 `aiService.cancelGeneration(requestId)`。
- [x] 2026-06-14 图片工作台文生图/重试入口改为 Rust 后端异步 job runner：先创建或恢复持久 job/task 快照并立即返回，`start_image_workbench_job_runner` 在后端通过 DB task claim/lease 推进 task；Tauri 启动与页面初始化都会把未完成任务恢复为可领取状态并启动 runner，结果仍只通过 `artifact.path` 写入受控资产库和 model_run 审计，不把大图内容放入 Pinia 状态树。
- [x] 2026-06-14 新增后端 generation task registry 语义层：`generate_ai_content` / `generate_ai_business_content` 会登记轻量任务快照，新增 `enqueue_ai_business_generation`、`get_ai_generation_task`、`list_ai_generation_tasks`、`cancel_ai_generation_task`；前端 `aiService.cancelGeneration()` 改走 generation 取消命令，`ai-provider-queue-sync` 会同步 generation task 到前端队列，图片工作台则由 Rust 后端 runner 直接调用 `run_business_generation_blocking()` 并写入自身 asset/metadata/model_run。浏览器图片工作台 mock 也通过 AI Provider mock 的 generation task 推进，尽量贴近桌面端真实路径。
- [x] 2026-06-14 `/ai` Chat/Image 业务生成新增 `ai_generation_tasks` 持久任务表：业务请求只持久 `providerConfigId`、prompt、model、options 和 requestId，不持久完整 Provider config/API Key；Tauri 启动会恢复 queued/running 业务任务并重启后台生成，`get_ai_generation_task` / `list_ai_generation_tasks` 可从 DB 回读结果和 artifact metadata。
- [x] 2026-06-14 通用业务 generation task 恢复已有服务级闭环测试：`resume_persisted_business_generation_restarts_queued_task` 直接种入 `ai_generation_tasks` queued 任务，模拟重启后由 `resume_persisted_business_generations()` 重新启动后台生成并写回 success 与 artifact；完成/失败路径已调整为先写 DB、再发布内存 task 终态，避免 UI 看到完成但持久表仍停留在 running 的短窗口。
- [x] 2026-06-14 新增 `business_generation_preference_cache_invalidates_when_config_file_changes`，覆盖业务 active binding 缓存失效；`direct_generation_can_cancel_running_sidecar` / `direct_generation_can_cancel_queued_request` 已改走 `cancel_generation_task`，直接验证 generation 统一取消入口可中止 running/queued 生成请求。
- [x] 2026-06-14 `/ai` Chat pending UI 恢复已补齐：新增 `ai-chat-pending-recovery.ts`，会话加载时通过 `get_ai_generation_task` 将 pending assistant 消息回填为成功文本、失败或取消；Image pending 恢复也改为会话加载时检查后端 generation task。浏览器 mock 已验证完成的 Chat generation task 能把 pending 消息恢复为 success，控制台 0 error / 0 warning。
- [x] 2026-06-14 AI generation 稳定性继续加固：图片 pending message 首次持久化即携带 `requestId`，避免刷新/取消时短暂丢失请求 ID；内存 generation registry 和 `ai_generation_tasks` repo 均保持终态幂等，`complete` 不再覆盖 `success/failed/canceled`；service 层会先尊重已持久化终态，再决定是否进入内存队列和 Provider queue，防止重启后同 `requestId` 复活已取消/已完成任务；取消兜底覆盖尚未进入 Provider queue 的 memory-only queued task。
- [x] 2026-06-14 `/image-workbench` 按执行包复核补齐基础全量闭环：文生图批量生成、关键词扩写/默认负向约束、每任务 expanded prompt、元提示词复制、单张重新生成、风格继续、历史/收藏/模板、详情审计、单张图片导出、受控导出文件夹、参考图/外部图入口、外部图片近似反推提示词口径和浏览器打开路径降级提示已验证；Playwright mock 生成、详情、导出、参考图反推控制台 0 error / 0 warning。
- [ ] 图片工作台后端后续扩展前继续拆：repo 已拆出 `image_workbench_types.rs` 与 `image_workbench_repo_tests.rs`，service 已拆出 `image_workbench_asset_policy.rs`；后续增加搜索分页、长耗时 worker heartbeat、受控导入参考图/蒙版、资产删除文件清理、ZIP 打包策略前，再拆 query / mutations / row mapper、task transition、asset recording builder。
- [ ] 图片工作台数据模型尚未支持资产组/变体/评分/版本链：`image_workbench_groups` 表（含 `job_id`、`source_id`、`name`、`type`、`agent_preset`、`agent_ids_json`、`base_prompt`、`count`、时间戳）未建；`image_workbench_tasks` 缺 `group_id`、`variant_index`、`failure_type`、`failure_hint` 与 `(job_id, group_id, variant_index)` 索引；`image_workbench_assets` 缺 `group_id`、`rating`、`parent_asset_id`、`root_asset_id`、`version_index`，后续可再扩 `archived_at_ms` / `deleted_at_ms`；asset list 仍只接受 `limit`，缺分页/筛选/排序/损坏状态。需要先写迁移、repo 测试，再放开 grouped job、复跑产生 parent/root/version、评分持久化等业务能力。
- [ ] 图片工作台运行时边界沉淀为后端规则：并发上限由前端只传请求值、Rust 按 Provider queue/max_concurrency clamp；runner 必须用 claim/lease 或等价锁保证多 worker 不重复；单任务取消只允许 queued，running 经 generation cancel token 处理，不得伪装成功；单任务重试需保留历史 attempt/model_run 并自增 retry_count；失败枚举固定为 `auth/model/size/rate_limit/timeout/connection/save/cancelled/unknown`，由后端返回稳定值，前端只做映射文案。
- [ ] 图片工作台前端组件化清单：拆 `ImageWorkbenchPage.vue` 为 `QueueSidebar / TaskRow / Composer / QuickFlows / ConfigPanel / AssetBoard / AssetGroupCard / SceneThumb / AssetLibraryModal / AssetPreviewModal / MaskCanvas`，配 `image-workbench-flows.ts / -board.ts / -queue.ts / -library.ts` helper；Pinia 拆 `image-workbench-runtime.ts`（任务运行/轮询/事件）、`image-workbench-planner.ts`（draft -> grouped job request）、保持 `image-workbench.ts` 仅做轻量业务编排；Service 仍只封装 `callTauri`，禁止持久化业务页 API Key/Base URL。
- [ ] 接 generated-assets 扫描导入器：`image_workbench_asset_import` 服务 + Tauri command，只扫描用户显式选定目录，不默认信任原型路径；JSON/PNG 成对校验，缺图/缺 JSON/解析失败均标"损坏"不静默；早期 schema fallback 到 `未分组` group，新 schema 保留 `groupId/groupName/groupType/sourceId/agent`；PNG 必须复制进受控资产目录再写 DB；以 `source_path + size + mtime` 或 metadata id 建立 fingerprint 保证幂等；测试覆盖中文 metadata、新旧 schema、缺图/缺 JSON、重复导入与超大目录分页。
- [ ] 图片工作台升级阶段验收门禁：`npm run check:architecture`、`npm run typecheck`、`cargo test image_workbench`；改 Rust/capabilities/打包链路时跑 `npm run tauri:build:no-bundle`；测试需覆盖 grouped job 入库、多 worker 并发 claim 不重复、queued 单条取消、failed 单条重试、rating 刷新仍存、复跑产生 parent/root/version、asset list 分页/筛选/排序、generated-assets 新旧 metadata 导入兼容；真实窗口验收三栏布局/队列折叠/Composer 不遮挡/modal 键盘操作。
- [ ] Python Provider 新增非 OpenAI-compatible 协议前，继续从 `provider_adapters.py` 拆新的 adapter family；新增 action 时只扩展 `ai_provider_actions.py` 与 `ai_provider_results.py`，不要回填到 `ai_provider_tester.py` 主入口。

## 真实环境验证

- [x] 在真实 Tauri 窗口用 localhost OpenAI-compatible mock Provider（无 API Key）smoke `generate_ai_content` 的 `chat/image/audio/video`：通过 WebView2 CDP 在 `/ai?tab=features` 页面上下文触发 Pinia Store，确认文本返回、图片保存、音频 `/audio/speech`、视频 `/videos` 创建/轮询/同源下载、artifact 落盘、产物路径转换和本地队列成功/失败状态收敛。
- [x] 2026-06-14 已用 Windows Computer Use 复核真实 `Monster Tools` 桌面窗口：重启 debug 可执行文件后应用可加载，键盘导航可进入 `AI 模型工作台`，真实模型配置列表和 `Codex Local Gateway` / `localhost:4444/v1` 配置可见，API Key 在 UI 中为掩码显示。当前 Computer Use 坐标点击、移动和滚动接口对该 WebView 绑定不稳定，真实窗口复杂点击流仍不作为后端/Provider/DB 闭环阻塞项。
- [ ] 用有效真实音视频 Provider 复核 `generate_ai_content` 的媒体播放、真实视频文件有效性、API Key 脱敏日志/错误提示和长任务队列状态；localhost mock 的 video 仅验证二进制保存与 MIME/下载链路，不代表真实播放已闭环。
- [ ] 在真实 Tauri 窗口用有效 Provider 覆盖 `/ai` Chat/Image 业务网关生成的 pending 对话取消、running 对话中止、running 生图中止和刷新恢复一致性；Rust 底层 running sidecar 取消已由 `direct_generation_can_cancel_running_sidecar` 覆盖，真实窗口仍需验证 UI 状态和错误提示。
- [x] 2026-06-14 已在 browser mock 运行态复核 `/ai?tab=chat` 与 `/image-workbench`：Chat 返回 `Mock 回复`；图片工作台文生图从页面生成收敛到 4/4，资产/元数据/model_run/历史分别为 4/4/4/1。普通浏览器中历史生图 `asset.localhost` 会报连接失败，这是非 Tauri 环境无法解析桌面 asset 协议导致；真实 WebView 仍需最终观感复核。
- [x] 2026-06-14 Playwright CLI 复核当前 `http://localhost:1420/#/ai?tab=features`：四个原子能力卡片（对话、图片、音频、视频）均渲染为可用，控制台 warning/error 为 0；1365x900、1269x912 与 390x800 视口下内容均未被截断，当前面板高度不需要滚动。
- [ ] Windows Computer Use 当前 `list_apps` 连续超时且状态诊断存在 bridge 空输入错误；直接 `get_app_state("Monster Tools")` 可截图窗口，但本轮抓到的窗口不是当前 `/ai?tab=features` 页面。后续真实窗口复杂 UI 复核仍优先用 WebView2 CDP / Playwright / 稳定截图方案，Computer Use 只作为可用时的辅助观感工具。
- [ ] 在真实 Tauri 窗口复核 `/ai` Chat/Image 持久 generation task 重启恢复 UI：后端服务级恢复与浏览器 mock pending 回填已覆盖；仍需制造 pending/running 业务请求后重启应用，确认真实 WebView 能按 requestId 收敛到成功/失败/取消。
- [ ] 后续视频生成、高清放大等更长耗时任务仍需补 worker heartbeat / worker 池实现；运行时准入规范已写入 `docs/engineering-playbook.md`、`docs/architecture-current-state.md` 与 `docs/ai/decisions.md`，前端只订阅或轮询轻量状态与 artifact metadata，直连原子测试不持久化完整 Provider config。
- [ ] 用真实第三方 Anthropic Messages 格式 API（`custom + anthropic-messages` adapter）和 OpenAI-compatible 自定义 Provider smoke AI 工作台 capability 展示、按钮禁用、聊天/生图可用性和错误提示；避免使用生产 API key 进入日志或文档。
- [x] `/image-workbench` 真实 Provider 成功链路已闭环：2026-06-13 使用 active image config `ai-model-1780916920189-5krffy` / `gpt-image-2` 生成 PNG，创建真实 job `iw-job-1781361589184-1`，写入 succeeded task、asset、metadata 和 succeeded model_run；资产文件存在于 `~/.monster-tools/ai/image-workbench/assets/iw-task-1781361589185-2/`，且大小与 DB `size_bytes` 一致。Windows UIA 截图自动化仍不稳定，后续只保留真实窗口最终观感/交互复核，不再阻塞后端/Provider/DB 闭环结论。
- [ ] `/image-workbench` 真实窗口最终观感/交互复核：确认成功 job、资产图、详情审计、历史列表和图库切换在 Tauri WebView 中显示正常；优先用 WebView2 CDP，若 dev watcher 被 `__pycache__` 干扰，先停止 dev、清理缓存并设置 `PYTHONDONTWRITEBYTECODE=1` 后再测。2026-06-14 Windows Computer Use 可截图真实 `Monster Tools` 窗口并用键盘导航，但坐标点击/滚动接口绑定不稳定，暂不作为真实窗口复核主路径。
- [ ] `/image-workbench` 新版“审片优先”首屏仍需真实窗口观感复核：确认作业概览、任务摘要、图库计数、选中结果动作分组和移动端/窄宽度降级布局都成立，再决定是否继续拆资产组/版本链。
- [ ] 图片工作台增强模式（图生图、局部重绘、人物一致性、高清放大）已进入 mode / capability / UI 降级清单；参考图/外部图入口已能自动切到图生图并显示近似反推提示词；局部重绘已补前端 mask 画布保存、受控 SVG mask 路径和浏览器 mock inpaint job 闭环。2026-06-14 已补模型配置 capability override 和 Python sidecar 增强图片请求契约：Provider 配置页可持久勾选模型能力，Rust/Python 都优先按模型配置能力判断；`img2img/inpaint/person_consistency` 支持 `txt2img_prompt_fallback`，声明原生能力时透传 reference/source/mask/person/scale 扩展字段，`upscale_2x/upscale_4x` 必须有 Provider 原生能力。后续需补真实 Provider adapter family / smoke、受控参考资产导入和真实窗口复核后再开放生产级直接生成。

## 文档维护

- [ ] 后续文档只更新当前事实、长期规则、边界和未闭环事项；不要重新创建历史 Goal 执行包、阶段提示词、平行路线图或过程性复核堆栈。
- [ ] 若新增、修改或删除规范文档，先读 `docs/ai/maintenance.md` 和 `docs/ai/index.md`；优先更新已有专题文档。

## 产品设计

- [ ] 将 `/workspace` 从欢迎页升级为工作台总览：展示 Provider 就绪状态、未完成任务、最近资产、高频入口和下一步建议。
- [ ] 重新梳理主导航分组：按“创作 / 资产 / 工具 / 系统诊断”组织现有 AI、图片工作台、文件、导航、工具和设置模块。
- [ ] 为 `/image-workbench` 设计生产化工作流：补模式引导、资产组/版本链、模板配方复用、失败原因和下一步动作，避免只在现有三栏界面继续追加按钮。
