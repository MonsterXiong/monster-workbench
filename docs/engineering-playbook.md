# 快速迭代工程手册

> 本手册把架构、目录、AI 协作、质量门禁和完成标准收敛成一条可执行路径。目标是让新增功能更快落地，同时减少越层调用、文案遗漏、浏览器/桌面端差异和回归风险。

---

## 1. 迭代原则

- 小步交付：一次任务只解决一个明确问题，避免顺手重构无关模块。
- 先读事实：修改前先读 `AGENTS.md`、相关专题文档和现有代码实现。
- 分层推进：新增能力默认走 `Page/Component -> Store -> Service -> callTauri -> Rust Command -> Rust Service -> Repo/DB`。
- 浏览器可预览：所有 Tauri 原生能力必须有浏览器降级或 Mock，不让 `http://localhost:1420` 直接崩溃。
- 文案可切换：用户可见文本进入 `locales/`，日志和异常保持 `[ERR_*] 中文描述`。
- 验证前置：每次代码变更后至少运行 `npm run typecheck`，涉及分层边界时运行 `npm run check:architecture`。

---

## 2. 推荐任务流

### 新增页面或模块

1. 读 `AGENTS.md`、`docs/architecture.md`、`docs/frontend-style.md`、`docs/i18n.md`。
2. 在 `src/views/<module>/` 创建路由页入口，复杂块放当前模块 `components/`。
3. 状态放 `src/stores/<module>.ts`，页面只装配状态和 UI。
4. 底座能力放 `src/services/<module>.service.ts`，IPC 统一走 `callTauri()`。
5. Rust 侧按 `commands -> services -> infra/repo` 拆分，Command 保持薄代理。
6. 新增 Tauri Command 时同步补 `src/services/tauri.mock.ts`。
7. 补齐 `zh-CN.ts` / `en-US.ts`，避免 Raw Key 出现在界面。
8. 运行 `npm run verify`；涉及 Rust / capabilities 时再运行 `npm run tauri:build:no-bundle`。

### 修复 Bug

1. 先复现或定位入口，不先改架构。
2. 判断 bug 属于 UI、Store、Service、Rust、权限、Mock 还是文案层。
3. 做最小修复，并补一条能防止复发的检查：类型、脚本、文档或测试。
4. 运行与改动范围匹配的校验命令。

### UI 调整

1. 先复用 `Base*`、`workbench-*`、Element Plus 封装组件。
2. 页面局部重复样式放当前 `.vue` 的 `<style scoped>`。
3. 浅色主题不得出现大面积深色背景；深色模式必须可用。
4. 文案短、动作导向，避免说明性堆叠。
5. 浏览器预览和真实 Tauri 窗口都要抽查关键页面。

---

## 3. 目录职责

```text
src/
├─ layouts/        全局桌面壳层，只承载导航、页头、内容出口等稳定结构
├─ router/         路由、懒加载、路由状态
├─ views/          路由页入口和页面私有组件
├─ components/     跨页面复用组件，common/ 只放基础通用组件
├─ composables/    与 UI 状态或生命周期相关的复用逻辑，不直接调用底座能力
├─ stores/         Pinia 状态、页面编排、轻量业务动作
├─ services/       HTTP、Tauri、文件系统、数据库、Mock、底座网关
├─ types/          跨模块共享类型
├─ locales/        用户可见文案
└─ styles/         全局样式变量、基础原子类和主题

src-tauri/src/
├─ commands/       Tauri Command 薄代理
├─ services/       Rust 业务服务
└─ infra/          DB、文件、路径、日志、加密等基础设施
```

新增文件判断：

- 只被单个页面用：放 `views/<module>/components/`。
- 被多个页面复用：放 `components/` 或 `composables/`。
- 触碰 Tauri / 文件 / DB / HTTP：放 `services/`。
- 跨模块共享的接口类型：放 `types/`。
- 只是某个 service 内部类型：优先靠近 service 定义。

