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

## 3. 开发环境真实数据桥接与 Mock 机制

为了支持浏览器前端调试与桌面端行为一致，开发期普通浏览器优先走真实数据桥接，再按能力边界降级：

- **真实数据优先**：核心中介 [tauri.ts](../src/services/tauri.ts) 在检测到 `!isTauriRuntime() && import.meta.env.DEV` 时，会先尝试通过 [tauri.dev-bridge.ts](../src/services/tauri.dev-bridge.ts) 访问调试底座。桥接服务只在 Rust `debug_assertions` 下启动，并限制来源为 `http://localhost:1420` / `http://127.0.0.1:1420`。
- **能力边界保留**：浏览器端不支持原生文件/目录选择、窗口控制、更新器、任意系统路径打开、任意文件读写、进程强杀等桌面专属能力。这类能力必须继续由 service 层显式降级或提示不可用，不能通过桥接放宽。
- **Mock 兜底**：真实数据桥接不可用或命令未纳入安全白名单时，开发期会继续落到 [tauri.mock.ts](../src/services/tauri.mock.ts)。当在后端新增 Rust Commands 时，若该命令需要浏览器调试真实数据，应同步加入桥接白名单与 Rust 调度；若仍需离线预览，也要同步浏览器 Mock。
