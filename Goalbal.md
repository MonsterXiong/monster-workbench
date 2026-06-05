# Vue 桌面端软件整体布局与样式规范

> 适用对象：基于 Vue 的桌面端工具型 / 业务型软件。
>
> 本规范只定义整体 Layout、全局样式、公共 Header、左侧菜单、内容容器与基础交互规则，不定义具体业务页面内容。

---

## 1. 产品风格定位

### 1.1 整体风格

系统整体采用 **现代化桌面端工作台风格**，区别于传统后台管理系统。

设计关键词：

- 现代
- 轻量
- 专业
- 高级感
- 工具型
- 信息清晰
- 操作聚焦
- 留白充足

整体视觉不应表现为传统后台的强表格、强菜单、强管理感，而应更接近 SaaS 工具、企业工作台、效率软件的桌面端界面。

### 1.2 视觉原则

- **左侧导航简洁**：只保留一级核心入口，避免复杂菜单树。
- **顶部 Header 工具化**：承载搜索、快捷操作、通知、用户信息等全局能力。
- **右侧为统一内容容器**：点击左侧菜单后，仅切换右侧内容区域。
- **内容区域不绑定业务**：只规定容器、间距、卡片、滚动、背景等通用规则。
- **页面层级清晰**：Layout 负责结构，页面负责内容，组件负责复用。

---

## 2. 整体 Layout 结构

### 2.1 布局结构

系统采用经典三段式桌面端布局：

```text
┌──────────────┬───────────────────────────────┐
│              │  Global Header                │
│              │───────────────────────────────┤
│   Sidebar    │                               │
│              │          Content Area         │
│              │                               │
└──────────────┴───────────────────────────────┘
```

对应结构：

```vue
<AppLayout>
  <AppSidebar />
  <main class="app-main">
    <AppHeader />
    <AppContent>
      <RouterView />
    </AppContent>
  </main>
</AppLayout>
```

### 2.2 Layout 职责边界

| 区域 | 职责 |
|---|---|
| AppSidebar | 全局主导航，只包含“工作台”和“设置” |
| AppHeader | 全局搜索、快捷操作、通知、帮助、用户信息 |
| AppContent | 页面内容承载容器，负责背景、间距、滚动和最大宽度 |
| RouterView | 承载不同页面，不影响整体布局规范 |

### 2.3 页面切换规则

点击左侧菜单时：

- 左侧 Sidebar 不刷新。
- 顶部 Header 不刷新。
- 只切换右侧 `AppContent` 内部的 `RouterView`。
- 页面过渡保持轻量，不使用夸张动画。

推荐使用：

```vue
<router-view v-slot="{ Component }">
  <transition name="page-fade" mode="out-in">
    <component :is="Component" />
  </transition>
</router-view>
```

---

## 3. 左侧 Sidebar 规范

### 3.1 菜单项

左侧菜单只保留两个一级入口：

| 菜单 | 路由 | 说明 |
|---|---|---|
| 工作台 | `/workspace` | 默认首页入口 |
| 设置 | `/settings` | 系统配置入口 |

不设计二级菜单，不使用复杂菜单分组。

### 3.2 Sidebar 尺寸

| 属性 | 建议值 |
|---|---|
| 宽度 | `220px` |
| 最小宽度 | `200px` |
| 背景色 | `#FFFFFF` |
| 右边框 | `1px solid #E5E7EB` |
| 内边距 | `16px 12px` |
| Logo 区高度 | `64px` |

### 3.3 Logo 区

Logo 区用于展示系统名称，不作为页面标题。

建议结构：

```text
[Logo Icon] 产品名称
           版本号 / 简短描述
```

样式规则：

- Logo 图标尺寸：`32px × 32px`
- 产品名称字号：`16px`
- 产品名称字重：`600`
- 副文案字号：`12px`
- 副文案颜色：`#94A3B8`

### 3.4 菜单样式

菜单项高度：`44px`

圆角：`10px`

默认状态：

```scss
.sidebar-menu-item {
  color: #475569;
  background: transparent;
}
```

Hover 状态：

```scss
.sidebar-menu-item:hover {
  color: #1677FF;
  background: #F1F5FF;
}
```

选中状态：

```scss
.sidebar-menu-item.is-active {
  color: #1677FF;
  background: linear-gradient(90deg, #EAF2FF 0%, #F5F9FF 100%);
  font-weight: 600;
}
```

