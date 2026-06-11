# Workflow Runtime Boundary：AI 工作流运行时边界

## 1. Vue

Vue 负责展示任务、创建用户请求、展示进度、展示资产、人工审核、暂停/取消按钮。

Vue 不负责 workflow 编排、复杂状态机、retry 策略、直接模型调用、直接 Python 通信。

## 2. Rust

Rust 是控制面，负责：

- Tauri commands；
- 权限；
- SQLite 主库；
- TaskService；
- AssetService；
- EventBridge；
- SidecarLifecycleService；
- 文件路径授权；
- 取消和暂停入口；
- 写入可信状态。

Rust 不负责具体小说生成逻辑、prompt 构建、审查推理、多 Agent 推理。

## 3. Python AI Engine

Python 是执行面，负责：

- workflow runtime；
- worker pool；
- provider client；
- prompt builder；
- context builder；
- review agent；
- revision agent；
- consistency agent；
- image processing。

Python 不负责桌面权限、UI 状态、Tauri capability、文件写入越权。

## 4. Provider Gateway

sub2api/cockpit 只负责模型中转，不负责业务流程。

## 5. 正确模式

```text
Vue -> Frontend Service -> Rust TaskService -> Python Workflow -> Rust/DB/AssetService -> Vue Event
```

错误模式：

```text
Vue -> Python
Python -> 任意改主库
Rust -> 写 prompt 业务
Provider Gateway -> 管业务状态
```

## 6. 当前代码事实

截至 2026-06-11，当前实现仍是过渡态，但 batch prompt / image 的 provider 执行已经从 Rust worker 迁到 Python sidecar workflow：

- `src-tauri/src/services/sidecar_lifecycle_service.rs` 负责启动 `creative_health_server.py`、分配 localhost 端口、注入 runtime token、执行 `/health` 检查，并通过 `/tasks` 提交 `generate_image_prompt`、`demo.image.prompt` 与 `demo.image.generate` workflow。
- `src-tauri/sidecars/python/creative_health_server.py` 当前仍是最小 HTTP runtime：`GET /health`、`GET /events`、`POST /tasks`。其中 `generate_image_prompt` 已按本协议返回 `outputs / modelRuns / events / retry` 标准结果，`demo.image.prompt` 已能在 Python 侧调用 OpenAI-compatible `/chat/completions`，`demo.image.generate` 已能在 Python 侧调用 OpenAI-compatible `/images/generations`，并把图片保存到 Rust 授权的输出目录。
- `src-tauri/src/services/worker_queue_service.rs` 已经有 SQLite-backed queue 的基础控制面：claim queued task、request cancel、cancel checkpoint、startup recovery。
- `src-tauri/src/services/batch_job_service.rs` 当前仍在 Rust 内运行 batch supervisor 与 `demo.image.mock / demo.image.prompt / demo.image.generate` worker 壳层。其中 `demo.image.mock` 仍是本地 smoke worker；`demo.image.prompt` 与 `demo.image.generate` worker 已改为提交 sidecar workflow，Rust 负责结果校验、取消后的状态映射、输出文件路径校验、asset/model_runs/task_events 写入和事件广播。
- Sidecar request 已不再使用空 `budget` 占位：Rust 会提交 `maxDurationMs / maxImages / maxTokens / maxCostEstimate` 形态的预算对象，sidecar HTTP read timeout 和 Python provider timeout 会按该预算收敛。
- `TaskService::run_review_asset_quality_stub` 仍在 Rust 内生成 review result 和 revise draft task；这只能作为 stub，不应扩展成真实审查/返工/一致性规则。
- `batch_job_service.rs` 当前每个 prompt/image worker 会新建 `SidecarLifecycleService` 并在任务结束后停止 dev health server；这属于过渡期 per-task sidecar 策略，不应直接视为正式生命周期模型。

因此下一阶段不是直接让 Python 任意读写主库，也不是继续把新生产型 worker 分支写进 `BatchJobService`；重点应转向 sidecar runtime 正式化、生命周期复用和正式 workflow 类型命名。

## 7. 推荐迁移模式：Rust 主动提交，Python 执行业务

