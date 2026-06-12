# Open Loops

本文件只保留当前仍未闭环、且会影响后续推进的事项。已完成 Goal 的历史记录不再堆积在这里。

## 2026-06-11 架构硬化待跟进

- [ ] 基于 `docs/architecture-current-state.md` 和实际代码，确认 post-goal architecture hardening 的拆分顺序与验收边界。
- [ ] 继续收口 AI 域：2026-06-12 复核确认 `src/stores/ai.ts` 已是薄 façade 且不直接调用 service；`syncAiProviderBackendQueue` 已是共享 service helper。后续重点改为约束 `AiImagePanel.vue`、`ai-image-runtime.ts`、`ai-provider-runtime.ts` 膨胀，必要时抽 image session list、size picker、preview/actions、task polling、pending image recovery、cancel/result patch 等稳定区块，并在改 AI 页面时逐步减少对 `useAiStore()` 兼容入口的依赖。
- [ ] 继续收口 Creative 前端：2026-06-12 复核确认 `CreativeWorkflowDemo.vue` 已是项目中心 orchestration shell；后续不要为文件名盲拆，优先拆 `CreativeTabBatch.vue` / `CreativeTabAssets.vue` 内部表单、结果面板、任务表和图片墙等宽区块。
- [ ] 继续产品化 `/creative` 三栏壳层：2026-06-12 复核确认左栏项目切换已接真实 store，但分类/tag 仍未驱动中间 workspace；右栏 `CreativeTaskForm` 是能力较窄的 quick launcher，与中间 Goal/Batch tabs 入口重叠但不等价。下一步先定义分类/tag -> workspace 的交互契约、quick forms 是否保留，再做真实窗口信息密度验收并决定是否扩展成正式资产库与 Agent 监控台。
- [ ] 继续收口 Creative service / backend：2026-06-13 再次按代码复核确认 Rust `TaskService` 仍是 task/asset/event 可信入口，`run_review_asset_quality_stub` 应继续冻结为 demo/stub；`BatchJobService` supervisor / prompt worker shell / image worker shell 仍短期留在 Rust，不新增正式生产 worker 分支。下一步若进入实现，先做 worker ownership / lease migration、旧库兼容回归、lease-aware claim/heartbeat/complete repo 测试和 result settle contract 验收，再评估 Python worker loop。
- [ ] 评估前后端分域对齐：前端已拆出 `creative-task / creative-asset / creative-goal / creative-batch / creative-project` service/store；Rust 侧 asset CRUD 暂不为拆文件名而拆，后续等资产版本、来源建模稳定后再决定是否独立 `AssetService`。
- [ ] 完成 `creative_db` 后续治理：`creative_projects` 已有建表和最小 repo，后续补正式项目生命周期、FK / 稳定 ID 策略、归档传播、资产版本/来源建模，以及 migration dry-run、备份策略和旧库兼容回归。
- [ ] 继续推进 Python workflow runtime：`generate_image_prompt`、`image.prompt.batch` 与 `image.generate.batch` 已由 Python sidecar 执行业务 workflow，并保留 Rust settle / model_runs / task_events / asset 写入。2026-06-13 再评估确认阻塞点仍是 `creative_tasks` 缺 worker identity、lease/claim token 和 heartbeat 字段，`complete_creative_task` 也不是带 runtime token 和租约校验的 sidecar control API；若实现 worker pool，先按 `workflow-runtime-boundary.md` 12.9-12.12 补 migration / lease repo 测试和 Rust-owned localhost control API。

## 文档维护待办

- [ ] 以代码事实为准继续同步 `docs/architecture-current-state.md`：AI façade、`/creative` 三栏壳层和公共组件 Element Plus 封装边界已复核；后续重点转为 Rust worker ownership / lease、migration / project / asset provenance 的正式化缺口。
- [ ] 基于当前 `/creative` 三栏工作台的实际代码边界，继续评审“正式业务核心”和“原型/展示壳层”的分界：`CreativeTabBatch.vue` / `CreativeTabAssets.vue` 已是主要宽区块；正式化前先决定左栏分类/tag 是否过滤 assets tab 或切 workspace，以及右栏 quick launcher 是否保留。
- [ ] 继续补齐 Creative repo 测试缺口：2026-06-12 复核确认 `creative_db_tests.rs` 只保留 schema / migration 回归，task / asset / batch / project / model_run repo 行为测试已在对应 repo 内；后续如补 `creative_goal_repo` 行为回归，应放在该 repo 的 test module，不回流到 `creative_db_tests.rs`。

## 2026-06-11 公共组件治理待跟进

- [ ] 公共组件治理暂不作为当前架构升级主线；后续只在新增页面或触碰 AI panels / `WorkspacePage` 时，按 `docs/global-components.md` 与 `docs/frontend-style.md` 小步回收页面直用 `<el-*>`，不要在 open-loops 继续堆已完成控件流水。
