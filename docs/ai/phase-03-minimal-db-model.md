# Phase 03：最小数据库模型

## 对 Codex 说

```text
请执行 docs/goals/goal_01_minimal_db_model.md。

强制要求：
1. 严格遵守 AGENTS.md；
2. 先阅读现有 SQLite / Rust DB / Repo / Service 文件；
3. 不修改现有 AI Provider 测试链路；
4. 不替换 AiProviderService 内存队列；
5. 不引入 Redis；
6. 不引入 Python FastAPI；
7. 不重写 src/stores/ai.ts；
8. 所有新增前端调用必须遵守项目标准调用链；
9. 完成后运行 npm run check:architecture、npm run typecheck；
10. 涉及 Rust 时运行 npx tauri build --no-bundle。
```
