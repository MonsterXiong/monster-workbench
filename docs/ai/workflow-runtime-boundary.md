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

- `src-tauri/src/services/sidecar_lifecycle_service.rs` 负责启动 `creative_health_server.py`、分配 localhost 端口、注入 runtime token、执行 `/health` 检查，并通过 `/tasks` 提交 `generate_image_prompt`、`image.prompt.batch` 与 `image.generate.batch` workflow。
- `src-tauri/sidecars/python/creative_health_server.py` 当前仍是最小 HTTP runtime：`GET /health`、`GET /events`、`POST /tasks`。其中 `generate_image_prompt` 已按本协议返回 `outputs / modelRuns / events / retry` 标准结果，`image.prompt.batch` 已能在 Python 侧调用 OpenAI-compatible `/chat/completions`，`image.generate.batch` 已能在 Python 侧调用 OpenAI-compatible `/images/generations`，并把图片保存到 Rust 授权的输出目录；Python 暂时仍接受旧 `demo.image.prompt/generate` taskType 作为兼容别名。`GET /events` 已从空 stub 升级为内存 ring buffer 查询，按 `after/limit` 返回 workflow events、`nextCursor`、`runtimeInstanceId` 和 `runtimeStartedAt`，但还不负责写主库。
- `src-tauri/src/services/worker_queue_service.rs` 已经有 SQLite-backed queue 的基础控制面：claim queued task、request cancel、cancel checkpoint、complete running task、startup recovery。
- `src-tauri/src/services/batch_job_service.rs` 当前仍在 Rust 内运行 batch supervisor 与 batch worker 壳层。其中 `demo.image.mock` 仍是本地 smoke worker；`demo.image.prompt` 与 `demo.image.generate` worker 已改为提交 sidecar workflow，Rust 负责结果校验、取消后的状态映射、输出文件路径校验、asset/model_runs/task_events 写入和事件广播。Rust batch 控制面现在也接受 `image.prompt.batch` / `image.generate.batch` 作为正式 batch type 别名，并路由到同一组 worker。
- Sidecar request 已不再使用空 `budget` 占位：Rust 会提交 `maxDurationMs / maxImages / maxTokens / maxCostEstimate` 形态的预算对象，sidecar HTTP read timeout 和 Python provider timeout 会按该预算收敛。
- `TaskService::run_review_asset_quality_stub` 仍在 Rust 内生成 review result 和 revise draft task；这只能作为 stub，不应扩展成真实审查/返工/一致性规则。
- `batch_job_service.rs` 的 prompt/image worker 已不再直接每个任务独立 new/stop sidecar；生产路径会优先复用 Tauri app-managed `SidecarLifecycleService`，未注入 state 的测试/孤立调用才退回临时 sidecar。当前 batch 提交只在确保 sidecar endpoint 时持有 lifecycle 锁，实际 `/tasks` 长请求在锁外执行，避免 Rust lifecycle mutex 把 batch 并发槽位串行化。普通 `generate_image_prompt` Tauri command 也已切到同样的 endpoint-provider 模式，长请求不再持有 sidecar lifecycle mutex。
- `SidecarLifecycleService` 已具备首段 recovery circuit、graceful shutdown、恢复可观测字段、Tauri 生命周期事件、生命周期诊断摘要和 `/events` polling 入口：`unhealthy/failed` 后会尝试受控恢复，恢复失败会打开短冷却窗口，冷却期间快速拒绝后续恢复请求；`SidecarStatusSnapshot` 会暴露 `recoveryFailureCount`、`lastRecoveryFailureAt` 和 `recoveryBackoffRemainingMs`；显式 stop 会先向 Python sidecar 发送受 token 保护的 `/shutdown`，短等待后再兜底 kill，并在 `stopped` message 中记录 `durationMs/shutdownRequested/killFallback` 摘要；`creative-sidecar-status-changed` 的 eventType 覆盖 `starting/health_ok/health_failed/recovery_failed/recovery_backoff_active/stopping/stopped/process_exited`，payload status 记录 `starting/running/unhealthy/failed/stopping/stopped` 等当前状态，同 status 重复事件有 1 秒节流；同源摘要会写入 `sidecar-lifecycle.log`；`poll_sidecar_runtime_events` 可读取带 runtime instance 边界的 Python workflow event buffer；设置诊断页已通过 `useSidecarStore` 只读消费该诊断流。这仍不等同于完整 worker-pool 熔断体系，也不代表 Python 可以写 `task_events`。

