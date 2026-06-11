# Codex Goal 模式

## 1. 定义

Codex Goal 模式不是让 AI 一次性改完整个项目，而是把长期工程目标拆成可验收、可回滚、可并行、可串行合并的小目标。

每个 Goal 必须包含：

- Goal：本次目标
- Background：当前项目事实
- Allowed Scope：允许修改范围
- Out of Scope：明确不做
- Requirements：具体要求
- Acceptance Criteria：验收标准
- Verification：检查命令
- Report：完成后报告内容

## 2. 当前使用方式

早期从零到一的 Goal / Phase 执行包已经完成并清理。新的 Goal 必须从当前代码和当前文档出发：

```text
AGENTS.md
  -> docs/architecture-current-state.md
  -> docs/ai/creative-architecture-guardrails.md
  -> 当前任务对应的专题文档
```

不要重新执行历史 Goal 链路，也不要为了一个新任务再新增平行路线图。未闭环事项写入 `agent/open-loops.md` 或 `TODO.md`。

## 3. 为什么必须这样做

当前目标是把一个已有桌面端应用升级为持续型 AI 创作系统。这个目标横跨：

- Vue UI
- Pinia Store
- Frontend Service
- Tauri IPC
- Rust Service
- SQLite
- Python sidecar
- 模型 Provider
- 任务队列
- 资产库
- 审查返工
- 多 Agent 工作流

如果一次性让 Codex 修改所有层，很容易出现：

- 破坏现有 Provider 测试链路；
- Vue 直连 Python；
- Rust 承载过多业务逻辑；
- 提前引入 Redis / 远程 worker；
- 重写 `src/stores/ai.ts`；
- 生成不可维护的大型重构。

Goal 模式的核心是：**小步改造，持续验收，串行合并。**

## 4. 单个 Goal 的最大粒度

一个 Goal 应该满足：

- 可以在一个分支完成；
- 可以用明确命令验证；
- 可以独立回滚；
- 不跨太多高冲突文件；
- 不同时改 Vue / Rust / Python 三大层，除非是最小闭环类 Goal。

## 5. 合并原则

允许多 Agent 并行开发，但合并必须串行。

推荐：

```text
并行设计 / 并行草稿 / 并行原型
串行合并 / 串行验收 / 串行发布
```

## 6. 不允许的 Goal

以下 Goal 粒度过大，不允许直接执行：

```text
把系统改造成完整 AI 创作平台
实现小说、剧本、分镜、角色、场景、道具、审查和多 Agent
重写 AI 模块
替换 Python sidecar
引入 Redis 和远程 worker
```

应该拆成：

```text
当前事实核对
最小数据模型或迁移
单个 service / repo 边界
单条事件桥接
单个 workflow 或 worker 能力
单个 UI 工作台分区
单次回归检查
```
