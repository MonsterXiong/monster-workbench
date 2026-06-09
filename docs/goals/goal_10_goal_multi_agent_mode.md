# Goal 10：Goal + 多 Agent 模式骨架

## Goal

为产品内部的 Goal 模式和多 Agent 并行创作流建立数据与流程骨架。


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

- goal model
- agent role model
- goal decomposition stub
- parallel task fan-out stub
- merge/review workflow stub
- 文档和调试入口

## Out of Scope

- 不做真正无限后台运行
- 不做远程 worker
- 不引入 Redis
- 不实现完整 agent 框架
- 不破坏已有任务/资产/事件系统

## Requirements

1. goal 可以拆成 creative_tasks。
2. agent role 可以绑定 task type。
3. 支持 fan-out 多任务创建。
4. 支持 merge/review stub。
5. 支持人工暂停/取消。
6. 不允许无限无边界运行，必须有预算、任务数和失败上限。

## Acceptance Criteria

- 可以创建一个 goal。
- 可以分解成多个 stub tasks。
- 可以查看 goal 下任务状态。
- 可以手动停止 goal。
