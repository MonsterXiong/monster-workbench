# Open Loops

本文只保留当前仍未闭环、且会影响后续推进的事项。已移除的旧独立创作工作台、批量任务、任务队列、资产库、常驻运行时和历史执行包事项不再记录。

## AI 工作台

- [ ] 继续拆分 `src-tauri/src/services/ai_service.rs`：首轮已抽出 `ai_provider_types.rs`、`ai_provider_config.rs`、`ai_provider_process.rs`、`ai_provider_output.rs`；下一步优先拆内部队列、任务注册/取消、provider registry 校验，保持现有 Tauri command 和 DTO contract 不变。
- [ ] AI 生图前端热点已完成首轮拆分：`image session list`、composer settings、composer prompt tools、预览弹窗、message/result display 已分别抽到 `src/views/ai/components/image/`；后续只有在新增生图工作区功能前，继续按稳定 UI / action helper 小步收窄 `src/views/ai/components/AiImagePanel.vue`。
- [ ] 收窄 AI runtime helper：task polling 与 queued cancel 同步已抽到 `src/stores/ai-provider-task-runtime.ts`；provider/image result patch 已做首轮聚合；后续继续收窄 pending image recovery 与 `generateImageMessage` 成功/失败分支，且新逻辑不要回流到 `src/stores/ai.ts` facade。
- [ ] 处理 `src/views/utils-docs/utilsDocsContent.ts` 体量：先确认是否为生成物；若是生成物，优先维护生成脚本和 `check:utils-docs`，不要手工拆内容。
- [ ] 评估 `src/services/tauri.mock.ts` 领域拆分：按 app/file/system/navigation/ai 拆 mock handler，但保持 `callTauri` 浏览器降级 contract。

## 真实环境验证

- [ ] 在真实 Tauri 窗口用有效 Provider 覆盖 AI 工作台 pending 对话取消、running 对话中止、running 生图中止和刷新恢复一致性。
- [ ] 用真实第三方 Anthropic Messages 格式 API（`custom + anthropic-messages` adapter）和 OpenAI-compatible 自定义 Provider smoke AI 工作台 capability 展示、按钮禁用、聊天/生图可用性和错误提示；避免使用生产 API key 进入日志或文档。

## 文档维护

- [ ] 后续文档只更新当前事实、长期规则、边界和未闭环事项；不要重新创建历史 Goal 执行包、阶段提示词、平行路线图或过程性复核堆栈。
- [ ] 若新增、修改或删除规范文档，先读 `docs/ai/maintenance.md` 和 `docs/ai/index.md`；优先更新已有专题文档。
