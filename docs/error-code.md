# 错误码结构化日志规范

> 本文档约束服务层、状态层与 Composables 层的控制台日志与异常抛出格式。

本项目以**简体中文**为核心开发与运维语言。服务层（`src/services/`）、状态层（`src/stores/`）、组合式函数层（`src/composables/`）以及应用启动入口的底座错误、运行时错误、降级提示和可观测日志，必须遵循以下结构化错误码规范。

业务校验错误可以直接抛出面向用户的中文消息（如“会话名称不能为空”），不强制加错误码；如果该错误会进入控制台日志、物理日志、全局异常监控或跨 IPC 边界，则必须带 `[ERR_*]` 前缀。

---

## 1. 错误日志统一格式

底座错误、运行时错误、降级提示和可观测日志使用以下固定格式：

```
[ERR_模块_操作] 中文错误描述: {物理报错对象}
```

**格式拆解**：

| 组成部分 | 说明 | 示例 |
|---------|------|------|
| `[ERR_模块_操作]` | 大写英文错误码前缀，由 `ERR` + 模块缩写 + 操作动词组成，使用下划线连接 | `[ERR_SQLITE_INIT]`、`[ERR_HTTP_TIMEOUT]`、`[ERR_SETTINGS_LOAD]` |
| 中文错误描述 | 简洁的中文语义描述，描述发生了什么错误 | `SQLite 数据库初始化失败`、`偏好设置同步至后端失败` |
| 物理报错对象 | 原始的 Error 对象或 message，作为 `console.error` 的第二参数透传 | `err`、`error`、`e` |

**正确示例**：

```typescript
// ✅ Services 层 — 控制台错误日志
console.error("[ERR_SQLITE_INIT] SQLite 数据库初始化失败:", err);
console.error("[ERR_HTTP_TIMEOUT] HTTP 请求超时:", err);
console.error("[ERR_FILEREF_CHECK] 检测文件引用状态出错:", err);

// ✅ Services 层 — 异常抛出
throw new Error("[ERR_UPDATER_NO_UPDATE] 当前无可用的更新包");
throw new Error("[ERR_SYS_BACKUP_FORMAT] 数据库备份文件数据格式不合法，缺少必要的节点记录");

// ✅ Services 层 — 降级提示（结合 ensureBrowserMessage）
throw new Error("[ERR_UPDATER_CHECK] " + ensureBrowserMessage("检查更新"));
throw new Error("[ERR_WIN_CTRL] " + ensureBrowserMessage("窗口控制"));

// ✅ Stores 层
console.error("[ERR_SETTINGS_LOAD] 从后端加载偏好设置失败，已降级使用 localStorage 本地缓存:", err);
console.error("[ERR_UPDATE_CHECK] 检查更新失败:", error);

// ✅ Composables 层
console.error("[ERR_CLIPBOARD_COPY] 复制失败:", fallbackErr);
console.error("[ERR_UPDATER_DOWNLOAD] 底座拉起更新任务失败:", err);
```

**反面示例**：

```typescript
// ❌ 纯英文 — 禁止盲目全改英文
console.error("SQLite initialization failed:", err);
console.error("Failed to sync preference to backend:", err);
throw new Error("Copy command failed");

// ❌ 无错误码 — 缺少结构化前缀
console.error("复制失败:", err);
console.error("底座检查更新异常:", err);

// ❌ 错误码格式不规范 — 必须 ERR_ 前缀 + 大写下划线
console.error("[err-sqlite-init] 失败:", err);
console.error("[ERROR_SqliteInit] 失败:", err);
```

---

## 2. 错误码命名规范

错误码前缀必须按照以下层级进行模块划分，保持全局唯一性和可检索性：

