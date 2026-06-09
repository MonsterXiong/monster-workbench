# Goal 04：Rust SidecarLifecycleService

## Goal

新增 Rust SidecarLifecycleService，用于未来管理 Python 常驻 sidecar，但默认不替换现有 ai_provider_tester.py 执行链路。


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

- Rust SidecarLifecycleService
- sidecar 状态类型
- health check 接口设计
- Tauri commands 查询 sidecar 状态
- 可选开发模式启动/停止 sidecar
- 最小 Python health server 原型

## Out of Scope

- 不替换现有 Provider 测试脚本
- 不让 Vue 直连 Python
- 不把 workflow 写进 Rust
- 不引入 worker 池
- 不引入 Redis
- 不强制生产环境启用常驻 sidecar

## Requirements

1. Sidecar 状态包括 stopped、starting、running、unhealthy、stopping、failed。
2. Rust 负责端口选择和 runtime token。
3. Vue 只能通过 Rust 查询状态。
4. Python health server 只提供 /health。
5. 默认功能仍使用现有脚本链路。
6. App 退出时预留关闭 sidecar 的接口。
7. sidecar 崩溃需要记录状态。

## Acceptance Criteria

- Rust 可以创建 SidecarLifecycleService。
- 可以查询 sidecar 状态。
- 开发模式可以启动最小 health server。
- health check 可用。
- 现有 AI Provider 测试不受影响。