图标规则：

- 图标尺寸：`18px`
- 图标与文字间距：`10px`
- 图标风格：线性图标为主，不使用厚重面性图标

---

## 4. 公共 Header 规范

### 4.1 Header 定位

Header 是全局公共工具栏，不是页面标题区域。

Header 不承载具体页面标题、不承载业务模块说明，只提供全局能力。

### 4.2 Header 尺寸

| 属性 | 建议值 |
|---|---|
| 高度 | `64px` |
| 背景色 | `rgba(255, 255, 255, 0.86)` |
| 毛玻璃效果 | `backdrop-filter: blur(16px)` |
| 底部分割线 | `1px solid #E5E7EB` |
| 左右内边距 | `24px` |
| 层级 | `z-index: 20` |

### 4.3 Header 布局

```text
┌────────────────────────────────────────────┐
│ [搜索区域]                 [操作区][用户区] │
└────────────────────────────────────────────┘
```

推荐结构：

```vue
<header class="app-header">
  <GlobalSearch />
  <HeaderActions />
  <UserProfile />
</header>
```

### 4.4 搜索区域

搜索区域用于全局搜索，不绑定具体页面。

搜索范围可包含：

- 项目
- 文件
- 流程
- 设置项
- 帮助文档

搜索框样式：

| 属性 | 建议值 |
|---|---|
| 宽度 | `420px` |
| 高度 | `38px` |
| 圆角 | `12px` |
| 背景色 | `#F8FAFC` |
| 边框 | `1px solid #E2E8F0` |
| 输入文字 | `#0F172A` |
| 占位文字 | `#94A3B8` |

搜索框示例：

```vue
<el-input
  v-model="keyword"
  class="global-search"
  placeholder="搜索项目、文件、流程或设置..."
  clearable
>
  <template #prefix>
    <el-icon><Search /></el-icon>
  </template>
  <template #suffix>
    <span class="search-shortcut">⌘ K</span>
  </template>
</el-input>
```

搜索交互规则：

- 聚焦时显示搜索浮层。
- 支持快捷键 `⌘ K` / `Ctrl K` 唤起搜索。
- 输入为空时展示最近访问。
- 输入后展示匹配结果。
- 搜索结果不改变当前页面，点击结果后再跳转。

搜索浮层样式：

| 属性 | 建议值 |
|---|---|
| 宽度 | `520px` |
| 最大高度 | `480px` |
| 圆角 | `16px` |
| 阴影 | `0 20px 50px rgba(15, 23, 42, 0.14)` |
| 背景色 | `#FFFFFF` |
| 边框 | `1px solid #E5E7EB` |

### 4.5 Header 操作区

右侧操作区用于放置全局快捷入口。

建议包含：

| 功能 | 说明 |
|---|---|
| 新建 | 全局快捷创建入口 |
| 通知 | 系统通知、任务提醒 |
| 消息 | 用户消息或协作消息 |
| 帮助 | 帮助中心、文档入口 |

操作按钮样式：

```scss
.header-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: #475569;
  background: transparent;
}

.header-icon-btn:hover {
  color: #1677FF;
  background: #F1F5FF;
}
```

通知角标规则：

- 小于 10 显示真实数字。
- 大于 99 显示 `99+`。
- 角标颜色使用错误色 `#FF4D4F`。
- 不应出现多个强提醒角标同时抢占视觉。

### 4.6 用户信息区

用户信息区位于 Header 最右侧。

组成：

```text
[头像] 用户名 [下拉箭头]
```

样式规则：

| 属性 | 建议值 |
|---|---|
| 头像尺寸 | `32px × 32px` |
| 用户名字号 | `14px` |
| 用户名字重 | `500` |
| 用户名颜色 | `#334155` |
| Hover 背景 | `#F8FAFC` |
| 圆角 | `12px` |

用户下拉菜单建议包含：

- 个人信息
- 偏好设置
- 账号安全
- 退出登录

---

## 5. 内容区域容器规范

> 内容区域规范只定义容器和承载规则，不定义具体页面内容。

### 5.1 内容区定位

内容区是右侧主工作区，用于承载不同路由页面。

它不关心页面内部业务，只负责：

- 页面背景
- 页面内边距
- 滚动方式
- 最大宽度
- 内容卡片基础规则
- 响应式边界

### 5.2 内容区尺寸

