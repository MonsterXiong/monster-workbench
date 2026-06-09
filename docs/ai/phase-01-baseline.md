# Phase 01：建立当前项目基线

## 目的

在任何代码改造之前记录当前能跑什么，不能跑什么。

## 对 Codex 说

```text
请建立当前项目基线。

要求：
1. 阅读 AGENTS.md 和 docs/ai/creative-regression-checklist.md；
2. 不修改代码；
3. 识别当前项目中与 AI Provider、Rust IPC、Python sidecar、SQLite、图片落盘、取消机制相关的关键文件；
4. 建议应该运行哪些检查命令；
5. 输出一份 BASELINE 草案，说明当前必须保留的功能和后续回归项。

不要执行大范围重构。
```

## 建议你本地运行

```bash
npm run check:architecture
npm run typecheck
npm run verify
```

涉及 Rust：

```bash
npx tauri build --no-bundle
```

## 结果记录

把失败和通过都记录到：

```text
docs/ai/creative-master-plan.md
agent/open-loops.md
```
