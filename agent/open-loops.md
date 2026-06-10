# Open Loops

本文件记录 Codex Goal 推进过程中尚未解决的问题。

## 当前未解决事项

- [x] 补充当前项目基线结果：2026-06-10 Goal 00 记录在 `docs/ai/creative-master-plan.md`。
- [ ] 确认 SQLite migration 现有机制
- [ ] 确认 AI Provider 测试链路的回归步骤
- [ ] 确认 Python sidecar 发布策略
- [ ] 确认图片落盘目录和 asset URL 映射
- [ ] 处理当前 `typecheck` 阻塞：并行中的 JSON utils 重构仍缺 `tryFormatJsonText` / `tryMinifyJsonText` 导出，且 `src/utils/json/parse.ts` 有未使用符号。
- [ ] 继续复验 Goal 06：确认 `generate_image_prompt` 在真实 Tauri 窗口中的任务、事件、资产和 Playground 调试入口表现。
- [ ] 处理当前 `tauri build --no-bundle` 阻塞：`src/stores/system.ts` 仍引用 `filterLogLinesByLevel`，但 `src/utils/index.ts` 尚未导出该符号。
- [ ] 继续复验 Goal 08：确认 `review_result` asset、`manual_approval` 状态和 `revise_asset_quality` stub 在 Playground 调试入口中的现场表现。
- [ ] 继续复验 Goal 09：确认角色 / 场景 / 道具 / 分镜 / 章节 / 剧本 / bible 资产和 `uses_*`、`part_of`、`derived_from` 链接在 Playground 调试入口中的现场表现。
- [ ] 继续复验 Goal 10：确认 goal、agent role、fan-out task、merge stub 和 stop goal 在 Playground 调试入口中的现场表现。
- [ ] 继续复验 Goal 11：确认 Batch Image Demo Mock 的创建、启动、暂停、恢复、取消与分页任务列表在真实 Tauri 窗口中的现场表现。

## 规则

每个 Goal 完成后，如存在未解决事项，必须追加到这里。
- [ ] 推进 Goal 06：把 `generate_image_prompt` 接入 `creative_tasks` + Python sidecar stub，形成第一条真实 workflow 的最终收口。
- [ ] 推进 Goal 07：把 worker queue skeleton 的 claim / cancel / retry / recovery 语义接到更完整的运行时检查里。
- [ ] 推进 Goal 08：把 review / revision skeleton 接到更完整的审批与返工流程检查里。
- [ ] 推进 Goal 09：把创作领域资产接口接到更完整的可视化或调试流程里。
- [ ] 推进 Goal 10：把 goal / multi-agent 骨架接到更完整的前端调试和状态展示里。
- [ ] 推进 Goal 11：把 Batch Image Demo Mock 接到更完整的真实窗口回归和分页/暂停/恢复/取消检查里。
- [ ] 在并行 worktree 改动环境下再做一轮 Goal 文档和新增 service 盘点，防止新文件被其他进程覆盖。
- [ ] 复验 AI 模型对话导出 UI：本轮已完成 Markdown/TXT/JSON 导出链路和聊天窗口美化，`typecheck`/`check:architecture`/`build` 已通过；但 Browser 插件安全策略拒绝访问 `http://localhost:1420`，需要在真实 Tauri 窗口或策略解除后确认导出菜单、消息复制和输入区提示的现场显示。
- [ ] 复验 AI 生图页桌面端最新交互：本轮已接通 `imageCount` 到 Rust + Python sidecar，并调整图片卡片底部按钮布局、去掉预览信息中的“已保存”展示；仍需在真实桌面窗口确认 `x1-x4` 张生图、按钮换行/对齐、以及生成完成后的文件路径/图片地址按钮观感。
- [ ] 复验 Batch Image Demo Mock：本轮已新增 `batch_jobs` / `batch_job` 相关 commands、任务分页和 mock 并发，但还需要在真实 Tauri 窗口确认创建 100/1000 条任务时列表是否流畅，以及暂停/恢复/取消是否按预期驱动状态流。
