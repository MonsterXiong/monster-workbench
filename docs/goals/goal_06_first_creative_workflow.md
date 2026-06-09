# Goal 06：第一个真实 Creative Workflow

## Goal

实现第一个最小 creative workflow：generate_image_prompt。


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

- 新增 generate_image_prompt task type
- Rust TaskService 调度入口
- Python 或现有 Provider 调用
- 结果写入 assets
- task_events 写入
- Vue 最小展示

## Out of Scope

- 不做生图
- 不做小说
- 不做剧本
- 不做自动审查
- 不做多 Agent 分解
- 不引入 Redis
- 不做复杂 worker 池

## Requirements

1. Vue 通过现有分层创建 generate_image_prompt task。
2. Rust 写入 creative_tasks。
3. 任务状态 queued -> running -> succeeded 或 failed。
4. 生成结果保存为 asset。
5. task_events 记录每个阶段。
6. Vue 能看到任务进度。
7. Vue 能看到生成的 prompt asset。
8. 现有 AI Provider 测试不受影响。

## Acceptance Criteria

- 创建一个 image prompt 任务。
- 任务成功完成。
- asset 表出现一条 prompt asset。
- 前端能显示结果。
- 失败时 task_events 有错误说明。
