# Goal 00：文档护栏确认

## Goal

确认 Codex Goal 完整推进体系已正确接入现有项目，不覆盖现有 AGENTS.md，不修改业务代码。


## Background

当前项目是 Tauri v2 + Vue 3 + Rust + Python sidecar 的桌面应用 Monster Tools / monster-workbench。

必须遵守：

- 根目录 AGENTS.md；
- docs/ai/codex-goal-mode.md；
- docs/ai/creative-architecture-guardrails.md；
- docs/ai/creative-regression-checklist.md。

现有 AI Provider 测试链路必须保持可用。

## Verification

默认完成后运行：

```bash
npm run check:architecture
npm run typecheck
bash scripts/check_creative_boundaries.sh
```

涉及 Rust / capabilities / 打包时运行：

```bash
npx tauri build --no-bundle
```

## Report

完成后必须报告：

- 修改了哪些文件；
- 为什么这样改；
- 没有做哪些范围外事项；
- 运行了哪些检查；
- 哪些通过，哪些未运行；
- 风险；
- 下一步建议。


## Allowed Scope

- AGENTS.md 追加内容的最小修订
- docs/ai/*
- docs/goals/*
- docs/templates/*
- docs/agents/*
- scripts/check_creative_boundaries.sh
- agent/open-loops.md

## Out of Scope

- 不修改业务代码
- 不修改 Vue / Rust / Python 实现
- 不新增依赖
- 不引入 Redis / FastAPI / worker
- 不替换现有 AI Provider 测试链路

## Requirements

1. 检查 AGENTS.md 追加内容是否与现有规则冲突。
2. 检查 docs/ai 文档是否完整。
3. 检查 docs/goals 是否能覆盖从零到一推进路径。
4. 检查所有文档是否遵守“AGENTS.md 只放全局入口，细节放 docs/ai”的原则。
5. 如果需要修改，只做文档最小修订。

## Acceptance Criteria

- 文档体系完整。
- 无业务代码变更。
- 后续 Codex 可按阶段执行。
