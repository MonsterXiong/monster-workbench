# Goal 01：最小任务/资产数据库模型

## Goal

在不破坏现有 AI Provider 测试功能的前提下，新增持续型 AI 创作系统的最小 SQLite 数据模型。


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

- Rust SQLite migration
- Rust DB / Repo / Service 基础访问层
- Rust 类型定义
- 基础测试或 smoke test
- 必要文档更新

## Out of Scope

- 不替换 AiProviderService 内存队列
- 不改现有 AI Provider 页面
- 不引入 Python FastAPI
- 不引入 Redis
- 不做 worker 池
- 不做真实 AI workflow
- 不重写 src/stores/ai.ts

## Requirements

新增或迁移以下表：

### creative_tasks

至少包含：

- id
- project_id
- task_type
- status
- priority
- payload_json
- result_json
- error_message
- retry_count
- max_retries
- parent_task_id
- asset_id
- created_at
- updated_at
- started_at
- finished_at

状态需为未来预留：

- draft
- queued
- running
- paused
- cancelling
- cancelled
- succeeded
- failed
- retrying
- blocked

### task_events

至少包含：

- id
- task_id
- event_type
- message
- payload_json
- created_at

### assets

至少包含：

- id
- project_id
- asset_type
- title
- content
- file_path
- thumbnail_path
- metadata_json
- status
- created_at
- updated_at

### asset_links

至少包含：

- id
- source_asset_id
- target_asset_id
- link_type
- created_at

## Acceptance Criteria

- migration 可执行。
- 可以创建/query creative_task。
- 可以追加/query task_event。
- 可以创建/query asset。
- 可以创建/query asset_link。
- 现有 AI Provider 测试链路不受影响。
