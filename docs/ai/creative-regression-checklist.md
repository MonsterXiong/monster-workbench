# 创作系统改造回归检查清单

## 1. 必跑命令

普通前端/架构变更：

```bash
npm run check:architecture
npm run typecheck
npm run verify
```

涉及 Rust / capabilities / 打包：

```bash
npx tauri build --no-bundle
```

创作系统边界检查：

```bash
bash scripts/check_creative_boundaries.sh
```

## 2. 现有功能不得破坏

- AI Provider 配置页面仍可打开
- Provider 测试链路仍可用
- 对话测试仍可用
- 生图测试仍可用
- 图片仍落盘而非进入前端大 base64
- 日志仍脱敏
- 取消机制仍可用
- 现有 SQLite / 导航 / 文件权限能力不被放宽

## 3. 分层检查

确认没有新增：

- 组件直接 `invoke`
- 组件直接导入 `@tauri-apps/*`
- 组件直接导入 `src/services/*`
- store 直接导入 `src/services/tauri`
- 非 `src/services/request.ts` 直接 `fetch`
- 非 `src/services/tauri.ts` 直接 `invoke`
- Vue 直接 fetch `127.0.0.1` / `localhost` Python

## 4. 禁止项检查

确认没有：

- Redis
- Postgres
- remote worker
- 前端 SQL 插件
- 前端 FS 插件
- assetProtocol 放宽到 `$HOME/**/*`
- 替换 Tauri updater
- 修改 `.github/workflows/release.yml` 触发逻辑
- 大图 base64 入 store
- 业务 workflow 写进 Rust
- sub2api/cockpit 承担业务逻辑

## 5. 每个 Goal 完成报告

必须包含：

- 修改文件
- 为什么这样改
- 没有做什么
- 验证命令
- 通过/失败项
- 风险
- 下一步建议
