# Goal 13：Batch Image Demo 真实生图阶段

## Goal

在 Batch Image Demo 中实现受控真实生图：队列总量可达 1000，但实际并发受限。

## Background

必须先完成 Goal 11 和 Goal 12。真实生图必须有并发限制、预算、取消、失败重试、图片落盘和缩略图展示。

## Allowed Scope

- demo.image.generate task type
- Python worker 调用 provider image generation
- 图片落盘
- 缩略图生成
- demo_image asset 入库
- model_runs
- 前端图片墙

## Out of Scope

- 不做无上限并发
- 不让 Vue 直接调用 provider
- 不传 base64 原图
- 不引入 Redis
- 不做完整正式资产墙替换

## Requirements

1. total_count 可设置到 1000。
2. concurrency 默认 2，最大建议 10。
3. 每张图保存原图文件。
4. 生成缩略图。
5. asset_type = demo_image。
6. 记录 model_runs。
7. 支持失败重试。
8. 连续失败超过阈值自动暂停 batch。
9. UI 图片墙懒加载或分页。
10. 取消后不继续生成新图。

## Acceptance Criteria

- 能受控生成真实图片。
- 图片落盘路径正确。
- 缩略图可展示。
- running 数不超过 concurrency。
- 失败任务可重试或 failed。
- 连续失败触发暂停。
- UI 不加载 1000 张原图。
- 现有 AI Provider 测试不受影响。


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