```scss
.app-content {
  flex: 1;
  min-width: 0;
  height: calc(100vh - 64px);
  overflow: auto;
  padding: 24px;
  background: #F5F7FB;
}
```

### 5.3 内容容器宽度

为了避免超宽屏下内容过散，建议增加内部容器：

```scss
.content-container {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}
```

适配建议：

| 屏幕宽度 | 内容规则 |
|---|---|
| `< 1280px` | 内容宽度 100%，减少多列布局 |
| `1280px - 1600px` | 默认桌面布局 |
| `> 1600px` | 内容最大宽度限制在 `1440px - 1560px` |

### 5.4 内容区滚动

滚动只发生在右侧内容区，页面整体不出现双滚动条。

规则：

- `body` 禁止滚动。
- `AppContent` 负责主滚动。
- Header 固定在内容区上方。
- Sidebar 固定高度为 `100vh`。

```scss
html,
body,
#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
```

### 5.5 内容卡片基础样式

页面内部如果需要承载内容，统一使用卡片容器。

```scss
.app-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}
```

卡片间距：

| 场景 | 间距 |
|---|---|
| 卡片之间 | `16px / 20px` |
| 卡片内部 padding | `20px / 24px` |
| 卡片标题与内容 | `16px` |

### 5.6 内容区空状态

内容区空状态应保持轻量，不使用夸张插画。

规范：

- 图标尺寸：`48px`
- 标题字号：`16px`
- 描述字号：`14px`
- 最大宽度：`360px`
- 居中展示

---

## 6. 全局色彩规范

### 6.1 品牌色

| 名称 | 色值 | 用途 |
|---|---|---|
| Primary | `#1677FF` | 主按钮、链接、选中状态 |
| Primary Hover | `#4096FF` | Hover 状态 |
| Primary Active | `#0958D9` | 点击状态 |
| Primary Light | `#EAF2FF` | 浅色背景、菜单选中 |

### 6.2 功能色

| 名称 | 色值 | 用途 |
|---|---|---|
| Success | `#22C55E` | 成功、完成 |
| Warning | `#FAAD14` | 警告、提醒 |
| Error | `#FF4D4F` | 错误、危险操作 |
| Info | `#64748B` | 辅助信息 |

### 6.3 中性色

| 名称 | 色值 | 用途 |
|---|---|---|
| Text Primary | `#0F172A` | 一级文字 |
| Text Regular | `#334155` | 正文文字 |
| Text Secondary | `#64748B` | 辅助文字 |
| Text Placeholder | `#94A3B8` | 占位文字 |
| Border | `#E5E7EB` | 默认边框 |
| Divider | `#EDF2F7` | 分割线 |
| Page Background | `#F5F7FB` | 页面背景 |
| Card Background | `#FFFFFF` | 卡片背景 |

---

## 7. 字体规范

### 7.1 字体族

```scss
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  "Helvetica Neue",
  Arial,
  "PingFang SC",
  "Microsoft YaHei",
  sans-serif;
```

### 7.2 字号层级

| 层级 | 字号 | 字重 | 用途 |
|---|---:|---:|---|
| Display | `28px` | `700` | 少量重点标题 |
| H1 | `24px` | `700` | 页面主标题 |
| H2 | `20px` | `600` | 区块标题 |
| H3 | `18px` | `600` | 卡片标题 |
| Body | `14px` | `400` | 正文 |
| Body Strong | `14px` | `600` | 强调正文 |
| Caption | `12px` | `400` | 辅助说明 |

### 7.3 行高

| 字号 | 行高 |
|---|---|
| `12px` | `20px` |
| `14px` | `22px` |
| `16px` | `24px` |
| `20px` | `28px` |
| `24px` | `32px` |

---

## 8. 圆角、阴影与边框

### 8.1 圆角

| Token | 值 | 用途 |
|---|---|---|
| `--radius-sm` | `6px` | 标签、小按钮 |
| `--radius-md` | `10px` | 菜单项、图标按钮 |
| `--radius-lg` | `12px` | 输入框、普通按钮 |
| `--radius-xl` | `16px` | 卡片、弹层 |
| `--radius-full` | `999px` | 胶囊按钮、头像 |

### 8.2 阴影

```scss
--shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.04);
--shadow-md: 0 8px 24px rgba(15, 23, 42, 0.06);
--shadow-lg: 0 20px 50px rgba(15, 23, 42, 0.12);
```