因此下一阶段不是直接让 Python 任意读写主库，也不是继续把新生产型 worker 分支写进 `BatchJobService`；batch provider DTO 与 prompt builder 已先后退出 Rust demo/test 语义，后续重点转向受控 worker-pool API、继续观察物理诊断日志是否足够，以及按需抽更稳定的 submit/settle 小 helper。

### 6.1 Python sidecar `/events` 持久化策略

`/events` 现在是 Python runtime 的内存诊断流，不是新的任务审计主通道。它和 `task_events` 的关系按以下规则处理：

| 事件来源 | 当前用途 | 是否进入 `task_events` | 说明 |
|---|---|---|---|
| `/tasks` 返回体里的 `events` | workflow result 的一部分 | 是，由 Rust settle 写入 | `append_sidecar_result_events` 已在 Rust 校验 `protocolVersion/taskId` 后落库，这是可信审计路径 |
| Python `/events` polling | sidecar runtime 诊断、UI 诊断面板、进度观察 | 默认否 | 当前 event id 只在 Python 进程内递增，重启后会重置；直接落 `task_events` 会与 settle 事件重复 |
| Tauri `creative-sidecar-status-changed` | Rust lifecycle 状态观察 | 默认否 | 当前是 UI/runtime 事件；如需跨会话审计，应由 Rust 明确写诊断记录 |

如果后续要持久化 `/events`，必须先补 Rust 受控策略：

- Python 仍只生产事件，不直接写主库。
- Rust 负责拉取、过滤、脱敏、限流、去重和选择落点。
- 只有能关联到已知 `creative_tasks.id`、且未通过 `/tasks` result settle 落过库的任务语义事件，才可由 Rust 转成 `task_events`。
- lifecycle、provider 细节、恢复/关闭耗时、runtime 异常等非任务审计信息，应进入 Rust 控制的诊断记录或物理日志，不混入 `task_events`。
- 持久化 payload 只能包含小型摘要、ID、状态、耗时、错误码等字段，不存 API key、完整 prompt、大文本、base64、大响应体或未授权文件路径。
- `/events` response 和 event 已携带 `runtimeInstanceId` / `runtimeStartedAt`；Rust 会把它们和 source event id 组合成诊断来源键，不能单独依赖 Python 进程内自增 `id`。
- 当前第一阶段持久化落点是 Rust-owned 物理日志 `sidecar-runtime.log`，由 `poll_sidecar_runtime_events` 在成功拉取后 best-effort 写入。日志行只包含 runtime/source id、taskId、workflowType、eventType、message 摘要，不写 payload；具体落盘仍经过 `LoggerInfra` 脱敏，并会被系统诊断导出收集。
- sidecar lifecycle 控制面事件的第一阶段持久化落点是 `sidecar-lifecycle.log`，由 `SidecarLifecycleService::emit_status_event` 同源写入。该日志继承状态事件节流规则，只记录 eventType、status、port、pid、recoveryFailureCount、backoff 和 message 摘要，并经过 `LoggerInfra` 脱敏。

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
| batch sidecar lifecycle | 首段可保留 | batch worker 已优先复用 app-managed lifecycle，并已把 endpoint 获取和 HTTP task request 分离；当前已有 recovery backoff、graceful shutdown、恢复可观测字段、节流后的 Tauri 生命周期事件、`sidecar-runtime.log` 和 `sidecar-lifecycle.log` 摘要日志；WorkerQueue Rust IPC 已有 claim/checkpoint/complete 首段，下一步再评估是否需要 localhost sidecar control API |

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