短期采用以下模式：

```text
Vue
  -> creative-batch.service.ts / creative-task.service.ts
  -> Rust Command
  -> Rust Service creates or claims task
  -> Rust updates task to running and emits event
  -> Rust SidecarLifecycleService POST /tasks
  -> Python executes workflow/provider/review/image logic
  -> Python returns structured result
  -> Rust validates result and writes task/assets/model_runs/events
  -> Rust emits task/batch events
```

这个模式保留 Rust 控制面，同时让 Python 承担真实 workflow 执行。它比“Python 直接拉 SQLite 队列并写库”更适合当前阶段，因为现有权限、路径、event bridge、repo 写入和 audit 入口都在 Rust。

当前 Rust 编排边界判定：

| 职责 | Rust 当前是否可保留 | 说明 |
|---|---|---|
| task / batch 最小状态机 | 是 | queued、running、cancelling、cancelled、succeeded、failed、paused、completed 等可信状态仍由 Rust/repo 写入 |
| asset / model_runs / task_events 最终写入 | 是 | 这是审计、路径安全和 UI 事件桥的共同边界 |
| sidecar task request/result 协议校验 | 是 | Rust 必须校验 `protocolVersion`、`taskId`、`status`、授权路径和结果摘要 |
| batch supervisor / concurrency slots | 短期是 | 在正式 worker pool、恢复协议、熔断和生命周期复用稳定前，先由 Rust 保留 |
| prompt builder / review / revision / consistency | 否 | 正式业务逻辑应进入 Python workflow runtime |
| provider 调用和图片处理 | 否 | prompt/image provider 执行已经迁到 Python；后续不要回流到 Rust worker |
| per-task sidecar 启停 | 仅过渡可接受 | 当前可用于验证，但下一步应升级为可复用 lifecycle、健康检查和熔断策略 |

中期才评估 Python 拉队列模式：

```text
Python worker -> Rust IPC/localhost control API -> claim/checkpoint/complete
```

不建议让 Python 直接任意写 `monster_workbench.db`。如果未来确实需要 Python 写库，也必须先定义受限仓储协议、迁移策略、锁策略和审计边界。

## 8. Sidecar Task Request 草案

Rust 提交给 Python 的请求建议统一为：

```json
{
  "protocolVersion": 1,
  "taskId": 123,
  "projectId": "project-a",
  "taskType": "generate_image_prompt",
  "workflowType": "image_prompt",
  "attempt": 1,
  "maxRetries": 2,
  "cancelToken": "task-123",
  "budget": {
    "maxDurationSeconds": 120,
    "maxImages": 1,
    "maxTokens": 4000,
    "maxCostEstimate": 0.2
  },
  "provider": {
    "providerId": "local-test",
    "providerType": "openai-compatible",
    "baseUrl": "http://127.0.0.1:3000/v1",
    "model": "gpt-4.1-mini",
    "requestType": "chat"
  },
  "input": {
    "brief": "visual direction",
    "style": "cinematic",
    "mood": "focused"
  },
  "context": {
    "sourceAssetIds": [1, 2],
    "parentTaskId": null,
    "batchJobId": null,
    "goalId": null
  }
}
```

约束：

- `taskId` 必须来自 Rust 已落库的 `creative_tasks`。
- `provider.apiKey` 不应落入 task payload、task_events 或普通日志；密钥由 Rust 按需注入 Python 进程请求，并在日志脱敏。
- `budget` 来自 Goal / Batch / Workflow / Provider 配置，由 Rust 负责最终熔断；Python 只按协议执行局部 timeout / token / image 数等约束。
- `context` 只传 ID 和必要摘要；大图、大文本、完整资产内容按需通过 Rust 授权路径或后续受限读取协议获取。

## 9. Sidecar Task Result 草案

Python 返回给 Rust 的结果建议统一为：

