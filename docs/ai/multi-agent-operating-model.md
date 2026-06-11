# 多 Agent 并行操作模型

## 1. 总原则

多 Agent 可以并行开发，但必须串行合并。

```text
并行设计
并行草案
并行原型
串行合并
串行验收
```

## 2. 角色

### Architecture Guardian

职责：

- 审查架构边界；
- 防止 Vue 直连 Python；
- 防止过早 Redis / FastAPI 替换；
- 防止 Rust 承载业务 workflow；
- 防止破坏现有 Provider 测试链路。

### Rust Backend Agent

职责：

- SQLite migration；
- Rust Service；
- Tauri commands；
- TaskService；
- SidecarLifecycleService；
- Event bridge；
- Rust 权限和文件边界。

禁止：

- 小说/剧本/审查业务；
- prompt 业务；
- Vue UI；
- Python workflow。

### Python Engine Agent

职责：

- Python sidecar stub；
- health server；
- provider client；
- worker skeleton；
- workflow skeleton；
- image processing；
- review skeleton。

禁止：

- Vue UI；
- Tauri capability；
- Rust IPC command；
- 提前替换现有 ai_provider_tester.py。

### Vue UI Agent

职责：

- task center UI；
- task event listener；
- asset list UI；
- debug panel；
- 前端服务封装。

禁止：

- 直接 Python fetch；
- 直接 invoke；
- 复杂后端状态机；
- 大规模重写 ai.ts。

### DB Migration Agent

职责：

- SQLite schema；
- indexes；
- repository；
- migration tests。

禁止：

- UI；
- Python workflow；
- Redis/Postgres。

### QA Regression Agent

职责：

- 跑检查；
- 对照回归清单；
- 检查边界；
- 汇总风险。

## 3. 什么时候可以并行

不建议在以下阶段并行：

- 当前任务的边界还不清楚；
- 代码事实还没有核对；
- 需要同时触碰多个高冲突文件；
- 验收命令和合并顺序还没有确定。

可以并行的阶段：

- 并行设计或草案；
- 前后端 contract 已稳定后的 UI / Rust / Python 分工；
- QA 回归与实现任务并行；
- 文档校对与代码实现并行，但文档必须以最终代码事实为准。

## 4. 高冲突文件

以下文件不允许多个 Agent 同时修改：

```text
AGENTS.md
src/stores/ai.ts
src-tauri/src/services/ai_service.rs
src-tauri/tauri.conf.json
src-tauri/sidecars/python/ai_provider_tester.py
SQLite migration 核心文件
```

## 5. 分支建议

```text
codex/<domain>-<intent>
codex/creative-batch-hardening
codex/ai-provider-observability
codex/python-sidecar-runtime
codex/architecture-doc-cleanup
```

## 6. 合并顺序

```text
先合并底层 contract / migration
再合并 Rust service / command
再合并 frontend service / store
再合并 UI
最后合并 QA / 文档收口
```
