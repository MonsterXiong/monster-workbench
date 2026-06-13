<script setup lang="ts">
import type { ButtonInstance } from "element-plus";
import type { Component } from "vue";
import { Comment, computed, ref, useAttrs, useSlots } from "vue";
import { omit } from "../../utils";
import { getElementPlusControlRoot, toElementPlusSize, type ProjectControlSize } from "./elementPlusDom";

defineOptions({
  inheritAttrs: false,
});

interface Props {
  type?: "primary" | "secondary" | "danger" | "warning" | "success" | "neutral" | "ghost" | "link";
  size?: ProjectControlSize;
  nativeType?: "button" | "submit" | "reset";
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  outline?: boolean;
  round?: boolean;
  circle?: boolean;
  icon?: string | Component;
  loadingIcon?: string | Component;
  color?: string;
  dark?: boolean;
  autoInsertSpace?: boolean;
  tag?: string | Component;
  autofocus?: boolean;
  ariaLabel?: string;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: "primary",
  size: "md",
  nativeType: "button",
  loading: false,
  disabled: false,
  block: false,
  outline: false,
  round: false,
  circle: false,
  icon: undefined,
  loadingIcon: undefined,
  color: "",
  dark: undefined,
  autoInsertSpace: undefined,
  tag: "button",
  autofocus: false,
  ariaLabel: "",
  title: "",
});

const slots = useSlots();
const attrs = useAttrs();
const buttonRef = ref<ButtonInstance | null>(null);

// 过滤掉可能冲突的 size 与 type 属性，防止透传到 el-button 上覆盖我们显式绑定的 :size 与 :type
const filteredAttrs = computed(() => {
  return omit(attrs, ["size", "type"]);
});

const elType = computed(() => {
  if (props.type === "secondary") return "info";
  if (props.type === "neutral") return "info";
  if (props.type === "ghost") return "";
  if (props.type === "link") return "primary";
  return props.type;
});

const elSize = computed(() => toElementPlusSize(props.size));

const isPlain = computed(() => props.outline);
const isText = computed(() => props.type === "ghost");
const isLink = computed(() => props.type === "link");
const hasDefaultSlot = computed(() => {
  const defaultNodes = slots.default?.() ?? [];
  return defaultNodes.some((node) => node.type !== Comment);
});
const hasIcon = computed(() => Boolean(props.icon || slots.icon));
const accessibleLabel = computed(() => props.ariaLabel || props.title || "");

const getElement = () => getElementPlusControlRoot(buttonRef.value);
const getButtonElement = () => {
  const element = getElement();
  if (element instanceof HTMLButtonElement || element instanceof HTMLAnchorElement) return element;
  return element?.querySelector<HTMLButtonElement | HTMLAnchorElement>("button,a") ?? null;
};
const focus = () => {
  const button = getButtonElement();
  button?.focus();
  return button;
};
const click = () => {
  const button = getButtonElement();
  button?.click();
  return button;
};

defineExpose({
  getNativeButton: () => buttonRef.value,
  getElement,
  getButtonElement,
  focus,
  click,
});
</script>

<template>
  <el-button
    v-bind="filteredAttrs"
    ref="buttonRef"
    class="base-button"
    :type="elType"
    :native-type="nativeType"
    :size="elSize"
    :loading="loading"
    :disabled="disabled || loading"
    :plain="isPlain"
    :text="isText"
    :link="isLink"
    :round="round"
    :circle="circle"
    :icon="icon || undefined"
    :loading-icon="loadingIcon || undefined"
    :color="color || undefined"
    :dark="dark"
    :auto-insert-space="autoInsertSpace"
    :tag="tag"
    :autofocus="autofocus"
    :aria-label="accessibleLabel || undefined"
    :aria-busy="loading ? 'true' : undefined"
    :title="title || accessibleLabel || undefined"
    :class="{
      'w-full': block,
      'is-xs': props.size === 'xs',
      'is-icon-only': circle || (!hasDefaultSlot && hasIcon),
    }"
  >
    <template #icon v-if="slots.icon">
      <slot name="icon"></slot>
    </template>
    <slot></slot>
  </el-button>
</template>

<style scoped>
/*
  架构已重构:
  原有的数百行定制 CSS 已被移除。
  现已全量接入 Element Plus 原生渲染引擎，支持深浅色无缝自适应切换。
*/

