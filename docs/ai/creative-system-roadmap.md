# 持续型 AI 创作系统路线图 v3

## Phase 00：文档护栏与基线

目标：

- 不改业务代码；
- 让 Codex 进入规则；
- 建立可回归的当前项目基线。

## Phase 01：最小任务/资产数据层

目标：

- creative_tasks
- task_events
- assets
- asset_links
- 数据库迁移策略
- 任务状态机

不做：

- 不替换现有 AI Provider 队列
- 不做 worker
- 不做 Python FastAPI

## Phase 02：Rust TaskService

目标：

- 通用 TaskService
- Tauri commands
- 前端服务封装
- 最小调试入口

## Phase 03：任务事件桥接

目标：

- Rust emit task events
- Vue listen and display
- 保持现有 Provider 测试逻辑

## Phase 04：SidecarLifecycleService

目标：

- Rust 管理 Python 常驻 sidecar 生命周期
- 状态机
- health check
- 默认不替换现有脚本
- Python sidecar packaging preflight

## Phase 05：Python sidecar stub

目标：

- /health
- /tasks stub
- /events stub
- token 校验

## Phase 06：第一个 creative workflow

目标：

- generate_image_prompt
- task -> event -> asset -> UI
- asset provenance
- model_runs 初步记录

## Phase 07：Worker 队列骨架

目标：

- SQLite-backed queue polling
- worker loop skeleton
- cancel checkpoints
- retry semantics
- startup recovery
- execution budget / kill switch

## Phase 08：审查与返工骨架

目标：

- review task
- review result
- auto revision stub
- manual approval

## Phase 09：领域资产

目标：

- character assets
- scene assets
- prop assets
- storyboard assets
- novel chapter assets
- script scene assets

## Phase 10：Goal + Multi-Agent 模式

目标：

- goal model
- agent role model
- goal decomposition
- parallel task fan-out
- merge/review workflow

## Phase 11：Batch Image Demo Mock

目标：

- 1000 mock tasks
- 受控并发
- 暂停/恢复/取消
- 前端统计

## Phase 12：Batch Image Demo Prompt

目标：

- 1000 image prompt tasks
- prompt asset 入库
- model_runs 记录

## Phase 13：Batch Image Demo Real Image

目标：

- 1000 queued real image tasks
- concurrency 受控
- 图片落盘
- 缩略图
- 熔断
