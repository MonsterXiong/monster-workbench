# Open Loops

本文件只保留当前仍未闭环、且会影响后续推进的事项。已完成 Goal 的历史记录不再堆积在这里。

## 2026-06-11 架构硬化待跟进

- [ ] 基于 `docs/architecture-current-state.md`、`docs/architecture-upgrade-baseline.md` 和 `docs/architecture-upgrade-roadmap.md`，确认 post-goal architecture hardening 的拆分顺序与验收边界。
- [ ] 继续收口 AI 域：评估 `src/stores/ai.ts` 剩余 facade / orchestration 是否继续下沉到独立 store、runtime 或 service。
- [ ] 继续收口 Creative 前端：评估 `src/views/creative/components/CreativeWorkflowDemo.vue` 是否进一步收敛为 orchestration shell，并继续拆分正式工作台。
- [ ] 继续收口 Creative service / backend：评估 `src/services/task.service.ts` 与 Rust `TaskService` 是否继续按领域缩窄。
- [ ] 完成 `creative_db` 后续治理：补正式 migration、旧库兼容回归，以及 `creative_projects`、资产版本、来源建模。
- [ ] 明确 Python sidecar 从 stub 进入正式 workflow runtime 的协议、健康检查和失败恢复边界。

## 回归与验收待办

- [ ] 沉淀 AI Provider 测试链路的最小回归步骤，形成可复用验收脚本或清单。
- [ ] 确认图片落盘目录、asset URL 映射与 `creative_projects` 归档策略。
- [ ] 在并行 worktree 改动持续存在的情况下，复盘新增 service / store / doc 的覆盖风险，避免后续提交互相踩踏。

## 文档维护待办

- [ ] 以代码事实为准继续同步 `docs/architecture-current-state.md`，至少修正 `useTaskStore` 退场、Creative store 拆分现状，以及 AI facade 最新边界。
- [ ] 基于当前 `/creative` 三栏工作台的实际代码边界，继续评审“正式业务核心”和“原型/展示壳层”的分界，决定后续是否拆出正式工作台页面。
- [ ] 基于本轮 batch repo 化进展，继续评估 Rust `src-tauri/src/services/batch_job_service.rs` 的剩余 orchestration 边界，明确哪些 supervisor / worker / provider 流程继续留在 Rust，哪些应为后续 Python runtime 正式化预留出口。
- [ ] 评估 `src-tauri/src/infra/creative_db.rs` 的下一轮收口方式：当前生产代码已不再直接依赖 `CreativeDbInfra`，下一步需要决定是继续保留其“类型汇总 + 遗留 façade + 测试入口”角色，还是把 shared types 进一步拆到更细粒度领域模块。
- [ ] 如后续继续扩写架构材料，优先更新现有基线、路线图和执行清单，不再平行新增重复摘要文档。

## 维护规则

- [ ] 已完成 Goal 00-13 的历史收口不再回填到本文件。
- [ ] 本文件只记录仍未闭环的问题；完成后及时删除，或迁入对应项目文档。
