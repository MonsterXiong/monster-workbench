# v2 补充包索引

## 工程护栏补强

- task-state-machine.md
- database-migration-policy.md
- python-sidecar-packaging-strategy.md
- execution-budget-and-kill-switch.md
- model-provider-observability.md
- asset-versioning-and-provenance.md
- workflow-runtime-boundary.md
- security-threat-model.md

## Batch Image Demo

- docs/business/batch-image-demo-design.md
- docs/goals/goal_11_batch_image_demo_mock.md
- docs/goals/goal_12_batch_image_prompt_tasks.md
- docs/goals/goal_13_batch_image_real_generation.md

## 推荐先对 Codex 说

```text
请先阅读 AGENTS.md、docs/ai/v2-addon-index.md、docs/ai/task-state-machine.md、docs/ai/execution-budget-and-kill-switch.md、docs/business/batch-image-demo-design.md。

不要修改代码。请总结：
1. v2 补充包新增了哪些工程护栏；
2. Batch Image Demo 为什么要分 mock、prompt、real image 三阶段；
3. 这个 Demo 如何验证任务系统、队列、事件、资产入库和前端性能；
4. 下一步推荐执行哪个 Goal。
```
