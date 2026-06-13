<script setup lang="ts">
import type { AllowDragFunction, AllowDropFunction, LoadFunction, NodeDropType, TreeKey } from "element-plus";
import { ref } from "vue";
import BaseTree from "../../../../../components/common/BaseTree.vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const activeTreePath = ref("components/playground/PlaygroundNavigationDemos.vue");
const treeEvent = ref("等待选择");
const controlledTreeExpandedKeys = ref<TreeKey[]>(["resources", "resources/layouts"]);
const checkedTreeKeys = ref<TreeKey[]>(["resources/layouts/three-column"]);
const treeFilterText = ref("");
const checkedTreeSummary = ref("已选 1 项");
const nativeTreeEvent = ref("展开目录触发懒加载，拖拽条目查看事件反馈");
const treeInstanceText = ref("等待树实例操作");
const treeInstanceRef = ref<InstanceType<typeof BaseTree> | null>(null);

type NavigationBadgeType = "primary" | "success" | "warning" | "danger" | "neutral";

interface NavigationTreeNode extends Record<string, unknown> {
  name: string;
  path: string;
  isDir: boolean;
  children?: NavigationTreeNode[];
  expanded?: boolean;
  disabled?: boolean;
  icon?: string;
  badge?: string;
  badgeType?: NavigationBadgeType;
  meta?: string;
  description?: string;
  dragLocked?: boolean;
}

type ElementTreeNode = Parameters<AllowDragFunction>[0];

const treeData = ref([
  {
    name: "components",
    path: "components",
    isDir: true,
    description: "公共组件目录",
    badge: "12",
    badgeType: "primary" as const,
    meta: "src",
    expanded: true,
    children: [
      { name: "BaseButton.vue", path: "components/BaseButton.vue", isDir: false, meta: "基础", badge: "UI", badgeType: "success" as const },
      { name: "BaseResizablePanels.vue", path: "components/BaseResizablePanels.vue", isDir: false, meta: "布局", badge: "Hot", badgeType: "warning" as const },
      {
        name: "playground",
        path: "components/playground",
        isDir: true,
        description: "组件沙箱拆分目录",
        meta: "demo",
        expanded: true,
        children: [
          { name: "PlaygroundCatalog.vue", path: "components/playground/PlaygroundCatalog.vue", isDir: false, meta: "目录" },
          { name: "PlaygroundNavigationDemos.vue", path: "components/playground/PlaygroundNavigationDemos.vue", isDir: false, meta: "当前", badge: "Active", badgeType: "primary" as const },
        ],
      },
    ],
  },
  {
    name: "legacy",
    path: "components/legacy",
    isDir: true,
    disabled: true,
    meta: "只读",
    badge: "Lock",
    badgeType: "warning" as const,
  },
]);

const resourceTreeData = ref([
  {
    name: "工作台资源",
    path: "resources",
    isDir: true,
    expanded: true,
    icon: "PackageOpen",
    description: "按资源类型聚合",
    children: [
      {
        name: "布局模板",
        path: "resources/layouts",
        isDir: true,
        expanded: true,
        icon: "LayoutTemplate",
        badge: "6",
        children: [
          { name: "三栏工作台", path: "resources/layouts/three-column", isDir: false, icon: "PanelsLeftRight", meta: "已接入" },
          { name: "详情编辑页", path: "resources/layouts/detail-editor", isDir: false, icon: "PanelTop", meta: "草稿" },
        ],
      },
      {
        name: "状态资源",
        path: "resources/states",
        isDir: true,
        icon: "Activity",
        badge: "4",
        badgeType: "success" as const,
        children: [
          { name: "空态", path: "resources/states/empty", isDir: false, icon: "CircleOff" },
          { name: "错误态", path: "resources/states/error", isDir: false, icon: "TriangleAlert" },
        ],
      },
    ],
  },
]);

const lazyNavigationData = ref<NavigationTreeNode[]>([
  {
    name: "导航工作区",
    path: "navigation",
    isDir: true,
    expanded: true,
    icon: "PanelsTopLeft",
    badge: "Lazy",
    badgeType: "primary",
    description: "展开后按需加载子级",
  },
  {
    name: "固定入口",
    path: "navigation/pinned",
    isDir: true,
    icon: "Pin",
    badge: "Lock",
    badgeType: "warning",
    meta: "不可拖拽",
    dragLocked: true,
  },
]);

