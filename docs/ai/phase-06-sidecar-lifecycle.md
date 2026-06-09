# Phase 06：SidecarLifecycleService

## 对 Codex 说

```text
请执行 docs/goals/goal_04_sidecar_lifecycle_service.md。

要求：
1. Rust 新增 SidecarLifecycleService；
2. 支持 stopped / starting / running / unhealthy / stopping / failed；
3. Rust 负责端口、runtime token、health check；
4. Vue 只能通过 Rust 查询 sidecar 状态；
5. 默认不替换现有 ai_provider_tester.py；
6. 不让 Vue 直连 Python；
7. 不引入复杂 worker 池。
```
