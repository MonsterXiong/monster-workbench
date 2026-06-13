<script setup lang="ts">
import type {
  AllowDragFunction,
  AllowDropFunction,
  CheckedInfo,
  LoadFunction,
  NodeDropType,
  TreeInstance,
  TreeKey,
  TreeNodeData,
} from "element-plus";
import type { ComponentInternalInstance } from "vue";
import { computed, nextTick, ref, useAttrs, watch } from "vue";
import { filterTreeNodeKeys, getFirstTruthyRecordValue, hasItem, setSelectionKey, uniqueArray } from "../../utils";
import { getElementPlusControlRoot } from "./elementPlusDom";

defineOptions({
  inheritAttrs: false,
});

type TreeSize = "sm" | "md" | "lg";
type TreeSurface = "card" | "muted" | "plain";
type BadgeType = "primary" | "success" | "warning" | "danger" | "neutral";
type ElementTreeNode = ReturnType<TreeInstance["getNode"]>;

export interface TreeNode extends TreeNodeData {
  name: string;
  isDir: boolean;
  path: string;
  children?: TreeNode[];
  expanded?: boolean;
  disabled?: boolean;
  isLeaf?: boolean;
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
  checkedKeys?: string[];
  defaultCheckedKeys?: string[];
  indent?: number;
  indentStep?: number;
  ariaLabel?: string;
  level?: number;
  size?: TreeSize;
  surface?: TreeSurface;
  bordered?: boolean;
  activeKey?: TreeKey | "";
  currentNodeKey?: TreeKey;
  nodeKey?: string;
  expandOnClick?: boolean;
  showLines?: boolean;
  leafIcon?: string;
  folderIcon?: string;
  folderOpenIcon?: string;
  disabled?: boolean;
  selectable?: boolean;
  showCheckbox?: boolean;
  checkStrictly?: boolean;
  checkOnClick?: boolean;
  checkOnClickLeaf?: boolean;
  checkDescendants?: boolean;
  autoExpandParent?: boolean;
  defaultExpandAll?: boolean;
  renderAfterExpand?: boolean;
  accordion?: boolean;
  lazy?: boolean;
  load?: LoadFunction;
  draggable?: boolean;
  allowDrag?: AllowDragFunction;
  allowDrop?: AllowDropFunction;
  emptyText?: string;
  filterText?: string;
  filterNodeMethod?: (query: string, node: TreeNode) => boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultExpandedKeys: () => [],
  defaultCheckedKeys: () => [],
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
  showCheckbox: false,
  checkStrictly: false,
  checkOnClick: false,
  checkOnClickLeaf: true,
  checkDescendants: false,
  autoExpandParent: true,
  defaultExpandAll: false,
  renderAfterExpand: false,
  accordion: false,
  lazy: false,
  load: undefined,
  draggable: false,
  allowDrag: undefined,
  allowDrop: undefined,
  emptyText: "",
  filterText: "",
  filterNodeMethod: undefined,
});

const emit = defineEmits<{
  (e: "node-click", node: TreeNode, treeNode: ElementTreeNode, nodeInstance: ComponentInternalInstance | null, event: MouseEvent): void;
  (e: "node-toggle", payload: { node: TreeNode; expanded: boolean }): void;
  (e: "node-expand", node: TreeNode, treeNode: ElementTreeNode, nodeInstance: ComponentInternalInstance | null): void;
  (e: "node-collapse", node: TreeNode, treeNode: ElementTreeNode, nodeInstance: ComponentInternalInstance | null): void;
  (e: "select", node: TreeNode): void;
  (e: "update:expandedKeys", keys: TreeKey[]): void;
  (e: "update:checkedKeys", keys: TreeKey[]): void;
  (e: "check", payload: { node: TreeNode; checkedKeys: TreeKey[]; checkedNodes: TreeNode[]; halfCheckedKeys: TreeKey[]; halfCheckedNodes: TreeNode[] }): void;
  (e: "check-change", payload: { node: TreeNode; checked: boolean; indeterminate: boolean }): void;
  (e: "current-change", node: TreeNode | null, treeNode: ElementTreeNode | null): void;
  (e: "node-contextmenu", event: Event, node: TreeNode, treeNode: ElementTreeNode, nodeInstance: ComponentInternalInstance | null): void;
  (e: "node-drag-start", treeNode: ElementTreeNode, event: DragEvent): void;
  (e: "node-drag-enter", draggingNode: ElementTreeNode, dropNode: ElementTreeNode, event: DragEvent): void;
  (e: "node-drag-leave", draggingNode: ElementTreeNode, oldDropNode: ElementTreeNode, event: DragEvent): void;
  (e: "node-drag-over", draggingNode: ElementTreeNode, dropNode: ElementTreeNode, event: DragEvent): void;
  (e: "node-drag-end", draggingNode: ElementTreeNode, dropNode: ElementTreeNode | null, dropType: NodeDropType, event: DragEvent): void;
  (e: "node-drop", draggingNode: ElementTreeNode, dropNode: ElementTreeNode, dropType: Exclude<NodeDropType, "none">, event: DragEvent): void;
}>();

