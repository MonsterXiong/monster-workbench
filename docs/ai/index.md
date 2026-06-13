# AI 文档索引与治理元规范

本文档是 `docs/ai/` 的当前入口，只保留仍会影响后续协作的规则、边界和审查路线。已移除的旧独立创作工作台、多 Agent、任务队列、资产库和常驻运行时资料不再作为当前项目事实引用。

> 原则：按需阅读，不默认读取所有文档；先看当前代码事实，再看约束文档。

---

## 1. 首读顺序

重要任务优先按这个顺序进入：

```text
AGENTS.md
  -> docs/architecture-current-state.md
  -> docs/architecture.md
  -> 当前任务对应的专题文档
```

`docs/ai/` 只承载 AI 协作治理和审查方法，不再维护已删除创作系统的阶段计划、执行包或路线图。

---

## 2. 当前有效文档

| 文档 | 用途 |
|------|------|
| `review-checklist.md` | 代码修改完成后的自检与审查清单 |
| `decisions.md` | 长期架构决策记录 |
| `maintenance.md` | 规范文档新增、修改、删除方法 |
| `index.md` | 本索引与按需阅读路线 |

---

## 3. 按任务类型阅读

### 新增页面 / 模块

```text
必读: AGENTS.md -> engineering-playbook.md -> architecture.md -> frontend-style.md -> i18n.md
可选: global-components.md（新增公共组件时）
完成后: review-checklist.md
```

### 修改 Vue 组件 / Store / Service

```text
必读: AGENTS.md -> architecture.md -> frontend-style.md
Store / Service: 追加阅读 engineering-playbook.md、error-code.md
涉及 Tauri / HTTP: 追加阅读 request-and-tauri.md
完成后: review-checklist.md
```

### Rust 后端 / DB / Tauri

```text
必读: AGENTS.md -> engineering-playbook.md -> rust-backend.md -> error-code.md
涉及 IPC / HTTP / DB / 文件能力边界: 运行 npm run check:architecture
涉及打包资源或 Tauri 配置: 运行 npm run tauri:build:no-bundle
```

### AI Provider 工作台

```text
必读: AGENTS.md -> docs/architecture-current-state.md -> request-and-tauri.md -> rust-backend.md
涉及 Python provider tester / adapter: 运行 npm run test:ai-sidecar
涉及前端 AI 工作区: 运行 npm run typecheck，并按需运行 npm run verify
完成后: review-checklist.md
```

### 新增 / 修改 / 删除规范文档

```text
必读: AGENTS.md -> maintenance.md -> 本文档
原则: 先查重；优先更新旧文档；过期文档直接删除
```

---

## 4. 文档更新规则

1. 文档必须与当前代码事实一致；不确定时先读代码。
2. 长期有效规则进入专题文档；全局红线才进入 `AGENTS.md`。
3. 已删除功能、历史阶段提示词和一次性执行包不保留在 `docs/`。
4. 未闭环事项写入 `agent/open-loops.md` 或 `TODO.md`。
5. 新增文档前先确认不能合并到已有文档。

---

## 5. 文档膨胀检查

- `AGENTS.md` 是否只保留全局红线？
- 是否存在重复路线图、重复清单或重复架构摘要？
- 是否有文档仍引用已删除页面、服务、脚本或历史阶段？
- 是否有文档描述已经不符合当前代码？
- 是否可以用脚本、类型或测试替代文档约束？
