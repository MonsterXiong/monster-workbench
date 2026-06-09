# 前后端分层架构与目录规范

> 本文档约束项目的目录结构、分层调用链与组件化组装原则。
> 任务执行流程、质量门禁和 AI 协作方式详见 [快速迭代工程手册](engineering-playbook.md)。

---

## 1. 前端目录与命名规范

前端采用 `Vue 3 + Pinia + Vue Router + Tailwind CSS + Base* 基础组件 + Element Plus 封装组件`。目录职责如下：

```text
src/
├─ App.vue                    # 应用入口，只承载壳层
├─ main.ts                    # 注册 Pinia / Router 并挂载
├─ layouts/                   # 全局桌面壳层，例如 AppShell/Layout
├─ router/                    # 路由定义、懒加载、路由状态
├─ views/                     # 路由页根目录，按模块划分子文件夹（小驼峰命名）
│  ├─ workspace/              # 工作台模块（小驼峰命名）
│  │  ├─ WorkspacePage.vue    # 工作台路由主入口壳组件
│  │  └─ components/          # 仅当前工作台页面使用的私有专属组件
│  ├─ system/                 # 系统能力模块
│  │  ├─ SystemPage.vue       # 系统能力路由主入口壳组件
│  │  └─ components/          # 仅系统能力页面使用的私有专属组件
│  └─ settings/               # 偏好设置模块
│     ├─ SettingsPage.vue     # 偏好设置路由主入口壳组件
│     └─ components/          # 仅偏好设置页面使用的私有专属组件
├─ components/                # 跨页面复用的公共组件与业务组件（非单页专属）
│  └─ common/                 # 全局基础公共组件（如 BaseEmpty / BaseLoading / BaseError）
├─ composables/               # 可复用异步状态、表单逻辑
├─ stores/                    # Pinia 状态管理
├─ services/                  # 前端服务层、请求层、Tauri 网关
├─ types/                     # TS 类型定义
└─ styles/                    # 全局样式目录
```

### 硬性要求

- **小驼峰命名目录**：`views/` 下面的业务文件夹必须严格使用小驼峰（camelCase）命名法（例如 `workspace`、`system`、`settings`）。
- **组件私有与公共隔离**：
  - 如果一个组件**仅被当前单个路由页面使用**，必须放置在当前页面文件夹下的 `components/` 目录中。
  - 只有当组件被**多个页面（跨路由/模块）复用**时，才可以放置在全局的 `src/components/` 目录中（如公共组件库 `components/common`）。
- **页面级间距规范**：
  - 正常的业务页面在开发时不应当自行声明上下左右的外边距或内边距（如页面级 `p-4`、`p-5`、`m-4` 等），且宽度一律保持 `w-full`（100% 铺满）。
  - 页面四周的间距统一由外层全局布局组件 `AppContent.vue` 的全局边距（如 `p-5`）进行集中统筹，确保所有页面在视觉上具有完全统一的边界和对齐感。
- `App.vue` 不使用动态 `component :is` 作为页面切换方案，统一使用 `router-view`。
- `views/` 负责将 `store` 与 `components/` 装配起来，不直接写底层请求。
- 路由页面必须使用懒加载，避免应用启动时一次性加载所有页面。

---

## 2. 分层架构

必须保持以下调用方向：

`Vue Component -> Pinia Store -> Frontend Service -> callTauri / Native Service Gateway -> Rust Command -> Rust Service -> Repository/DB`

禁止事项：

