<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { getNextClampedIndex, hasItem, reduceTree, removeByValue, uniqueArray } from "../../utils";

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

const isRoot = () => props.level === 1;
const getNodeKey = (node: TreeNode) => String(node[props.nodeKey] || node.path || node.name);
const collectExpandedKeys = (nodes: TreeNode[]): string[] => {
  return reduceTree(
    nodes,
    (keys, node) => {
      if (node.expanded) {
        keys.push(getNodeKey(node));
      }

      return keys;
    },
    [] as string[],
    (node) => node.children
  );
};

const initialExpandedKeys = () => uniqueArray([...collectExpandedKeys(props.data), ...props.defaultExpandedKeys]);
const internalExpandedKeys = ref<string[]>(initialExpandedKeys());
const expandedKeysSource = computed(() => props.expandedKeys ?? internalExpandedKeys.value);

const isActive = (node: TreeNode) => Boolean(props.activeKey && getNodeKey(node) === props.activeKey);
const hasChildren = (node: TreeNode) => Boolean(node.isDir && node.children?.length);
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
  if (props.expandedKeys === undefined) {
    internalExpandedKeys.value = keys;
  }

  emit("update:expandedKeys", keys);
};

const setNodeExpanded = (node: TreeNode, expanded: boolean) => {
  const key = getNodeKey(node);
  const nextKeys = expanded
    ? uniqueArray([...expandedKeysSource.value, key])
    : removeByValue(expandedKeysSource.value, (item) => item, key);

  commitExpandedKeys(nextKeys);
  emit("node-toggle", { node, expanded });
};

const handleNodeClick = (node: TreeNode) => {
  if (isNodeDisabled(node)) return;

  if (node.isDir && props.expandOnClick) {
    setNodeExpanded(node, !isNodeExpanded(node));
  }

  emit("node-click", node);

  if (props.selectable) {
    emit("select", node);
  }
};

const getTreeRoot = (target: EventTarget | null) => {
  return target instanceof HTMLElement ? target.closest<HTMLElement>('[role="tree"]') : null;
};

const getVisibleTreeItems = (target: EventTarget | null) => {
  const root = getTreeRoot(target);
  if (!root) return [];

  return Array.from(root.querySelectorAll<HTMLButtonElement>('.base-tree__node:not(:disabled)')).filter((item) => item.offsetParent !== null);
};

const focusTreeItem = (items: HTMLButtonElement[], index: number) => {
  const target = items[index];
  if (!target) return;

  void nextTick(() => {
    target.focus({ preventScroll: true });
  });
};

const focusSibling = (event: KeyboardEvent, offset: 1 | -1) => {
  const items = getVisibleTreeItems(event.currentTarget);
  const currentIndex = items.findIndex((item) => item === event.currentTarget);
  if (currentIndex === -1) return;

  const nextIndex = getNextClampedIndex(items.length, currentIndex, offset);
  focusTreeItem(items, nextIndex);
};

const handleNodeKeydown = (event: KeyboardEvent, node: TreeNode) => {
  if (isNodeDisabled(node)) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusSibling(event, 1);
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    focusSibling(event, -1);
  }

  if (event.key === "Home") {
    event.preventDefault();
    focusTreeItem(getVisibleTreeItems(event.currentTarget), 0);
  }

  if (event.key === "End") {
    event.preventDefault();
    const items = getVisibleTreeItems(event.currentTarget);
    focusTreeItem(items, items.length - 1);
  }

  if (event.key === "ArrowRight" && hasChildren(node)) {
    event.preventDefault();
    if (!isNodeExpanded(node)) {
      setNodeExpanded(node, true);
      return;
    }

    focusSibling(event, 1);
  }

  if (event.key === "ArrowLeft" && hasChildren(node) && isNodeExpanded(node)) {
    event.preventDefault();
    setNodeExpanded(node, false);
  }
};
</script>

