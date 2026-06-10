# Creative System Master Plan

## 当前阶段

Phase 11：Batch Image Demo Mock

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

## 进行中

- [x] 建立当前基线
- [x] 运行 `npm run check:architecture`
- [x] 运行 `bash scripts/check_creative_boundaries.sh`
- [x] 运行 `cargo test worker_queue_service`
- [x] 运行 `cargo test creative_db`
- [x] 运行 `cargo check`
- [x] 运行 `bash scripts/check_creative_boundaries.sh`
- [x] 运行 `npm run typecheck`
- [x] 运行 `npx tauri build --no-bundle`
- [ ] Goal 06：继续复验 `generate_image_prompt` 最小闭环与 Playground 调试入口
- [ ] Goal 08：继续复验 review / revision stub 的 Playground 现场表现
- [ ] Goal 09：继续复验领域资产调试入口和 link 展示
- [ ] Goal 10：继续复验 goal 创建、fan-out、状态、stop 的 Playground 现场表现
- [ ] Goal 11：继续复验 Batch Image Demo Mock 在真实 Tauri 窗口中的暂停 / 恢复 / 取消与分页表现
- [ ] 运行 `npm run verify`

## 当前基线记录

2026-06-10 Goal 00 复验：

- `bash scripts/check_goal_docs.sh`：通过，必需 Goal 文档齐全。
- `npm run check:architecture`：通过。
- `bash scripts/check_creative_boundaries.sh`：通过；未发现 Vue 直连 Python、过早基础设施或前端 SQL/FS 红线命中。WSL 会输出一条 `localhost` 提示噪音，不影响检查结果。
- `npm run typecheck`：通过。
- `npx tauri build --no-bundle`：通过；前端 production build 与 Rust release 编译均通过。
- `bash scripts/check_batch_demo_boundaries.sh`：在当前 Windows/bash 环境下长时间卡住，未拿到可用退出结果；已改用等价人工检查确认本轮 Batch Demo 未引入 Vue 直连 Python、本地 provider 直连循环或前端原图 base64 状态存储。
- 当前代码痕迹已覆盖 Goal 01 至 Goal 10；`generate_image_prompt` workflow、sidecar stub、Playground 调试入口、worker queue skeleton、review / revision skeleton、领域资产接口与 goal / multi-agent 骨架都已落地，仍需继续在并行 worktree 下复验收口。
- 当前代码痕迹已推进到 Goal 11：新增 `batch_jobs`、`creative_tasks.batch_job_id/sequence_no`、Rust `BatchJobService`、Batch Tauri commands、前端 task service/store 接口、browser mock 与 Playground Batch Image Demo Mock 调试入口；支持 100-1000 mock tasks、受控并发、暂停 / 恢复 / 取消、事件统计与分页任务列表。

## 下一步

1. 继续收口 Goal 06/08/09/10/11：在真实 Tauri 窗口里确认 `generate_image_prompt`、review / revision stub、领域资产、goal / multi-agent 与 Batch Image Demo Mock 的现场行为。
2. 进入 Goal 12：Batch Image Demo Prompt 阶段，把 `demo.image.prompt`、`demo_image_prompt` asset 与 `model_runs` 接到批量任务链路。
3. 继续在每次 Goal 切换前刷新 `creative-master-plan.md` 与 `agent/open-loops.md`，防止并行工作树导致状态失真。

## 当前红线

- 不覆盖现有 AGENTS.md
- 不引入 Redis
- 不引入 FastAPI 替换现有链路
- 不重写 `src/stores/ai.ts`
- 不让 Vue 直连 Python
- 不破坏 AI Provider 测试链路

## Open Loops

同步维护 `agent/open-loops.md`。
