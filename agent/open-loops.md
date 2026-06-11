# Open Loops

本文件只保留当前仍未闭环、且会影响后续推进的事项。已完成 Goal 的历史记录不再堆积在这里。

## 2026-06-11 架构硬化待跟进

- [ ] 基于 `docs/architecture-current-state.md` 和实际代码，确认 post-goal architecture hardening 的拆分顺序与验收边界。
- [ ] 继续收口 AI 域：评估 `src/stores/ai.ts` 剩余 facade / orchestration 是否继续下沉到独立 store、runtime 或 service。
- [ ] 继续收口 Creative 前端：评估 `src/views/creative/components/CreativeWorkflowDemo.vue` 是否进一步收敛为 orchestration shell，并继续拆分正式工作台。
- [ ] 继续复核 `/creative` 三栏壳层：左右栏已首轮接入真实项目/资产/任务活动，后续需在真实窗口确认信息密度，并决定是否扩展成正式资产库与 Agent 监控台。
- [ ] 继续收口 Creative service / backend：评估 `src/services/task.service.ts` 与 Rust `TaskService` 是否继续按领域缩窄。
- [ ] 评估前后端分域对齐：前端已拆出 `creative-task / creative-asset / creative-goal / creative-batch / creative-project` service/store，但 Rust 侧 asset CRUD 与 workflow 仍主要挂在 `TaskService + commands/creative_task.rs` 下。
- [ ] 完成 `creative_db` 后续治理：补正式 migration、旧库兼容回归，以及 `creative_projects`、资产版本、来源建模。
- [ ] 明确 Python sidecar 从 stub 进入正式 workflow runtime 的协议、健康检查和失败恢复边界。

## 回归与验收待办

- [ ] 沉淀 AI Provider 测试链路的最小回归步骤，形成可复用验收脚本或清单。
- [ ] 确认图片落盘目录、asset URL 映射与 `creative_projects` 归档策略。
- [ ] 在并行 worktree 改动持续存在的情况下，复盘新增 service / store / doc 的覆盖风险，避免后续提交互相踩踏。
- [ ] 复核当前剩余未提交基础组件改动：`components.d.ts`、`BaseProgress.vue`、`BaseSearchInput.vue`、`BaseSelect.vue`、`BaseSkeletonCard.vue`、`BaseSlider.vue`，确认是否作为独立 UI 基础组件批次提交；`.playwright-cli/` 临时产物需清理或加入忽略策略后再继续。

## 文档维护待办

- [ ] 以代码事实为准继续同步 `docs/architecture-current-state.md`，重点继续修正剩余的 AI façade 最新职责、`creative_db_tests.rs` 下沉后的 repo/test 结构，以及 `/creative` 三栏壳层的后续产品化边界。
- [ ] 基于当前 `/creative` 三栏工作台的实际代码边界，继续评审“正式业务核心”和“原型/展示壳层”的分界，决定后续是否拆出正式工作台页面。
- [ ] 基于本轮 batch repo 化进展，继续评估 Rust `src-tauri/src/services/batch_job_service.rs` 的剩余 orchestration 边界，明确哪些 supervisor / worker / provider 流程继续留在 Rust，哪些应为后续 Python runtime 正式化预留出口。
- [ ] 评估 `src-tauri/src/infra/creative_db_tests.rs` 与各 creative repo 的下一轮边界：当前 `CreativeDbInfra` 已移除，shared types 已迁出到 `creative_types.rs`，测试入口也已直接化；下一步需要决定是继续把测试按领域拆散，还是保留当前集中回归入口。
  - 2026-06-11：已完成 creative_task_repo、creative_asset_repo、creative_batch_repo 的 repo 级测试下沉；creative_db_tests.rs 当前仅保留 schema / migration 回归。
- [ ] 如后续继续扩写架构材料，优先更新 `docs/architecture-current-state.md` 和对应专题文档，不再新增平行路线图、阶段提示词或一次性执行包。

## 维护规则

- [ ] 已完成 Goal 00-13 的历史收口不再回填到本文件。
- [ ] 本文件只记录仍未闭环的问题；完成后及时删除，或迁入对应项目文档。
