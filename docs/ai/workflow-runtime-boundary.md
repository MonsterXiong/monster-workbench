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
- `src-tauri/src/services/worker_queue_service.rs` 已经有 SQLite-backed queue 的基础控制面：claim queued task、request cancel、cancel checkpoint、startup recovery。
- `src-tauri/src/services/batch_job_service.rs` 当前仍在 Rust 内运行 batch supervisor 与 batch worker 壳层。其中 `demo.image.mock` 仍是本地 smoke worker；`demo.image.prompt` 与 `demo.image.generate` worker 已改为提交 sidecar workflow，Rust 负责结果校验、取消后的状态映射、输出文件路径校验、asset/model_runs/task_events 写入和事件广播。Rust batch 控制面现在也接受 `image.prompt.batch` / `image.generate.batch` 作为正式 batch type 别名，并路由到同一组 worker。
- Sidecar request 已不再使用空 `budget` 占位：Rust 会提交 `maxDurationMs / maxImages / maxTokens / maxCostEstimate` 形态的预算对象，sidecar HTTP read timeout 和 Python provider timeout 会按该预算收敛。
- `TaskService::run_review_asset_quality_stub` 仍在 Rust 内生成 review result 和 revise draft task；这只能作为 stub，不应扩展成真实审查/返工/一致性规则。
- `batch_job_service.rs` 的 prompt/image worker 已不再直接每个任务独立 new/stop sidecar；生产路径会优先复用 Tauri app-managed `SidecarLifecycleService`，未注入 state 的测试/孤立调用才退回临时 sidecar。当前 batch 提交只在确保 sidecar endpoint 时持有 lifecycle 锁，实际 `/tasks` 长请求在锁外执行，避免 Rust lifecycle mutex 把 batch 并发槽位串行化。普通 `generate_image_prompt` Tauri command 也已切到同样的 endpoint-provider 模式，长请求不再持有 sidecar lifecycle mutex。
- `SidecarLifecycleService` 已具备首段 recovery circuit、graceful shutdown、恢复可观测字段、Tauri 生命周期事件和 `/events` polling 入口：`unhealthy/failed` 后会尝试受控恢复，恢复失败会打开短冷却窗口，冷却期间快速拒绝后续恢复请求；`SidecarStatusSnapshot` 会暴露 `recoveryFailureCount`、`lastRecoveryFailureAt` 和 `recoveryBackoffRemainingMs`；显式 stop 会先向 Python sidecar 发送受 token 保护的 `/shutdown`，短等待后再兜底 kill；`creative-sidecar-status-changed` 的 eventType 覆盖 `starting/health_ok/health_failed/recovery_failed/recovery_backoff_active/stopping/stopped/process_exited`，payload status 记录 `starting/running/unhealthy/failed/stopping/stopped` 等当前状态，同 status 重复事件有 1 秒节流；`poll_sidecar_runtime_events` 可读取带 runtime instance 边界的 Python workflow event buffer；设置诊断页已通过 `useSidecarStore` 只读消费该诊断流。这仍不等同于完整 worker-pool 熔断体系，也不代表 Python 可以写 `task_events`。

因此下一阶段不是直接让 Python 任意读写主库，也不是继续把新生产型 worker 分支写进 `BatchJobService`；重点应转向 Python sidecar `/events` 事件持久化策略、恢复/关闭事件记录和通用 workflow settle。

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
| batch sidecar lifecycle | 首段可保留 | batch worker 已优先复用 app-managed lifecycle，并已把 endpoint 获取和 HTTP task request 分离；当前已有 recovery backoff、graceful shutdown、恢复可观测字段和节流后的 Tauri 生命周期事件，下一步补 Python `/events` polling、事件持久化策略和受控 worker-pool API |

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

