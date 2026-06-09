# Goal 11：Batch Image Demo Mock 阶段

## Goal

实现批量生图 Demo 的第一阶段：创建 1000 条 mock image tasks，并用受控并发模拟执行，不调用真实模型。

## Background

该 Goal 用于验证任务系统、队列、事件、UI 性能和取消/暂停能力。不得直接开始真实生图。

必须遵守：

- AGENTS.md
- docs/ai/task-state-machine.md
- docs/ai/execution-budget-and-kill-switch.md
- docs/business/batch-image-demo-design.md

## Allowed Scope

- batch_jobs 表或最小数据模型
- BatchJobService
- TaskService 复用
- mock worker
- Tauri commands
- 前端测试页面
- 任务事件和统计

## Out of Scope

- 不调用真实模型
- 不生成真实图片
- 不引入 Redis
- 不引入远程 worker
- 不让 Vue 直连 Python
- 不大改现有 AI Provider 页面

## Requirements

1. 创建 batch_job。
2. 一次性批量写入 N 条 `demo.image.mock` creative_tasks。
3. 支持 total_count 默认 100，可输入 1000。
4. 支持 concurrency，默认 5。
5. mock worker 每个任务模拟 1~3 秒。
6. 支持暂停、恢复、取消。
7. 写入 task_events。
8. 前端展示统计。
9. 前端列表分页或虚拟滚动，避免卡顿。
10. 不传输大对象。

## Acceptance Criteria

- 可创建 1000 条 mock tasks。
- 同时 running 数不超过 concurrency。
- 暂停后不再领取新任务。
- 取消后 queued 任务变 cancelled。
- UI 统计正确。
- 现有 AI Provider 测试链路不受影响。


## Verification

```bash
npm run check:architecture
npm run typecheck
bash scripts/check_creative_boundaries.sh
bash scripts/check_batch_demo_boundaries.sh
```

涉及 Rust：

```bash
npx tauri build --no-bundle
```

## Report

完成后必须报告：

- 修改文件；
- 业务流；
- 状态流；
- 验证结果；
- 风险；
- 下一步建议。