const lazyNavigationChildren: Record<string, NavigationTreeNode[]> = {
  navigation: [
    {
      name: "页面入口",
      path: "navigation/pages",
      isDir: true,
      icon: "PanelTop",
      badge: "3",
      description: "可继续懒加载",
    },
    {
      name: "工具入口",
      path: "navigation/tools",
      isDir: true,
      icon: "Wrench",
      badge: "2",
      badgeType: "success",
    },
    { name: "README.md", path: "navigation/readme", isDir: false, icon: "FileText", meta: "说明" },
  ],
  "navigation/pages": [
    { name: "概览页", path: "navigation/pages/overview", isDir: false, icon: "LayoutDashboard", meta: "默认" },
    { name: "详情页", path: "navigation/pages/detail", isDir: false, icon: "PanelTop" },
    { name: "设置页", path: "navigation/pages/settings", isDir: false, icon: "Settings" },
  ],
  "navigation/tools": [
    { name: "批量操作", path: "navigation/tools/batch-actions", isDir: false, icon: "MousePointerClick" },
    { name: "命令面板", path: "navigation/tools/command-palette", isDir: false, icon: "Command" },
  ],
  "navigation/pinned": [
    { name: "首页", path: "navigation/pinned/home", isDir: false, icon: "Home", dragLocked: true, meta: "固定" },
    { name: "审计", path: "navigation/pinned/audit", isDir: false, icon: "ShieldCheck", dragLocked: true, meta: "固定" },
  ],
};

const cloneNavigationNodes = (nodes: NavigationTreeNode[]): NavigationTreeNode[] =>
  nodes.map((node) => ({
    ...node,
    children: node.children ? cloneNavigationNodes(node.children) : undefined,
  }));

const getNavigationNodeData = (node: ElementTreeNode | null | undefined) => node?.data as NavigationTreeNode | undefined;

const formatNavigationNode = (node: ElementTreeNode | null | undefined) => getNavigationNodeData(node)?.name ?? "空白区域";

const dragDropTypeText: Record<Exclude<NodeDropType, "none">, string> = {
  before: "移到前方",
  after: "移到后方",
  inner: "放入",
};

const loadNavigationNode: LoadFunction = (node, resolve) => {
  const nodeData = getNavigationNodeData(node);
  const children = node.level === 0 ? lazyNavigationData.value : lazyNavigationChildren[nodeData?.path ?? ""] ?? [];

  window.setTimeout(() => {
    resolve(cloneNavigationNodes(children));
    if (nodeData) {
      nativeTreeEvent.value = `懒加载：${nodeData.name} 载入 ${children.length} 项`;
    }
  }, 220);
};

const allowNavigationDrag: AllowDragFunction = (node) => !getNavigationNodeData(node)?.dragLocked;

const allowNavigationDrop: AllowDropFunction = (_draggingNode, dropNode, type) => {
  const dropData = getNavigationNodeData(dropNode);
  if (!dropData || dropData.dragLocked) return false;
  if (type === "inner") return dropData.isDir;

  const parentData = dropNode.parent?.data as NavigationTreeNode | undefined;
  return !parentData?.dragLocked;
};

const handleTreeNodeClick = (node: { name: string; path: string; isDir: boolean }) => {
  activeTreePath.value = node.path;
  treeEvent.value = `${node.isDir ? "目录" : "文件"}：${node.path || node.name}`;
  triggerToast(treeEvent.value, "info");
};

const handleTreeToggle = (payload: { node: { name: string; path: string }; expanded: boolean }) => {
  treeEvent.value = `${payload.node.name} ${payload.expanded ? "展开" : "收起"}`;
};

const filterResourceTreeNode = (query: string, node: { name: string; path: string; description?: string; meta?: string; badge?: string }) => {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;

  return [node.name, node.path, node.description, node.meta, node.badge]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(keyword);
};

const handleTreeCheck = (payload: { checkedKeys: TreeKey[]; halfCheckedKeys: TreeKey[] }) => {
  checkedTreeSummary.value = `已选 ${payload.checkedKeys.length} 项，半选 ${payload.halfCheckedKeys.length} 项`;
};

