# Codex Goal 从零到一完整操作手册 v3

本文档是当前完整版推进包的主入口。

## 0. 当前事实

当前项目已有成熟的 `AGENTS.md`，因此本推进体系不覆盖它，只追加入口规则，并把细节放到 `docs/ai/`、`docs/goals/`、`docs/business/`。

当前项目分析结论：

- 项目不需要推倒重来。
- Tauri2 + Vue3 + Rust + Python sidecar 路线成立。
- 现有底座值得保留：分层边界、Rust IPC 入口、AI Provider 测试链路、内存队列、取消机制、图片落盘预览、日志脱敏、文件权限收口。
- 当前系统更像 AI Provider / 对话 / 生图工作台。
- 目标系统是持续型 AI 创作系统。
- 核心差距：任务不落库、队列不通用、Python 不是常驻工作流服务、资产不是领域资产库、Vue store 承担了过多 AI 会话和状态编排。

## 1. 安装本完整包

在项目根目录执行：

```bash
unzip monster_codex_goal_complete_v3_pack.zip
cp -R monster_codex_goal_complete_v3_pack/docs/* docs/
cp -R monster_codex_goal_complete_v3_pack/scripts/* scripts/
mkdir -p agent
cp -R monster_codex_goal_complete_v3_pack/agent/* agent/
cat monster_codex_goal_complete_v3_pack/AGENTS_APPEND_ONLY.md >> AGENTS.md
```

注意：

- 不要覆盖现有 `AGENTS.md`；
- 只追加 `AGENTS_APPEND_ONLY.md`；
- 复制 `docs/`、`scripts/`、`agent/` 即可。

## 2. 建分支并提交文档体系

```bash
git checkout -b refactor/creative-task-system
git add AGENTS.md docs/ai docs/goals docs/templates docs/agents docs/business agent scripts
git commit -m "文档：新增 Codex Goal 从零到一完整推进体系"
```

## 3. 让 Codex 先读规则

第一次启动 Codex 后，不要让它直接改代码。先说：

```text
请先阅读 AGENTS.md、docs/ai/codex-goal-ops-manual.md、docs/ai/codex-goal-mode.md、docs/ai/creative-architecture-guardrails.md、docs/ai/creative-system-roadmap.md、docs/ai/creative-regression-checklist.md、docs/ai/multi-agent-operating-model.md、docs/ai/v2-addon-index.md、docs/business/batch-image-demo-design.md。

不要修改代码。请只总结：
1. 当前项目的架构红线；
2. Codex Goal 的推进方式；
3. 不允许提前做的事情；
4. v3 完整包新增了哪些工程护栏；
5. Batch Image Demo 为什么要分 mock、prompt、real image 三阶段；
6. 下一步推荐执行的 Goal。
```

如果 Codex 总结中出现以下倾向，需要纠正：

- 让 Vue 直连 Python；
- 一上来引入 Redis；
- 一上来替换 `ai_provider_tester.py`；
- 一上来重写 `src/stores/ai.ts`；
- 把小说、审查、prompt 工作流写进 Rust；
- 改 Tauri 更新机制；
- 引入新前端 SQL / 文件系统直驱能力；
- 直接开始真实 1000 张图生成。

## 4. 建立当前基线

执行：

```bash
npm run check:architecture
npm run typecheck
npm run verify
```

如果涉及 Rust / capabilities / 打包链路：

```bash
npx tauri build --no-bundle
```

把结果记录到：

```text
docs/ai/creative-master-plan.md
agent/open-loops.md
```

已有失败项也要记录，避免后续误判。

## 5. 第一阶段：文档确认

让 Codex 执行：

```text
请执行 docs/goals/goal_00_docs_guardrails.md。

要求：
1. 不修改业务代码；
2. 不覆盖现有 AGENTS.md，只检查追加内容是否合理；
3. 检查 docs/ai、docs/goals、docs/business 是否完整；
4. 如果发现与现有项目 AGENTS.md 冲突，提出修订建议，不要直接大改。
```

## 6. 第二阶段：最小任务/资产数据库模型

执行：

```text
请执行 docs/goals/goal_01_minimal_db_model.md。

要求：
1. 严格遵守 AGENTS.md；
2. 先阅读 docs/ai/database-migration-policy.md 和 docs/ai/task-state-machine.md；
3. 不修改现有 AI Provider 测试链路；
4. 不引入 Redis；
5. 不引入 Python FastAPI；
6. 不重写 src/stores/ai.ts；
7. 先阅读相关 SQLite / Rust service 文件，给出简短计划，再实施；
8. 完成后运行 npm run check:architecture 和 npm run typecheck；
9. 涉及 Rust 编译时运行 npx tauri build --no-bundle；
10. 报告修改文件、验证结果、风险和下一步建议。
```