<template>
  <ul
    class="base-tree"
    :class="[
      `base-tree--${size}`,
      {
        [`base-tree--${surface}`]: isRoot(),
        'base-tree--bordered': isRoot() && bordered,
        'base-tree--nested': !isRoot(),
        'base-tree--lines': showLines,
        'is-disabled': isRoot() && disabled,
      },
    ]"
    :role="isRoot() ? 'tree' : 'group'"
    :aria-label="isRoot() ? ariaLabel || undefined : undefined"
    :aria-disabled="isRoot() && disabled ? 'true' : undefined"
  >
    <li
      v-for="(node, idx) in data"
      :key="node.path || node.name || idx"
      class="base-tree__item"
      :class="{ 'is-expanded': isNodeExpanded(node), 'is-disabled': isNodeDisabled(node) }"
      role="none"
    >
      <button
        type="button"
        class="base-tree__node"
        :class="{ 'is-active': isActive(node), 'is-disabled': isNodeDisabled(node) }"
        :style="{ paddingLeft: `${indent}px` }"
        role="treeitem"
        :disabled="isNodeDisabled(node)"
        :aria-expanded="node.isDir ? isNodeExpanded(node) : undefined"
        :aria-level="level"
        :aria-selected="selectable && isActive(node) ? 'true' : undefined"
        :aria-disabled="isNodeDisabled(node) ? 'true' : undefined"
        @click="handleNodeClick(node)"
        @keydown="handleNodeKeydown($event, node)"
      >
        <span class="base-tree__toggle" aria-hidden="true">
          <BaseIcon
            v-if="node.isDir"
            name="ChevronRight"
            size="14"
            class="base-tree__chevron"
            :class="{ 'is-expanded': isNodeExpanded(node) }"
            aria-hidden="true"
          />
        </span>

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
      </button>

      <BaseTree
        v-if="hasChildren(node) && isNodeExpanded(node)"
        :data="node.children || []"
        :expanded-keys="expandedKeysSource"
        :default-expanded-keys="defaultExpandedKeys"
        :indent="indent + indentStep"
        :indent-step="indentStep"
        :level="level + 1"
        :size="size"
        surface="plain"
        :bordered="false"
        :active-key="activeKey"
        :node-key="nodeKey"
        :expand-on-click="expandOnClick"
        :show-lines="showLines"
        :leaf-icon="leafIcon"
        :folder-icon="folderIcon"
        :folder-open-icon="folderOpenIcon"
        :disabled="disabled"
        :selectable="selectable"
        @update:expanded-keys="commitExpandedKeys"
        @node-click="emit('node-click', $event)"
        @node-toggle="emit('node-toggle', $event)"
        @select="emit('select', $event)"
      >
        <template v-if="$slots.default" #default="slotProps">
          <slot name="default" v-bind="slotProps"></slot>
        </template>
        <template v-if="$slots.actions" #actions="slotProps">
          <slot name="actions" v-bind="slotProps"></slot>
        </template>
      </BaseTree>
    </li>
  </ul>
</template>

<style scoped>
.base-tree {
  @apply m-0 w-full min-w-0 list-none select-none p-0;
}

.base-tree.is-disabled {
  @apply opacity-75;
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

.base-tree--nested {
  @apply mt-1;
}

.base-tree__item {
  @apply relative min-w-0;
}

.base-tree--lines .base-tree__item::before {
  @apply absolute bottom-0 top-0 w-px bg-slate-200 dark:bg-slate-800;
  content: "";
  left: 18px;
}

.base-tree__node {
  @apply relative flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800;
}

.base-tree--card > .base-tree__item > .base-tree__node,
.base-tree--muted > .base-tree__item > .base-tree__node {
  @apply rounded-none;
}

.base-tree__node.is-active {
  color: rgb(var(--color-primary));
  background-color: rgba(var(--color-primary), 0.09);
}

.base-tree__item.is-expanded > .base-tree__node {
  @apply bg-slate-50 dark:bg-slate-900;
}

.base-tree__item.is-expanded > .base-tree__node.is-active {
  background-color: rgba(var(--color-primary), 0.1);
}

.base-tree__node.is-disabled {
  @apply opacity-55;
}

.base-tree__toggle {
  @apply flex h-4 w-4 shrink-0 items-center justify-center text-slate-400 dark:text-slate-500;
}

.base-tree__chevron {
  @apply transition-transform duration-150;
}

.base-tree__chevron.is-expanded {
  @apply rotate-90 text-primary;
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

.base-tree--sm .base-tree__node {
  @apply py-1 text-xs;
}

.base-tree--sm .base-tree__description,
.base-tree--sm .base-tree__meta {
  @apply text-[9px];
}

.base-tree--lg .base-tree__node {
  @apply py-2 text-sm;
}

.base-tree--lg .base-tree__description {
  @apply text-xs;
}

@media (prefers-reduced-motion: reduce) {
  .base-tree__node,
  .base-tree__chevron {
    transition: none !important;
  }
}
</style>