- **禁止非服务层代码直连底座**：页面组件、Composables、Pinia Stores 等所有非服务（Service）层业务代码，禁止直接导入或调用原生 Tauri APIs（如 `@tauri-apps/api/*`、`@tauri-apps/plugin-*`）。所有底座原生 API 的依赖，必须彻底且唯一地收拢在 `src/services/` 目录中进行代理输出与调用。
- **禁止 UI 层直连 Service**：`src/views/`、`src/components/`、`src/layouts/` 禁止直接导入 `src/services/*`。页面与组件只表达交互意图，业务动作统一进入对应 Pinia Store，再由 Store 调用 Service。
- **禁止 Composable 承担底座适配**：`src/composables/` 禁止直接导入 `src/services/*`。Composable 只处理生命周期、响应式状态、键盘/拖拽等 UI 组合逻辑；需要底座能力时通过 Store 暴露的动作进入标准链路。
- **禁止 Store 直连 Tauri 网关**：`src/stores/` 可以调用模块 Service，但不得直接导入 `services/tauri`。底座命令、事件监听、版本号、窗口控制等能力必须先封装为对应 Service。
- **禁止直接访问数据源**：页面组件禁止直接访问 SQLite 或原始网络请求。
- **禁止在 Store 编写复杂底层逻辑**：Store 内禁止编写复杂底层逻辑或直接处理复杂底座交互。

数据库与持久化代码应优先向 Rust Command / Service / Repository 收敛，禁止引入 `@tauri-apps/plugin-sql`、`tauri-plugin-sql` 或任何前端 SQL 直驱通道。

文件读写能力必须经 Rust Command / Service 做路径、扩展名、大小与沙箱校验后暴露给前端。禁止直接依赖、注册或开放 `@tauri-apps/plugin-fs`、`tauri-plugin-fs`、`fs:default`，禁止把 `assetProtocol.scope` 放宽到整个 `$HOME/**/*`。

### 自动化边界检查

以下硬红线已接入脚本检查：

```bash
npm run check:architecture
```

检查范围：

- 非 `src/services/` 不导入 `@tauri-apps/*`。
- `src/views/`、`src/components/`、`src/layouts/` 不直接导入 `src/services/*`。
- `src/composables/` 不直接导入 `src/services/*`。
- `src/stores/` 不直接导入 `src/services/tauri`。
- 非 `src/services/tauri.ts` 不直接调用 `invoke()`。
- 非 `src/services/request.ts` 不直接调用 `fetch()`。
- 非 `src/services/` 不直接调用 `callTauri()`。
- 禁止前端 SQLite 直驱，禁止回引 `@tauri-apps/plugin-sql`、`tauri-plugin-sql`、SQL capability。
- 禁止直接依赖、注册或开放前端文件系统插件和 `fs:default`，文件读写必须走受限 Rust Command。
- 禁止将 `assetProtocol.scope` 放宽到整个 `$HOME/**/*`。

说明：存量页面/组件中的 service 直连已经纳入迁移对象；新增或修改业务模块必须按标准链路落地，不再扩大 UI 层直连 service 的范围。通用路径选择、图片上传等组件也必须走 Store -> Service 适配。

---

## 3. 组件化层级组装规范

- **单层 Page 挂载与局部 components 归口**：
  - 一个页面入口引入 `components/*View.vue` 往往具有多余的中转层，应当直接将 View 的核心内容与逻辑合并到 Page 入口中，实现单页面一层文件组装。
  - 对于页面内部复杂的独立功能块，应当在当前页面目录下建立 `components/` 文件夹并进行局部组件拆分（例如 `views/tools/components/DirGenerator.vue`），直接由 Page 组件导入组装，保持代码整洁且最大程度落实高内聚、低耦合。

### 新功能模块模板

```text
src/views/<module>/
├─ <Module>Page.vue          # 路由页入口，只做页面装配
└─ components/               # 当前模块私有组件

src/stores/<module>.ts       # 模块状态与轻量业务编排
src/services/<module>.service.ts
src/types/<module>.ts        # 仅跨模块共享时创建
```

当功能需要 Rust 能力时：

```text
src-tauri/src/commands/<module>.rs
src-tauri/src/services/<module>_service.rs
src-tauri/src/infra/<module>_repo.rs  # 需要 DB/文件仓储时再建
```

---

## 4. 开发流程规范

涉及前端或 Rust 代码变更后，至少执行：

```bash
npm run typecheck
```

涉及 Tauri / IPC / HTTP / DB 边界时，执行：

```bash
npm run check:architecture
```

普通前端任务完成前推荐执行：

```bash
npm run verify
```

如修改了打包、能力或整体集成链路，再执行：

```bash
npx tauri build --no-bundle
```

本地桌面联调统一使用：

```bash
npm run tauri:dev
```