/* 局部覆盖 Element Plus 按钮的悬浮与激活态，防止与全局主题色变量冲突导致文字或背景隐形 */
.el-button {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.el-button :deep(> span) {
  display: inline-flex !important;
  min-width: 0;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px;
  line-height: 1;
}

.el-button :deep(.el-icon),
.el-button :deep(svg) {
  flex-shrink: 0;
}

.el-button.is-icon-only {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: var(--el-button-size, 32px) !important;
  min-width: var(--el-button-size, 32px) !important;
  height: var(--el-button-size, 32px) !important;
  padding: 0 !important;
  aspect-ratio: 1 / 1;
  line-height: 1 !important;
}

.el-button.is-icon-only :deep(> span),
.el-button.is-icon-only :deep(.el-icon) {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: auto !important;
  height: auto !important;
  line-height: 1;
}

.el-button.is-icon-only :deep(> span:empty) {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  margin-left: 0 !important;
}

.el-button.is-icon-only :deep(.el-icon) {
  margin: 0 !important;
  transform: translate(0, 0);
  font-size: 1em;
}

.el-button.is-icon-only :deep(svg) {
  display: block;
  flex-shrink: 0;
  margin: auto;
  transform: translate(0, 0);
}

.el-button.is-icon-only :deep(.el-icon > svg),
.el-button.is-icon-only :deep(> span > svg) {
  align-self: center;
  justify-self: center;
  margin: 0;
}

.el-button :deep(.el-icon + span),
.el-button :deep(svg + span) {
  margin-left: 0 !important;
}

/* Primary 实底按钮 hover 与 active 态 */
.el-button--primary:not(.is-plain):not(.is-text):not(.is-link):hover {
  background-color: #3b82f6 !important; /* blue-500，换用安全的 16 进制颜色防止 WebView 变量解析失败 */
  border-color: #3b82f6 !important;
  color: #ffffff !important;
}
.el-button--primary:not(.is-plain):not(.is-text):not(.is-link):active {
  background-color: #1d4ed8 !important; /* blue-700 */
  border-color: #1d4ed8 !important;
  color: #ffffff !important;
}

/* Success 实底按钮 hover 与 active 态 */
.el-button--success:not(.is-plain):not(.is-text):not(.is-link):hover {
  background-color: #10b981 !important; /* emerald-500 */
  border-color: #10b981 !important;
  color: #ffffff !important;
}
.el-button--success:not(.is-plain):not(.is-text):not(.is-link):active {
  background-color: #047857 !important; /* emerald-700 */
  border-color: #047857 !important;
  color: #ffffff !important;
}

/* Warning 实底按钮 hover 与 active 态 */
.el-button--warning:not(.is-plain):not(.is-text):not(.is-link):hover {
  background-color: #f59e0b !important; /* amber-500 */
  border-color: #f59e0b !important;
  color: #ffffff !important;
}
.el-button--warning:not(.is-plain):not(.is-text):not(.is-link):active {
  background-color: #b45309 !important; /* amber-700 */
  border-color: #b45309 !important;
  color: #ffffff !important;
}

/* Danger 实底按钮 hover 与 active 态 */
.el-button--danger:not(.is-plain):not(.is-text):not(.is-link):hover {
  background-color: #ef4444 !important; /* red-500 */
  border-color: #ef4444 !important;
  color: #ffffff !important;
}
.el-button--danger:not(.is-plain):not(.is-text):not(.is-link):active {
  background-color: #b91c1c !important; /* red-700 */
  border-color: #b91c1c !important;
  color: #ffffff !important;
}

/* Info / Neutral / Secondary 实底按钮 hover 与 active 态 */
.el-button--info:not(.is-plain):not(.is-text):not(.is-link):hover {
  background-color: #64748b !important; /* slate-500 */
  border-color: #64748b !important;
  color: #ffffff !important;
}
.el-button--info:not(.is-plain):not(.is-text):not(.is-link):active {
  background-color: #334155 !important; /* slate-700 */
  border-color: #334155 !important;
  color: #ffffff !important;
}

/* Outline / Plain 按钮 hover 态 */
.el-button--primary.is-plain:hover {
  background-color: #2563eb !important; /* blue-600 */
  border-color: #2563eb !important;
  color: #ffffff !important;
}
.el-button--success.is-plain:hover {
  background-color: #10b981 !important;
  border-color: #10b981 !important;
  color: #ffffff !important;
}
.el-button--warning.is-plain:hover {
  background-color: #f59e0b !important;
  border-color: #f59e0b !important;
  color: #ffffff !important;
}
.el-button--danger.is-plain:hover {
  background-color: #ef4444 !important;
  border-color: #ef4444 !important;
  color: #ffffff !important;
}
.el-button--info.is-plain:hover {
  background-color: #64748b !important;
  border-color: #64748b !important;
  color: #ffffff !important;
}

/* 自定义 Extra Small (xs) 按钮尺寸样式，使其比 small 更小且精致，防止其隐形 */
.el-button.is-xs {
  padding: 2px 6px !important;
  height: 20px !important;
  font-size: 10px !important;
  border-radius: 6px !important;
}

.el-button.is-icon-only:not(.el-button--small):not(.el-button--large):not(.is-xs) {
  --el-button-size: 32px;
}

.el-button.is-icon-only.is-xs {
  --el-button-size: 20px;
}

@media (prefers-reduced-motion: reduce) {
  .el-button {
    transition: none !important;
  }
}
</style>