当前 `WorkerQueueService::check_cancel_checkpoint(task_id)` 已具备 Rust 侧查询能力，`WorkerQueueService::complete_task` 也已具备运行中任务的受控终态收敛能力；`generate_image_prompt`、`image.prompt.batch` 与 `image.generate.batch` 已通过 Rust 暴露的 localhost checkpoint 让 Python 在步骤边界查询取消状态，而不是让 Python 直接查询 SQLite。

最低要求：

- 每次 provider 调用前检查取消。
- 每个长循环或多图片生成步骤之间检查取消。
- 已进入不可中断 provider 请求时，完成当前请求后必须再次检查取消，再决定是否落库。
- 取消后的部分输出不得覆盖源资产；如需保留，必须作为 draft / partial asset 并标记来源。

## 11. 批量任务迁移边界

`BatchJobService` 的下一步不应继续增加新的生产 worker 分支。推荐迁移顺序：

1. 保留 `demo.image.mock` 作为 Rust 本地 smoke worker。
2. `demo.image.prompt` batch job 的 provider 调用已从 Rust worker 迁到 Python `image.prompt.batch` workflow；Rust 仍负责 claim、running、结果落库和 batch progress event。
3. `demo.image.generate` batch job 的 provider 调用和图片处理已从 Rust worker 迁到 Python `image.generate.batch` workflow；Rust 负责校验输出文件路径、创建 asset、复制 thumbnail、写 `model_runs`。
4. 新增正式 batch 类型时不要继续扩展 `demo.image.*` 命名；sidecar 协议层已先使用 `image.prompt.batch` / `image.generate.batch`，Rust batch 控制面也已接受同名 batch type 别名；UI / browser mock 当前也已把 prompt/generate 提交值切到正式命名，并保留旧值兼容。
5. batch prompt / image sidecar workflow 已接入 cancel checkpoint，并已具备基础 budget/timeout 协议；batch worker 已优先复用 app-managed sidecar lifecycle，且 batch `/tasks` 提交不再长时间持有 lifecycle mutex。当前已补首段 recovery circuit / backoff、graceful shutdown、恢复可观测字段、节流后的 Tauri 生命周期事件、Python `/events` polling、`sidecar-runtime.log` 与 `sidecar-lifecycle.log` 摘要持久化，且 provider DTO / prompt builder 已退出 Rust demo/test 语义；下一步先设计受控 worker-pool API，只有这些协议稳定后，再讨论 supervisor 是否从 Rust 迁到 Python worker pool。

## 12. Rust 服务代码级边界清单

本节用于评估 `src-tauri/src/services/task_service.rs` 与 `src-tauri/src/services/batch_job_service.rs` 是否继续扩张。后续改动优先按这里判断，而不是只按文件名判断。

### 12.1 `TaskService`

| 函数 / 区域 | 当前职责 | 边界判定 | 后续约束 |
|---|---|---|---|
| `create_creative_task` / `update_creative_task_status` / `append_task_event` | 校验输入、调用 repo、发 Tauri event | Rust 控制面，保留 | 继续保持薄状态入口，不写业务 prompt/review 规则 |
| asset / asset_link 读写方法 | 通过 `creative_asset_repo` 写入资产和关系 | 短期可保留 | 不因为文件名不理想而优先拆；等资产版本、来源、权限模型稳定后再拆 `AssetService` |
| `run_generate_image_prompt_workflow` | 创建 task、启动 cancel checkpoint、提交 sidecar、校验 result、写 asset/model_runs/events/status | 合理的过渡 workflow 入口 | 已通过 endpoint-provider 模式释放 sidecar lifecycle 长锁；后续继续抽象通用 workflow submit/settle，不为每个正式 workflow 手写一套 Rust 编排 |
| `settle_sidecar_non_success` / `resolve_sidecar_failure_status` | 把 sidecar 非成功结果映射为受控 task 状态 | Rust 可信状态面，保留 | 只处理协议状态和 retry budget，不嵌入业务判断 |
| `run_review_asset_quality_stub` / `build_review_result` | Rust 内生成 review result 和 revise draft task | demo/stub，冻结 | 不继续扩展真实审查、返工、一致性规则；正式 review/revision 迁入 Python workflow runtime |

