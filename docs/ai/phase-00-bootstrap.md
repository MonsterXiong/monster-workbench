# Phase 00：启动 Codex 并进入规则模式

## 目的

让 Codex 先读规则，不改代码。

## 对 Codex 说

```text
请先阅读以下文件：

1. AGENTS.md
2. docs/ai/codex-goal-ops-manual.md
3. docs/ai/codex-goal-mode.md
4. docs/ai/creative-architecture-guardrails.md
5. docs/ai/creative-system-roadmap.md
6. docs/ai/creative-regression-checklist.md
7. docs/ai/multi-agent-operating-model.md

不要修改代码。

请只总结：
1. 当前项目的全局红线；
2. 当前项目的标准调用链；
3. Codex Goal 模式的推进规则；
4. 当前阶段禁止提前做的事情；
5. 下一步推荐执行的 Goal。
```

## 你要检查 Codex 的回答

必须包含：

- 不覆盖 AGENTS.md；
- Vue 不直连 Python；
- Rust 是前端唯一后端入口；
- Python 常驻服务后置；
- 队列先 SQLite-backed；
- 不引入 Redis；
- 不破坏 AI Provider 测试链路；
- 遵守 `npm run check:architecture`。
