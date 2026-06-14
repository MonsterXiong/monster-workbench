# 请求封装与 Tauri 运行时兼容规范

> 本文档约束 HTTP 请求封装与 Tauri 原生 API 的运行时兼容降级策略。

---

## 1. 请求封装规范

所有 HTTP 请求统一走 `src/services/request.ts`，不得在页面中直接裸写 `fetch`。

要求：

- 支持 `timeout`
- 支持 `params`
- 自动解析 JSON / Text
- 返回统一结构 `ApiResponse<T>`
- 错误消息统一中文化

如果是 Tauri IPC，则统一走 `src/services/tauri.ts` 的 `callTauri()`。

---

## 2. Tauri 运行时兼容规范

由于开发期经常在浏览器预览中打开 `http://localhost:1420`，所有原生能力调用必须先判断运行时：

- `isTauriRuntime()` 为真时，才可调用 `invoke`、窗口控制、文件对话框、更新器等原生 API
- 浏览器预览必须优雅降级，不能出现 `Cannot read properties of undefined (reading 'invoke')`

涉及原生能力的服务必须收敛在：

- `services/tauri.ts`
- `services/system.service.ts`
- `services/window-control.ts`
- `services/app-updater.ts`

非 `src/services/` 代码不得直接导入 `@tauri-apps/*`、直接调用 `invoke()` 或直接调用 `callTauri()`。该边界已接入：

```bash
npm run check:architecture
```

---

## 3. 开发环境 Mock 机制

为了支持脱离底座容器在普通浏览器中的敏捷调试与自动化测试，系统引入了离线 Mock 机制：

- **IPC 拦截重定向**：核心中介 [tauri.ts](../src/services/tauri.ts) 在检测到 `!isTauriRuntime() && import.meta.env.DEV` 时，会自动将底层调用重定向到 Mock 路由。
- **Mock 同步维护**：当在后端新增任何底座 Rust Commands 时，**必须同步**浏览器 Mock，防止普通浏览器预览因未注册命令报错。小命令可直接放 [tauri.mock.ts](../src/services/tauri.mock.ts)；成组领域命令优先放 `src/services/mocks/*.mock.ts`，再由 `tauri.mock.ts` 统一分发。