使用规则：

- 普通卡片使用 `shadow-sm` 或轻边框。
- 浮层、下拉、搜索面板使用 `shadow-lg`。
- 不使用厚重黑色阴影。

### 8.3 边框

默认边框：

```scss
border: 1px solid #E5E7EB;
```

分割线：

```scss
border-color: #EDF2F7;
```

---

## 9. 间距规范

采用 `4px` 基础栅格。

| Token | 值 |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |

常用规则：

- Layout 外层间距：`24px`
- 卡片内部间距：`20px / 24px`
- 表单项间距：`16px`
- 图标与文字间距：`8px / 10px`
- 页面区块间距：`20px / 24px`

---

## 10. 全局交互规范

### 10.1 Hover

Hover 应轻量，不改变布局尺寸。

```scss
.interactive:hover {
  background: #F1F5FF;
  color: #1677FF;
}
```

### 10.2 Focus

所有可交互元素都应有 Focus 状态。

```scss
:focus-visible {
  outline: 2px solid rgba(22, 119, 255, 0.35);
  outline-offset: 2px;
}
```

### 10.3 Disabled

禁用状态规则：

```scss
.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
```

### 10.4 过渡动画

统一动画时长：

```scss
--transition-fast: 0.15s ease;
--transition-normal: 0.2s ease;
--transition-slow: 0.3s ease;
```

页面切换动画：

```scss
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
```

---

## 11. Vue 技术栈规范

### 11.1 推荐技术栈

| 类型 | 推荐方案 |
|---|---|
| 前端框架 | Vue 3 |
| 构建工具 | Vite |
| 开发语言 | TypeScript |
| UI 组件库 | Element Plus |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 请求库 | Axios |
| 样式方案 | SCSS + CSS Variables |
| 图标库 | @element-plus/icons-vue / lucide-vue-next |
| 工具函数 | VueUse |
| 代码规范 | ESLint + Prettier |

### 11.2 UI 组件库选择

推荐使用 **Element Plus** 作为基础组件库。

原因：

- 与 Vue 3 兼容度高。
- 表单、弹窗、下拉、菜单、通知等基础组件完整。
- 适合桌面端中后台和业务工具系统。
- 可通过 CSS Variables 深度定制为更现代的工具型风格。

不建议直接使用 Element Plus 默认视觉，应进行主题覆盖。

---

## 12. Vue 项目目录规范

```text
src/
├─ assets/
│  ├─ icons/
│  └─ images/
├─ components/
│  ├─ common/
│  └─ layout/
│     ├─ AppLayout.vue
│     ├─ AppSidebar.vue
│     ├─ AppHeader.vue
│     ├─ AppContent.vue
│     ├─ GlobalSearch.vue
│     ├─ HeaderActions.vue
│     └─ UserProfile.vue
├─ router/
│  └─ index.ts
├─ stores/
│  ├─ app.ts
│  └─ user.ts
├─ styles/
│  ├─ index.scss
│  ├─ variables.scss
│  ├─ reset.scss
│  ├─ element.scss
│  └─ layout.scss
├─ views/
│  ├─ workspace/
│  │  └─ index.vue
│  └─ settings/
│     └─ index.vue
├─ App.vue
└─ main.ts
```

---

## 13. 路由规范

只保留两个主路由：

```ts
const routes = [
  {
    path: '/',
    redirect: '/workspace',
  },
  {
    path: '/workspace',
    name: 'Workspace',
    component: () => import('@/views/workspace/index.vue'),
    meta: {
      title: '工作台',
      icon: 'House',
    },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/settings/index.vue'),
    meta: {
      title: '设置',
      icon: 'Setting',
    },
  },
]
```

菜单从路由配置生成，但只读取一级路由。

---

## 14. Layout 示例代码

### 14.1 AppLayout.vue

```vue
<template>
  <div class="app-layout">
    <AppSidebar />

    <section class="app-main">
      <AppHeader />
      <AppContent>
        <RouterView />
      </AppContent>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import AppContent from './AppContent.vue'
</script>
```

### 14.2 AppSidebar.vue

