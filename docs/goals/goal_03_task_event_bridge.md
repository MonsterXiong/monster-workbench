# Goal 03：任务事件桥接

## Goal

为 creative_tasks 增加任务事件桥接能力，让 Rust 在任务变化时向 Vue emit 事件。


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

- Rust TaskService event emit
- Tauri event 名称定义
- 前端服务层或 store 层最小监听封装
- 轻量任务事件调试 UI

## Out of Scope

- 不改现有 Provider 轮询逻辑
- 不重写 ai.ts
- 不接 Python SSE/WebSocket
- 不引入 FastAPI
- 不做 worker 池
- 不传大图/base64

## Requirements

1. 创建任务时 emit creative-task-created。
2. 更新状态时 emit creative-task-status-changed。
3. 追加事件时 emit creative-task-event。
4. 事件 payload 包含 task_id、project_id、status、message、created_at。
5. 事件 payload 不包含大文件或大文本。
6. Vue 监听必须遵守现有分层规则。

## Acceptance Criteria

- Vue 能收到 task created 事件。
- Vue 能收到 status changed 事件。
- Vue 能收到 task event。
- 现有 AI Provider 页面不受影响。
