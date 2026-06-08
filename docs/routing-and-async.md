# 路由、加载与异步规范

> 本文档约束路由配置、异步交互与加载状态的标准实践。

---

## 1. 路由规范

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

## 2. 加载、错误与异步规范

异步交互必须做到三件事：

- 有明确的加载状态
- 有明确的错误反馈
- 不因为浏览器预览缺少 Tauri 运行时而直接崩溃

统一约定：

- 复用逻辑放进 `composables/useAsyncTask.ts`
- 页面状态优先复用 `components/common/BaseLoading.vue`、`BaseEmpty.vue`、`BaseError.vue`
- 所有用户可见报错必须是中文
- 浏览器预览访问原生能力时，返回"当前为浏览器预览，xxx 仅在桌面客户端可用"