const handleNavigationCurrentChange = (node: NavigationTreeNode | null) => {
  if (!node) return;
  activeTreePath.value = node.path;
  nativeTreeEvent.value = `当前节点：${node.name}`;
};

const handleNavigationContextmenu = (event: Event, node: NavigationTreeNode) => {
  event.preventDefault();
  nativeTreeEvent.value = `右键节点：${node.name}`;
};

const handleNavigationDragStart = (node: ElementTreeNode) => {
  nativeTreeEvent.value = `开始拖拽：${formatNavigationNode(node)}`;
};

const handleNavigationDragEnd = (draggingNode: ElementTreeNode, dropNode: ElementTreeNode | null, dropType: NodeDropType) => {
  if (dropType === "none") {
    nativeTreeEvent.value = `取消拖拽：${formatNavigationNode(draggingNode)}`;
    return;
  }

  nativeTreeEvent.value = `拖拽结束：${formatNavigationNode(draggingNode)} ${dragDropTypeText[dropType]} ${formatNavigationNode(dropNode)}`;
};

const handleNavigationDrop = (draggingNode: ElementTreeNode, dropNode: ElementTreeNode, dropType: Exclude<NodeDropType, "none">) => {
  nativeTreeEvent.value = `已放置：${formatNavigationNode(draggingNode)} ${dragDropTypeText[dropType]} ${formatNavigationNode(dropNode)}`;
};

function readTreeElement() {
  const element = treeInstanceRef.value?.getElement();
  treeInstanceText.value = element ? `DOM: ${element.tagName.toLowerCase()}.${element.classList[0] || "root"}` : "未读取到 DOM";
}

async function focusCurrentTreeNode() {
  const element = await treeInstanceRef.value?.focusCurrentNode();
  treeInstanceText.value = element ? `当前节点: ${element.textContent?.trim() || "-"}` : "未找到当前节点";
}

