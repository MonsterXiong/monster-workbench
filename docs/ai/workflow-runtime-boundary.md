# Workflow Runtime Boundary：AI 工作流运行时边界

## 1. Vue

Vue 负责展示任务、创建用户请求、展示进度、展示资产、人工审核、暂停/取消按钮。

Vue 不负责 workflow 编排、复杂状态机、retry 策略、直接模型调用、直接 Python 通信。

## 2. Rust

Rust 是控制面，负责：

- Tauri commands；
- 权限；
- SQLite 主库；
- TaskService；
- AssetService；
- EventBridge；
- SidecarLifecycleService；
- 文件路径授权；
- 取消和暂停入口；
- 写入可信状态。

Rust 不负责具体小说生成逻辑、prompt 构建、审查推理、多 Agent 推理。

## 3. Python AI Engine

Python 是执行面，负责：

- workflow runtime；
- worker pool；
- provider client；
- prompt builder；
- context builder；
- review agent；
- revision agent；
- consistency agent；
- image processing。

Python 不负责桌面权限、UI 状态、Tauri capability、文件写入越权。

## 4. Provider Gateway

sub2api/cockpit 只负责模型中转，不负责业务流程。

## 5. 正确模式

```text
Vue -> Frontend Service -> Rust TaskService -> Python Workflow -> Rust/DB/AssetService -> Vue Event
```

错误模式：

```text
Vue -> Python
Python -> 任意改主库
Rust -> 写 prompt 业务
Provider Gateway -> 管业务状态
```