## 7. 第三阶段：Rust TaskService

执行：

```text
请执行 docs/goals/goal_02_task_service_commands.md。

重点：
- 新增 Rust TaskService；
- 通过现有分层暴露前端调用；
- 不替换 AiProviderService 内存队列；
- 不改现有 AI Provider 页面；
- 前端如需调用，必须经过 Frontend Service / callTauri，不得在组件或 store 里直接 invoke。
```

## 8. 第四阶段：任务事件桥接

执行：

```text
请执行 docs/goals/goal_03_task_event_bridge.md。

重点：
- Rust 任务状态变化时 emit Tauri event；
- Vue 只做监听和展示；
- 不用事件传输大文本、大图或 base64；
- 不替换现有 Provider 轮询逻辑。
```

## 9. 第五阶段：Sidecar 生命周期

执行：

```text
请执行 docs/goals/goal_04_sidecar_lifecycle_service.md。

重点：
- Rust 管理未来 Python 常驻 sidecar 生命周期；
- 默认不替换当前一次性 Python 脚本；
- Vue 不能直连 Python；
- Rust 负责端口、token、health check 和状态；
- 同步阅读 docs/ai/python-sidecar-packaging-strategy.md。
```

## 10. 第六阶段：Python sidecar stub

执行：

```text
请执行 docs/goals/goal_05_python_sidecar_stub.md。

重点：
- 新增 Python 常驻服务原型；
- 只做 /health、/tasks stub、/events stub；
- 不执行真实模型调用；
- 不替换 ai_provider_tester.py；
- 通过 Rust 调用。
```

## 11. 第七阶段：第一个真实 creative workflow

执行：

```text
请执行 docs/goals/goal_06_first_creative_workflow.md。

重点：
- 只做 generate_image_prompt；
- 不做生图；
- 不做小说/剧本；
- 不做复杂审查；
- 目标是跑通 task -> event -> asset -> UI 的最小闭环。
```

## 12. 后续主线

依次执行：

```text
docs/goals/goal_07_worker_queue_skeleton.md
docs/goals/goal_08_review_revision_skeleton.md
docs/goals/goal_09_creative_domain_assets.md
docs/goals/goal_10_goal_multi_agent_mode.md
```

## 13. Batch Image Demo 支线

主线至少完成 Goal 01、Goal 02、Goal 03 后，才建议开始 Batch Demo。

执行顺序：

```text
docs/goals/goal_11_batch_image_demo_mock.md
docs/goals/goal_12_batch_image_prompt_tasks.md
docs/goals/goal_13_batch_image_real_generation.md
```

对 Codex 说：

```text
请先阅读 docs/business/batch-image-demo-design.md、docs/ai/execution-budget-and-kill-switch.md、docs/ai/model-provider-observability.md、docs/ai/asset-versioning-and-provenance.md。

不要直接实现真实生图。请先执行 docs/goals/goal_11_batch_image_demo_mock.md。
```

## 14. 多 Agent 并行规则

并行只能从以下条件满足后开始：

- 文档护栏已提交；
- 最小数据库模型已落地；
- Codex 已能正确遵守 AGENTS.md；
- 有 `creative-master-plan.md` 记录当前阶段。

并行方式：

```text
Rust Agent：TaskService / event bridge / sidecar lifecycle
Python Agent：sidecar stub / worker skeleton
Vue Agent：任务中心展示 / asset mock / batch demo UI
DB Agent：schema / repo / migration
QA Agent：回归检查
Architecture Guardian：审查边界
```

合并顺序仍然必须串行。

## 15. 每次完成后必须做

```bash
npm run check:architecture
npm run typecheck
bash scripts/check_creative_boundaries.sh
```

Batch Demo 相关任务额外运行：

```bash
bash scripts/check_batch_demo_boundaries.sh
```

涉及 Rust：

```bash
npx tauri build --no-bundle
```

然后更新：

```text
docs/ai/creative-master-plan.md
agent/open-loops.md
```

## 16. 判断 Codex 是否跑偏

出现以下行为，立即停止：

- 主动覆盖现有 AGENTS.md；
- 主动引 Redis / Postgres / 远程 worker；
- 让 Vue 直接 `fetch("http://127.0.0.1:...")`；
- 在组件、store、composable 里直接 `invoke()`；
- 修改 Tauri 更新逻辑；
- 放宽 assetProtocol 到 `$HOME/**/*`；
- 引入前端 SQL / FS 插件；
- 把 prompt / 审查 / 小说工作流写进 Rust；
- 把 sub2api/cockpit 当业务编排引擎；
- 把图片 base64 塞进前端状态；
- 直接真实生成 1000 张图而没有 mock / prompt 阶段。
