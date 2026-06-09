# Codex Goal 模板

```text
Goal：
[一句话说明本次目标]

Background：
当前项目是 Tauri2 + Vue3 + Rust + Python sidecar。
必须遵守 AGENTS.md。
必须遵守 docs/ai/creative-architecture-guardrails.md。
现有 AI Provider 测试链路必须保留。

Allowed Scope：
- [允许改的模块]
- [允许新增的文件]
- [允许新增的测试]

Out of Scope：
- 不引入 Redis
- 不引入远程 worker
- 不重写现有 AI Provider 页面
- 不让 Vue 直连 Python
- 不把 AI workflow 写进 Rust
- 不破坏现有图片落盘策略

Requirements：
1. ...
2. ...
3. ...

Acceptance Criteria：
1. ...
2. ...
3. ...

Verification：
- npm run check:architecture
- npm run typecheck
- bash scripts/check_creative_boundaries.sh
- 必要时 npx tauri build --no-bundle

Report：
完成后请输出：
- 修改了哪些文件
- 为什么这样改
- 没有做哪些范围外事项
- 如何验证
- 有哪些风险
- 下一步建议
```
