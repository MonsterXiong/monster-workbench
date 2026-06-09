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
image_generation
vision_review
embedding
rerank
```

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

## 5. 脱敏要求

不得记录：

- API key
- token
- bearer
- authorization
- cookie
- 用户隐私路径
