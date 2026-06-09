# 代码审查与自检清单

AI 在完成每次代码修改后，应对照本清单进行自检。不需要每次检查所有项，根据任务类型选择对应章节。

---

## 1. 通用自检（每次必做）

- [ ] 修改是否解决了用户提出的问题？
- [ ] 是否只修改了相关文件，没有动无关文件？
- [ ] 是否引入了新依赖？如果是，用户是否明确要求？
- [ ] 是否遵守了项目现有目录结构和命名规范？
- [ ] 代码风格是否与周围代码一致？
- [ ] 是否有重复实现（项目中已有相同功能的代码）？
- [ ] 是否考虑了性能影响？
- [ ] 是否有安全风险？
- [ ] 是否已按改动范围运行 `npm run typecheck`、`npm run check:architecture` 或 `npm run verify`？
- [ ] 是否需要额外运行 sidecar、Tauri build 或发布 dry-run 相关命令？如果需要，是否已选择最小但足够的门禁？
- [ ] 如果创建了提交，Commit message 是否符合 `类型：中文概要`，本地 hook 是否已启用，并通过 `npm run check:commit-message`？

---

## 2. Vue / 前端专项（涉及 .vue / .ts 文件时）

- [ ] Props / Emits 是否使用 TypeScript 接口声明了类型？
- [ ] 模板中是否有复杂表达式？（应使用 `computed` 提取）
- [ ] 是否滥用了 `watch`？（优先考虑 `computed`）
- [ ] 定时器、事件监听是否在 `onBeforeUnmount` 中清理？
- [ ] 可复用逻辑是否抽离到了 `composables/`？
- [ ] 涉及文案的地方是否使用了 `t()` 国际化函数？
- [ ] 样式是否加了 `scoped`？是否复用了现有 `Base*` 基础组件、Element Plus 封装组件和项目样式原子类？
- [ ] 路由历史模式是否使用了 Hash 模式 (`createWebHashHistory`)，以防 Tauri 本地环境刷新 404？

---

## 3. Rust 专项（涉及 src-tauri/ 下文件时）

- [ ] Command 层是否保持了"薄代理"（不超过 5 行业务逻辑）？
- [ ] 错误信息是否中文化（优先使用 `AppResult` / `AppError`，Command 层用 `to_json_string()` 转给前端）？
- [ ] 是否避免了 `.unwrap()` / `panic!()`？（对于 `Mutex` 的锁获取，必须使用 `unwrap_or_else(|e| e.into_inner())` 以防锁毒化后引起应用崩溃）
- [ ] 路径操作是否有 `..` 穿透检测？（特别是批量目录物理创建、数据库备份等导出导入，必须防御路径遍历与注入）
- [ ] 是否遵守了最小依赖原则（优先使用 `std` 标准库）？

---

## 4. 安全检查（每次必做）

- [ ] 没有硬编码密钥、token、密码、API key。
- [ ] 没有使用 `v-html` 渲染不可信内容。
- [ ] 没有绕过登录、权限、审计逻辑。
- [ ] 没有在日志中输出 token / 密码 / 隐私信息。
- [ ] 用户输入没有直接拼接为 HTML 或未编码 URL。
- [ ] 没有擅自引入新的外部依赖。

---

## 5. 发布 / CI / sidecar 检查（涉及脚本、workflow、Rust sidecar 或发版链路时）

