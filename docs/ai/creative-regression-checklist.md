# 创作系统改造回归检查清单

## 1. 必跑命令

普通前端/架构变更：

```bash
npm run check:architecture
npm run typecheck
npm run verify
```

涉及 Rust / capabilities / 打包：

```bash
npx tauri build --no-bundle
```

创作系统边界检查：

```bash
bash scripts/check_creative_boundaries.sh
```

AI Provider / Rust AI 服务 / Python sidecar 测试链路变更：

```bash
npm run test:ai-sidecar
```

涉及 provider 队列、取消、并发、生图输出、响应体限制或脱敏时继续运行：

```bash
npm run test:ai-sidecar:stress
cargo test --manifest-path .\src-tauri\Cargo.toml ai_service
```

## 2. 现有功能不得破坏

- AI Provider 配置页面仍可打开
- Provider 测试链路仍可用
- 对话测试仍可用
- 生图测试仍可用
- 图片仍落盘而非进入前端大 base64
- 日志仍脱敏
- 取消机制仍可用
- 现有 SQLite / 导航 / 文件权限能力不被放宽

## 3. 分层检查

确认没有新增：

- 组件直接 `invoke`
- 组件直接导入 `@tauri-apps/*`
- 组件直接导入 `src/services/*`
- store 直接导入 `src/services/tauri`
- 非 `src/services/request.ts` 直接 `fetch`
- 非 `src/services/tauri.ts` 直接 `invoke`
- Vue 直接 fetch `127.0.0.1` / `localhost` Python

## 4. 禁止项检查

确认没有：

- Redis
- Postgres
- remote worker
- 前端 SQL 插件
- 前端 FS 插件
- assetProtocol 放宽到 `$HOME/**/*`
- 替换 Tauri updater
- 修改 `.github/workflows/release.yml` 触发逻辑
- 大图 base64 入 store
- 业务 workflow 写进 Rust
- sub2api/cockpit 承担业务逻辑

## 5. 每个 Goal 完成报告

必须包含：

- 修改文件
- 为什么这样改
- 没有做什么
- 验证命令
- 通过/失败项
- 风险
- 下一步建议

## 6. AI Provider 最小回归

适用范围：

- `src-tauri/sidecars/python/ai_provider_tester.py`
- `src-tauri/sidecars/python/test_ai_provider_tester.py`
- `src-tauri/sidecars/python/stress_ai_provider_tester.py`
- `src-tauri/src/services/ai_service.rs`
- `src-tauri/src/commands/ai.rs`
- `src/services/ai.service.ts`
- `src/services/ai-provider-queue-sync.ts`
- `src/stores/ai-provider-runtime.ts`
- `src/views/ai/components/AiProviderPanel.vue`
- `src/views/ai/components/AiChatPanel.vue`
- `src/views/ai/components/AiImagePanel.vue`

脚本级回归：

- `npm run test:ai-sidecar` 覆盖 mock OpenAI-compatible provider 的 models / chat / image contract。
- 该脚本覆盖模型列表数量上限、长模型名截断、AnyRouter Anthropic 模型 ID 归一、长文本截断、非生图 action 不依赖输出目录、生图 b64 / URL 落盘、超大或受限图片 URL、超大 b64、无效输出目录和密钥脱敏。
- `npm run test:ai-sidecar:stress` 重复执行 models / chat / b64 image / URL image，并断言图片保存为本地文件、输出不泄露 `data:image` base64、错误中密钥已脱敏。

Rust 服务回归：

- 修改 `AiProviderService` 队列、取消、并发、配置校验、stdout / stderr 限制或生成文件清理时，运行 `cargo test --manifest-path .\src-tauri\Cargo.toml ai_service`。
- 该 Rust 测试覆盖 task registry、队列运行槽、串行/并发 key、取消 queued task、唤醒等待请求、等待超时、队列饱和状态、配置长度与生图尺寸白名单、sidecar 输出上限、非生图 action 不创建输出目录、Python sidecar 隔离环境和 cancel token。

前端分层回归：

- 修改 AI Provider 页面、runtime store 或 `ai.service.ts` 后，运行 `npm run check:architecture` 和 `npm run typecheck`。
- 确认页面仍走 `AiPage/AiProviderPanel/AiChatPanel/AiImagePanel -> useAiStore / ai-* runtime store -> ai.service.ts -> callTauri -> commands::ai -> AiProviderService -> ai_provider_tester.py`。
- 确认页面没有直接调用 `invoke()`、`fetch()`、`@tauri-apps/*` 或 Python localhost 端口。
- 确认生图结果仍通过 `imagePaths -> convertFileSrc()` 展示，不把大图 base64 放入 store。

手工 smoke：

- 有可用本地 mock 或用户提供的真实 OpenAI-compatible provider 时，在 `/ai` 页面分别跑模型列表、聊天测试和生图测试。
- 队列模式改动后，至少检查 queued / running / succeeded / failed 状态呈现、取消 queued task 和后端队列状态同步。
- 生图链路改动后，检查图片可预览、可打开文件位置，并确认日志和错误提示不包含 API key。

不作为完成证据：

- 只跑 `npm run verify` 不能证明 AI Provider Python contract 未破坏。
- 只打开 `/ai` 页面不能证明 Rust 队列、取消、输出限制或脱敏正确。
- `ai_provider_tester.py` 仍是一次性 provider 测试脚本，不能把它当作正式 creative workflow runtime 的回归证据。
