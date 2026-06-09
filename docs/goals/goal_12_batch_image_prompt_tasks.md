# Goal 12：Batch Image Demo Prompt 阶段

## Goal

在 Batch Image Demo 中实现 `demo.image.prompt` 阶段：批量生成 image prompt asset，但不真实生图。

## Background

必须先完成 Goal 11。该阶段用于验证 Provider 文本调用、model_runs、asset 入库和失败重试。

## Allowed Scope

- demo.image.prompt task type
- Python AI Engine 或现有 Provider 调用
- image_prompt asset 入库
- model_runs 记录
- 前端展示 prompt asset

## Out of Scope

- 不真实生图
- 不生成图片文件
- 不引入 Redis
- 不做复杂审查
- 不替换现有 Provider 测试链路

## Requirements

1. batch_job 可选择 mode = prompt。
2. 每个 task 根据 prompt_template 生成 prompt。
3. 结果保存为 asset_type = demo_image_prompt。
4. 记录 task_events。
5. 记录 model_runs。
6. 支持失败重试。
7. 支持暂停、取消。
8. UI 可查看 prompt 摘要。

## Acceptance Criteria

- 可生成 100 或 1000 个 prompt assets。
- model_runs 记录 provider/model/duration/status。
- 失败任务不会阻塞整个 batch。
- 现有 AI Provider 页面不受影响。


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
