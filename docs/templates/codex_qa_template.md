# Codex QA 模板

```text
请作为 QA Regression Agent 验证本次 Goal。

请执行或建议执行：
1. npm run check:architecture
2. npm run typecheck
3. npm run verify
4. bash scripts/check_creative_boundaries.sh
5. 如果涉及 Rust/capabilities/打包，运行 npx tauri build --no-bundle

请检查：
- 现有 AI Provider 测试链路是否受影响；
- 图片落盘策略是否保持；
- Vue 是否直连 Python；
- 是否新增前端 SQL / FS 直驱；
- 是否提前引入 Redis / 远程 worker；
- 是否修改了 Tauri 更新机制；
- 是否符合 docs/ai/creative-regression-checklist.md。

请输出：
- 执行的命令；
- 通过项；
- 失败项；
- 未执行项及原因；
- 回归风险；
- 是否建议合并。
```
