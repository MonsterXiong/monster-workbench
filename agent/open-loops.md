# Open Loops

本文件只保留当前仍未闭环、且会影响后续推进的事项。已完成 Goal 的历史记录不再堆积在这里。

## 2026-06-11 架构硬化待跟进

- [ ] 基于 `docs/architecture-current-state.md` 和实际代码，确认 post-goal architecture hardening 的拆分顺序与验收边界。
- [ ] 继续收口 AI 域：2026-06-12 复核确认 `src/stores/ai.ts` 已是薄 façade 且不直接调用 service；后续重点改为约束 `ai-image-runtime.ts` / `ai-provider-runtime.ts` 膨胀，必要时抽 task polling、backend queue sync、pending message recovery 等稳定 helper，并在改 AI 页面时逐步减少对 `useAiStore()` 兼容入口的依赖。
- [ ] 继续收口 Creative 前端：2026-06-12 复核确认 `CreativeWorkflowDemo.vue` 已是项目中心 orchestration shell；后续不要为文件名盲拆，优先拆 `CreativeTabBatch.vue` / `CreativeTabAssets.vue` 内部表单、结果面板、任务表和图片墙等宽区块。
- [ ] 继续复核 `/creative` 三栏壳层：左右栏已接真实项目/资产/任务活动；下一轮明确左栏资产分类选择是否驱动中间 workspace，右栏 `CreativeTaskForm` quick forms 是否保留，随后再做真实窗口信息密度验收并决定是否扩展成正式资产库与 Agent 监控台。
- [ ] 继续收口 Creative service / backend：Rust `TaskService` 二次评估结论是短期可保留 task/asset/event 可信入口，先冻结 `run_review_asset_quality_stub` 的业务扩展，正式 review/revision 迁入 Python workflow runtime。
- [ ] 评估前后端分域对齐：前端已拆出 `creative-task / creative-asset / creative-goal / creative-batch / creative-project` service/store；Rust 侧 asset CRUD 暂不为拆文件名而拆，后续等资产版本、来源建模稳定后再决定是否独立 `AssetService`。
- [ ] 完成 `creative_db` 后续治理：补正式 migration、旧库兼容回归，以及 `creative_projects`、资产版本、来源建模。
- [ ] 继续推进 Python workflow runtime：`generate_image_prompt`、`image.prompt.batch` 与 `image.generate.batch` 已落地 task request/result、model_runs 审计、失败/取消/重试映射、cancel checkpoint、基础 budget/timeout 协议、正式 workflow 类型命名、batch sidecar lifecycle 首段硬化、Python `/events` runtime instance 边界、Rust polling、设置诊断消费、`sidecar-runtime.log` 与 `sidecar-lifecycle.log` 摘要持久化；batch provider DTO 已退出 `AiProviderConfig` 测试语义，batch prompt builder 已迁向 Python workflow，WorkerQueue Rust IPC 已补 claim/checkpoint/complete 首段；2026-06-12 再评估确认 `creative_tasks` 仍缺 worker identity、lease/claim token 和 heartbeat 字段，下一步先设计 Rust-owned localhost sidecar control API 与租约/结果 settle 协议，继续避免在 `batch_job_service.rs` 新增生产 worker 分支或提前迁移 supervisor。

## 回归与验收待办

- [ ] 沉淀 AI Provider 测试链路的最小回归步骤，形成可复用验收脚本或清单。
- [ ] 确认图片落盘目录、asset URL 映射与 `creative_projects` 归档策略。
- [ ] 在并行 worktree 改动持续存在的情况下，复盘新增 service / store / doc 的覆盖风险，避免后续提交互相踩踏。

## 文档维护待办

- [ ] 以代码事实为准继续同步 `docs/architecture-current-state.md`，重点继续修正剩余的 AI façade 最新职责、`creative_db_tests.rs` 下沉后的 repo/test 结构，以及 `/creative` 三栏壳层的后续产品化边界。
- [ ] 基于当前 `/creative` 三栏工作台的实际代码边界，继续评审“正式业务核心”和“原型/展示壳层”的分界：左栏分类目前只 emit 未接线，右栏 properties 与中间 Goal/Batch tabs 有入口重叠，正式化前先定义这两处交互契约。
- [ ] 评估 `src-tauri/src/infra/creative_db_tests.rs` 与各 creative repo 的下一轮边界：当前 `CreativeDbInfra` 已移除，shared types 已迁出到 `creative_types.rs`，测试入口也已直接化；下一步需要决定是继续把测试按领域拆散，还是保留当前集中回归入口。
  - 2026-06-11：已完成 creative_task_repo、creative_asset_repo、creative_batch_repo 的 repo 级测试下沉；creative_db_tests.rs 当前仅保留 schema / migration 回归。
- [ ] 如后续继续扩写架构材料，优先更新 `docs/architecture-current-state.md` 和对应专题文档，不再新增平行路线图、阶段提示词或一次性执行包。

## 维护规则

- [ ] 已完成 Goal 00-13 的历史收口不再回填到本文件。
- [ ] 本文件只记录仍未闭环的问题；完成后及时删除，或迁入对应项目文档。

## 2026-06-11 公共组件治理待跟进

- [ ] 继续按“高频稳定控件优先 Element Plus，复杂容器/业务形态自研补足”的原则评估剩余 `BaseForm` 壳层与未收口的稳定控件；迁移前需逐项确认现有 `Base*` API、slot、键盘交互与 Playground 示例不会被压缩。
- [ ] `BaseTable` 已接入 `el-table`，后续如继续增强可补充排序、选择列、固定列等数据表格能力，但应与 `BaseDataTable` 的职责边界分开。
- [ ] `BaseSearchInput` 可继续评估与 `BaseInput` 共享 size 映射和状态样式工具，进一步收敛 Element Plus 输入封装的重复样式与尺寸映射逻辑。