---

## 4. 分层规则

硬红线：

- 非 `src/services/` 不导入 `@tauri-apps/*`。
- `src/views/`、`src/components/`、`src/layouts/` 不直接导入 `src/services/*`。
- `src/composables/` 不直接导入 `src/services/*`。
- `src/stores/` 不直接导入 `src/services/tauri`，必须经模块 Service。
- 非 `src/services/tauri.ts` 不直接调用 `invoke()`。
- 非 `src/services/request.ts` 不直接调用 `fetch()`。
- 非 `src/services/` 不直接调用 `callTauri()`。
- 数据库读写不前端直驱 SQLite，禁止回引前端 SQL 插件或 SQL capability，优先走 Rust Command / Service / Repo。
- 文件读写不前端直驱文件系统插件，禁止直接依赖、注册或开放 FS 插件能力，必须走受限 Rust Command；`assetProtocol.scope` 不得放宽到整个 `$HOME/**/*`。

过渡规则：

- 存量页面/组件中的 service 直连已经纳入迁移对象，不在无关任务中强制大搬迁，但不得新增同类直连。
- 新增业务模块必须按标准调用链落地，不扩大 UI 层直连 service 的范围。
- 通用组件如路径选择、图片上传必须走 Store -> Service 适配，不直接导入 service 或 Tauri 插件。
- Composable 只放可复用 UI 组合逻辑。需要底座能力时，由 Store 暴露轻量动作给 composable 调用。

自动检查：

```bash
npm run check:architecture
```

---

## 5. AI 协作方式

AI 开始重要任务时：

1. 先读项目 `AGENTS.md` 和相关专题文档。
2. 用 `rg` 查真实代码，不凭记忆判断。
3. 先说明正在核对的上下文，再做小步修改。
4. 不引入新依赖、不升级核心依赖、不格式化无关文件。
5. 遇到存量不规范代码时，优先最小收口；大迁移单独开任务。

AI 修改代码后：

1. 运行 `npm run typecheck`。
2. 涉及分层边界时运行 `npm run check:architecture` 或 `npm run verify`。
3. 涉及 Rust / capabilities 时运行 `npm run tauri:build:no-bundle`。
4. 涉及 UI 时打开浏览器预览或真实 Tauri 窗口抽查。
5. 结束重要任务前更新 Codex 记忆库，只记录决策、状态和待跟进项。

AI 不应做：

- 把聊天临时想法直接写进 `AGENTS.md`。
- 为了“更现代”重写模块。
- 给过期文档加状态标签后继续保留误导信息；应直接更新或移除。

---

## 6. 质量门禁

| 命令 | 使用场景 |
|------|----------|
| `npm run check:architecture` | 检查 Tauri / IPC / fetch / SQLite 是否越层，并防止 SQL/FS 插件、capability 与宽 HOME asset scope 回引 |
| `npm run typecheck` | 每次 TS / Vue 代码变更后必须运行 |
| `npm run verify` | 普通前端任务完成前推荐运行 |
| `npm run tauri:dev` | 真实桌面联调 |
| `npm run tauri:build:no-bundle` | Rust、capabilities、打包链路变更后运行 |
| `npm run release:test` | 触发 GitHub Actions 快速发布 dry-run，不上传 Release |
| `npm run release:test:full` | 触发完整发布 dry-run，验证安装包、更新包和签名链路 |

完成定义：

- 用户问题已被直接解决。
- 变更范围可解释、可回滚。
- 分层边界没有新增破口。
- UI 文案、日志、错误码与 i18n 没有明显遗漏。
- 必要校验命令已通过。
- 重要决策和待跟进已写入记忆库。

---

## 7. 文档维护

- 高频全局红线放 `AGENTS.md`。
- 工程执行流程放本手册。
- 专题细节放 `docs/*.md`。
- AI 协作治理放 `docs/ai/*.md`。
- 文档必须和代码事实一致；规则过期时直接更新或删除。
