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

- 文档护栏尚未建立；
- 最小数据库模型尚未落地；
- Codex 尚未正确理解 AGENTS.md。

可以并行的阶段：

- TaskService 与 Vue debug UI 草案；
- SidecarLifecycleService 与 Python health server 原型；
- QA 回归脚本与文档完善。

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
codex/goal-00-docs
codex/goal-01-db-model
codex/goal-02-task-service
codex/goal-03-event-bridge
codex/goal-04-sidecar-lifecycle
codex/goal-05-python-sidecar-stub
codex/goal-06-first-creative-workflow
```

## 6. 合并顺序

```text
Goal 00
  -> Goal 01
  -> Goal 02
  -> Goal 03
  -> Goal 04
  -> Goal 05
  -> Goal 06
```