### 12.2 `BatchJobService`

| 函数 / 区域 | 当前职责 | 边界判定 | 后续约束 |
|---|---|---|---|
| `create_batch_image_job` / `start_batch_job` / `pause_batch_job` / `resume_batch_job` / `cancel_batch_job` | batch 生命周期、任务创建、暂停/恢复/取消、事件广播 | Rust 控制面，保留 | 保持为状态控制，不下沉 provider 或业务 workflow 逻辑 |
| `run_batch_supervisor_inner` | 轮询 snapshot、按 concurrency claim queued task、spawn worker、判断 completed | 短期保留 | sidecar recovery、runtime events polling 与诊断日志已有；但缺 worker identity、claim token、lease deadline、heartbeat 和 lease-aware complete，在这些稳定前不迁给 Python worker pool |
| `run_mock_task_worker` | 本地 smoke worker、模拟耗时/失败/取消 | demo，本地验证可保留 | 只服务本地 smoke，不作为正式业务类型模板 |
| `run_prompt_task_worker` / `run_generate_task_worker` | 检查取消、构造 sidecar request、提交 Python workflow、交给 settle 归档 | 过渡 worker shell | 不新增生产 worker 分支；新增正式 workflow 走 sidecar runtime |
| `settle_batch_prompt_sidecar_response` / `settle_batch_image_sidecar_response` | 校验 protocol/taskId/status，写入 asset/model_runs/task_events/status | Rust 可信落库和审计面，保留 | protocol 校验、sidecar events、model_runs、普通 ready asset 与 batch failure/cancelled 状态映射已收口；image 文件 success settle 仍因路径授权和 thumbnail 生成保留在 batch 服务 |
| `validate_sidecar_output_file` / `copy_sidecar_thumbnail` | 校验 Python 输出文件仍在 Rust 授权目录内，并生成缩略图 | Rust 权限与文件边界，保留 | Python 不返回可直接信任的任意绝对路径 |
| Python sidecar `/events` | 已有内存 ring buffer、runtime instance 字段、Rust `poll_sidecar_runtime_events` 读取入口和 `sidecar-runtime.log` 摘要日志 | 过渡诊断流，继续保留 | 不替代 Rust settle 写入的 `task_events`；继续只写诊断摘要，不写 payload / 大对象 / 密钥 |
| sidecar lifecycle diagnostics | 已有 `creative-sidecar-status-changed` Tauri event 和 `sidecar-lifecycle.log` 摘要日志 | 控制面诊断，继续保留 | 不新增 DB 表；同源节流、脱敏、随系统诊断导出收集 |
| `useSidecarStore` / 设置诊断页 | 只读展示 runtime instance、cursor 和最近事件 | 可保留 | 先 `get_sidecar_status`，只有 status 为 `running` 才 polling，避免打开诊断页主动启动 sidecar |
| `read_batch_prompt_template` / Python `build_batch_prompt_request` | Rust 只读取 template；Python 侧替换 `{{sequenceNo}}` / `{{index}}` 并回传 `promptRequest/promptHash` | 已退出 Rust demo-era prompt builder | 保持 prompt builder 在 Python workflow；Rust 继续只做 request 适配、协议校验和可信落库 |
| `build_workflow_provider_config` / `BatchWorkflowProviderConfig` | 把 batch payload 适配成 sidecar workflow provider 配置 | 已退出 `AiProviderConfig` 测试语义 | 保持为 Rust request 适配层；后续如 provider 协议继续扩展，优先靠近 sidecar workflow DTO |
| `maybe_auto_pause_batch_after_failure` | 基于失败阈值自动暂停 batch | 控制面安全策略，可短期保留 | 不继续扩展成复杂业务失败策略；复杂策略进入 workflow runtime 或受控 policy 配置 |

