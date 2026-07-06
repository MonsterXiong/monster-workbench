# 架构决策记录 (ADR)

本文件记录项目中的重要架构决策，帮助 AI 理解"为什么这么做"，而不仅仅是"怎么做"。

每条 ADR 包含：日期、背景、决策、后果（好处 + 成本）。

---

## ADR-001：仅限 Tauri 原生整体更新

- **日期**：2025 年
- **背景**：早期曾考虑自定义 Vue 资源热更新方案（独立于 Tauri 更新），以实现前端快速迭代。但该方案引入了复杂的资源管理、版本对齐、回滚逻辑，且需要额外的 Rust 依赖（`reqwest`、`zip`、`sha2` 等）。
- **决策**：剔除所有自定义热更新逻辑，仅使用 Tauri 原生更新机制 `@tauri-apps/plugin-updater`。
- **后果**：
  - ✅ 大幅简化了更新流程和代码量
  - ✅ 减小了 Rust 二进制体积（剔除了 reqwest/zip/sha2/hex 等依赖）
  - ✅ 降低了安全风险（不再自行处理下载和解压）
  - ⚠️ 前端每次更新必须跟随 Tauri 整体打包发布

---

## ADR-002：严控 Rust 依赖体积

- **日期**：2025 年
- **背景**：Tauri 桌面应用的安装包大小直接影响用户下载和安装体验。Rust 编译的二进制体积随依赖增加而显著膨胀。
- **决策**：`Cargo.toml` 中禁止引入无关外部依赖，优先使用 `std` 标准库；序列化使用 `serde` / `serde_json`，本地数据持久化使用 `rusqlite`，Tauri 能力只保留当前业务需要的官方插件。
- **后果**：
  - ✅ 安装包保持精简
  - ✅ 编译速度更快
  - ⚠️ 某些功能需要手动实现而非引入现成库

---

## ADR-003：前端分层架构

- **日期**：2025 年
- **背景**：Tauri 应用中前后端交互通过 IPC（`invoke`）完成。如果页面组件直接调用 Tauri API，会导致业务逻辑散落各处、难以测试、浏览器预览失效。
- **决策**：强制分层调用链 `Vue Component → Pinia Store → Frontend Service → callTauri → Rust Command → Rust Service → DB/Repo`。禁止跨层调用。
- **后果**：
  - ✅ 职责清晰，每一层有明确边界
  - ✅ 支持浏览器预览（Service 层可降级）
  - ✅ 便于单元测试（各层可独立 mock）
  - ⚠️ 简单功能也需要穿透多层，初期开发略显繁琐

---

## ADR-004：基础组件封装与 Tailwind 自定义视觉方案

- **日期**：2025 年
- **背景**：项目需要一套轻量、美观、支持暗色模式且适合 Windows WebView2 的桌面 UI 方案。直接在页面中混用第三方组件会导致视觉风格和交互边界难以统一。
- **决策**：业务页面优先使用项目 `Base*` 基础组件和 `workbench-*` 原子类。Element Plus 通过基础组件封装后使用，自定义布局与视觉效果通过 Tailwind CSS 和 scoped CSS 实现。
- **后果**：
  - ✅ 业务页面风格更统一，基础交互由公共组件兜住
  - ✅ Tailwind 与 scoped CSS 能覆盖桌面端紧凑布局和暗色模式
  - ✅ Element Plus 能补足复杂控件能力，但不会直接扩散到所有页面
  - ⚠️ 新增公共组件时需要同步 `main.ts` 全局注册和 `env.d.ts` 类型声明

---

## ADR-005：保持 AGENTS.md 简短

- **日期**：2026 年
- **背景**：随着项目发展，开发规范越来越多。如果全部堆进 `AGENTS.md`，会导致文件过长、AI 上下文浪费、维护困难。
- **决策**：`AGENTS.md` 只保留全局红线和文档导航。细节规范拆入 `docs/` 专题文档。AI 协作治理拆入 `docs/ai/`。
- **后果**：
  - ✅ `AGENTS.md` 保持 200 行以内，入口清晰
  - ✅ AI 按需阅读，节省上下文 token
  - ✅ 各专题文档可独立更新，互不影响
  - ⚠️ 需要维护文档索引和导航表

---

## ADR-006：AI 原子能力统一调度与 sidecar 受控运行时

- **日期**：2026 年 06 月
- **背景**：AI 工作台同时包含 Provider 配置诊断、原子能力测试、模型对话、模型生图和图片工作台。若业务页面直接调用 Provider、直接持有完整模型配置或让 Python sidecar 自管任务状态，会导致 API Key 暴露、取消/恢复不一致、大图视频进入前端状态树、Provider 差异扩散到页面层。
- **决策**：全局统一为 `AI Provider -> 模型配置 -> capability binding -> 原子能力 / 业务 generation task -> 业务 job/task`。Provider 配置面板只承担配置诊断与原子测试；业务入口默认走 `enqueue_ai_business_generation` 或工作台后端 runner。Python sidecar 当前保持短生命周期脚本，后续可升级成长驻 worker 或 `externalBin` 二进制，但必须继续由 Rust Service 独占调度，统一控制启动、停止、超时、取消、并发槽位、heartbeat/lease、artifact 输出目录、脱敏日志和恢复状态。
- **后果**：
  - ✅ 业务页面不携带完整 Provider config/API Key，降低泄露和越层风险
  - ✅ 队列、取消、并发、恢复、审计和 artifact 管理统一收敛，后续扩展 `img2img`、`inpaint`、`upscale`、音视频时只扩原子能力合同
  - ✅ Python sidecar 升级路径清晰，可以从脚本平滑演进为 worker 或二进制 sidecar
  - ⚠️ 调用链比直连长，简单功能也需要经过 Store、Service、Command、Rust Service 和任务注册层；性能优化必须通过缓存、异步 job/task、轻量状态轮询和 artifact path/metadata 管理解决，而不是绕开原子能力层

---

## 如何新增 ADR

当项目做出重要架构决策时，在本文件追加一条新 ADR：

```markdown
## ADR-NNN：[决策标题]

- **日期**：YYYY 年 MM 月
- **背景**：[为什么需要这个决策？问题是什么？]
- **决策**：[具体选择了什么方案？]
- **后果**：
  - ✅ [好处1]
  - ✅ [好处2]
  - ⚠️ [成本/风险1]
```

如果旧 ADR 因项目演进而失真，应直接更新内容或移除过时条目，不再依赖显式状态标签表达。
