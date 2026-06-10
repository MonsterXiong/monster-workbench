# Creative System Master Plan

## 当前阶段

Post-goal Architecture Hardening

## 已完成

- [x] 追加 AGENTS.md Codex Goal 入口
- [x] 新增 docs/ai/codex-goal-ops-manual.md
- [x] 新增 docs/ai/codex-goal-mode.md
- [x] 新增 docs/ai/creative-architecture-guardrails.md
- [x] 新增 docs/ai/creative-system-roadmap.md
- [x] 新增 docs/ai/creative-regression-checklist.md
- [x] 新增 docs/ai/multi-agent-operating-model.md
- [x] 新增 docs/goals/*
- [x] 新增 scripts/check_creative_boundaries.sh
- [x] 完成 Goal 00 文档护栏确认
- [x] Goal 01：最小 `creative_tasks` / `task_events` / `assets` / `asset_links` 数据模型已落地
- [x] Goal 02：Rust TaskService 与最小 commands 已落地
- [x] Goal 03：creative task 事件桥接已落地
- [x] Goal 04：SidecarLifecycleService 已落地
- [x] Goal 05：Python 常驻 sidecar stub 已落地
- [x] Goal 06：第一个 `generate_image_prompt` workflow 已落地
- [x] Goal 07：Worker 队列骨架已落地
- [x] Goal 08：review / revision skeleton 已落地
- [x] Goal 09：创作领域资产已落地
- [x] Goal 10：Goal + 多 Agent 模式骨架已落地
- [x] Goal 11：Batch Image Demo Mock 已落地

## 阶段验收

- [x] 建立当前基线
- [x] 运行 `npm run check:architecture`
- [x] 运行 `bash scripts/check_creative_boundaries.sh`
- [x] 运行 `cargo test worker_queue_service`
- [x] 运行 `cargo test creative_db`
- [x] 运行 `cargo check`
- [x] 运行 `bash scripts/check_creative_boundaries.sh`
- [x] 运行 `npm run typecheck`
- [x] 运行 `npx tauri build --no-bundle`
- [x] Goal 06：`generate_image_prompt` 最小闭环与 Playground 调试入口已完成
- [x] Goal 08：review / revision stub 的 Playground 现场表现已完成
- [x] Goal 09：领域资产调试入口和 link 展示已完成
- [x] Goal 10：goal 创建、fan-out、状态、stop 的 Playground 现场表现已完成
- [x] Goal 11：Batch Image Demo Mock 在真实 Tauri 窗口中的暂停 / 恢复 / 取消与分页表现已完成
- [x] Goal 12：`demo.image.prompt` 的创建、启动、暂停、恢复、取消、重试，以及 prompt asset / model_runs 现场表现已完成
- [x] Goal 13：真实生图前端入口、`file path` / thumbnail 落盘链路、自动暂停与真实窗口表现已完成
- [x] 运行 `npm run verify`

## 历史基线记录

2026-06-10 Goal 00 复验（历史基线快照）：

- `bash scripts/check_goal_docs.sh`：通过，必需 Goal 文档齐全。
- `npm run check:architecture`：通过。
- `bash scripts/check_creative_boundaries.sh`：通过；未发现 Vue 直连 Python、过早基础设施或前端 SQL/FS 红线命中。WSL 会输出一条 `localhost` 提示噪音，不影响检查结果。
- `npm run typecheck`：通过。
- `npx tauri build --no-bundle`：通过；前端 production build 与 Rust release 编译均通过。
- `bash scripts/check_batch_demo_boundaries.sh`：在当前 Windows/bash 环境下长时间卡住，未拿到可用退出结果；已改用等价人工检查确认本轮 Batch Demo 未引入 Vue 直连 Python、本地 provider 直连循环或前端原图 base64 状态存储。
- 当前代码痕迹已覆盖 Goal 01 至 Goal 10；`generate_image_prompt` workflow、sidecar stub、Playground 调试入口、worker queue skeleton、review / revision skeleton、领域资产接口与 goal / multi-agent 骨架都已落地，仍需继续在并行 worktree 下复验收口。
- 当前代码痕迹已推进到 Goal 11：新增 `batch_jobs`、`creative_tasks.batch_job_id/sequence_no`、Rust `BatchJobService`、Batch Tauri commands、前端 task service/store 接口、browser mock 与 Playground Batch Image Demo Mock 调试入口；支持 100-1000 mock tasks、受控并发、暂停 / 恢复 / 取消、事件统计与分页任务列表。
- 当前代码痕迹已推进到 Goal 12：Playground Batch Demo 已支持 `mock / prompt` 两种模式切换，前端 `task.service.ts` 已补齐 `providerConfig` 入参类型，Browser mock 已支持 `demo.image.prompt` 批量执行；后续真实 Tauri 验证已在下方闭环。
- 当前代码痕迹已推进到 Goal 13：`demo.image.generate` 前端入口与真实图片任务链路已开始落地，Rust 侧回归已覆盖真实图片资产、自动暂停和 started label；后续真实 Tauri 验证已在下方闭环。

## 后续关注

1. 拆分 `useTaskStore`、`useAiStore` 与 `commands/database.rs` 的宽边界。
2. 固化 SQLite migration、`creative_projects` 与资产版本/来源治理。
3. 将 Python `creative_health_server.py` 逐步升级为正式 workflow runtime。

## 当前红线

- 不覆盖现有 AGENTS.md
- 不引入 Redis
- 不引入 FastAPI 替换现有链路
- 不重写 `src/stores/ai.ts`
- 不让 Vue 直连 Python
- 不破坏 AI Provider 测试链路

## Open Loops

同步维护 `agent/open-loops.md`。

## 2026-06-10 Goal 12 Prompt 进展

- Playground Batch Demo 已从单一 mock 表单扩展为 `mock / prompt` 两种模式切换。
- 前端 `task.service.ts` 已补齐 `providerConfig` 入参类型，允许 Batch Prompt 阶段把 provider 配置沿标准链路传到 Tauri。
- Browser mock 已支持 `demo.image.prompt` 的批量执行：会生成 `demo_image_prompt` asset 摘要、模拟 `modelRunId`、保留 retry / cancel / success / failure 状态轨迹。
- 本轮验证已通过：`npm run typecheck`、`npm run check:architecture`、`cargo check`。
- 该阶段已完成真实 Tauri 窗口验证；对应入口已迁移到 `CreativeWorkflowDemo.vue`。
- `demo.image.generate` 也已完成真实图片资产、自动暂停和 started label 回归的窗口验证。

## 2026-06-10 Verification Update
- `bash scripts/check_goal_docs.sh`: passed.
- `npm run check:architecture`: passed.
- `npm run typecheck`: passed.
- `bash scripts/check_creative_boundaries.sh`: passed.
- `bash scripts/check_batch_demo_boundaries.sh`: passed.
- `cargo test batch_job_service -- --nocapture`: passed, including prompt, generate, auto-pause, and started-label tests.
- `cargo test creative_db -- --nocapture`: passed.
- `cargo check`: passed.
- 当时仍在推进真实窗口验收；现已由下方 True Tauri Verification Closure 收口，当前不再保留 Goal 06 / 08 / 09 / 10 / 11 / 12 / 13 的未完成待办。

## 2026-06-10 Batch UI Refresh Follow-up
- Added automatic current-page batch task refresh in `src/stores/task.ts` so `batch-job-status-changed` / `batch-job-progress` events can pull the latest paged tasks for the active batch window.
- The store now remembers the current `limit` / `offset` window and coalesces concurrent refresh requests to avoid overlapping task-page reads.
- Browser-mock headless verification reached interactive states for Goal 06 / 08 / 09 / 10 / 11 / 12 and showed `demo.image.generate` reaching `image worker started` / `image worker finished successfully` / `batch completed` in the live page text.
- This section is now historical context only; the real-window evidence has already been closed out in the final verification section below.

## 2026-06-10 Browser-Mock Verification Script
- Added `scripts/verify-playground-browser-mock.cjs` to run a single-page CDP verification session against `/playground` in browser-mock mode.
- Added a DEV-only `window.__monsterPlaygroundDebug` bridge in `CreativeWorkflowDemo.vue` so the verifier can drive real store actions instead of brittle button clicking.
- Current script evidence:
  - Goal 06 prompt workflow succeeds and yields a prompt asset.
  - Goal 08 review stub succeeds and yields a review asset.
  - Goal 09 domain draft yields >= 9 assets and >= 7 links.
  - Goal 10 goal stub yields >= 5 tasks.
  - Goal 11 mock batch can be created, started, paused, resumed, and cancelled.
  - Goal 12 prompt batch reaches succeeded tasks with `modelRunId` in task results.
  - Goal 13 browser-mock real-image batch reaches succeeded tasks with `filePath`, `thumbnailPath`, `modelRunId`, and non-empty `batchJobImageItems`.
- This is still browser-mock evidence, not final true-Tauri-window proof.

## 2026-06-10 True Tauri Verification Closure
- Real Tauri window verification is now complete for Goal 06 / 08 / 09 / 10 / 11 / 12 / 13 through the live WebView2 runtime, not browser-mock only.
- During true-window verification, `generate_image_prompt` initially exposed a legacy SQLite migration bug: `creative_tasks.goal_id` / `batch_job_id` / `sequence_no` indexes were created before old databases were upgraded. Fixed in `src-tauri/src/infra/creative_db.rs` by deferring those indexes until after `ensure_column(...)`, and added a regression test for legacy schema upgrade.
- True Tauri evidence captured after the migration fix:
  - Goal 06: `generate_image_prompt` succeeded in the desktop window with `taskId=2`, `assetId=2`, and prompt asset content rendered in Playground.
  - Goal 08: review stub succeeded in the desktop window with `taskId=3`, `assetId=3`.
  - Goal 09: domain draft produced `9` assets and `7` asset links in the desktop window.
  - Goal 10: goal / multi-agent stub produced `5` tasks in the desktop window.
  - Goal 11: mock batch flow confirmed desktop-window create/start/pause/resume/cancel, ending with `cancelled=6`.
  - Goal 12: prompt batch succeeded in the desktop window against a temporary local OpenAI-compatible mock provider, with `3` succeeded tasks and persisted `modelRunId` values in task results.
  - Goal 13: real-image batch succeeded in the desktop window against a temporary local OpenAI-compatible mock provider, with `2` succeeded tasks, persisted `filePath` / `thumbnailPath`, and `modelRunId` values.
  - Goal 13 auto-pause: a failing real-image provider path still paused the batch in the desktop window after consecutive failures.
- Gates rerun after the migration fix:
  - `npm run check:architecture`
  - `npm run typecheck`
  - `bash scripts/check_creative_boundaries.sh`
  - `bash scripts/check_batch_demo_boundaries.sh`
  - `cargo test creative_db -- --nocapture`
  - `cargo test batch_job_service -- --nocapture`
  - `cargo check`
  - `npx tauri build --no-bundle`
- Goal 00-13 are now verified as complete. The next work should move from “close the goal chain” to “post-goal architecture hardening”.

## 2026-06-11 Post-Goal Hardening
- Current follow-up work is to harden the `/creative` page, `useTaskStore`, `useAiStore`, `CreativeDbInfra`, and related command boundaries without reopening the completed Goal chain.
