# AI 文档索引与治理元规范

本文件是 `docs/ai/` 目录的索引入口，管理 AI 协作治理体系。

> 原则：按需阅读，不要默认读取所有文档。根据任务类型选择性阅读。

---

## 1. 文档体系全景图

```
AGENTS.md                    ← 首读入口，全局红线（最高优先级）
├── docs/                    ← 项目开发规范（管"代码怎么写"）
│   ├── engineering-playbook.md ← 快速迭代工程手册
│   ├── architecture.md      ← 架构与目录
│   ├── frontend-style.md    ← 样式与视觉
│   ├── i18n.md              ← 国际化
│   ├── error-code.md        ← 错误码日志
│   ├── rust-backend.md      ← Rust 后端
│   ├── request-and-tauri.md ← 请求与 Tauri 兼容
│   ├── global-components.md ← 全局组件注册
│   ├── routing-and-async.md ← 路由与异步
│   └── ui-patterns.md       ← UI 模式与数据一致性
└── docs/ai/                 ← AI 协作治理（管"AI 怎么协作"）
    ├── index.md             ← 本文件
    ├── review-checklist.md  ← 代码审查与自检清单
    ├── decisions.md         ← 架构决策记录 (ADR)
    └── maintenance.md       ← 文档维护方法论
```

---

## 2. 按任务类型的阅读路线图

### 新增页面 / 模块

```
必读: AGENTS.md → engineering-playbook.md → architecture.md → frontend-style.md → i18n.md
可选: global-components.md（新增公共组件时）
完成后: review-checklist.md（自检）
```

### 修改 / 新增 Vue 组件

```
必读: AGENTS.md → architecture.md → frontend-style.md
可选: i18n.md（涉及文案时）→ global-components.md（涉及全局组件时）
完成后: review-checklist.md（自检）
```

### 前端 Service / Store 开发

```
必读: AGENTS.md → engineering-playbook.md → architecture.md → error-code.md
可选: request-and-tauri.md（涉及 HTTP 或 Tauri API 时）
完成后: review-checklist.md（自检）
```

### Rust 后端开发

```
必读: AGENTS.md → engineering-playbook.md → rust-backend.md → error-code.md
完成后: review-checklist.md（自检）
```

### Bug 修复

```
必读: AGENTS.md → 直接定位问题代码
按需: 根据 bug 所在层级读取对应文档
完成后: review-checklist.md（自检）
```

### UI 样式调整

```
必读: AGENTS.md → engineering-playbook.md → frontend-style.md
可选: i18n.md（涉及文案时）
完成后: review-checklist.md（自检）
```

### 路由 / 异步 / 弹窗相关

```
必读: AGENTS.md → routing-and-async.md → ui-patterns.md
完成后: review-checklist.md（自检）
```

### 理解架构决策

```
必读: decisions.md
```

### 新增 / 修改规范文档

```
必读: AGENTS.md → maintenance.md → 本文件
```

---

## 3. 规则晋升机制

规则的沉淀路径（从临时到稳定）：

```
聊天中的临时约定
  ↓ 经过 2-3 次真实任务验证
docs/ai/*.md（AI 协作治理文档）
  ↓ 如果是项目开发规范而非 AI 治理
docs/*.md（项目开发规范）
  ↓ 如果是全局红线级别
AGENTS.md（最高优先级入口）
```

**晋升判断标准**：

- 这条规则是否在 **多次任务** 中被反复触发？
- 这条规则如果 AI 不遵守，是否会造成 **难以修复的问题**？
- 这条规则是否 **所有类型的任务** 都需要遵守？

只有三个问题都是"是"，才值得进入 `AGENTS.md`。

---

## 4. 文档更新流程

当需要新增或修改规则时：

1. **先查重**：搜索 `AGENTS.md` 和 `docs/` 中是否已有类似规则。
2. **选择位置**：按晋升机制决定规则应该放在哪个层级。
3. **专题优先**：优先更新对应的专题文档，而非 `AGENTS.md`。
4. **保持简短**：每条规则用一句话表达，示例放在正文中而非标题中。
5. **避免噪声**：规则正文只保留当前有效结论；来源和讨论过程只在确有长期价值时写入 ADR。

---

## 5. 文档膨胀检查清单

定期（或在新增规则时）检查：

- [ ] `AGENTS.md` 是否超过 200 行？如果超过，考虑将细节下沉到 `docs/`。
- [ ] 是否有规则在 `AGENTS.md` 和 `docs/` 中重复出现？
- [ ] 是否有规则可以通过代码（ESLint 规则、TypeScript 类型）强制执行而非文档约束？
- [ ] 是否有过期或不再需要的规则？如果有，直接更新或删除。
- [ ] 是否有过于细节化的规则（应该放在代码注释而非文档中）？
- [ ] 文档描述是否与项目代码事实一致？

---

## 6. 任务后复盘提示

每次任务完成后，AI 应额外检查：

1. 本次是否暴露出 AI 需要长期记住的规则？
2. 如果有，应该写入哪个 `docs/ai/` 文件？
3. 是否足够重要到进入 `AGENTS.md`？
4. 是否有重复或可合并的旧规则？
5. 默认只给建议，不自动修改文档；用户明确要求规范化、更新文档或沉淀规则时，可以直接修改对应文档。
