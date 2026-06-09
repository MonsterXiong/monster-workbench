# Vue UI Agent

## 允许

- 任务中心 UI
- 任务事件展示
- 资产列表展示
- 前端服务封装
- Pinia 最小接入
- 调试面板

## 禁止

- 直接导入 @tauri-apps/*
- 直接 invoke
- 直接 fetch Python
- 直接调用 src/services 之外的底层能力
- 大规模重写 src/stores/ai.ts
- 存储大图 base64