### 12.3 当前推进顺序

1. UI / browser mock 的 prompt/generate batch type 提交值已切到 `image.prompt.batch` / `image.generate.batch`；旧 `demo.image.prompt/generate` 只作为历史兼容保留。
2. 共享 `SidecarLifecycleService` 已具备首段 recovery circuit / backoff、graceful shutdown、恢复可观测字段、节流后的 Tauri 生命周期事件、`sidecar-lifecycle.log` 摘要持久化、Python `/events` polling 入口、runtime instance 字段、设置诊断页只读消费和 `sidecar-runtime.log` 摘要持久化；继续观察物理日志是否足够，必要时再设计正式 Rust-owned diagnostics 表/导出策略。
3. 再抽象 Rust workflow submit/settle 公共路径，减少 `TaskService` 和 `BatchJobService` 内重复的 sidecar 状态映射；当前已先落地 sidecar 协议校验、事件落库、model_runs 持久化、普通 ready asset 创建和 batch failure/cancelled 状态映射 helper，下一步再评估 image success settle。
4. 最后才评估 supervisor 是否迁给 Python worker pool；当前已有 Rust IPC 形态的 claim/checkpoint/complete/recover 首段，`complete_creative_task` 与 `recover_interrupted_creative_tasks` 也已注册为 Tauri command，但它们没有 runtime token、lease 校验和 sidecar HTTP 暴露，不能直接当作 Python worker-pool API。迁移前还需要明确 localhost sidecar control API、鉴权、租约/心跳和结果入库协议，不允许 Python 任意写主库。

### 12.4 当前边界结论

本次复核后，`TaskService` 与 `BatchJobService` 的升级方向按以下规则判断：

- 不因为 `TaskService` 同时包含 task / asset / event 方法就立即拆文件；当前更高风险是继续把真实 review/revision 规则写进 `run_review_asset_quality_stub`。
- 不把 `BatchJobService` 的 supervisor 立即迁给 Python；当前 Rust supervisor 仍是受控 claim、并发槽位、暂停/恢复/取消和最终状态落库的可信入口。
- 不再为新的正式 batch workflow 增加 Rust worker 分支；新增 workflow 应走统一 sidecar request/result 协议，Rust 只做控制、校验、授权路径和可信落库。
- `build_prompt_request` 已替换为 Rust 侧 `read_batch_prompt_template` + Python 侧 `build_batch_prompt_request`；`AiProviderConfig` 适配也已收口为 `BatchWorkflowProviderConfig`；WorkerQueue 已补 Rust IPC `complete_creative_task` 首段，当前剩余重点是 localhost sidecar control API、租约/心跳和稳定 submit/settle 边界。
- `settle_sidecar_non_success`、`settle_batch_prompt_sidecar_response`、`settle_batch_image_sidecar_response` 代表同一类 Rust 可信 settle 逻辑；当前已先抽出 sidecar 协议校验、事件落库、model_runs 持久化、普通 ready asset 创建和 batch failure/cancelled 状态映射 helper，后续再评估 image success settle 或 Python `/events` polling，而不是把落库职责迁到 Python。
- `SidecarLifecycleService` 已有恢复冷却、受控 shutdown、恢复失败指标、节流后的 Tauri 生命周期事件、`sidecar-lifecycle.log` 摘要持久化、Python `/events` polling、runtime instance 字段、设置诊断页只读消费和 `sidecar-runtime.log` 摘要持久化，下一步不要急着上 Python worker pool；先观察物理诊断日志是否足够，再评估正式 diagnostics 表/导出策略或 Rust submit/settle 公共路径。

### 12.5 2026-06-12 再评估：编排边界排序

本轮再次对照 `task_service.rs`、`batch_job_service.rs` 和 `workflow_settle_service.rs` 后，边界排序调整如下：

