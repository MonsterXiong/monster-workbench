<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { filterTreeNodeKeys, getFirstTruthyRecordValue, hasItem, setSelectionKey, uniqueArray } from "../../utils";

type TreeSize = "sm" | "md" | "lg";
type TreeSurface = "card" | "muted" | "plain";
type BadgeType = "primary" | "success" | "warning" | "danger" | "neutral";

export interface TreeNode {
  name: string;
  isDir: boolean;
  path: string;
  children?: TreeNode[];
  expanded?: boolean;
  disabled?: boolean;
  icon?: string;
  badge?: string;
  badgeType?: BadgeType;
  meta?: string;
  description?: string;
}

interface Props {
  data: TreeNode[];
  expandedKeys?: string[];
  defaultExpandedKeys?: string[];
  indent?: number;
  indentStep?: number;
  ariaLabel?: string;
  level?: number;
  size?: TreeSize;
  surface?: TreeSurface;
  bordered?: boolean;
  activeKey?: string;
  nodeKey?: "path" | "name";
  expandOnClick?: boolean;
  showLines?: boolean;
  leafIcon?: string;
  folderIcon?: string;
  folderOpenIcon?: string;
  disabled?: boolean;
  selectable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultExpandedKeys: () => [],
  indent: 12,
  indentStep: 16,
  ariaLabel: "",
  level: 1,
  size: "md",
  surface: "card",
  bordered: true,
  activeKey: "",
  nodeKey: "path",
  expandOnClick: true,
  showLines: false,
  leafIcon: "FileText",
  folderIcon: "Folder",
  folderOpenIcon: "FolderOpen",
  disabled: false,
  selectable: true,
});

const emit = defineEmits<{
  (e: "node-click", node: TreeNode): void;
  (e: "node-toggle", payload: { node: TreeNode; expanded: boolean }): void;
  (e: "select", node: TreeNode): void;
  (e: "update:expandedKeys", keys: string[]): void;
}>();

defineSlots<{
  default?: (props: { node: TreeNode; level: number; active: boolean; expanded: boolean }) => any;
  actions?: (props: { node: TreeNode; level: number; active: boolean; expanded: boolean }) => any;
}>();

const getNodeKey = (node: TreeNode) => String(getFirstTruthyRecordValue(node, [props.nodeKey, "path", "name"], ""));
const collectExpandedKeys = (nodes: TreeNode[]): string[] => {
  return filterTreeNodeKeys(nodes, (node) => Boolean(node.expanded), (node) => node.children, getNodeKey);
};

const initialExpandedKeys = () => uniqueArray([...collectExpandedKeys(props.data), ...props.defaultExpandedKeys]);
const internalExpandedKeys = ref<string[]>(initialExpandedKeys());
const expandedKeysSource = computed(() => props.expandedKeys ?? internalExpandedKeys.value);

const rootClasses = computed(() => [
  `base-tree--${props.size}`,
  `base-tree--${props.surface}`,
  {
    "base-tree--bordered": props.bordered,
    "base-tree--lines": props.showLines,
    "is-disabled": props.disabled,
  },
]);

const treeProps = computed(() => ({
  children: "children",
  label: "name",
  disabled: (node: TreeNode) => isNodeDisabled(node),
  isLeaf: (node: TreeNode) => !node.isDir,
}));

const treeStyle = computed(() => ({
  "--base-tree-indent": `${props.indent}px`,
}));

const isActive = (node: TreeNode) => Boolean(props.activeKey && getNodeKey(node) === props.activeKey);
const isNodeDisabled = (node: TreeNode) => Boolean(props.disabled || node.disabled);
const isNodeExpanded = (node: TreeNode) => hasItem(expandedKeysSource.value, getNodeKey(node));
const resolvedIcon = (node: TreeNode) => {
  if (node.icon) return node.icon;
  if (node.isDir) return isNodeExpanded(node) ? props.folderOpenIcon : props.folderIcon;
  return props.leafIcon;
};

