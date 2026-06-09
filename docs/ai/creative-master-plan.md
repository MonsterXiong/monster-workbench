# Creative System Master Plan

## 当前阶段

Phase 00：文档护栏与基线

## 已完成

- [ ] 追加 AGENTS.md Codex Goal 入口
- [ ] 新增 docs/ai/codex-goal-ops-manual.md
- [ ] 新增 docs/ai/codex-goal-mode.md
- [ ] 新增 docs/ai/creative-architecture-guardrails.md
- [ ] 新增 docs/ai/creative-system-roadmap.md
- [ ] 新增 docs/ai/creative-regression-checklist.md
- [ ] 新增 docs/ai/multi-agent-operating-model.md
- [ ] 新增 docs/goals/*
- [ ] 新增 scripts/check_creative_boundaries.sh

## 进行中

- [ ] 建立当前基线
- [ ] 运行 npm run check:architecture
- [ ] 运行 npm run typecheck
- [ ] 运行 npm run verify

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