当前 `WorkerQueueService::check_cancel_checkpoint(task_id)` 已具备 Rust 侧查询能力；`generate_image_prompt`、`image.prompt.batch` 与 `image.generate.batch` 已通过 Rust 暴露的 localhost checkpoint 让 Python 在步骤边界查询取消状态，而不是让 Python 直接查询 SQLite。

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
5. batch prompt / image sidecar workflow 已接入 cancel checkpoint，并已具备基础 budget/timeout 协议；batch worker 已优先复用 app-managed sidecar lifecycle，且 batch `/tasks` 提交不再长时间持有 lifecycle mutex。当前已补首段 recovery circuit / backoff、graceful shutdown、恢复可观测字段与节流后的 Tauri 生命周期事件，下一步优先补 Python sidecar `/events` polling、恢复/关闭事件持久化策略和受控 worker-pool API；只有这些协议稳定后，再讨论 supervisor 是否从 Rust 迁到 Python worker pool。

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
| `run_batch_supervisor_inner` | 轮询 snapshot、按 concurrency claim queued task、spawn worker、判断 completed | 短期保留 | 首段 sidecar recovery circuit、graceful shutdown、恢复可观测字段与节流 Tauri 生命周期事件已有；但在 Python `/events` polling、持久化策略和受控 worker-pool API 稳定前，不迁给 Python worker pool |
| `run_mock_task_worker` | 本地 smoke worker、模拟耗时/失败/取消 | demo，本地验证可保留 | 只服务本地 smoke，不作为正式业务类型模板 |
| `run_prompt_task_worker` / `run_generate_task_worker` | 检查取消、构造 sidecar request、提交 Python workflow、交给 settle 归档 | 过渡 worker shell | 不新增生产 worker 分支；新增正式 workflow 走 sidecar runtime |
| `settle_batch_prompt_sidecar_response` / `settle_batch_image_sidecar_response` | 校验 protocol/taskId/status，写入 asset/model_runs/task_events/status | Rust 可信落库和审计面，保留 | protocol 校验、sidecar events、model_runs、普通 ready asset 与 batch failure/cancelled 状态映射已收口；image 文件 success settle 仍因路径授权和 thumbnail 生成保留在 batch 服务 |
| `validate_sidecar_output_file` / `copy_sidecar_thumbnail` | 校验 Python 输出文件仍在 Rust 授权目录内，并生成缩略图 | Rust 权限与文件边界，保留 | Python 不返回可直接信任的任意绝对路径 |
| Python sidecar `/events` | 已有内存 ring buffer、runtime instance 字段、Rust `poll_sidecar_runtime_events` 读取入口和 `sidecar-runtime.log` 摘要日志 | 过渡诊断流，继续保留 | 不替代 Rust settle 写入的 `task_events`；继续只写诊断摘要，不写 payload / 大对象 / 密钥 |
| `useSidecarStore` / 设置诊断页 | 只读展示 runtime instance、cursor 和最近事件 | 可保留 | 先 `get_sidecar_status`，只有 status 为 `running` 才 polling，避免打开诊断页主动启动 sidecar |
| `build_prompt_request` | Rust 侧替换 `{{sequenceNo}}` / `{{index}}` | demo-era prompt builder 残留 | 正式 batch prompt builder 放到 Python；Rust 只传 template/input/context |
| `build_provider_config` / `build_image_provider_config` | 把 batch payload 适配成 `AiProviderConfig` | 测试链路 DTO 语义残留 | 后续改向正式 workflow provider DTO，避免让 `AiProviderService` 测试语义回流到生产 runtime |
| `maybe_auto_pause_batch_after_failure` | 基于失败阈值自动暂停 batch | 控制面安全策略，可短期保留 | 不继续扩展成复杂业务失败策略；复杂策略进入 workflow runtime 或受控 policy 配置 |

### 12.3 当前推进顺序

1. UI / browser mock 的 prompt/generate batch type 提交值已切到 `image.prompt.batch` / `image.generate.batch`；旧 `demo.image.prompt/generate` 只作为历史兼容保留。
2. 共享 `SidecarLifecycleService` 已具备首段 recovery circuit / backoff、graceful shutdown、恢复可观测字段、节流后的 Tauri 生命周期事件、Python `/events` polling 入口、runtime instance 字段、设置诊断页只读消费和 `sidecar-runtime.log` 摘要持久化；继续补恢复/关闭事件记录或更正式的 Rust-owned diagnostics 表/导出策略。
3. 再抽象 Rust workflow submit/settle 公共路径，减少 `TaskService` 和 `BatchJobService` 内重复的 sidecar 状态映射；当前已先落地 sidecar 协议校验、事件落库、model_runs 持久化、普通 ready asset 创建和 batch failure/cancelled 状态映射 helper，下一步再评估 image success settle 或恢复/关闭诊断记录。
4. 最后才评估 supervisor 是否迁给 Python worker pool；迁移前必须先有受控 claim/checkpoint/complete API，不允许 Python 任意写主库。

### 12.4 当前边界结论

本次复核后，`TaskService` 与 `BatchJobService` 的升级方向按以下规则判断：

- 不因为 `TaskService` 同时包含 task / asset / event 方法就立即拆文件；当前更高风险是继续把真实 review/revision 规则写进 `run_review_asset_quality_stub`。
- 不把 `BatchJobService` 的 supervisor 立即迁给 Python；当前 Rust supervisor 仍是受控 claim、并发槽位、暂停/恢复/取消和最终状态落库的可信入口。
- 不再为新的正式 batch workflow 增加 Rust worker 分支；新增 workflow 应走统一 sidecar request/result 协议，Rust 只做控制、校验、授权路径和可信落库。
- `build_prompt_request` 与 `AiProviderConfig` 适配是当前最明确的 demo/test 语义残留；后续应先迁成 Python prompt builder 和正式 workflow provider DTO。
- `settle_sidecar_non_success`、`settle_batch_prompt_sidecar_response`、`settle_batch_image_sidecar_response` 代表同一类 Rust 可信 settle 逻辑；当前已先抽出 sidecar 协议校验、事件落库、model_runs 持久化、普通 ready asset 创建和 batch failure/cancelled 状态映射 helper，后续再评估 image success settle 或 Python `/events` polling，而不是把落库职责迁到 Python。
- `SidecarLifecycleService` 已有恢复冷却、受控 shutdown、恢复失败指标、节流后的 Tauri 生命周期事件、Python `/events` polling、runtime instance 字段、设置诊断页只读消费和 `sidecar-runtime.log` 摘要持久化，下一步不要急着上 Python worker pool；先补恢复/关闭记录、正式 diagnostics 表/导出策略或 Rust submit/settle 公共路径。

## 13. 不变量

- Vue 永远不知道 Python 端口和 token。
- Python 不拥有 Tauri capability，也不绕过 Rust 访问用户文件。
- Provider gateway 不保存业务状态。
- 所有 AI 调用必须形成 `model_runs` 审计记录。
- 资产生成不覆盖源资产，review / revision 通过关系或新资产表达。
- task status 与 task_events 必须由 Rust 可信写入或通过 Rust 受控 API 写入。
- 正式 workflow 不复用 `AiProviderService::test_provider` 作为生产执行语义；它可以继续作为 provider 测试链路存在。
