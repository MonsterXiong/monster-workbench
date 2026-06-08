<script setup lang="ts">
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
}

const props = withDefaults(defineProps<Props>(), {
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
});

const emit = defineEmits<{
  (e: "node-click", node: TreeNode): void;
  (e: "node-toggle", payload: { node: TreeNode; expanded: boolean }): void;
  (e: "select", node: TreeNode): void;
}>();

defineSlots<{
  default?: (props: { node: TreeNode; level: number; active: boolean; expanded: boolean }) => any;
  actions?: (props: { node: TreeNode; level: number; active: boolean; expanded: boolean }) => any;
}>();

const isRoot = () => props.level === 1;
const getNodeKey = (node: TreeNode) => node[props.nodeKey] || node.path || node.name;
const isActive = (node: TreeNode) => Boolean(props.activeKey && getNodeKey(node) === props.activeKey);
const hasChildren = (node: TreeNode) => Boolean(node.isDir && node.children?.length);
const resolvedIcon = (node: TreeNode) => {
  if (node.icon) return node.icon;
  if (node.isDir) return node.expanded ? props.folderOpenIcon : props.folderIcon;
  return props.leafIcon;
};

const handleNodeClick = (node: TreeNode) => {
  if (node.disabled) return;

  if (node.isDir && props.expandOnClick) {
    node.expanded = !node.expanded;
    emit("node-toggle", { node, expanded: Boolean(node.expanded) });
  }

  emit("node-click", node);
  emit("select", node);
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
      },
    ]"
    :role="isRoot() ? 'tree' : 'group'"
    :aria-label="isRoot() ? ariaLabel || undefined : undefined"
  >
    <li
      v-for="(node, idx) in data"
      :key="node.path || node.name || idx"
      class="base-tree__item"
      :class="{ 'is-expanded': node.expanded, 'is-disabled': node.disabled }"
      role="none"
    >
      <button
        type="button"
        class="base-tree__node"
        :class="{ 'is-active': isActive(node), 'is-disabled': node.disabled }"
        :style="{ paddingLeft: `${indent}px` }"
        role="treeitem"
        :disabled="node.disabled"
        :aria-expanded="node.isDir ? Boolean(node.expanded) : undefined"
        :aria-level="level"
        :aria-selected="isActive(node) ? 'true' : undefined"
        @click="handleNodeClick(node)"
      >
        <span class="base-tree__toggle" aria-hidden="true">
          <BaseIcon
            v-if="node.isDir"
            name="ChevronRight"
            size="14"
            class="base-tree__chevron"
            :class="{ 'is-expanded': node.expanded }"
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

        <slot :node="node" :level="level" :active="isActive(node)" :expanded="Boolean(node.expanded)">
          <span class="base-tree__text">
            <span class="base-tree__name">{{ node.name }}</span>
            <span v-if="node.description" class="base-tree__description">{{ node.description }}</span>
          </span>
        </slot>

        <span class="base-tree__right">
          <span v-if="node.meta" class="base-tree__meta">{{ node.meta }}</span>
          <BaseBadge v-if="node.badge" :type="node.badgeType || 'neutral'" size="xs">{{ node.badge }}</BaseBadge>
          <slot name="actions" :node="node" :level="level" :active="isActive(node)" :expanded="Boolean(node.expanded)"></slot>
        </span>
      </button>

      <BaseTree
        v-if="hasChildren(node) && node.expanded"
        :data="node.children || []"
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
