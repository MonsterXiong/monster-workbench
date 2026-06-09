# Goal 08：审查与返工骨架

## Goal

新增 review task 与 revision stub，为后续自动审查和返工打基础。


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

- review task type
- review result model
- reviews 表或 assets metadata 扩展
- revision task stub
- manual approval 状态

## Out of Scope

- 不做复杂审查 prompt
- 不做完整多轮返工
- 不做视觉模型审查
- 不引入 agent 框架
- 不破坏已有 workflow

## Requirements

1. 支持 review_text_quality 或 review_asset_quality stub。
2. review 结果至少包含 pass、quality_score、problems、revision_instruction。
3. 未通过时可创建 revise task stub。
4. 支持 manual approval 状态。
5. 审查结果与 asset/task 可关联。

## Acceptance Criteria

- 可以创建 review task。
- 可以保存 review result。
- 可以创建 revise task stub。
- Vue 或调试入口可查看结果。
