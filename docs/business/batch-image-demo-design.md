# Batch Image Generation Demo：1000 张图片批量队列生成业务设计

## 1. 目的

该 Demo 用于验证持续型 AI 创作系统的核心承载能力：

- 批量任务创建；
- SQLite-backed 队列；
- 受控并发；
- 任务事件；
- 暂停 / 恢复 / 取消；
- Provider 限流；
- 图片落盘；
- 缩略图展示；
- 资产入库；
- 前端大列表性能。

它不是正式创作业务的全部，而是任务系统和资产系统的压力演示页。

## 2. 核心原则

不要让 Vue 直接循环发送 1000 个生图请求。

正确模式：

```text
Vue 创建 batch_job
  -> Rust 批量写入 creative_tasks
  -> Python/Rust worker 按并发上限消费
  -> 生成图片并落盘
  -> 写入 assets / task_events / model_runs
  -> Vue 展示进度和缩略图
```

## 3. 三阶段落地

### 阶段 A：Mock 任务压测

- 创建 1000 条 mock image tasks；
- worker 模拟 1~3 秒耗时；
- 随机成功/失败；
- 不调用模型；
- 不生成图片。

验证 DB 写入、队列状态、并发、取消、前端性能。

### 阶段 B：Prompt 任务

- 为 1000 个任务生成 image prompt；
- 保存为 image_prompt asset；
- 不真实生图。

验证 Provider 文本调用、prompt asset 入库、model_runs、失败重试。

### 阶段 C：真实生图

- 1000 条 image.generate_asset；
- 并发数默认 2~5；
- 图片落盘；
- 缩略图生成；
- asset 入库；
- model_runs 记录。

## 4. Batch Job 模型

建议新增表：batch_jobs

```text
id
project_id
name
batch_type
status
total_count
submitted_count
queued_count
running_count
succeeded_count
failed_count
cancelled_count
concurrency
max_retries
prompt_template
provider_id
model
image_size
budget_json
created_at
updated_at
started_at
finished_at
```

状态：

```text
draft
queued
running
paused
completed
failed
cancelled
blocked
```

## 5. creative_tasks 扩展

建议 creative_tasks 支持：

```text
batch_job_id
sequence_no
run_after
locked_by
lease_expires_at
last_heartbeat_at
cancel_requested_at
checkpoint_json
```

第一版至少保留：

```text
batch_job_id
sequence_no
```

## 6. task_type

阶段 A：

```text
demo.image.mock
```

阶段 B：

```text
demo.image.prompt
```

阶段 C：

```text
demo.image.generate
```

## 7. asset_type

阶段 B：

```text
demo_image_prompt
```

阶段 C：

```text
demo_image
```

## 8. 页面设计

页面名称：

```text
批量生图压测 / Batch Image Demo
```

输入区：

- 任务名称
- 基础 prompt
- prompt 变量模板
- 生成数量
- 并发数
- Provider
- Model
- 图片尺寸
- 最大重试次数
- 阶段模式：mock / prompt / real image
- 是否保存缩略图
- 是否记录 model_runs

操作区：

- 创建批量任务
- 开始
- 暂停
- 恢复
- 取消
- 清空 Demo 结果
- 导出 JSON / CSV

统计区：

- 总数
- 排队中
- 运行中
- 成功
- 失败
- 取消
- 成功率
- 平均耗时
- 预计剩余
- 当前并发
- 熔断原因

列表区：

- sequence_no
- task_id
- 状态
- prompt 摘要
- 耗时
- 重试次数
- 错误
- 缩略图

图片墙：

- 只显示缩略图；
- 虚拟滚动或分页；
- 点击查看原图；
- 不把原图 base64 放入前端状态。

## 9. Rust Service

建议新增：

```text
BatchJobService
```

职责：

- create_batch_job
- enqueue_batch_tasks
- start_batch_job
- pause_batch_job
- resume_batch_job
- cancel_batch_job
- get_batch_job
- list_batch_jobs
- list_batch_job_tasks
- compute_batch_progress

BatchJobService 建立在 TaskService 之上，不替代 TaskService。

## 10. Tauri Commands

```text
create_batch_image_job
start_batch_job
pause_batch_job
resume_batch_job
cancel_batch_job
get_batch_job
list_batch_jobs
list_batch_job_tasks
list_batch_job_assets
```

前端调用必须经过项目既有 Frontend Service / callTauri 分层。

## 11. 事件

```text
batch-job-created
batch-job-status-changed
batch-job-progress
creative-task-status-changed
creative-task-event
asset-created
```

事件 payload 不传大图或大文本。

## 12. Python Worker

阶段 A 可以先由 Rust mock worker 或 Python stub worker 执行。

阶段 B/C 由 Python AI Engine 执行更合适。

流程：

```text
claim queued task
mark running
build prompt
call provider
save output
create asset
write model_run
write task_event
mark succeeded / failed / retrying
```

## 13. 并发策略

不要 1000 并发。使用：

```text
total_count = 1000
concurrency = 2~5 默认
```

真实生图默认建议：

```text
concurrency = 2
max_retries = 2
```

## 14. 熔断

触发暂停：

- 连续失败超过 20；
- provider 429 超过阈值；
- sidecar unhealthy；
- 磁盘空间不足；
- 用户点击暂停；
- 达到预算上限。

## 15. 验收标准

阶段 A：

- 能创建 1000 条 mock task；
- UI 不明显卡顿；
- 任务按 concurrency 执行；
- 可暂停/恢复/取消；
- 统计正确。

阶段 B：

- 能生成 1000 个 prompt asset；
- model_runs 有记录；
- 失败可重试；
- 不生成图片。

阶段 C：

- 能受控生成真实图片；
- 图片落盘；
- 缩略图显示；
- asset 入库；
- 失败不会卡死队列；
- 取消有效。

## 16. 不允许

- Vue 循环直接发 1000 个 provider 请求；
- Vue 直连 Python；
- 前端保存 1000 张原图 base64；
- 无并发上限；
- 无取消入口；
- 无预算；
- 直接真实 1000 生图作为第一版；
- 一上来引 Redis。
