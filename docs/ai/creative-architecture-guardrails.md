# 持续型 AI 创作系统架构护栏

## 1. 总目标

把当前 Monster Tools 从 AI Provider / 对话 / 生图工作台，渐进升级为持续型 AI 创作系统。

目标能力：

- 小说生成
- 剧本生成
- 分镜生成
- 角色资产
- 场景资产
- 道具资产
- 生图 prompt
- 生图任务
- 自动审查
- 一致性分析
- 自动返工
- 队列任务
- 批量并发生成
- Goal 模式
- 多 Agent 并行创作

## 2. 现有架构必须保留

- Tauri v2
- Vue 3
- Rust 后端
- Python sidecar
- Rust IPC 入口
- 现有 AI Provider 测试链路
- 图片落盘预览策略
- 日志脱敏
- 文件权限收口
- 现有分层规则

## 3. 标准调用链

必须遵守现有 `AGENTS.md`：

```text
Vue Component
  -> Pinia Store
  -> Frontend Service
  -> callTauri / Native Service Gateway
  -> Rust Command
  -> Rust Service
  -> DB / Repo / Python Sidecar
```

禁止：

- 页面组件直接导入 `@tauri-apps/*`
- 组件直接 `invoke()`
- store 直接写底层 IPC 逻辑
- Vue 直接 fetch Python localhost
- Composable 承担底座适配

## 4. Rust 的职责

Rust 是桌面控制面，负责：

- IPC command
- 权限边界
- 文件授权
- 配置读取
- SQLite service / repo
- sidecar lifecycle
- 请求代理
- 事件桥接
- 取消 token
- 日志脱敏边界

Rust 不负责：

- 小说生成业务
- 剧本生成业务
- prompt 业务编排
- 审查逻辑
- 返工逻辑
- 一致性分析
- 多 Agent 创作策略

## 5. Python 的职责

Python 逐步成为执行面，负责：

- AI workflow
- worker pool
- provider calls
- prompt 构建
- 审查
- 返工
- 资产入库
- 图片处理
- 向量检索
- 一致性分析
- 长任务执行

Python 不负责：

- Tauri capability
- Vue 状态
- 桌面权限
- UI 逻辑

## 6. Vue 的职责

Vue 负责：

- UI 展示
- 任务看板
- 编辑器
- 资产墙
- 用户操作
- 实时进度展示
- 错误提示

Vue 不负责：

- 复杂任务状态机
- 模型调用
- sidecar 生命周期
- 大文件处理
- 队列调度
- Python 端口和 token 管理

## 7. sub2api/cockpit 的职责

sub2api/cockpit 只作为 OpenAI-compatible 模型网关。

允许：

- 统一模型入口
- base_url / key / model 配置
- 模型路由
- 上游转发

禁止：

- 把小说流程写进 cockpit 规则
- 把审查/返工业务写进中转层
- 让中转层承担资产库逻辑
- 让中转层承担项目状态机

## 8. 队列策略

阶段性策略：

1. 先 SQLite-backed 本地任务队列
2. 再 Python worker skeleton
3. 再限流、重试、恢复
4. 最后才考虑 Redis / 远程 worker

不允许一开始引入 Redis，除非用户明确改变路线。

## 9. 图片与大对象策略

必须：

- 大图落盘
- 数据库存 metadata
- 前端使用 thumbnail / file path / asset URL
- 事件 payload 不传大图
- task_events 不存大文件

禁止：

- 图片 base64 进入 Vue store
- 大文本事件频繁广播
- 数据库存原图二进制

## 10. Python 常驻化顺序

正确顺序：

```text
任务/资产落库
  -> Rust TaskService
  -> 事件桥
  -> SidecarLifecycleService
  -> Python health server
  -> Python task stub
  -> 第一个 workflow
  -> worker skeleton
```

错误顺序：

```text
直接替换 ai_provider_tester.py
直接 FastAPI 化全部模型调用
直接引 worker 池
直接上 Redis
```