defineSlots<{
  default?: (props: { node: TreeNode; level: number; active: boolean; expanded: boolean }) => any;
  actions?: (props: { node: TreeNode; level: number; active: boolean; expanded: boolean }) => any;
}>();

const attrs = useAttrs();
const getNodeKey = (node: TreeNode): TreeKey => {
  const value = getFirstTruthyRecordValue<TreeKey | "">(node, [props.nodeKey, "path", "name"], "");
  return typeof value === "number" ? value : String(value ?? "");
};

const collectExpandedKeys = (nodes: TreeNode[]): TreeKey[] => {
  return filterTreeNodeKeys(nodes, (node) => Boolean(node.expanded), (node) => node.children, getNodeKey);
};

const initialExpandedKeys = () => uniqueArray([...collectExpandedKeys(props.data), ...props.defaultExpandedKeys]);
const internalExpandedKeys = ref<TreeKey[]>(initialExpandedKeys());
const internalCheckedKeys = ref<TreeKey[]>(uniqueArray(props.defaultCheckedKeys));
const expandedKeysSource = computed(() => props.expandedKeys ?? internalExpandedKeys.value);
const checkedKeysSource = computed(() => props.checkedKeys ?? internalCheckedKeys.value);
const treeRef = ref<TreeInstance | null>(null);
const resolvedCurrentNodeKey = computed(() => {
  const key = props.currentNodeKey ?? props.activeKey;
  return key === "" || key === undefined ? undefined : key;
});

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
  isLeaf: (node: TreeNode) => node.isLeaf ?? !node.isDir,
}));

const treeStyle = computed(() => ({
  "--base-tree-indent": `${props.indent}px`,
}));

const normalizeTreeKeys = (keys: TreeKey[]) => uniqueArray(keys);
const isActive = (node: TreeNode) => resolvedCurrentNodeKey.value !== undefined && getNodeKey(node) === resolvedCurrentNodeKey.value;
const isNodeDisabled = (node: TreeNode) => Boolean(props.disabled || node.disabled);
const isNodeExpanded = (node: TreeNode) => hasItem(expandedKeysSource.value, getNodeKey(node));
const resolvedIcon = (node: TreeNode) => {
  if (node.icon) return node.icon;
  if (node.isDir) return isNodeExpanded(node) ? props.folderOpenIcon : props.folderIcon;
  return props.leafIcon;
};

const getNodeSearchText = (node: TreeNode) =>
  [node.name, node.path, node.description, node.meta, node.badge]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

const resolvedFilterNodeMethod = (query: string, node: TreeNode) => {
  if (props.filterNodeMethod) return props.filterNodeMethod(String(query ?? ""), node);

  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  if (!normalizedQuery) return true;

  return getNodeSearchText(node).includes(normalizedQuery);
};

const syncCheckedKeys = async (keys: TreeKey[]) => {
  if (!props.showCheckbox) return;

  await nextTick();
  treeRef.value?.setCheckedKeys(keys);
};

const filterTree = async (query: string) => {
  await nextTick();
  treeRef.value?.filter(query);
};

watch(
  () => props.defaultExpandedKeys,
  () => {
    if (props.expandedKeys === undefined) {
      internalExpandedKeys.value = initialExpandedKeys();
    }
  },
);

watch(
  () => props.defaultCheckedKeys,
  () => {
    if (props.checkedKeys === undefined) {
      internalCheckedKeys.value = uniqueArray(props.defaultCheckedKeys);
      void syncCheckedKeys(internalCheckedKeys.value);
    }
  },
);

watch(
  checkedKeysSource,
  (keys) => {
    void syncCheckedKeys(keys);
  },
  { immediate: true },
);

watch(
  () => props.filterText,
  (query) => {
    void filterTree(query);
  },
  { immediate: true },
);

const commitExpandedKeys = (keys: TreeKey[]) => {
  const nextKeys = uniqueArray(keys);
  if (props.expandedKeys === undefined) {
    internalExpandedKeys.value = nextKeys;
  }

  emit("update:expandedKeys", nextKeys);
};

const commitCheckedKeys = (keys: TreeKey[]) => {
  const nextKeys = uniqueArray(keys);
  if (props.checkedKeys === undefined) {
    internalCheckedKeys.value = nextKeys;
  }

  emit("update:checkedKeys", nextKeys);
};

