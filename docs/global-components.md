# 全局组件注册与类型安全规范

> 本文档约束高频公共组件的全局注册、零导入机制与 TypeScript 类型安全声明。

---

## 1. 基础通用组件的全局注册与零导入机制

- **单体 main.ts 全局注册**：对于在绝大多数业务场景中均会使用到的通用高频 UI 组件（如 `BaseButton`、`BaseInput`、`BaseDialog`、`BaseTable` 等），必须在 `src/main.ts` 的 `bootstrap` 方法中统一通过 `app.component()` 进行全局挂载。业务层页面及子组件中**绝对禁止**再次编写 `import BaseButton from ...` 等重复的样板导入代码，贯彻 DRY 原则。

---

## 2. 类型系统安全声明（GlobalComponents）

- 全局注册后，为了保证静态编译器 `vue-tsc` 在没有 `import` 语句时依然能够对模板中的 Props 及 Emits 进行完全的静态类型安全检查，必须在 `src/env.d.ts` 中声明 `declare module '@vue/runtime-core'` 的 `GlobalComponents` 接口，将全局组件映射为其对应的物理类型。

---

## 3. 声明文件模块化保护

- 在 `env.d.ts` 的最顶部必须至少包含一个顶层 `import` 声明（例如 `import { DefineComponent } from "vue"`），否则 TS 编译器会将其误判为全局脚本并发生模块重写（Override）报错，这会导致 Vue 核心模块类型（如 `ref`, `computed` 等）被完全抹除覆盖。

---

## 4. 基础通用组件的沙箱预览与注册自检

为了保证所有全局公共基础组件的接口清晰、自适应效果好（特别是在浅色/深色模式下的外观表现）：

- **组件沙箱页**：[PlaygroundPage.vue](file:///src/views/playground/PlaygroundPage.vue) 作为开发期组件的展示和调试沙箱，集中展示了所有 `Base*` 基础组件的各种 Props 态（Loading、Disabled、不同类型等）。
- **同步注册要求**：**新增或重构 Base 组件时，必须同步**在该沙箱页面中注册其展示用例，直观地通过沙箱完成对比度、事件交互以及跨主题样式校验。
