# Task State Machine：创作任务状态机

## 1. 目的

持续型 AI 创作系统必须有统一任务状态机，避免不同 Agent、Rust Service、Python worker、Vue UI 对状态含义理解不一致。

## 2. 标准状态

```text
draft
queued
running
paused
cancelling
cancelled
succeeded
failed
retrying
blocked
```

## 3. 状态含义

| 状态 | 含义 |
|------|------|
| draft | 草稿状态，尚未入队 |
| queued | 已入队，等待 worker 消费 |
| running | 正在执行 |
| paused | 被用户或系统暂停 |
| cancelling | 正在请求取消，worker 需要检查 cancel token |
| cancelled | 已取消 |
| succeeded | 成功完成 |
| failed | 执行失败，且当前不再自动重试 |
| retrying | 等待重试，通常带 run_after |
| blocked | 被依赖、预算、人工审核或安全策略阻塞 |

## 4. 允许流转

```text
draft -> queued
queued -> running
queued -> paused
queued -> cancelled
running -> succeeded
running -> failed
running -> retrying
running -> cancelling
running -> blocked
cancelling -> cancelled
cancelling -> failed
paused -> queued
paused -> cancelled
failed -> retrying
failed -> blocked
retrying -> queued
retrying -> cancelled
blocked -> queued
blocked -> cancelled
blocked -> failed
```

## 5. 终态

终态包括：

```text
succeeded
failed
cancelled
```

终态任务不得继续执行。重跑或返工应创建新任务。

## 6. 中断恢复

应用或 sidecar 崩溃后，启动时建议：

```text
running -> retrying 或 failed
cancelling -> cancelled
retrying 且 run_after 到期 -> queued
```

文本 / prompt 任务可以自动重试；生图任务若已有输出文件，先检查 asset 是否存在。

## 7. task_events

每次状态变化必须写入 `task_events`：

```json
{
  "event_type": "status_changed",
  "message": "queued -> running",
  "payload_json": {
    "from": "queued",
    "to": "running",
    "reason": "worker_claimed"
  }
}
```