```json
{
  "protocolVersion": 1,
  "taskId": 123,
  "status": "succeeded",
  "message": "workflow completed",
  "outputs": [
    {
      "assetType": "image_prompt",
      "title": "Generated image prompt",
      "content": "prompt text",
      "filePath": null,
      "thumbnailPath": null,
      "metadata": {
        "workflowType": "image_prompt",
        "source": "python-workflow"
      }
    }
  ],
  "modelRuns": [
    {
      "providerId": "local-test",
      "providerType": "openai-compatible",
      "model": "gpt-4.1-mini",
      "requestType": "chat",
      "status": "succeeded",
      "durationMs": 1200,
      "promptHash": "hash",
      "promptVersionId": "workflow:123:1",
      "inputTokenCount": 100,
      "outputTokenCount": 200,
      "costEstimate": 0.01,
      "errorCode": null,
      "errorMessage": null,
      "metadata": {}
    }
  ],
  "events": [
    {
      "eventType": "workflow_step_completed",
      "message": "prompt built",
      "payload": {}
    }
  ],
  "retry": {
    "shouldRetry": false,
    "reason": null
  }
}
```

Rust 收到结果后必须：

- 校验 `taskId` 与当前 running task 一致。
- 校验 `status` 只允许进入 `succeeded`、`failed`、`blocked`、`cancelled` 或 `retrying` 的受控分支。
- 使用 repo 写入 `assets`、`model_runs`、`task_events` 和最终 `creative_tasks` 状态。
- 事件 payload 只写摘要、ID、状态和小型 metadata；大对象只写 file path / thumbnail path / asset id。
- 不信任 Python 返回的绝对路径；涉及文件路径时必须经过 Rust 授权目录或复制/校验流程。

## 10. 取消与 Checkpoint

取消入口仍由 Rust 暴露：

```text
Vue -> Rust request_cancel -> task status: running -> cancelling
```

Python 执行长任务时必须支持 checkpoint：

```text
Python step boundary
  -> Rust cancel checkpoint API
  -> if cancelling/cancelled: stop provider calls or stop next step
  -> return status cancelled
```

当前 `WorkerQueueService::check_cancel_checkpoint(task_id)` 已具备 Rust 侧查询能力；`generate_image_prompt`、`demo.image.prompt` 与 `demo.image.generate` 已通过 Rust 暴露的 localhost checkpoint 让 Python 在步骤边界查询取消状态，而不是让 Python 直接查询 SQLite。

最低要求：

- 每次 provider 调用前检查取消。
- 每个长循环或多图片生成步骤之间检查取消。
- 已进入不可中断 provider 请求时，完成当前请求后必须再次检查取消，再决定是否落库。
- 取消后的部分输出不得覆盖源资产；如需保留，必须作为 draft / partial asset 并标记来源。

## 11. 批量任务迁移边界

`BatchJobService` 的下一步不应继续增加新的生产 worker 分支。推荐迁移顺序：

1. 保留 `demo.image.mock` 作为 Rust 本地 smoke worker。
2. `demo.image.prompt` 的 provider 调用已从 Rust worker 迁到 Python workflow；Rust 仍负责 claim、running、结果落库和 batch progress event。
3. `demo.image.generate` 的 provider 调用和图片处理已从 Rust worker 迁到 Python workflow；Rust 负责校验输出文件路径、创建 asset、复制 thumbnail、写 `model_runs`。
4. 新增正式 batch 类型时不要继续使用 `demo.image.*` 命名；应使用业务语义，例如 `image.prompt.batch`、`image.generate.batch` 或后续领域命名。
5. batch prompt / image sidecar workflow 已接入 cancel checkpoint，并已具备基础 budget/timeout 协议；下一步优先补 sidecar lifecycle 复用。只有在这些协议稳定后，再讨论 supervisor 是否从 Rust 迁到 Python worker pool。

## 12. 不变量

- Vue 永远不知道 Python 端口和 token。
- Python 不拥有 Tauri capability，也不绕过 Rust 访问用户文件。
- Provider gateway 不保存业务状态。
- 所有 AI 调用必须形成 `model_runs` 审计记录。
- 资产生成不覆盖源资产，review / revision 通过关系或新资产表达。
- task status 与 task_events 必须由 Rust 可信写入或通过 Rust 受控 API 写入。
- 正式 workflow 不复用 `AiProviderService::test_provider` 作为生产执行语义；它可以继续作为 provider 测试链路存在。
