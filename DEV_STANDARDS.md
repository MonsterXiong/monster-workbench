# Monster Workbench 开发规范

本文件约束 Monster Workbench 的前后端分层、目录结构、请求规范、加载与报错处理方式，以及桌面端视觉实现原则。所有新增功能和重构必须优先遵循本规范。

---

## 1. 前端目录与命名规范

前端采用 `Vue 3 + Pinia + Vue Router + Tailwind CSS + DaisyUI 5`。目录职责如下：

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
│  └─ common/                 # 全局基础公共组件（如 PageState.vue）
├─ composables/               # 可复用异步状态、表单逻辑
├─ stores/                    # Pinia 状态管理
├─ services/                  # 前端服务层、请求层、Tauri 网关
├─ types/                     # TS 类型定义
└─ styles/                    # 全局样式目录
```

### 硬性要求：

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

`Vue Component -> Pinia Store -> Frontend Service -> callTauri -> Rust Command -> Rust Service -> Repository/DB`

禁止事项：

- 页面组件直接调用 `@tauri-apps/api/*`。
- 页面组件直接访问 SQLite 或原始网络请求。
- Store 内直接拼装原始 IPC 命令字符串之外的复杂底层逻辑。

---

## 3. 路由规范

- 统一使用 `vue-router`。
- 顶层壳层放在 `layouts/Layout.vue`。
- 页面组件放在 `views/`，通过 `router-view` 挂载。
- 路由切换加载态统一由 `src/router/state.ts` 驱动，不在每个页面各自重复实现。

示例：

```ts
{
  path: "/notes",
  name: "notes",
  component: () => import("../views/notes/NotesPage.vue"),
}
```

---

## 4. 加载、错误与异步规范

异步交互必须做到三件事：

- 有明确的加载状态
- 有明确的错误反馈
- 不因为浏览器预览缺少 Tauri 运行时而直接崩溃

统一约定：

- 复用逻辑放进 `composables/useAsyncTask.ts`
- 页面状态组件放进 `components/common/PageState.vue`
- 所有用户可见报错必须是中文
- 浏览器预览访问原生能力时，返回“当前为浏览器预览，xxx 仅在桌面客户端可用”

---

## 5. 请求封装规范

所有 HTTP 请求统一走 `src/services/request.ts`，不得在页面中直接裸写 `fetch`。

要求：

- 支持 `timeout`
- 支持 `params`
- 自动解析 JSON / Text
- 返回统一结构 `ApiResponse<T>`
- 错误消息统一中文化

如果是 Tauri IPC，则统一走 `src/services/tauri.ts` 的 `callTauri()`。

---

## 6. Tauri 运行时兼容规范

由于开发期经常在浏览器预览中打开 `http://localhost:1420`，所有原生能力调用必须先判断运行时：

- `isTauriRuntime()` 为真时，才可调用 `invoke`、窗口控制、文件对话框、更新器等原生 API
- 浏览器预览必须优雅降级，不能出现 `Cannot read properties of undefined (reading 'invoke')`

涉及原生能力的服务必须收敛在：

- `services/tauri.ts`
- `services/system.service.ts`
- `services/window-control.ts`
- `services/app-updater.ts`

---

## 7. 样式与组件规范

桌面端视觉目标：

- 现代化 / 简洁 / 大气 / 紧凑
- 中文可读性优先

### 样式隔离与局部封装规范：

- **全局样式规范**：全局公共样式、主题定义、全局 CSS 变量以及通用的组件原子类（如 `.workbench-card`、`.workbench-input`、`.workbench-btn`）统一存放在 `src/styles/` 目录下的 `index.css` 中，防止污染。
- **页面局部封装规范**：对于页面或组件中**重复出现的 Tailwind CSS 类组合**，应当在当前文件 Vue 的 `<style scoped>` 块中通过 `@apply` 指令进行局部样式类的封装（例如 `.card-header-title`），方便将来统改，严禁在 HTML 模板中散落及复制堆砌大量相同的重复 Tailwind CSS 类。
- **样式 scoped 隔离**：独属于单个页面的独特样式修饰，必须写在该 Vue 文件的 `<style scoped>` 块中，严禁随意写入全局样式表。

### 样式与字体要求：

- 优先使用 DaisyUI 标准类：`card`、`btn`、`input`、`textarea`、`badge`、`toggle`、`progress`
- 不在主内容区域使用 `max-width`
- 全屏优先按桌面端紧凑布局设计，窗口缩小时再做适配
- 页面不额外放顶部说明区，直接进入工作区
- 输入框必须有明确的边界、背景和焦点反馈
- 字体要求：
  ```css
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Microsoft YaHei", sans-serif;
  ```
- 禁止全局使用会破坏 Windows ClearType 的灰度抗锯齿配置。

---

## 8. 中文文案规范

用户可见文案统一简体中文，软件名称 `Monster Tools` 可保留英文。

要求：

- 文案短、准、直接
- 不展示解释产品是什么的废话
- 不混用中英文双标题
- 按钮优先使用动作词，例如“保存”“新建”“检查更新”

---

## 9. 开发流程规范

涉及前端或 Rust 代码变更后，至少执行：

```bash
npm run typecheck
```

如修改了打包、能力或整体集成链路，再执行：

```bash
npm run build
```

本地桌面联调统一使用：

```bash
npm run tauri:dev
```

---

## 10. 页面样式、组件拆分与编译安全最新实践 (新增)

在多轮业务重构中，我们固定了以下关于 Vue Scoped Style 与 Tauri 构建的最佳实践：

### A. Scoped `@apply` 指令的安全约束 (规避 PostCSS 编译崩盘)
- **严禁包含不透明度斜杠**：所有在 Scoped Style 中通过 Tailwind `@apply` 提取重复样式类时，**绝对禁止**包含带斜杠的透明度颜色类（例如 `bg-primary/20`、`focus:ring-primary/15` 等），否则会导致 PostCSS 崩盘报错（如 `class does not exist`）。如果有透明度需求，应当分立为标准的非斜杠类结合不透明度控制类（例如 `focus:ring-primary focus:ring-opacity-20`），或直接在 HTML 模板的 class 属性中安全使用。
- **严禁提取带斜杠的 Group 修饰符**：例如 `group-hover/card` 等修饰符无法在 `@apply` 里安全编译，必须在 HTML 模板 class 里书写。

### B. 输入框灰色边框覆盖原则
- **默认灰色轮廓与聚焦蓝色**：对于需要静态即显示灰色边界的 input 或 textarea，若使用 `.visual-input` 等局部类进行提取，为了防止 DaisyUI 或全局重置类的默认淡色边框在运行期覆盖局部样式，应当显式、重要化（使用 `!important`）定义默认边框与背景，确保静态对比度，例如：
  ```css
  .visual-input {
    border: 1px solid #cbd5e1 !important; /* border-slate-300 */
    background-color: #f8fafc !important; /* bg-slate-50 */
    transition: all 0.2s ease !important;
  }
  .visual-input:focus {
    border-color: #2563eb !important; /* border-blue-600 */
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
    background-color: #ffffff !important;
    outline: none !important;
  }
  ```

### C. 组件化层级组装规范
- **单层 Page 挂载与局部 components 归口**：
  - 一个页面入口引入 `components/*View.vue` 往往具有多余的中转层，应当直接将 View 的核心内容与逻辑合并到 Page 入口中，实现单页面一层文件组装。
  - 对于页面内部复杂的独立功能块，应当在当前页面目录下建立 `components/` 文件夹并进行局部组件拆分（例如 `views/tools/components/DirGenerator.vue`），直接由 Page 组件导入组装，保持代码整洁且最大程度落实高内聚、低耦合。

