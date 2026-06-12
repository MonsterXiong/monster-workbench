# Model Provider Observability：模型调用观测与审计

## 1. 目的

AI 创作系统必须记录每次模型调用，便于排查失败、优化成本和评估质量。

## 2. 建议表：model_runs

```text
id
project_id
task_id
asset_id
provider_id
provider_type
model
request_type
status
duration_ms
prompt_hash
prompt_version_id
input_token_count
output_token_count
cost_estimate
error_code
error_message
metadata_json
created_at
finished_at
```

request_type 示例：

```text
chat
image
image_generation
vision_review
embedding
rerank
```

当前代码中 batch prompt 使用 `chat`，batch real image 使用 `image`；`image_generation` 可作为后续更语义化命名，但引入前需要兼容已有数据。

## 3. 失败分类

```text
rate_limited
timeout
network_error
provider_error
invalid_request
content_rejected
empty_response
parse_error
unknown
```

## 4. 与 task_events 的关系

`task_events` 记录任务过程；`model_runs` 记录模型调用。一条 task 可以有多条 model_runs。

当前代码事实：

- `model_runs` 表由 `src-tauri/src/infra/creative_db_schema.rs` 创建。
- `src-tauri/src/infra/creative_model_run_repo.rs` 提供 create/list repo。
- `src-tauri/src/services/workflow_settle_service.rs::persist_sidecar_model_runs` 是当前 sidecar workflow 写入 `model_runs` 的公共入口。
- `TaskService::run_generate_image_prompt_workflow_after_task` 在 success 和 non-success settle 中都会持久化 sidecar 返回的 `modelRuns`。
- `BatchJobService` 的 prompt/image worker shell 在 success、failed、cancelled 等 settle 路径都会持久化 sidecar 返回的 `modelRuns`，并把 `modelRunIds` 写入 task result。
- `AiProviderService` / `ai_provider_tester.py` 仍是 AI Provider 工作台诊断链路，当前不写 `model_runs`；它使用内存队列任务、结果 DTO、日志/诊断能力和 `test_logs` 初始化链路，不代表正式 creative workflow 审计已经落库。

边界：

- 正式 creative workflow 的 provider 调用必须经 Rust trusted settle 写 `model_runs`。
- AI Provider 工作台的连接测试、聊天测试、生图测试可以继续作为诊断链路保留；如果未来把它们提升为正式任务或创作 workflow，必须补 `creative_tasks` / `model_runs` / `task_events` 归档。
- Python sidecar 只能返回 `modelRuns` 摘要；最终落库、task/asset 绑定和脱敏边界仍由 Rust 控制。

## 5. 脱敏要求

不得记录：

- API key
- token
- bearer
- authorization
- cookie
- 用户隐私路径