const handleNodeClick = (node: TreeNode, treeNode: ElementTreeNode, nodeInstance: ComponentInternalInstance | null, event: MouseEvent) => {
  if (isNodeDisabled(node)) return;

  emit("node-click", node, treeNode, nodeInstance, event);

  if (props.selectable) {
    emit("select", node);
  }
};

const handleNodeExpand = (node: TreeNode, treeNode: ElementTreeNode, nodeInstance: ComponentInternalInstance | null) => {
  if (isNodeDisabled(node)) return;

  commitExpandedKeys(setSelectionKey(expandedKeysSource.value, getNodeKey(node), true));
  emit("node-toggle", { node, expanded: true });
  emit("node-expand", node, treeNode, nodeInstance);
};

const handleNodeCollapse = (node: TreeNode, treeNode: ElementTreeNode, nodeInstance: ComponentInternalInstance | null) => {
  if (isNodeDisabled(node)) return;

  commitExpandedKeys(setSelectionKey(expandedKeysSource.value, getNodeKey(node), false));
  emit("node-toggle", { node, expanded: false });
  emit("node-collapse", node, treeNode, nodeInstance);
};

const handleCheck = (
  node: TreeNode,
  payload: CheckedInfo,
) => {
  const checkedKeys = normalizeTreeKeys(payload.checkedKeys);
  const halfCheckedKeys = normalizeTreeKeys(payload.halfCheckedKeys);

  commitCheckedKeys(checkedKeys);
  emit("check", {
    node,
    checkedKeys,
    checkedNodes: payload.checkedNodes as TreeNode[],
    halfCheckedKeys,
    halfCheckedNodes: payload.halfCheckedNodes as TreeNode[],
  });
};

const handleCheckChange = (node: TreeNode, checked: boolean, indeterminate: boolean) => {
  emit("check-change", { node, checked, indeterminate });
};

const handleCurrentChange = (node: TreeNode | null, treeNode: ElementTreeNode | null) => {
  emit("current-change", node, treeNode);
};

const handleNodeContextMenu = (
  event: Event,
  node: TreeNode,
  treeNode: ElementTreeNode,
  nodeInstance: ComponentInternalInstance | null,
) => {
  emit("node-contextmenu", event, node, treeNode, nodeInstance);
};

const handleNodeDragStart = (treeNode: ElementTreeNode, event: DragEvent) => {
  emit("node-drag-start", treeNode, event);
};

const handleNodeDragEnter = (draggingNode: ElementTreeNode, dropNode: ElementTreeNode, event: DragEvent) => {
  emit("node-drag-enter", draggingNode, dropNode, event);
};

const handleNodeDragLeave = (draggingNode: ElementTreeNode, oldDropNode: ElementTreeNode, event: DragEvent) => {
  emit("node-drag-leave", draggingNode, oldDropNode, event);
};

const handleNodeDragOver = (draggingNode: ElementTreeNode, dropNode: ElementTreeNode, event: DragEvent) => {
  emit("node-drag-over", draggingNode, dropNode, event);
};

const handleNodeDragEnd = (
  draggingNode: ElementTreeNode,
  dropNode: ElementTreeNode | null,
  dropType: NodeDropType,
  event: DragEvent,
) => {
  emit("node-drag-end", draggingNode, dropNode, dropType, event);
};

const handleNodeDrop = (
  draggingNode: ElementTreeNode,
  dropNode: ElementTreeNode,
  dropType: Exclude<NodeDropType, "none">,
  event: DragEvent,
) => {
  emit("node-drop", draggingNode, dropNode, dropType, event);
};

const getElement = () => getElementPlusControlRoot(treeRef.value);

const getCurrentNodeElement = () =>
  getElement()?.querySelector<HTMLElement>(".el-tree-node.is-current > .el-tree-node__content") ?? null;

const focusTreeNodeElement = (element: HTMLElement | null) => {
  if (!element) return null;
  element.focus();
  return element;
};

const focusCurrentNode = async () => {
  await nextTick();
  return focusTreeNodeElement(getCurrentNodeElement());
};

const focusNode = async (key: TreeKey, shouldAutoExpandParent = true) => {
  treeRef.value?.setCurrentKey(key, shouldAutoExpandParent);
  await nextTick();
  return focusTreeNodeElement(getCurrentNodeElement());
};

