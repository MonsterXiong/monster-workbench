# Rust 后端开发规范

> 本文档约束 Rust + Tauri v2 后端的目录结构、分层职责、命令规范与安全约束。

---

## 1. 后端目录结构

```text
src-tauri/src/
├─ main.rs                    # 应用入口：插件注册、窗口创建、托盘、状态注入、invoke_handler
├─ commands/                  # 命令层：Tauri IPC 命令函数（薄代理层）
│  ├─ mod.rs                  # 模块聚合导出
│  └─ system.rs               # 系统能力命令（文件/路径/进程/上传等）
├─ services/                  # 服务层：核心业务逻辑实现
│  ├─ mod.rs                  # 模块聚合导出
│  └─ system_service.rs       # 系统业务服务（SystemService）
├─ infra/                     # 底座基础设施：路径、文件、数据库文件、日志等能力
└─ repository/                # 仓储层：新增复杂业务数据库读写时使用
   └─ mod.rs                  # 模块聚合导出（按需新增）
```

---

## 2. 分层职责与调用约束

必须保持以下调用方向（与前端分层对称）：

`main.rs（注册）-> commands/*（薄代理）-> services/*（业务逻辑）-> infra/* / repository/*（底座能力与数据持久化）`

| 层级 | 职责 | 禁止事项 |
|---|---|---|
| **main.rs** | 插件注册、窗口配置、系统托盘、`app.manage()` 状态注入、`invoke_handler` 命令注册 | 禁止编写任何业务逻辑 |
| **commands/** | 接收 IPC 参数、从 `State` 取出服务实例、调用 service 方法并透传返回值 | 禁止在命令函数中编写超过 5 行的业务逻辑，必须委托给 service |
| **services/** | 核心业务实现：文件操作、路径计算、进程管理、数据转换等 | 禁止直接依赖 `tauri::command` 宏 |
| **infra/** | 路径、文件、日志、数据库文件备份等底座基础能力 | 禁止包含页面业务流程 |
| **repository/** | 新增复杂业务数据读写、查询与迁移 | 禁止包含非数据持久化的业务逻辑 |

数据库与持久化能力应优先通过 Rust Command / Service / Repository 暴露给前端。当前已移除前端 SQL 插件与 SQL capability，禁止重新引入 `@tauri-apps/plugin-sql`、`tauri-plugin-sql` 或任何前端 SQL 直驱通道。

文件读写能力必须由 Rust Command / Service 做路径、扩展名、大小与沙箱校验后暴露给前端。禁止直接依赖、注册或开放 `@tauri-apps/plugin-fs`、`tauri-plugin-fs`、`fs:default`，禁止把 `assetProtocol.scope` 放宽到整个 `$HOME/**/*`。

---

## 3. 命令层（commands/）规范

- **薄代理原则**：每个 `#[tauri::command]` 函数只负责：① 接收前端 IPC 参数 → ② 从 `State<Mutex<Service>>` 中 `lock().unwrap_or_else(|e| e.into_inner())` 获取服务实例 → ③ 调用对应 service 方法 → ④ 返回 `Result<T, String>`。
- **状态类型别名**：在每个命令文件顶部统一定义 `type SystemState<'a> = tauri::State<'a, std::sync::Mutex<SystemService>>;`，保持简洁。
- **命令注册**：所有新增命令必须在 `main.rs` 的 `invoke_handler(tauri::generate_handler![...])` 中注册，否则前端 `invoke()` 将静默失败。
- **返回值约定**：
  - 成功返回数据：`Result<T, String>` 其中 `T` 为 `String`（JSON 序列化）、`()` 或可序列化的 struct。
  - 错误一律返回 `Err(String)`，错误消息**必须使用中文**。

示例（标准命令函数）：

```rust
#[tauri::command]
pub fn upload_file(
    src_path: String,
    file_type: String,
    year_month: String,
    uuid_name: String,
    state: SystemState<'_>
) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.upload_file(&src_path, &file_type, &year_month, &uuid_name)
}
```

---

## 4. 服务层（services/）规范