watch(
  () => props.defaultExpandedKeys,
  () => {
    if (props.expandedKeys === undefined) {
      internalExpandedKeys.value = initialExpandedKeys();
    }
  },
);

const commitExpandedKeys = (keys: string[]) => {
  const nextKeys = uniqueArray(keys);
  if (props.expandedKeys === undefined) {
    internalExpandedKeys.value = nextKeys;
  }

  emit("update:expandedKeys", nextKeys);
};

const handleNodeClick = (node: TreeNode) => {
  if (isNodeDisabled(node)) return;

  emit("node-click", node);

  if (props.selectable) {
    emit("select", node);
  }
};

const handleNodeExpand = (node: TreeNode) => {
  if (isNodeDisabled(node)) return;

  commitExpandedKeys(setSelectionKey(expandedKeysSource.value, getNodeKey(node), true));
  emit("node-toggle", { node, expanded: true });
};

const handleNodeCollapse = (node: TreeNode) => {
  if (isNodeDisabled(node)) return;

  commitExpandedKeys(setSelectionKey(expandedKeysSource.value, getNodeKey(node), false));
  emit("node-toggle", { node, expanded: false });
};
</script>

<template>
  <el-tree
    class="base-tree"
    :class="rootClasses"
    :style="treeStyle"
    :data="data"
    :props="treeProps"
    :node-key="nodeKey"
    :default-expanded-keys="expandedKeysSource"
    :current-node-key="activeKey || undefined"
    :indent="indentStep"
    :expand-on-click-node="!disabled && expandOnClick"
    :highlight-current="Boolean(activeKey)"
    :render-after-expand="false"
    :aria-label="ariaLabel || undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    @node-click="handleNodeClick"
    @node-expand="handleNodeExpand"
    @node-collapse="handleNodeCollapse"
  >
    <template #default="{ data: node }">
      <span
        class="base-tree__node"
        :class="{
          'is-active': isActive(node),
          'is-disabled': isNodeDisabled(node),
          'is-expanded': isNodeExpanded(node),
        }"
      >
        <BaseIcon
          :name="resolvedIcon(node)"
          size="16"
          class="base-tree__icon"
          :class="{ 'is-folder': node.isDir }"
          aria-hidden="true"
        />

        <slot :node="node" :level="level" :active="isActive(node)" :expanded="isNodeExpanded(node)">
          <span class="base-tree__text">
            <span class="base-tree__name">{{ node.name }}</span>
            <span v-if="node.description" class="base-tree__description">{{ node.description }}</span>
          </span>
        </slot>

        <span class="base-tree__right">
          <span v-if="node.meta" class="base-tree__meta">{{ node.meta }}</span>
          <BaseBadge v-if="node.badge" :type="node.badgeType || 'neutral'" size="xs">{{ node.badge }}</BaseBadge>
          <slot name="actions" :node="node" :level="level" :active="isActive(node)" :expanded="isNodeExpanded(node)"></slot>
        </span>
      </span>
    </template>
  </el-tree>
</template>

<style scoped>
.base-tree {
  @apply w-full min-w-0 select-none text-slate-700 dark:text-slate-300;
  --el-tree-node-content-height: 34px;
  --el-tree-node-hover-bg-color: rgb(241 245 249);
  --el-tree-text-color: rgb(51 65 85);
  --el-tree-expand-icon-color: rgb(148 163 184);
  background: transparent;
}

.dark .base-tree {
  --el-tree-node-hover-bg-color: rgb(30 41 59);
  --el-tree-text-color: rgb(203 213 225);
  --el-tree-expand-icon-color: rgb(100 116 139);
}

.base-tree.is-disabled {
  @apply opacity-75;
  pointer-events: none;
}

.base-tree--card {
  @apply overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900;
}

.base-tree--muted {
  @apply overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-950;
}

.base-tree--plain {
  @apply bg-transparent;
}