1. `TaskService::run_generate_image_prompt_workflow_after_task` 仍是合理过渡入口：Rust 创建 task、启动 cancel checkpoint、拿 endpoint、提交 sidecar、校验协议并写入 asset/model_runs/task_events/status；真实 prompt 生成逻辑不回到 Rust。
2. `BatchJobService::run_batch_supervisor_inner` 仍短期保留：它负责 snapshot 轮询、concurrency slot、claim queued task、暂停/取消收敛和最终 completed 判定；在受控 worker-pool API 成型前，不迁给 Python 直接拉队列。
3. `run_prompt_task_worker` / `run_generate_task_worker` 是过渡 worker shell：可以继续负责取消检查、checkpoint server、sidecar submit 和 settle 分派，但不再新增正式业务 worker 分支。
4. `handle_batch_worker_failure_with_model_runs` 与 `handle_batch_worker_cancelled` 已收口 prompt/image 的失败、重试和取消状态；这类 Rust 可信状态 helper 保留。
5. `settle_batch_image_sidecar_response` 的 success 分支暂不强抽：它仍包含授权输出目录校验、thumbnail 生成、image-specific metadata 和 asset 创建；后续最多抽小型 result/status helper，不能把路径信任交给 Python。
6. `build_prompt_request` 已退出 Rust；batch sidecar request 现在传 `promptTemplate`，Python workflow 负责生成 `promptRequest` 并回传 `promptHash`。`build_provider_config` / `build_image_provider_config` 已收口为 `build_workflow_provider_config` / `BatchWorkflowProviderConfig`，不再依赖 `AiProviderConfig` 测试 DTO；`WorkerQueueService::complete_task` 已补齐 Rust IPC complete 首段，下一步优先设计 localhost sidecar control API 与租约/心跳。

### 12.6 Worker-pool 控制协议前置条件

`WorkerQueueService::claim_next_task`、`check_cancel_checkpoint`、`complete_task` 和 `recover_interrupted_tasks` 已形成 Rust IPC/service 的首段闭环，但这还不是 Python worker pool 可以直接接管 `BatchJobService` supervisor 的条件。

当前缺口：

| 缺口 | 当前代码事实 | 迁移前要求 |
|---|---|---|
| worker identity | `CreativeTask` / `creative_tasks` 没有 worker id 字段 | claim 后必须能识别任务当前归属的 runtime / worker |
| lease / claim token | `claim_next_queued_task` 只把 queued 改 running | claim 必须产生 leaseId 或 claimToken，complete 时校验同一 token |
| heartbeat | 当前没有续约字段或 API | Python worker 长任务必须定期续约，Rust 能回收过期 lease |
| result settle | `complete_creative_task` 只能写 status/result/asset_id；batch prompt/image settle 仍在 Rust 内校验 sidecar result | 正式 workflow result 仍要经过 Rust 校验 outputs/modelRuns/events/授权文件路径 |
| recovery | `recover_interrupted_tasks` 基于 running/cancelling 状态兜底 | worker-pool 模式需要区分过期 lease、进程退出、runtime 重启和主动取消 |

推荐下一步仍是 Rust-owned localhost sidecar control API，而不是 Python 直接访问 SQLite：

```text
Python worker
  -> localhost control API with runtime token
  -> Rust WorkerQueueService / settle helpers
  -> creative_task_repo / asset_repo / model_run_repo / task_events
```

注意：这里的 localhost control API 不是当前前端可调用的 Tauri command。Python sidecar 不应通过前端 IPC 路径补齐 worker-pool 能力，而应走 Rust 暴露、带 runtime token 和 lease 校验的本地控制面。

该 control API 的最小集合应先设计为：

