# Goal 07：Worker 队列骨架

## Goal

在已有 creative_tasks 基础上增加 SQLite-backed worker queue skeleton。


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

- Rust 或 Python worker skeleton，按现有阶段选择
- queue polling
- cancel checkpoint
- retry 状态语义
- startup recovery 草案

## Out of Scope

- 不引入 Redis
- 不引入远程 worker
- 不做完整多进程调度
- 不做复杂 AI workflow
- 不破坏 generate_image_prompt

## Requirements

1. worker 能读取 queued task。
2. worker 能标记 running。
3. worker 能检查 cancelling。
4. worker 能写 failed / retrying。
5. 启动时能识别 interrupted running task。
6. 只实现 skeleton，不扩大范围。

## Acceptance Criteria

- 可以消费一个 stub task。
- 可以取消一个待执行任务。
- 可以记录 retrying。
- 重启后能查询异常中断任务。