async function focusPlaygroundTreeNode() {
  const element = await treeInstanceRef.value?.focusNode("components/playground/PlaygroundNavigationDemos.vue");
  treeInstanceText.value = element ? "已聚焦当前 demo 节点" : "未找到目标节点";
}
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="树形导航" subtitle="用于目录、资源分组和层级配置，保留展开折叠与节点点击反馈。" icon="ListTree">
      <div class="demo-grid">
        <BasePanel title="组件目录" subtitle="标准卡片表面，支持 active、badge、meta、禁用项和展开事件。">
          <BaseTree
            ref="treeInstanceRef"
            data-native-tree-ref="base-tree-instance"
            :data="treeData"
            :active-key="activeTreePath"
            aria-label="组件目录树"
            @node-click="handleTreeNodeClick"
            @node-toggle="handleTreeToggle"
          />
          <template #footer>
            <div class="tree-instance-panel">
              <span class="navigation-result">最近节点：{{ treeEvent }}</span>
              <span class="tree-instance-copy">{{ treeInstanceText }}</span>
              <div class="tree-instance-actions">
                <BaseButton size="xs" type="secondary" outline @click="readTreeElement">DOM</BaseButton>
                <BaseButton size="xs" type="secondary" outline @click="focusCurrentTreeNode">当前</BaseButton>
                <BaseButton size="xs" type="secondary" outline @click="focusPlaygroundTreeNode">Demo</BaseButton>
              </div>
            </div>
          </template>
        </BasePanel>

        <BasePanel title="资源树" subtitle="muted 表面、小尺寸和层级连线适合侧栏资源导航。">
          <BaseTree
            :data="resourceTreeData"
            :active-key="activeTreePath"
            size="sm"
            surface="muted"
            show-lines
            aria-label="工作台资源树"
            @node-click="handleTreeNodeClick"
          />
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="勾选与过滤" subtitle="复用 Element Plus checkbox、checkedKeys 和 filterNodeMethod。">
          <div class="tree-filter-stack">
            <BaseSearchInput
              v-model="treeFilterText"
              placeholder="搜索布局、状态或资源路径"
              size="sm"
              search-on-input
              aria-label="过滤资源树"
            />
            <BaseTree
              v-model:checked-keys="checkedTreeKeys"
              :data="resourceTreeData"
              :filter-text="treeFilterText"
              :filter-node-method="filterResourceTreeNode"
              show-checkbox
              check-on-click
              default-expand-all
              surface="muted"
              size="sm"
              empty-text="没有匹配的资源"
              aria-label="可勾选资源树"
              @node-click="handleTreeNodeClick"
              @check="handleTreeCheck"
            />
          </div>
          <template #footer>
            <span class="navigation-result">{{ checkedTreeSummary }}</span>
          </template>
        </BasePanel>

        <BasePanel title="受控展开" subtitle="通过 expandedKeys 接管展开状态，适合与路由、搜索或偏好设置联动。">
          <BaseTree
            v-model:expanded-keys="controlledTreeExpandedKeys"
            :data="resourceTreeData"
            :active-key="activeTreePath"
            surface="muted"
            show-lines
            aria-label="受控展开资源树"
            @node-click="handleTreeNodeClick"
            @node-toggle="handleTreeToggle"
          />
          <template #footer>
            <span class="navigation-result">展开节点：{{ controlledTreeExpandedKeys.join(" / ") }}</span>
          </template>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="整组禁用" subtitle="流程锁定或权限不足时禁用所有节点，同时保留展开内容可读。">
          <BaseTree
            :data="resourceTreeData"
            :default-expanded-keys="['resources', 'resources/layouts']"
            disabled
            :selectable="false"
            size="sm"
            surface="card"
            aria-label="禁用资源树"
          />
        </BasePanel>

        <BasePanel title="拖拽与懒加载" subtitle="透传 Element Plus lazy、load、draggable、allowDrop 和原生树事件。">
          <BaseTree
            :data="lazyNavigationData"
            :default-expanded-keys="['navigation']"
            lazy
            :load="loadNavigationNode"
            draggable
            :allow-drag="allowNavigationDrag"
            :allow-drop="allowNavigationDrop"
            render-after-expand
            show-lines
            surface="muted"
            size="sm"
            aria-label="可拖拽懒加载导航树"
            @current-change="handleNavigationCurrentChange"
            @node-contextmenu="handleNavigationContextmenu"
            @node-drag-start="handleNavigationDragStart"
            @node-drag-end="handleNavigationDragEnd"
            @node-drop="handleNavigationDrop"
          />
          <template #footer>
            <span class="navigation-result">{{ nativeTreeEvent }}</span>
          </template>
        </BasePanel>
      </div>

      <BasePanel title="自定义节点" subtitle="通过默认插槽和 actions 插槽接入业务状态、文件类型和行内操作。">
        <BaseTree
          :data="treeData"
          :active-key="activeTreePath"
          surface="plain"
          :bordered="false"
          :indent="8"
          leaf-icon="FileCode"
          folder-icon="FolderGit2"
          folder-open-icon="FolderOpen"
          aria-label="自定义节点树"
          @node-click="handleTreeNodeClick"
        >
          <template #default="{ node, active }">
            <span class="tree-custom-node">
              <strong>{{ node.name }}</strong>
              <small>{{ node.path }}</small>
              <BaseBadge v-if="active" type="primary" size="xs">选中</BaseBadge>
            </span>
          </template>
          <template #actions="{ node }">
            <BaseBadge v-if="node.isDir" type="neutral" size="xs">目录</BaseBadge>
          </template>
        </BaseTree>
        <BaseAlert class="mt-4" type="info" title="节点事件" description="树组件保持轻量，业务可以在 node-click 中接入路由、预览、选择或上下文菜单。" compact />
      </BasePanel>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}

.navigation-result {
  @apply text-xs font-black text-slate-500 dark:text-slate-400;
}

.tree-filter-stack {
  @apply grid gap-3;
}

.tree-custom-node {
  @apply flex min-w-0 flex-1 items-center gap-2;
}

.tree-custom-node strong {
  @apply min-w-0 truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.tree-custom-node small {
  @apply hidden min-w-0 truncate text-[10px] font-bold text-slate-400 dark:text-slate-500 sm:block;
}

.tree-instance-panel {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}

.tree-instance-copy {
  @apply min-w-0 truncate text-[11px] font-black text-slate-400 dark:text-slate-500;
}

.tree-instance-actions {
  @apply ml-auto flex shrink-0 flex-wrap items-center gap-2;
}
</style>