| API | 目的 | Rust 可信职责 |
|---|---|---|
| `claim` | 获取可执行任务并生成 lease | 状态从 queued 到 running，写 worker identity / lease / started_at |
| `checkpoint` | 查询取消或暂停 | 只暴露布尔或受控原因，不暴露 DB |
| `heartbeat` | 续约 running task | 校验 worker identity 和 lease，刷新 lease deadline |
| `complete` | 收敛终态 | 校验 lease 未过期，执行 result settle，写 task_events/model_runs/assets/status |

在这些协议和必要 schema migration 稳定前，`BatchJobService::run_batch_supervisor_inner` 继续保留在 Rust；`run_prompt_task_worker` / `run_generate_task_worker` 也继续作为过渡 shell，只负责提交 Python workflow 与 Rust settle，不新增正式业务 worker 分支。

### 12.7 2026-06-12 继续评估：迁移门禁

本轮继续对照 `task_service.rs`、`batch_job_service.rs`、`worker_queue_service.rs`、`creative_task_repo.rs` 与 `workflow_settle_service.rs` 后，迁移门禁按“能保留、可抽象、不可迁移”三类执行：

| 类别 | 当前代码事实 | 结论 |
|---|---|---|
| Rust 必须保留 | `creative_task_repo::claim_next_queued_task` 仍只是事务内选择 queued task 并更新为 running；`WorkerQueueCompleteTaskInput` 只有 `taskId/status/resultJson/errorMessage/assetId` | 这只能作为 Rust 内受控收敛入口，不能作为 Python worker-pool 的最终 claim/complete 协议 |
| Rust 必须保留 | `settle_batch_image_sidecar_response` success 分支仍校验输出文件 canonical path、复制 thumbnail、创建 image asset、绑定 model_runs 并写 task status/event | image success settle 暂不迁 Python，也不应强抽成脱离权限上下文的通用 helper |
| Rust 可继续抽象 | `workflow_settle_service.rs` 已承接 protocol/taskId 校验、sidecar events、model_runs、普通 ready asset 创建 | 后续可继续抽 submit/settle 公共骨架，但必须保持 Rust 写库和路径授权 |
| 过渡壳层可保留 | `run_prompt_task_worker` / `run_generate_task_worker` 只做 checkpoint、sidecar submit、transport fallback 和 settle 分派 | 不新增正式生产 worker 分支；新增 workflow 继续走 sidecar request/result |
| 不能提前迁移 | `BatchJobService::run_batch_supervisor_inner` 仍负责 concurrency slot、claim、暂停/取消/完成收敛 | 没有 worker identity、lease、heartbeat、lease-aware complete 前，不让 Python 直接拉队列或拥有 batch supervisor |

因此下一步不是继续移动函数位置，而是先设计最小控制协议和 schema：

1. `creative_tasks` 增加 worker ownership / lease 支撑字段前，继续把任务拥有权留在 Rust supervisor。
2. localhost sidecar control API 必须先定义 `claim -> checkpoint -> heartbeat -> complete`，并复用 runtime token 或等价鉴权。
3. `complete` 必须校验 worker identity、lease token 和 lease deadline，再进入 Rust settle helper；不能复用当前 Tauri IPC `complete_creative_task` 作为 Python worker 协议。
4. Python workflow 只返回受控结果摘要、modelRuns、events 和授权输出目录内的文件引用；asset、model_runs、task_events、task status 仍由 Rust 可信写入。
5. 在 control API 和 migration 通过旧库兼容回归前，`BatchJobService` 的 supervisor / worker shell 只做收窄和复用，不做所有权迁移。

## 13. 不变量

- Vue 永远不知道 Python 端口和 token。
- Python 不拥有 Tauri capability，也不绕过 Rust 访问用户文件。
- Provider gateway 不保存业务状态。
- 所有 AI 调用必须形成 `model_runs` 审计记录。
- 资产生成不覆盖源资产，review / revision 通过关系或新资产表达。
- task status 与 task_events 必须由 Rust 可信写入或通过 Rust 受控 API 写入。
- 正式 workflow 不复用 `AiProviderService::test_provider` 作为生产执行语义；它可以继续作为 provider 测试链路存在。