- [ ] 是否保持 `.github/workflows/release.yml` 的 tag 触发逻辑不变？
- [ ] 是否同步更新 `package.json` npm 脚本、`docs/engineering-playbook.md` 和必要的入口文档？
- [ ] 是否保留 `.githooks/commit-msg` 与 release CI 中的 commit message 校验？
- [ ] 日常发布测试是否使用 `npm run release:test`，并确认 `publish_release=false` 不上传 Release？
- [ ] 正式发版前是否至少跑过一次 `npm run release:test:full`，覆盖安装包、updater artifacts 和签名链路？
- [ ] Python sidecar 或 Rust AI 服务变更后，是否运行 `npm run test:ai-sidecar`、`npm run test:ai-sidecar:stress`，并按需运行 Rust 检查？
- [ ] 打包、capabilities、Tauri 配置或 sidecar 资源变更后，是否运行 `npm run tauri:build:no-bundle`？
- [ ] 修改 `scripts/release.js` 时，是否保留 main 分支、干净工作区、版本号、重复 tag 和本地门禁检查？
- [ ] 发布脚本自动生成的提交信息是否符合 `类型：中文概要`？
- [ ] 如果使用 `SKIP_RELEASE_PREFLIGHT=1`，是否明确说明风险和已有替代验证结果？

---

## 6. 分层架构检查（涉及跨层调用时）

- [ ] 页面组件是否通过 Store 调用，而非直接调 Service？
- [ ] Service 层是否统一封装 Tauri 原生能力，IPC 调用是否通过 `callTauri()`？
- [ ] Store 内是否没有写复杂底层逻辑？
- [ ] 是否遵守了 `Vue Component → Store → Service → callTauri / Native Service Gateway → Rust` 调用链？
- [ ] 页面组件是否没有直接导入或调用 Tauri 原生插件（如 `@tauri-apps/plugin-dialog` 等，应统一封装到前端 Service 层）？
- [ ] 数据库读写是否避免前端直驱 SQLite，并优先向 Rust Command / Service / Repository 收敛？
- [ ] 是否没有重新引入 `@tauri-apps/plugin-sql`、`tauri-plugin-sql`、SQL capability 或任何前端 SQL 直驱通道？
- [ ] 文件读写是否走受限 Rust Command，而不是直接依赖、注册或开放 `@tauri-apps/plugin-fs`、`tauri-plugin-fs`、`fs:default`？
- [ ] `assetProtocol.scope` 是否没有放宽到整个 `$HOME/**/*`？
- [ ] 是否确保组件以外的 Composables 和 Stores 中，同样没有直接导入或调用原生 Tauri APIs（如 `@tauri-apps/api/*` 或 `@tauri-apps/plugin-*`）？
- [ ] 是否确保 `src/composables/` 没有直接导入 `src/services/*`，只通过 Store 使用底座能力？
- [ ] 是否确保 `src/stores/` 没有直接导入 `src/services/tauri`，而是通过模块 Service 调用底座网关？
- [ ] 是否运行并通过 `npm run check:architecture`？

---

## 7. 国际化检查（涉及文案改动时）

- [ ] `zh-CN.ts` 和 `en-US.ts` 是否对称声明了 key？是否针对新增或修改的页面内联 `t('...')` 键名进行了逐一对比，保证双语包中均无遗漏，以防 fallback 时直接退化显示 Raw Key（如 `tools.base64.clearBtn`）？
- [ ] 表头 columns 是否用 `computed` 包装以支持语言热切换？
- [ ] 全局组件 props 默认值是否避免了硬编码中文？
- [ ] 是否存在通过中文字符串匹配控制 UI 的代码？（应改用布尔状态变量）

---

## 8. 输出规范

### 修改代码时，应说明：

| 维度 | 说明 |
|------|------|
| 修改目标 | 本次修改要解决什么问题 |
| 涉及文件 | 修改了哪些文件 |
| 关键变更 | 具体改了什么 |
| 风险点 | 可能影响的其他功能 |
| 验证方式 | 如何验证修改是否正确 |

### 排查问题时，应说明：

| 维度 | 说明 |
|------|------|
| 可能原因 | 问题的潜在根因 |
| 排查路径 | 定位问题的步骤 |
| 最小修复 | 最小改动的修复方案 |
| 长期建议 | 彻底解决的优化建议 |

### 无法确认项目事实时：

明确说明假设，不得编造。使用"我假设……"而非"这里是……"。
