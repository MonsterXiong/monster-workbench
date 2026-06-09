# Goal 05：Python 常驻 Sidecar Stub

## Goal

新增 Python 常驻 sidecar 服务原型，为后续 AI workflow engine 做准备。


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

- 新增 Python server 文件
- /health
- /tasks stub
- /events polling stub
- token 校验
- 启动参数解析
- 最小 requirements 说明

## Out of Scope

- 不执行真实模型调用
- 不替换 ai_provider_tester.py
- 不做 worker 池
- 不做真实队列消费
- 不引入复杂 agent 框架
- 不让 Vue 直连 Python

## Requirements

1. server 支持 --port。
2. server 支持 --token。
3. /health 返回 ok。
4. /tasks 可以接收 task payload 并返回 accepted/stub。
5. /events 可以返回空事件数组或 stub 事件。
6. 所有接口需要 token 校验。
7. Rust 通过 SidecarLifecycleService 调用。
8. 默认不影响现有 Provider 测试。

## Acceptance Criteria

- Rust 能启动 server。
- Rust 能通过 token 调 /health。
- Rust 能停止 server。
- 现有脚本仍可用。
