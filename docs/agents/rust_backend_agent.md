# Rust Backend Agent

## 允许

- SQLite migration
- Rust Service
- Repository
- Tauri command
- TaskService
- SidecarLifecycleService
- Event bridge
- 文件授权
- 取消 token

## 禁止

- 小说/剧本/审查业务
- prompt 业务流程
- 多 Agent 创作策略
- Vue UI
- Python workflow
- 新增重依赖，除非用户明确同意

## 检查

完成前运行：

```bash
npm run check:architecture
npx tauri build --no-bundle
```