```vue
<template>
  <aside class="app-sidebar">
    <div class="sidebar-brand">
      <div class="brand-logo">智</div>
      <div class="brand-text">
        <div class="brand-name">智汇工具箱</div>
        <div class="brand-desc">Vue Desktop App</div>
      </div>
    </div>

    <nav class="sidebar-menu">
      <RouterLink
        v-for="item in menus"
        :key="item.path"
        :to="item.path"
        class="sidebar-menu-item"
        active-class="is-active"
      >
        <el-icon>
          <component :is="item.icon" />
        </el-icon>
        <span>{{ item.title }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
const menus = [
  {
    title: '工作台',
    path: '/workspace',
    icon: 'House',
  },
  {
    title: '设置',
    path: '/settings',
    icon: 'Setting',
  },
]
</script>
```

### 14.3 AppHeader.vue

```vue
<template>
  <header class="app-header">
    <GlobalSearch />

    <div class="header-right">
      <HeaderActions />
      <UserProfile />
    </div>
  </header>
</template>

<script setup lang="ts">
import GlobalSearch from './GlobalSearch.vue'
import HeaderActions from './HeaderActions.vue'
import UserProfile from './UserProfile.vue'
</script>
```

### 14.4 AppContent.vue

```vue
<template>
  <main class="app-content">
    <div class="content-container">
      <slot />
    </div>
  </main>
</template>
```

---

## 15. 全局 SCSS 示例

```scss
:root {
  --color-primary: #1677ff;
  --color-primary-hover: #4096ff;
  --color-primary-active: #0958d9;
  --color-primary-light: #eaf2ff;

  --color-success: #22c55e;
  --color-warning: #faad14;
  --color-error: #ff4d4f;

  --text-primary: #0f172a;
  --text-regular: #334155;
  --text-secondary: #64748b;
  --text-placeholder: #94a3b8;

  --border-base: #e5e7eb;
  --divider-base: #edf2f7;

  --bg-page: #f5f7fb;
  --bg-card: #ffffff;

  --sidebar-width: 220px;
  --header-height: 64px;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  --shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.06);
  --shadow-lg: 0 20px 50px rgba(15, 23, 42, 0.12);
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--text-primary);
  background: var(--bg-page);
}

* {
  box-sizing: border-box;
}

.app-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  background: var(--bg-page);
}

.app-sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  padding: 16px 12px;
  background: #ffffff;
  border-right: 1px solid var(--border-base);
}

.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.app-header {
  height: var(--header-height);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-base);
  z-index: 20;
}

.app-content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 24px;
  background: var(--bg-page);
}

.content-container {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}
```

---

## 16. Element Plus 主题覆盖建议

```scss
:root {
  --el-color-primary: #1677ff;
  --el-color-success: #22c55e;
  --el-color-warning: #faad14;
  --el-color-danger: #ff4d4f;
  --el-border-radius-base: 10px;
  --el-font-size-base: 14px;
  --el-text-color-primary: #0f172a;
  --el-text-color-regular: #334155;
  --el-border-color: #e5e7eb;
}

.el-button {
  border-radius: 10px;
  font-weight: 500;
}

.el-input__wrapper {
  border-radius: 12px;
  box-shadow: none;
}

.el-dropdown-menu {
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
}
```

---

## 17. 设计约束

### 17.1 必须遵守

- 左侧菜单只保留“工作台”和“设置”。
- Header 是公共工具栏，不作为页面标题区域。
- 点击左侧菜单后，只切换右侧内容区域。
- 内容区只定义容器规范，不绑定具体业务模块。
- 页面整体不出现双滚动条。
- 全局样式必须使用 Token 管理。
- Element Plus 默认样式需要进行主题覆盖。

### 17.2 避免事项

- 避免传统后台大面积表格化视觉。
- 避免过多菜单层级。
- 避免在 Header 中放置页面标题和业务说明。
- 避免过重阴影、过深边框和过多分割线。
- 避免内容区直接铺满超宽屏。
- 避免每个页面各自定义一套外层 padding 和背景。

---

## 18. 最终落地结论

本系统应以 **固定左侧导航 + 公共顶部 Header + 统一内容容器** 作为核心 Layout。

左侧只承载两个主入口：

- 工作台
- 设置

顶部 Header 统一承载：

- 全局搜索
- 快捷操作
- 通知 / 消息 / 帮助
- 用户信息

右侧内容区域只作为页面承载容器，不在本规范中定义具体业务内容。

整体视觉应保持现代、轻量、专业，弱化传统后台管理感，强化桌面端工具软件的效率感和产品感。
