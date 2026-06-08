# 样式、组件与视觉规范

> 本文档约束桌面端的视觉目标、样式隔离、基础组件使用与视觉物理隔离原则。

---

## 1. 视觉目标

桌面端视觉目标：

- 现代化 / 简洁 / 大气 / 紧凑
- 中文可读性优先

---

## 2. 样式隔离与局部封装规范

- **全局样式规范**：全局公共样式、主题定义、全局 CSS 变量以及通用的组件原子类（如 `.workbench-card`、`.workbench-input`、`.workbench-btn`）统一存放在 `src/styles/` 目录下的 `index.css` 中，防止污染。
- **页面局部封装规范**：对于页面或组件中**重复出现的 Tailwind CSS 类组合**，应当在当前文件 Vue 的 `<style scoped>` 块中通过 `@apply` 指令进行局部样式类的封装（例如 `.card-header-title`），方便将来统改，严禁在 HTML 模板中散落及复制堆砌大量相同的重复 Tailwind CSS 类。
- **样式 scoped 隔离**：独属于单个页面的独特样式修饰，必须写在该 Vue 文件的 `<style scoped>` 块中，严禁随意写入全局样式表。

---

## 3. 样式与字体要求

- 优先复用项目现有 `Base*` 全局基础组件和 `workbench-*` 原子类。
- Element Plus 仅作为基础组件封装或明确局部场景使用，业务页面不应绕过封装重复拼装复杂控件。
- 不在主内容区域使用 `max-width`
- 全屏优先按桌面端紧凑布局设计，窗口缩小时再做适配
- 页面不额外放顶部说明区，直接进入工作区
- 输入框必须有明确的边界、背景和焦点反馈
- 字体要求：
  ```css
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Microsoft YaHei", sans-serif;
  ```
- 禁止全局使用会破坏 Windows ClearType 的灰度抗锯齿配置。

---

## 4. Scoped `@apply` 指令的安全约束

> 规避 PostCSS 编译崩盘

- **严禁包含不透明度斜杠**：所有在 Scoped Style 中通过 Tailwind `@apply` 提取重复样式类时，**绝对禁止**包含带斜杠的透明度颜色类（例如 `bg-primary/20`、`focus:ring-primary/15` 等），否则会导致 PostCSS 崩盘报错（如 `class does not exist`）。如果有透明度需求，应当分立为标准的非斜杠类结合不透明度控制类（例如 `focus:ring-primary focus:ring-opacity-20`），或直接在 HTML 模板的 class 属性中安全使用。
- **严禁提取带斜杠的 Group 修饰符**：例如 `group-hover/card` 等修饰符无法在 `@apply` 里安全编译，必须在 HTML 模板 class 里书写。

---

## 5. 输入框灰色边框原则

- **默认灰色轮廓与聚焦蓝色**：对于需要静态即显示灰色边界的 input 或 textarea，若使用 `.visual-input` 等局部类进行提取，应显式定义默认边框与背景，确保静态对比度，例如：
  ```css
  .visual-input {
    border: 1px solid #cbd5e1 !important; /* border-slate-300 */
    background-color: #f8fafc !important; /* bg-slate-50 */
    transition: all 0.2s ease !important;
  }
  .visual-input:focus {
    border-color: #2563eb !important; /* border-blue-600 */
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
    background-color: #ffffff !important;
    outline: none !important;
  }
  ```

---

## 6. 双栏与多栏诊断工具的视觉物理隔离

- **禁止裸露网格划分**：在单页面承载两个或多个相对独立的诊断/操作区块时（例如端口占用诊断与服务实例诊断），禁止仅通过单一的 `divide-x` 分割线将输入框和列表隔开。这会导致两部分表单在视觉上混为一体，产生"左右明显布局不明确"的缺陷。
- **强制使用卡片容器**：每个相对独立的功能板块必须采用带有显式背景、细微虚化边框与轻度阴影的容器（优先复用 `workbench-card`，或使用 `bg-white dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/80 shadow-sm rounded-2xl p-5`）进行整体物理隔离，从而在小屏堆叠与大屏分列时提供平稳的视觉边界。
- **特色图标与描述性标题**：每个卡片的顶部必须保留高对比度的分割头部，并配备该功能的专有图标（如网络类的 `Radio` 图标、计算或系统类的 `Cpu` 图标等）和全大写微字体的诊断标题进行指引，确保功能界限一目了然。
