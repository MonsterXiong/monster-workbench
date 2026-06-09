# Creative System Master Plan

## 当前阶段

Phase 00：文档护栏与基线

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

## 进行中

- [x] 建立当前基线
- [x] 运行 npm run check:architecture
- [x] 运行 npm run typecheck
- [ ] 运行 npm run verify

## 当前基线记录

2026-06-10 Goal 00：

- `bash scripts/check_goal_docs.sh`：通过，必需 Goal 文档齐全。
- `npm run check:architecture`：通过。
- `bash scripts/check_creative_boundaries.sh`：通过；脚本已从全仓库 `grep` 调整为 `rg`，避免 Windows/WSL 环境下扫描超时。
- `npm run typecheck`：通过。
- `npm run verify`：未单独运行；本轮已分别完成 `typecheck` 与 `check:architecture`。
- 与 Goal 00 无关的稳定改动已按批次提交；未把临时目录或未确认敏感配置作为 Goal 文档批次混入。

## 下一步

1. 执行 `docs/goals/goal_00_docs_guardrails.md`
2. 执行 `docs/goals/goal_01_minimal_db_model.md`
3. 执行 `docs/goals/goal_02_task_service_commands.md`

## 当前红线

- 不覆盖现有 AGENTS.md
- 不引入 Redis
- 不引入 FastAPI 替换现有链路
- 不重写 `src/stores/ai.ts`
- 不让 Vue 直连 Python
- 不破坏 AI Provider 测试链路

## Open Loops

同步维护 `agent/open-loops.md`。
