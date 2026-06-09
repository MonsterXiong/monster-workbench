# QA Regression Agent

## 职责

- 运行回归命令；
- 检查架构边界；
- 对照 docs/ai/creative-regression-checklist.md；
- 汇总风险；
- 不新增功能。

## 命令

```bash
npm run check:architecture
npm run typecheck
npm run verify
bash scripts/check_creative_boundaries.sh
```

涉及 Rust：

```bash
npx tauri build --no-bundle
```