| 模块前缀 | 适用范围 | 示例错误码 |
|---------|---------|-----------|
| `ERR_APP_*` | 应用启动与初始化 | `ERR_APP_BOOTSTRAP` |
| `ERR_SQLITE_*` | SQLite 数据库操作 | `ERR_SQLITE_INIT`、`ERR_SQLITE_QUERY` |
| `ERR_HTTP_*` | HTTP 网络请求 | `ERR_HTTP_REQUEST`、`ERR_HTTP_TIMEOUT`、`ERR_HTTP_FAILED`、`ERR_HTTP_NETWORK` |
| `ERR_IPC_*` | Tauri IPC 底座调用与浏览器降级 | `ERR_IPC_INVOKE`、`ERR_IPC_BROWSER` |
| `ERR_IPC_MOCK_*` | 浏览器预览 Mock IPC | `ERR_IPC_MOCK_CONFIG` |
| `ERR_SYS_*` | 系统能力服务 | `ERR_SYS_OPEN_PATH`、`ERR_SYS_WINDOW_CTRL`、`ERR_SYS_SELECT_FOLDER`、`ERR_SYS_SELECT_FILE`、`ERR_SYS_BACKUP_FORMAT`、`ERR_SYS_BACKUP_PARSE` |
| `ERR_SYSTEM_*` | 全局系统兜底异常 | `ERR_SYSTEM_UNKNOWN` |
| `ERR_WIN_CTRL` | 窗口控制 | `ERR_WIN_CTRL` |
| `ERR_UPDATER_*` | 应用更新 | `ERR_UPDATER_CHECK`、`ERR_UPDATER_DOWNLOAD`、`ERR_UPDATER_INSTALL`、`ERR_UPDATER_NO_UPDATE` |
| `ERR_UPDATE_*` | 更新状态管理 | `ERR_UPDATE_CHECK`、`ERR_UPDATE_INSTALL` |
| `ERR_SETTINGS_*` | 偏好设置 | `ERR_SETTINGS_LOAD`、`ERR_SETTINGS_SYNC` |
| `ERR_STORE_NAV_*` | 导航状态管理 | `ERR_STORE_NAV_LIST`、`ERR_STORE_NAV_CATS`、`ERR_STORE_NAV_CLICK` |
| `ERR_TASK_*` | 后台任务管理 | `ERR_TASK_LISTENER` |
| `ERR_SENTINEL_*` | 全局自愈哨兵 | `ERR_SENTINEL_CATCH`、`ERR_SENTINEL_WARN`、`ERR_SENTINEL_INFO`、`ERR_SENTINEL_UNLOCK_FAIL` |
| `ERR_CLIPBOARD_*` | 剪贴板操作 | `ERR_CLIPBOARD_COPY`、`ERR_CLIPBOARD_EXEC` |
| `ERR_FILE_PICKER_*` | 文件/目录选择器 | `ERR_FILE_PICKER_DIR`、`ERR_FILE_PICKER_FILE` |
| `ERR_FILE_DRAGDROP_*` | 文件拖拽上传监听 | `ERR_FILE_DRAGDROP_INIT` |
| `ERR_FILEREF_*` | 文件引用检测 | `ERR_FILEREF_CHECK` |
| `ERR_TAURI_EVENT` | Tauri 事件监听 | `ERR_TAURI_EVENT` |
| `ERR_LOGGER_*` | 日志系统内部 | `ERR_LOGGER_WRITE` |
| `ERR_AI_*` | AI 模型提供商、队列与 sidecar 测试 | `ERR_AI_CONFIG_LOAD`、`ERR_AI_CONFIG_SAVE`、`ERR_AI_COMMAND_MISSING`、`ERR_AI_PROVIDER_TEST`、`ERR_AI_QUEUE_STATUS`、`ERR_AI_TEST_BROWSER` |
| `ERR_UNKNOWN` | 错误监控无法解析错误码时的兜底值 | `ERR_UNKNOWN` |

---

## 3. `ensureBrowserMessage` 降级提示规范

- `ensureBrowserMessage(feature)` 函数的参数 `feature` **必须使用中文**（如 `"窗口控制"`、`"安装更新"`），因为其模板为：`当前为浏览器预览，${feature}仅在桌面客户端可用`。
- 调用处在 `throw new Error(...)` 中，必须在前方拼接 `[ERR_*]` 错误码前缀，保证降级抛出在日志追踪中可被结构化定位。

---

## 4. 区分：UI 文案国际化 vs 日志/报错中文化

| 场景 | 处理方式 | 说明 |
|------|---------|------|
| **用户可见 UI 文案**（标题、按钮、Toast、弹窗提示等） | 使用 `t()` 国际化函数，从 `locales/` 词典中读取 | 支持热切换中英文 |
| **控制台日志**（`console.error` / `console.warn`） | `[ERR_CODE] 中文描述` 固定格式 | 面向开发者，以中文为主 |
| **底座 / 运行时异常抛出**（`throw new Error(...)`) | `[ERR_CODE] 中文描述` 固定格式 | 被全局哨兵捕获后，消息会同时写入物理日志；业务校验错误可直接使用中文 |
| **降级提示**（非 Tauri 运行时报错） | `[ERR_CODE] + ensureBrowserMessage("中文功能名")` | 中文参数 + 错误码前缀 |

---

## 5. 新增模块时的错误码注册要求

- 每新增一个 service / store / composable 模块，必须在本文档的 §2 错误码表中注册该模块的前缀分配，防止重复占用。
- 错误码前缀全局唯一，同一模块内不同操作通过后缀区分（如 `ERR_SYS_OPEN_PATH` vs `ERR_SYS_BACKUP_FORMAT`）。