- **结构体注入 AppHandle**：服务通过 `SystemService::new(app_handle)` 构造，内部持有 `AppHandle` 以访问 Tauri 路径、对话框、opener 等原生能力。
- **方法签名**：所有公开方法统一返回 `Result<T, String>`，内部错误通过 `.map_err(|e| format!("中文描述: {}", e))` 转换。
- **跨平台处理**：涉及操作系统差异的逻辑（如进程查杀），必须使用 `#[cfg(target_os = "windows")]` / `#[cfg(not(target_os = "windows"))]` 条件编译，非支持平台返回友好错误或空结果。
- **路径安全**：
  - 涉及用户输入的路径参数，必须进行 `..` 路径穿透检测和前缀白名单校验。
  - 上传/删除类操作必须限定在 `.monster-tools/uploads/` 沙箱目录内。
- **JSON 序列化**：复杂数据使用 `serde_json::json!()` 宏构建 → `serde_json::to_string()` 序列化为 JSON 字符串返回前端。

---

## 5. 数据结构规范

- 入参 struct（接收前端数据）：标注 `#[derive(serde::Deserialize)]`。
- 出参 struct（返回前端数据）：标注 `#[derive(serde::Serialize)]`。
- 双向 struct：标注 `#[derive(serde::Serialize, serde::Deserialize)]`。
- 所有 struct 定义放在对应 service 文件末尾或独立的 `types.rs` 中。
- 字段命名使用 Rust 标准 `snake_case`，前端接收后自行映射为 `camelCase`。

---

## 6. 依赖管理（Cargo.toml）

为确保 Cargo 编译速度和二进制包体积，遵循以下硬性约束：

- **最小依赖原则**：仅保留以下核心依赖，禁止引入无关外部库：
  - `tauri` + 官方插件（`dialog`、`fs`、`opener`、`process`、`updater`、`sql`）
  - `serde` + `serde_json`（序列化基础）
- **严禁引入**：`reqwest`、`zip`、`sha2`、`hex`、`tokio`（单独引入）等与基础功能无关的重量级依赖。
- 优先使用 `std` 标准库解决问题（如 `std::fs`、`std::process::Command`、`std::path`）。

---

## 7. 错误处理规范

- 所有面向前端的错误消息**必须使用简体中文**。
- 使用 `.map_err(|e| format!("操作描述失败: {}", e))` 模式统一转换。
- 禁止在 command/service 层使用 `.unwrap()` 或 `panic!()`；Mutex 锁获取统一使用 `unwrap_or_else(|e| e.into_inner())`，避免锁毒化后直接引发应用崩溃。
- 文件不存在、权限不足等常见错误，给出具体的中文提示而非原始英文 OS 错误。

---

## 8. 前后端命名映射

| 前端（TypeScript） | Rust 命令函数 | 说明 |
|---|---|---|
| `callTauri('get_app_paths', {})` | `get_app_paths()` | 获取应用数据目录 |
| `callTauri('upload_file', {...})` | `upload_file()` | 上传文件到本地沙箱 |
| `callTauri('list_uploaded_files', {...})` | `list_uploaded_files()` | 列出已上传文件 |
| `callTauri('delete_uploaded_file', {...})` | `delete_uploaded_file()` | 删除已上传文件 |

- 前端参数使用 `camelCase`（如 `srcPath`），Tauri 会自动映射为 Rust 的 `snake_case`（如 `src_path`）。
- 前端调用统一走 `src/services/tauri.ts` 的 `callTauri()` 封装，禁止裸调 `invoke()`。

---

## 9. 安全与性能约束

- **窗口关闭拦截**：`main.rs` 必须通过 `on_window_event` 拦截 `CloseRequested`，执行 `api.prevent_close()` + `window.hide()` 实现关闭转托盘。
- **状态并发保护**：所有注入到 `app.manage()` 的服务必须包裹 `std::sync::Mutex`，命令函数通过 `state.lock().unwrap_or_else(|e| e.into_inner())` 获取独占访问。
- **目录遍历防挂起**：递归遍历本地目录时，必须同时支持「排除目录列表」和「最大递归深度」两个保护参数，防止 `node_modules`、`.git` 等超大目录导致进程卡死。
