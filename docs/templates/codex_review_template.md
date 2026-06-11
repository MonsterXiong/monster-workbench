# Codex Review 模板

```text
请作为 Architecture Guardian 审查本次改动。

请重点检查：
1. 是否违反 AGENTS.md；
2. 是否违反 docs/ai/creative-architecture-guardrails.md；
3. Vue 是否直连 Python；
4. 是否出现组件/Store 直接 invoke；
5. 是否提前引入 Redis / Postgres / remote worker；
6. 是否破坏现有 AI Provider 测试链路；
7. 是否把小说/prompt/审查业务写进 Rust；
8. 是否把大图/base64 传入前端状态；
9. 是否修改了不相关文件；
10. 是否需要更新 docs/architecture-current-state.md、agent/open-loops.md 或 TODO.md。

请输出：
- Approved / Not Approved
- 必须修改项
- 风险
- 建议合并顺序
```
