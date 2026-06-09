# Security Threat Model：安全威胁模型

## 1. 主要风险

- Vue 直连 Python 端口；
- Python sidecar 被本机其他进程调用；
- API key 泄漏；
- 大图 base64 进入前端状态；
- 任务无限生成；
- Python 越权写文件；
- migration 破坏数据；
- provider 返回异常内容污染资产；
- 日志输出敏感信息。

## 2. 防护原则

- Rust 是唯一前端后端入口；
- Python 监听 localhost 且带 runtime token；
- Vue 不知道 Python 端口和 token；
- 文件写入由 Rust 授权；
- 大对象走文件路径；
- 所有任务有预算和取消；
- 所有模型日志脱敏；
- migration 必须人工审核；
- 资产生成必须记录 provenance。

## 3. 高风险操作

默认需要人工确认：

- 批量生成超过阈值；
- 自动返工超过阈值；
- 修改 locked Bible；
- 删除资产；
- 破坏性 migration；
- 变更 provider key；
- 放宽文件权限；
- 修改 Tauri capability。
