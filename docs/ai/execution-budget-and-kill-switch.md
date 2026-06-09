# Execution Budget and Kill Switch：执行预算与熔断

## 1. 目的

持续生成、多 Agent、批量生图必须有预算和熔断，否则会出现请求刷爆、成本失控、任务堆积和 UI 卡顿。

## 2. 必备预算项

每个 Goal / Batch Job / Workflow 应支持：

```text
max_tasks
max_running_tasks
max_retries
max_revision_rounds
max_images
max_tokens
max_cost_estimate
max_duration_seconds
max_consecutive_failures
```

## 3. Kill Switch

系统必须提供：

```text
pause_goal
cancel_goal
cancel_batch_job
stop_all_running_tasks
disable_auto_revision
disable_new_task_creation
```

## 4. 熔断条件

```text
连续失败超过阈值
provider 429 过多
磁盘空间不足
sidecar unhealthy
用户点击暂停
达到预算上限
审查连续不通过
取消请求超时
```

## 5. 状态处理

预算耗尽时建议：

```text
queued -> blocked
running -> cancelling 或继续完成
goal/batch_job -> paused 或 blocked
```

## 6. UI 必须展示

- 已生成数量；
- 失败数量；
- 剩余预算；
- 当前并发；
- 暂停/取消入口；
- 熔断原因。
