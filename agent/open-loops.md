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

- [ ] 以代码事实为准继续同步 `docs/architecture-current-state.md`：AI façade、`/creative` 三栏壳层和公共组件 Element Plus 封装边界已在 2026-06-12 复核；后续重点转为 migration / project / asset provenance 的正式化缺口，以及 AI panels / `WorkspacePage` 少量页面直用 Element Plus 的回收判断。
- [ ] 基于当前 `/creative` 三栏工作台的实际代码边界，继续评审“正式业务核心”和“原型/展示壳层”的分界：`CreativeTabBatch.vue` / `CreativeTabAssets.vue` 已是主要宽区块；正式化前先决定左栏分类/tag 是否过滤 assets tab 或切 workspace，以及右栏 quick launcher 是否保留。
- [ ] 继续补齐 Creative repo 测试缺口：2026-06-12 复核确认 `creative_db_tests.rs` 只保留 schema / migration 回归，task / asset / batch / project / model_run repo 行为测试已在对应 repo 内；后续如补 `creative_goal_repo` 行为回归，应放在该 repo 的 test module，不回流到 `creative_db_tests.rs`。

## 2026-06-11 公共组件治理待跟进

- [ ] 继续按“高频稳定控件优先 Element Plus，复杂容器 / 业务形态自研补足”的原则评估剩余稳定控件；迁移前需逐项确认现有 `Base*` API、slot、键盘交互与 Playground 示例不会被压缩。
- [ ] 2026-06-13 已继续收口 `BaseTree`：保留项目节点模型、图标、badge、meta、active 与插槽，同时补齐 Element Plus `showCheckbox`、受控 `checkedKeys`、`checkStrictly`、`checkOnClick`、`defaultExpandAll`、`accordion`、`filterText` / `filterNodeMethod` 和空态文本；Playground 已覆盖可勾选与过滤示例。
- [ ] 2026-06-13 已继续收口 `BaseSelect`：共享 `toElementPlusSize()`，保留项目 option / selectedLabel / valueKey 语义，同时补齐 Element Plus 可创建、远程搜索、filterMethod、下拉定位、滚动事件等高频能力；Playground 已覆盖可创建与远程搜索示例。后续继续按控件族分批审计，不一次性机械替换。
- [ ] 2026-06-13 已继续收口 `BaseUpload` / `BaseAvatar` / `BaseEmpty` / `BaseError`：`BaseUpload` 保留 FileList 校验、select/reject 和默认轻量模式，同时补齐 Element Plus 文件列表、列表类型、limit/exceed、preview/remove、drag 开关和实例方法；`BaseAvatar` 补齐 `fit`、`srcSet` 和 error 事件；`BaseEmpty` 补齐 `image` / `imageSize` 图片空态；`BaseError` 补齐 `ElResult` status、原生图标复用、success / primary tone，并继续保留 retry、extra slot、ARIA 和长文案换行语义。Playground 已覆盖文件列表与限制、头像 fit、图片空态和错误结果原生图标示例。后续继续审计上传实际业务链路时，仍不得让页面绕过 store/service/Rust 边界直接做网络或文件系统能力。
- [ ] 2026-06-13 已继续收口 `BaseTab` / `BaseAccordion`：`BaseTab` 保留项目 tab item、图标、徽标、slot 和 pills/underline 外观，同时补齐 Element Plus `tabPosition`、`type`、`closable`、`addable`、`editable`、`beforeLeave` 和 add/remove/edit 事件；`BaseAccordion` 保留项目 item 模型、surface、allowCollapse、keepMounted 和 actions slot，同时补齐 `expandIconPosition`、`beforeCollapse` 与 change 事件。Playground 已覆盖动态标签、垂直标签、切换拦截、左侧展开图标和折叠前拦截。
- [ ] 2026-06-13 已复核高频组件视觉一致性：`BaseSlider` 保持 `ElSlider` 底座并把手柄定位交还给 Element Plus 原生变量，只保留项目轨道 / 手柄视觉；`BaseButton` 的 icon-only / circle 态已统一中心对齐。Playground 已用滑块和按钮场景做 smoke 验证。
- [ ] 2026-06-13 已继续收口 `BaseStepper` / `BaseTimeline`：`BaseStepper` 保留项目 steps 模型、图标、线性可选、键盘导航和状态语义，同时补齐 Element Plus `simple`、`alignCenter`、`finishStatus`、`processStatus`、`v-model:current` 与 change 事件；`BaseTimeline` 保留 marker、actions slot、selectedKey、reverse、长文案换行和点击选择语义，同时补齐原生 timestamp / placement。Playground 已覆盖 simple steps、状态映射、顶部时间戳和窄容器无横向溢出。
- [ ] 2026-06-13 已继续收口 `BaseConfirmAction` / `BaseDescriptionList` / `BaseNumberInput`：`BaseConfirmAction` 保留确认输入、防重复弹层和项目按钮语义，同时补齐 Popconfirm placement、宽度、图标、teleported、fallback placements 和按钮类型；`BaseDescriptionList` 保留项目 items / 状态点 / loading / empty 语义，同时补齐 title / extra、纵向布局、label width、对齐、colon 和 item 级尺寸；`BaseNumberInput` 补齐严格步进、controls、右侧控制按钮、清空值、输入对齐、inputmode 和 disabled-scientific。Playground 已覆盖弹层策略、原生描述能力和数值输入控制位示例。
- [ ] 2026-06-12 已继续收口 `BaseTooltip`：保留项目内容 slot、受控 `open`、视口避让和可访问描述，同时补齐 Element Plus / Popper 的 `*-start/end` placement、`hover/focus/click/contextmenu` trigger、浅色提示、箭头、enterable、autoClose、fallbackPlacements 和 strategy；Playground 已覆盖触发方式、浅色提示、无箭头和自动关闭示例。
- [ ] 后续触碰 AI panels 或 `WorkspacePage` 时，优先评估页面级 `<el-*>` 是否能回收到 `Base*` / `App*` 封装；不要扩大页面直用 Element Plus 范围。
