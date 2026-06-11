# AI 文档索引与治理元规范

本文件是 `docs/ai/` 的当前入口，只保留仍会影响后续协作的规则与边界。历史 Phase / Goal 执行包已经清理，后续不要新增平行路线图或一次性提示词包。

> 原则：按需阅读，不要默认读取所有文档；先看当前代码事实，再看约束文档。

---

## 1. 首读顺序

重要任务优先按这个顺序进入：

```text
AGENTS.md
  -> docs/architecture-current-state.md（理解当前架构事实）
  -> docs/architecture.md（分层与目录红线）
  -> 当前任务对应的专题文档
```

涉及持续型 AI 创作系统、Goal、多 Agent、任务队列、资产、sidecar 或审查返工时，再读：

```text
docs/ai/codex-goal-mode.md
docs/ai/creative-architecture-guardrails.md
docs/ai/creative-regression-checklist.md
```

---

## 2. 当前有效文档

### AI 协作治理

| 文档 | 用途 |
|------|------|
| `codex-goal-mode.md` | 长目标拆分、验收、合并方式 |
| `creative-architecture-guardrails.md` | 创作系统边界与禁止项 |
| `multi-agent-operating-model.md` | 多 Agent 并行与串行合并规则 |
| `creative-regression-checklist.md` | 创作系统改动后的回归清单 |
| `review-checklist.md` | 常规代码审查与自检 |
| `decisions.md` | 架构决策记录 |
| `maintenance.md` | 文档新增、修改、删除规则 |

### 创作系统专题边界

| 文档 | 用途 |
|------|------|
| `task-state-machine.md` | `creative_tasks` 状态语义、流转、事件 |
| `database-migration-policy.md` | SQLite schema / repo / migration 约束 |
| `workflow-runtime-boundary.md` | Vue / Rust / Python / Provider 职责边界 |
| `execution-budget-and-kill-switch.md` | 批量任务、预算、熔断、暂停取消 |
| `model-provider-observability.md` | 模型调用审计、`model_runs` 与脱敏 |
| `asset-versioning-and-provenance.md` | 资产版本、来源、关系 |
| `python-sidecar-packaging-strategy.md` | Python sidecar 发布、预检、错误呈现 |
| `security-threat-model.md` | 权限、端口、密钥、大对象与高风险操作 |

---

## 3. 按任务类型阅读

### 新增页面 / 模块

```text
必读: AGENTS.md -> engineering-playbook.md -> architecture.md -> frontend-style.md -> i18n.md
可选: global-components.md（新增公共组件时）
完成后: review-checklist.md
```

### 修改 Vue 组件 / Store / Service

```text
必读: AGENTS.md -> architecture.md -> frontend-style.md
Store / Service: 追加阅读 engineering-playbook.md、error-code.md
涉及 Tauri / HTTP: 追加阅读 request-and-tauri.md
完成后: review-checklist.md
```

### Rust 后端 / DB / Tauri

```text
必读: AGENTS.md -> engineering-playbook.md -> rust-backend.md -> error-code.md
涉及 DB: 追加阅读 docs/ai/database-migration-policy.md
涉及 creative task: 追加阅读 docs/ai/task-state-machine.md
```

### 持续型 AI 创作系统

```text
必读: AGENTS.md -> docs/architecture-current-state.md -> codex-goal-mode.md -> creative-architecture-guardrails.md
按需: task-state-machine.md、workflow-runtime-boundary.md、execution-budget-and-kill-switch.md
按需: model-provider-observability.md、asset-versioning-and-provenance.md、security-threat-model.md
完成后: creative-regression-checklist.md
```

### 多 Agent 并行

```text
必读: AGENTS.md -> codex-goal-mode.md -> multi-agent-operating-model.md
必须: 串行合并、串行验收，不并行改高冲突文件
```

### 新增 / 修改 / 删除规范文档

```text
必读: AGENTS.md -> maintenance.md -> 本文件
原则: 先查重；优先更新旧文档；过期文档直接删除
```

---

## 4. 文档更新规则

1. 文档必须与当前代码事实一致；不确定时先读代码。
2. 长期有效规则进入专题文档；全局红线才进入 `AGENTS.md`。
3. 已完成阶段、历史提示词、一次性执行包不再保留在 `docs/`。
4. 未闭环事项写入 `agent/open-loops.md` 或 `TODO.md`。
5. 新增文档前先确认不能合并到已有文档。

---

## 5. 文档膨胀检查

- `AGENTS.md` 是否只保留全局红线？
- 是否存在重复路线图、重复清单、重复架构摘要？
- 是否有文档仍引用已删除或已完成的历史阶段？
- 是否有文档描述已经不符合当前代码？
- 是否可以用脚本、类型或测试替代文档约束？
