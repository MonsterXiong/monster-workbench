# Python Sidecar Packaging Strategy：Python Sidecar 发布策略

## 1. 背景

当前 Python sidecar 主要以 `.py` 脚本资源形式存在，运行时依赖系统 Python / py。开发阶段可以接受，但发布到普通用户机器会遇到：

- 用户没有 Python；
- Python 版本不兼容；
- 依赖缺失；
- Windows/macOS/Linux 路径差异；
- sidecar 启动失败难排查；
- FastAPI / worker 依赖更复杂。

## 2. 阶段策略

### 阶段 A：开发模式

允许系统 Python，但需要清晰错误提示。

### 阶段 B：Sidecar Stub

新增 Python 常驻服务原型，但默认不替换现有脚本链路。

要求：

- `--port`
- `--token`
- `/health`
- 干净退出
- 日志脱敏

### 阶段 C：生产打包决策

正式启用 Python 常驻 sidecar 前必须确定：

```text
PyInstaller binary
uv/venv + embedded runtime
独立 Python sidecar binary
平台专用打包
```

## 3. 不允许

- 不得假设用户机器一定有 Python；
- 不得让 Vue 处理 Python 环境细节；
- 不得让 Vue 直连 Python；
- 不得把 Python 环境问题伪装成模型调用失败。

## 4. Rust 预检职责

SidecarLifecycleService 应负责：

- 检查 sidecar 文件存在；
- 检查可执行权限；
- 检查启动超时；
- 检查 `/health`；
- 记录 stdout/stderr 摘要；
- 脱敏日志；
- 返回用户可读错误码。
