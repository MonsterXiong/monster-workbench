# Open Loops

本文件记录 Codex Goal 推进过程中尚未解决的问题。

## 2026-06-11 架构升级待跟进

- [ ] 基于 `docs/architecture-current-state.md` 做 post-goal architecture hardening 评审，先确认拆分顺序和验收边界。
- [ ] 拆分 `useTaskStore`：优先评估 `creative-task`、`creative-asset`、`creative-goal`、`creative-batch`、`creative-project` 与 `background-task` 的边界。
- [ ] 拆分 `useAiStore`：优先评估 provider、session、image、prompt library 与 queue 的状态边界。
- [ ] 拆分 `commands/database.rs`：保留数据库备份/导入/重置/status，将 creative task、asset、goal、batch、sidecar、worker queue 迁出到独立 command namespace。
- [ ] 拆分 `CreativeDbInfra`：将 schema、task、event、asset、model_run、batch、goal repo 分离，并补对应回归测试边界。
- [ ] 建立正式 SQLite migration 体系：`schema_migrations`、幂等迁移、旧库兼容测试、迁移前备份和破坏性变更审批。
- [ ] 设计正式 `creative_projects` 与资产版本/来源治理，避免继续只依赖松散 `project_id` 字符串和 `metadata_json`。
- [ ] 将 Python `creative_health_server.py` 从 health/workflow stub 规划为正式 workflow runtime，同时保持 Rust 作为 Vue 唯一入口。

## 当前未解决事项

- [x] 补充当前项目基线结果：2026-06-10 Goal 00 记录在 `docs/ai/creative-master-plan.md`。
- [ ] 确认 SQLite migration 现有机制，并沉淀为正式迁移方案。
- [ ] 确认 AI Provider 测试链路的回归步骤与可复用验收脚本。
- [ ] 确认 Python sidecar 发布策略与运行时升级边界。
- [ ] 确认图片落盘目录、asset URL 映射与后续 `creative_projects` 归档策略。
- [ ] 在并行 worktree 改动环境下再做一轮 Goal 文档和新增 service 盘点，防止新文件被其他进程覆盖。

## 规则

每个 Goal 完成后，如存在未解决事项，追加真正仍未闭环的 follow-up 即可。

- [ ] 已完成的 Goal 06 / 08 / 09 / 10 / 11 / 12 / 13 不再重复写回“待真实窗口验证”类条目。
- [ ] 后续待办统一收敛到 post-goal architecture hardening、真实回归缺口或新增功能的验收缺口。

## 其他待验证事项

- [ ] 复验 AI 模型对话导出 UI：本轮已完成 Markdown / TXT / JSON 导出链路和聊天窗口美化，`typecheck` / `check:architecture` / `build` 已通过；但 Browser 插件安全策略拒绝访问 `http://localhost:1420`，需要在真实 Tauri 窗口或策略解除后确认导出菜单、消息复制和输入区提示的现场显示。
- [ ] 复验 AI 生图页桌面端最新交互：本轮已接通 `imageCount` 到 Rust + Python sidecar，并调整图片卡片底部按钮布局、去掉预览信息中的“已保存”展示；仍需在真实桌面窗口确认 `x1-x4` 张生图、按钮换行 / 对齐，以及生成完成后的文件路径 / 图片地址按钮观感。
- [ ] 复验 Batch Image Demo Mock：本轮已新增 `batch_jobs` / `batch_job` 相关 commands、任务分页和 mock 并发，但还需要在真实 Tauri 窗口确认创建 100 / 1000 条任务时列表是否流畅，以及暂停 / 恢复 / 取消是否按预期驱动状态流。

## 2026-06-10 进展记录

- Goal 00 的文档护栏复验通过：`bash scripts/check_goal_docs.sh`、`npm run check:architecture`、`npm run typecheck` 和创作边界检查都已通过。
- Batch Demo 的 Rust 回归已通过：`cargo test batch_job_service -- --nocapture`、`cargo test creative_db -- --nocapture` 和 `cargo check` 都已通过。
- `src/stores/task.ts` 已在批量状态 / 进度事件到来时自动刷新当前分页窗口，方便把 prompt / image 输出及时反映到 `Paged Tasks`、`Task Results` 和 `Image Wall`。
- 无头浏览器验证已进入 Goal 06 / 08 / 09 / 10 / 11 / 12 的交互态，并在页面文本里看到了 `demo.image.generate` 的 `image worker started`、`image worker finished successfully`、`batch completed`。
- 浏览器 mock 是页面记忆态，新的 headless 目标会重置任务 / 资产 / 批次状态；多步验证必须保持在同一页面会话里。

2026-06-10：真实 Tauri 窗口验证已收口。Goal 06 / 08 / 09 / 10 / 11 / 12 / 13 均已在 WebView2 真实运行时中验证通过；本轮同时修复了旧版 SQLite 库迁移里 creative_tasks.goal_id / batch_job_id / sequence_no 索引早于列升级的兼容性问题。后续开放事项不再是 Goal 00-13 收口，而是 post-goal architecture hardening：整理下一阶段的真实 provider、迁移兼容与 demo 可验证性 Goal。