defineExpose({
  getNativeTree: () => treeRef.value,
  getElement,
  getTreeElement: getElement,
  focusCurrentNode,
  focusNode,
  filter: (value: string) => treeRef.value?.filter(value),
  getNode: (data: TreeKey | TreeNodeData) => treeRef.value?.getNode(data),
  getNodePath: (data: TreeKey | TreeNodeData) => treeRef.value?.getNodePath(data),
  getCheckedKeys: (leafOnly?: boolean) => treeRef.value?.getCheckedKeys(leafOnly) ?? [],
  getCheckedNodes: (leafOnly?: boolean, includeHalfChecked?: boolean) =>
    (treeRef.value?.getCheckedNodes(leafOnly, includeHalfChecked) ?? []) as TreeNode[],
  getHalfCheckedKeys: () => treeRef.value?.getHalfCheckedKeys() ?? [],
  getHalfCheckedNodes: () => (treeRef.value?.getHalfCheckedNodes() ?? []) as TreeNode[],
  setCheckedKeys: (keys: TreeKey[], leafOnly?: boolean) => treeRef.value?.setCheckedKeys(keys, leafOnly),
  setChecked: (data: TreeKey | TreeNodeData, checked: boolean, deep?: boolean) => treeRef.value?.setChecked(data, checked, deep),
  getCurrentNode: () => (treeRef.value?.getCurrentNode() ?? null) as TreeNode | null,
  getCurrentKey: () => treeRef.value?.getCurrentKey(),
  setCurrentNode: (node: ElementTreeNode, shouldAutoExpandParent?: boolean) => treeRef.value?.setCurrentNode(node, shouldAutoExpandParent),
  setCurrentKey: (key?: TreeKey | null, shouldAutoExpandParent?: boolean) => treeRef.value?.setCurrentKey(key, shouldAutoExpandParent),
  setCurrentNodeKey: (key?: TreeKey | null, shouldAutoExpandParent?: boolean) => treeRef.value?.setCurrentKey(key, shouldAutoExpandParent),
  append: (data: TreeNodeData, parentNode: TreeKey | TreeNodeData | ElementTreeNode) => treeRef.value?.append(data, parentNode),
  remove: (data: TreeNodeData | ElementTreeNode) => treeRef.value?.remove(data),
  insertBefore: (data: TreeNodeData, refNode: TreeKey | TreeNodeData | ElementTreeNode) => treeRef.value?.insertBefore(data, refNode),
  insertAfter: (data: TreeNodeData, refNode: TreeKey | TreeNodeData | ElementTreeNode) => treeRef.value?.insertAfter(data, refNode),
  updateKeyChildren: (key: TreeKey, data: TreeNodeData[]) => treeRef.value?.updateKeyChildren(key, data),
});
</script>

<template>
  <el-tree
    v-bind="attrs"
    ref="treeRef"
    class="base-tree"
    :class="rootClasses"
    :style="treeStyle"
    :data="data"
    :empty-text="emptyText"
    :props="treeProps"
    :node-key="nodeKey"
    :default-expanded-keys="expandedKeysSource"
    :default-checked-keys="checkedKeysSource"
    :current-node-key="resolvedCurrentNodeKey"
    :indent="indentStep"
    :expand-on-click-node="!disabled && expandOnClick"
    :show-checkbox="showCheckbox"
    :check-strictly="checkStrictly"
    :check-on-click-node="!disabled && checkOnClick"
    :check-on-click-leaf="!disabled && checkOnClickLeaf"
    :check-descendants="checkDescendants"
    :auto-expand-parent="autoExpandParent"
    :default-expand-all="defaultExpandAll"
    :accordion="accordion"
    :render-after-expand="renderAfterExpand"
    :lazy="lazy"
    :load="load"
    :draggable="!disabled && draggable"
    :allow-drag="allowDrag"
    :allow-drop="allowDrop"
    :highlight-current="resolvedCurrentNodeKey !== undefined"
    :filter-node-method="resolvedFilterNodeMethod"
    :aria-label="ariaLabel || undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    @node-click="handleNodeClick"
    @node-expand="handleNodeExpand"
    @node-collapse="handleNodeCollapse"
    @check="handleCheck"
    @check-change="handleCheckChange"
    @current-change="handleCurrentChange"
    @node-contextmenu="handleNodeContextMenu"
    @node-drag-start="handleNodeDragStart"
    @node-drag-enter="handleNodeDragEnter"
    @node-drag-leave="handleNodeDragLeave"
    @node-drag-over="handleNodeDragOver"
    @node-drag-end="handleNodeDragEnd"
    @node-drop="handleNodeDrop"
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

.base-tree :deep(.el-checkbox) {
  @apply mr-0 shrink-0;
}

.base-tree :deep(.el-checkbox__inner) {
  @apply h-4 w-4 rounded-md border-slate-300 bg-white transition dark:border-slate-700 dark:bg-slate-950;
}

.base-tree :deep(.el-checkbox__input.is-checked .el-checkbox__inner),
.base-tree :deep(.el-checkbox__input.is-indeterminate .el-checkbox__inner) {
  border-color: rgb(var(--color-primary));
  background-color: rgb(var(--color-primary));
}

.base-tree :deep(.el-checkbox__input.is-focus .el-checkbox__inner) {
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.14);
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
