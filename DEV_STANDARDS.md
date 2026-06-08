# Monster Workbench 开发规范（索引导航）

> **本文件为规范索引页。** 原 17 个章节的完整内容已拆分至 `docs/` 目录下的独立子文档中，便于按需检索和维护。

---

## 📚 文档索引

| # | 文档 | 核心内容 | 原章节 |
|---|------|---------|--------|
| 0 | [快速迭代工程手册](docs/engineering-playbook.md) | 架构、目录、AI 协作、质量门禁、完成标准 | 新增 |
| 1 | [架构与目录规范](docs/architecture.md) | 前端目录命名、分层调用链、组件化组装、开发流程命令 | §1, §2, §9, §10.C |
| 2 | [样式与视觉规范](docs/frontend-style.md) | 基础组件复用、Scoped @apply 安全、输入框边框、卡片物理隔离 | §7, §10.A/B, §15.A |
| 3 | [路由与异步规范](docs/routing-and-async.md) | vue-router 懒加载、异步加载状态、Base 状态组件复用 | §3, §4 |
| 4 | [请求与 Tauri 兼容](docs/request-and-tauri.md) | request.ts 封装、isTauriRuntime 降级策略 | §5, §6 |
| 5 | [国际化规范](docs/i18n.md) | 中文文案基准、useI18n 接入、词典同步、布尔状态解耦、分页/选择器 | §8, §14.B, §15.B, §16 |
| 6 | [错误码日志规范](docs/error-code.md) | [ERR_CODE] 格式、错误码注册表、ensureBrowserMessage、UI vs 日志区分 | §17 |
| 7 | [Rust 后端规范](docs/rust-backend.md) | 目录结构、commands/services 分层、Cargo 依赖、前后端命名映射 | §13 |
| 8 | [UI 模式与数据一致性](docs/ui-patterns.md) | 自动更新流、Modal 收纳、目录遍历防挂起、文件-DB 关联自愈 | §11, §12 |
| 9 | [全局组件注册](docs/global-components.md) | main.ts 全局挂载、GlobalComponents 类型声明、env.d.ts 模块化保护 | §14.A |

---

## 入口文件

AI 编码助手的首读入口为 [AGENTS.md](AGENTS.md)，其中包含核心约束与按需跳转的文档导航。
