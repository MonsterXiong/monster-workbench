<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const activeTreePath = ref("components/playground/PlaygroundNavigationDemos.vue");
const treeEvent = ref("等待选择");
const controlledTreeExpandedKeys = ref(["resources", "resources/layouts"]);
const checkedTreeKeys = ref(["resources/layouts/three-column"]);
const treeFilterText = ref("");
const checkedTreeSummary = ref("已选 1 项");

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

const handleTreeCheck = (payload: { checkedKeys: string[]; halfCheckedKeys: string[] }) => {
  checkedTreeSummary.value = `已选 ${payload.checkedKeys.length} 项，半选 ${payload.halfCheckedKeys.length} 项`;
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="树形导航" subtitle="用于目录、资源分组和层级配置，保留展开折叠与节点点击反馈。" icon="ListTree">
      <div class="demo-grid">
        <BasePanel title="组件目录" subtitle="标准卡片表面，支持 active、badge、meta、禁用项和展开事件。">
          <BaseTree
            :data="treeData"
            :active-key="activeTreePath"
            aria-label="组件目录树"
            @node-click="handleTreeNodeClick"
            @node-toggle="handleTreeToggle"
          />
          <template #footer>
            <span class="navigation-result">最近节点：{{ treeEvent }}</span>
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
</style>
