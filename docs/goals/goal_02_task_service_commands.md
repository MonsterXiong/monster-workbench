# Goal 02：Rust TaskService 与最小 Commands

## Goal

新增 Rust TaskService 和最小 Tauri commands，用于操作 creative_tasks 和 task_events，但不替换现有 Provider 队列。


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

- Rust TaskService
- Rust commands
- 前端服务封装
- 可选开发调试入口
- 基础测试

## Out of Scope

- 不重写 src/stores/ai.ts
- 不替换 AI Provider 页面
- 不引入 Python 常驻服务
- 不引入 worker 池
- 不接真实模型调用

## Requirements

1. 新增 create_creative_task command。
2. 新增 get_creative_task command。
3. 新增 list_creative_tasks command。
4. 新增 update_creative_task_status command。
5. 新增 append_task_event command。
6. 前端如需调用，必须通过项目既有 Frontend Service / callTauri 分层。
7. 命令返回统一错误格式。
8. 不影响现有 AI Provider 调用路径。

## Acceptance Criteria

- 前端服务可以创建 creative_task。
- 前端服务可以查询 creative_task。
- Rust 可以追加 task_event。
- 现有 Provider 测试保持可用。
