# Goal 09：创作领域资产类型

## Goal

在通用 assets 基础上增加角色、场景、道具、分镜、小说章节、剧本场景等领域资产类型。


## Background

当前项目是 Tauri v2 + Vue 3 + Rust + Python sidecar 的桌面应用 Monster Tools / monster-workbench。

必须遵守：

- 根目录 AGENTS.md；
- docs/ai/codex-goal-mode.md；
- docs/ai/creative-architecture-guardrails.md；
- docs/ai/creative-regression-checklist.md。

现有 AI Provider 测试链路必须保持可用。

## Verification

默认完成后运行：

```bash
npm run check:architecture
npm run typecheck
bash scripts/check_creative_boundaries.sh
```

涉及 Rust / capabilities / 打包时运行：

```bash
npx tauri build --no-bundle
```

## Report

完成后必须报告：

- 修改了哪些文件；
- 为什么这样改；
- 没有做哪些范围外事项；
- 运行了哪些检查；
- 哪些通过，哪些未运行；
- 风险；
- 下一步建议。


## Allowed Scope

- asset_type 枚举或类型定义
- metadata schema 草案
- asset_links link_type 扩展
- 最小展示或调试入口

## Out of Scope

- 不做完整资产墙
- 不做完整小说生成
- 不做完整剧本生成
- 不做生图批量任务
- 不引入向量库

## Requirements

1. 支持 character。
2. 支持 scene。
3. 支持 prop。
4. 支持 storyboard。
5. 支持 novel_chapter。
6. 支持 script_scene。
7. 支持 bible / style_bible / world_bible。
8. 支持 asset_links 表达引用关系。

## Acceptance Criteria

- 可以创建不同 asset_type。
- 可以建立角色与分镜、场景与剧本等 link。
- 不影响已有 prompt asset。