.base-tree--bordered {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-tree :deep(.el-tree-node) {
  @apply min-w-0;
  white-space: normal;
}

.base-tree :deep(.el-tree-node__content) {
  @apply relative min-w-0 gap-2 rounded-xl px-3 text-left text-sm font-bold transition focus:outline-none;
  height: auto;
  min-height: var(--el-tree-node-content-height);
  padding-left: max(var(--base-tree-indent), 0px);
}

.base-tree--card :deep(.el-tree > .el-tree-node > .el-tree-node__content),
.base-tree--muted :deep(.el-tree > .el-tree-node > .el-tree-node__content),
.base-tree--card :deep(> .el-tree-node > .el-tree-node__content),
.base-tree--muted :deep(> .el-tree-node > .el-tree-node__content) {
  @apply rounded-none;
}

.base-tree :deep(.el-tree-node__content:hover) {
  @apply bg-slate-100 dark:bg-slate-800;
}

.base-tree :deep(.el-tree-node:focus > .el-tree-node__content) {
  @apply bg-slate-100 outline-none ring-2 ring-primary ring-opacity-20 dark:bg-slate-800;
}

.base-tree :deep(.el-tree-node.is-current > .el-tree-node__content),
.base-tree :deep(.el-tree-node__content:has(.base-tree__node.is-active)) {
  color: rgb(var(--color-primary));
  background-color: rgba(var(--color-primary), 0.09);
}

.base-tree :deep(.el-tree-node.is-expanded > .el-tree-node__content) {
  @apply bg-slate-50 dark:bg-slate-900;
}

.base-tree :deep(.el-tree-node.is-expanded.is-current > .el-tree-node__content),
.base-tree :deep(.el-tree-node.is-expanded > .el-tree-node__content:has(.base-tree__node.is-active)) {
  background-color: rgba(var(--color-primary), 0.1);
}

.base-tree :deep(.el-tree-node[aria-disabled="true"] > .el-tree-node__content) {
  @apply cursor-not-allowed opacity-55;
}

.base-tree :deep(.el-tree-node__expand-icon) {
  @apply shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-white/70 hover:text-primary dark:text-slate-500 dark:hover:bg-slate-900;
}

.base-tree :deep(.el-tree-node__expand-icon.expanded) {
  @apply text-primary;
}

.base-tree :deep(.el-tree-node__expand-icon.is-leaf) {
  @apply opacity-0;
}

.base-tree--lines :deep(.el-tree-node) {
  @apply relative;
}

.base-tree--lines :deep(.el-tree-node::before) {
  @apply absolute bottom-0 top-0 w-px bg-slate-200 dark:bg-slate-800;
  content: "";
  left: 18px;
}

.base-tree__node {
  @apply flex min-w-0 flex-1 items-center gap-2;
}

.base-tree__node.is-disabled {
  @apply opacity-70;
}

.base-tree__icon {
  @apply shrink-0 text-slate-400;
}

.base-tree__icon.is-folder {
  @apply text-primary;
}

.base-tree__text {
  @apply min-w-0 flex-1;
}

.base-tree__name {
  @apply block truncate;
}

.base-tree__description {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-tree__right {
  @apply ml-auto flex shrink-0 items-center gap-1.5;
}

.base-tree__meta {
  @apply hidden text-[10px] font-black text-slate-400 dark:text-slate-500 sm:inline;
}

.base-tree--sm {
  --el-tree-node-content-height: 30px;
}

.base-tree--sm :deep(.el-tree-node__content) {
  @apply text-xs;
}

.base-tree--sm .base-tree__description,
.base-tree--sm .base-tree__meta {
  @apply text-[9px];
}

.base-tree--lg {
  --el-tree-node-content-height: 38px;
}

.base-tree--lg :deep(.el-tree-node__content) {
  @apply text-sm;
}

.base-tree--lg .base-tree__description {
  @apply text-xs;
}

@media (prefers-reduced-motion: reduce) {
  .base-tree :deep(.el-tree-node__content),
  .base-tree :deep(.el-tree-node__expand-icon) {
    transition: none !important;
  }
}
</style>
