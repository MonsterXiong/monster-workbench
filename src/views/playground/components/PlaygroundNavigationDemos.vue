<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../composables/useToast";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const { triggerToast } = useToast();

const selectedBreadcrumbKey = ref("detail");
const activeTab = ref("overview");
const underlineTab = ref("config");
const compactTab = ref("all");
const equalTab = ref("build");
const scrollTab = ref("assets");
const customTab = ref("preview");
const singleAccordion = ref(["usage"]);
const multiAccordion = ref(["usage", "config"]);
const lockedAccordion = ref(["config"]);
const embeddedAccordion = ref(["usage"]);
const accordionEvent = ref("等待操作");
const activeTreePath = ref("components/playground/PlaygroundNavigationDemos.vue");
const treeEvent = ref("等待选择");
const breadcrumbExpandEvent = ref("等待展开");
const controlledTreeExpandedKeys = ref(["resources", "resources/layouts"]);

const breadcrumbItems = [
  { key: "workspace", label: "工作台", icon: "LayoutDashboard" },
  { key: "components", label: "组件库", icon: "Boxes" },
  { key: "navigation", label: "导航组织", badge: "5", badgeType: "primary" as const },
  { key: "detail", label: "面包屑" },
];

const longBreadcrumbItems = [
  { key: "home", label: "Monster Workbench", icon: "Home" },
  { key: "workspace", label: "工作台" },
  { key: "project", label: "组件平台" },
  { key: "library", label: "公共组件库" },
  { key: "navigation", label: "导航组织" },
  { key: "breadcrumb", label: "BaseBreadcrumb" },
];

const stateBreadcrumbItems = [
  { key: "settings", label: "系统设置", icon: "Settings" },
  { key: "permission", label: "权限中心", disabled: true, badge: "只读", badgeType: "warning" as const },
  { key: "audit", label: "审计规则" },
];

const guardedBreadcrumbItems = [
  { key: "security", label: "安全中心", icon: "ShieldCheck", href: "#/settings/security", disabled: true, badge: "禁用", badgeType: "warning" as const },
  { key: "policy", label: "策略模板", href: "#/settings/policy" },
  { key: "review", label: "审批详情", href: "#/settings/review", badge: "当前", badgeType: "success" as const },
];

const nowrapBreadcrumbItems = [
  { key: "workspace", label: "工作台", icon: "LayoutDashboard" },
  { key: "tenant", label: "华东区域生产环境多租户资源编排中心" },
  { key: "pipeline", label: "自动化发布流水线与审批策略" },
  { key: "detail", label: "版本回滚任务详情" },
];

const tabs = [
  { key: "overview", title: "概览", icon: "LayoutDashboard", badge: "New", badgeColor: "bg-primary text-white" },
  { key: "config", title: "配置", icon: "SlidersHorizontal" },
  { key: "activity", title: "动态", icon: "History", badge: "3" },
  { key: "disabled", title: "受限", icon: "Lock", disabled: true },
];

const compactTabs = [
  { key: "all", title: "全部" },
  { key: "ready", title: "可用", badge: "18" },
  { key: "draft", title: "草稿", badge: "6" },
  { key: "locked", title: "锁定", disabled: true },
];

const equalTabs = [
  { key: "build", title: "构建", icon: "Hammer" },
  { key: "preview", title: "预览", icon: "Eye" },
  { key: "release", title: "发布", icon: "Rocket", badge: "2" },
];

const scrollTabs = [
  { key: "assets", title: "资源与素材配置", icon: "PackageOpen" },
  { key: "workflow", title: "自动化流程编排", icon: "Workflow" },
  { key: "permission", title: "成员权限与审批", icon: "ShieldCheck" },
  { key: "audit", title: "审计记录", icon: "History" },
  { key: "archive", title: "归档策略", icon: "Archive" },
  { key: "disabled", title: "受限视图", icon: "Lock", disabled: true },
];

const customTabs = [
  { key: "preview", title: "预览", icon: "Monitor", badge: "Live", badgeColor: "bg-emerald-500 text-white" },
  { key: "schema", title: "结构", icon: "Braces", badge: "JSON" },
  { key: "history", title: "历史", icon: "History" },
];

const accordionItems = [
  { key: "usage", title: "使用场景", description: "用于详情页、设置页和分组说明。", icon: "BookOpen", badge: "指南", badgeType: "primary" as const, meta: "3 min" },
  { key: "config", title: "配置能力", description: "支持单开、多开、紧凑和禁用项。", icon: "SlidersHorizontal", badge: "核心", badgeType: "success" as const, meta: "必看" },
  { key: "disabled", title: "受限配置", description: "权限不足时保持只读感知。", icon: "Lock", disabled: true, badge: "锁定", badgeType: "warning" as const, meta: "Admin" },
];

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

const listItems = ref([
  { id: "filter", title: "BaseFilterBar", description: "列表页筛选、搜索和动作入口。", status: "已接入", type: "success" as const, icon: "ListFilter", meta: "Data" },
  { id: "panels", title: "BaseResizablePanels", description: "可拖拽拉伸的布局容器。", status: "优化中", type: "warning" as const, icon: "PanelLeftRight", meta: "Layout" },
  { id: "list", title: "BaseList", description: "动态行、任务队列和轻量结果。", status: "完善中", type: "primary" as const, icon: "List", meta: "Nav" },
]);
const activeSimpleListKey = ref("filter");
const activeRowListKey = ref("list");
interface SimpleListItem {
  id: string;
  title: string;
  disabled?: boolean;
}

interface RowListItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge: string;
  type: "primary" | "success" | "warning";
  meta: string;
  disabled?: boolean;
}

const simpleListItems: SimpleListItem[] = [
  { id: "filter", title: "筛选条" },
  { id: "detail", title: "详情卡片" },
  { id: "table", title: "数据表格" },
  { id: "toolbar", title: "列表工具栏", disabled: true },
];

const simpleMetaListItems = [
  { id: "catalog", title: "组件目录", meta: "10" },
  { id: "form", title: "表单输入", meta: "8" },
  { id: "layout", title: "布局容器", meta: "7" },
  { id: "feedback", title: "反馈浮层", meta: "4" },
];

const rowListItems: RowListItem[] = [
  { id: "queue", title: "任务队列", description: "排队、执行中和失败重试的状态列表。", icon: "ListChecks", badge: "运行中", type: "primary" as const, meta: "12 项" },
  { id: "audit", title: "审计记录", description: "按时间记录关键操作，可点击进入详情。", icon: "History", badge: "已归档", type: "success" as const, meta: "48 条" },
  { id: "blocked", title: "权限受限", description: "禁用行仍保留信息密度，但不会触发点击。", icon: "Lock", badge: "禁用", type: "warning" as const, meta: "Admin", disabled: true },
];

const handleBreadcrumbSelect = (item: { key: string; label: string }) => {
  selectedBreadcrumbKey.value = item.key;
  triggerToast(`选择面包屑：${item.label}`, "info");
};

const handleBreadcrumbExpand = (count: number) => {
  breadcrumbExpandEvent.value = `展开 ${count} 级路径`;
};

const handleAccordionToggle = (payload: { key: string; expanded: boolean }) => {
  accordionEvent.value = `${payload.key} ${payload.expanded ? "展开" : "收起"}`;
};

const handleTreeNodeClick = (node: { name: string; path: string; isDir: boolean }) => {
  activeTreePath.value = node.path;
  treeEvent.value = `${node.isDir ? "目录" : "文件"}：${node.path || node.name}`;
  triggerToast(treeEvent.value, "info");
};

const handleTreeToggle = (payload: { node: { name: string; path: string }; expanded: boolean }) => {
  treeEvent.value = `${payload.node.name} ${payload.expanded ? "展开" : "收起"}`;
};
</script>

<template>
  <section v-if="activeComponentKey === 'breadcrumb'" class="detail-stack">
    <PlaygroundDemoSection title="面包屑" subtitle="展示层级路径、返回入口、折叠路径、禁用项和当前项交互。" icon="Route">
      <BasePanel title="标准路径" subtitle="保留旧 API：只传 items 就能获得可点击层级导航。">
        <BaseBreadcrumb :items="breadcrumbItems" @select="handleBreadcrumbSelect" />
        <template #footer>
          <span class="navigation-result">最近选择：{{ selectedBreadcrumbKey }}</span>
        </template>
      </BasePanel>

      <div class="demo-grid">
        <BasePanel title="长路径折叠" subtitle="maxItems 会折叠中间层级，适合深层资源详情。">
          <BaseBreadcrumb
            :items="longBreadcrumbItems"
            surface="muted"
            separator="slash"
            :max-items="4"
            aria-label="长路径面包屑"
            @select="handleBreadcrumbSelect"
            @expand="handleBreadcrumbExpand"
          />
          <template #footer>
            <span class="navigation-result">{{ breadcrumbExpandEvent }}</span>
          </template>
        </BasePanel>

        <BasePanel title="返回入口" subtitle="返回按钮会优先选择上一级，也可以单独监听 back 事件。">
          <BaseBreadcrumb
            :items="breadcrumbItems"
            surface="card"
            size="lg"
            show-back
            current-clickable
            aria-label="带返回入口面包屑"
            @select="handleBreadcrumbSelect"
            @back="triggerToast('触发返回入口', 'info')"
          />
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="紧凑只读" subtitle="适合表格详情、弹窗顶部和窄栏区域。">
          <BaseBreadcrumb :items="stateBreadcrumbItems" size="sm" surface="plain" :wrap="false" />
        </BasePanel>

        <BasePanel title="链接拦截" subtitle="禁用项和不可点击当前项会保留 href 信息，但不会触发默认跳转。">
          <BaseBreadcrumb :items="guardedBreadcrumbItems" surface="card" aria-label="链接拦截面包屑" @select="handleBreadcrumbSelect" />
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="窄容器不换行" subtitle="wrap=false 会在组件内部横向滚动，避免撑破页面。">
          <BaseBreadcrumb :items="nowrapBreadcrumbItems" surface="muted" :wrap="false" aria-label="不换行长路径面包屑" />
        </BasePanel>

        <BasePanel title="自定义项内容" subtitle="通过 item 插槽接入业务状态或更强的视觉提示。">
          <BaseBreadcrumb :items="breadcrumbItems" surface="muted" aria-label="自定义面包屑">
            <template #item="{ item, current }">
              <BaseIcon v-if="item.icon" :name="item.icon" size="14" aria-hidden="true" />
              <span>{{ item.label }}</span>
              <BaseBadge v-if="current" type="success" size="xs">当前</BaseBadge>
            </template>
          </BaseBreadcrumb>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'tabs'" class="detail-stack">
    <PlaygroundDemoSection title="标签页" subtitle="覆盖胶囊、下划线、图标、徽标和禁用状态，适合页面内视图切换。" icon="PanelTop">
      <BasePanel title="胶囊标签" subtitle="适合紧凑工具面板、设置分段和局部视图切换。">
        <BaseTab v-model="activeTab" :tabs="tabs" size="lg" @select="(tab) => triggerToast(`切换到 ${tab.title}`, 'info')" />
        <BaseDataState class="mt-4" state="ready" :title="`当前视图：${activeTab}`" description="切换后业务区保持稳定，只替换当前内容。">
          <BaseDescriptionList
            :items="[
              { key: 'variant', label: '形态', value: 'pills' },
              { key: 'active', label: '当前项', value: activeTab, status: 'primary' },
            ]"
            compact
          />
        </BaseDataState>
      </BasePanel>

      <div class="demo-grid">
        <BasePanel title="下划线标签" subtitle="适合详情页二级导航和内容区顶部分类。">
          <BaseTab v-model="underlineTab" :tabs="tabs" variant="underline" full-width />
        </BasePanel>

        <BasePanel title="紧凑 Plain" subtitle="无背景表面适合嵌入工具栏、卡片页脚和浮层顶部。">
          <BaseTab v-model="compactTab" :tabs="compactTabs" size="sm" surface="plain" />
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="等分填充" subtitle="equal + fullWidth 适合流程分段和三段式工作区。">
          <BaseTab v-model="equalTab" :tabs="equalTabs" surface="muted" full-width equal align="between" />
        </BasePanel>

        <BasePanel title="禁用整组" subtitle="流程锁定时整组禁用，但仍保留当前状态可读。">
          <BaseTab model-value="build" :tabs="equalTabs" disabled full-width equal aria-label="禁用标签页" />
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="长标签滚动" subtitle="内容较多时在组件内部横向滚动，不撑破页面。">
          <BaseTab v-model="scrollTab" :tabs="scrollTabs" size="sm" surface="muted" full-width aria-label="长标签页" />
        </BasePanel>

        <BasePanel title="自定义项内容" subtitle="通过 tab / badge 插槽接入业务标记，同时保留键盘和选中状态。">
          <BaseTab v-model="customTab" :tabs="customTabs" surface="plain" full-width aria-label="自定义标签页">
            <template #tab="{ tab, active }">
              <span class="tab-demo-custom-icon" :class="{ 'is-active': active }">
                <BaseIcon v-if="tab.icon" :name="tab.icon" size="14" aria-hidden="true" />
              </span>
              <span class="min-w-0 truncate">{{ tab.title }}</span>
              <BaseBadge v-if="tab.badge" :type="active ? 'primary' : 'neutral'" size="xs">{{ tab.badge }}</BaseBadge>
            </template>
          </BaseTab>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'accordion'" class="detail-stack">
    <PlaygroundDemoSection title="折叠面板" subtitle="展示单开、多开、紧凑和禁用项，适合配置组、帮助说明和详情分段。" icon="PanelsTopLeft">
      <div class="demo-grid">
        <BasePanel title="单开模式" subtitle="一次只展开一个配置段，支持 badge、meta 和 toggle 事件。">
          <BaseAccordion v-model="singleAccordion" :items="accordionItems" aria-label="单开折叠面板" @toggle="handleAccordionToggle">
            <template #usage>
              <BaseAlert type="info" title="使用场景" description="适合说明文字、局部配置和详情分段。" compact />
            </template>
            <template #config>
              <BaseDescriptionList :items="[{ key: 'mode', label: '模式', value: 'single' }]" compact />
            </template>
          </BaseAccordion>
          <template #footer>
            <span class="navigation-result">最近事件：{{ accordionEvent }}</span>
          </template>
        </BasePanel>
        <BasePanel title="多开紧凑" subtitle="适合设置页多个分组同时展开，actions 插槽可放状态提示。">
          <BaseAccordion v-model="multiAccordion" :items="accordionItems" multiple compact size="sm" surface="muted">
            <template #actions="{ expanded }">
              <BaseBadge :type="expanded ? 'success' : 'neutral'" size="xs">{{ expanded ? "展开" : "收起" }}</BaseBadge>
            </template>
            <template #usage>
              <BaseBadge type="primary">局部帮助</BaseBadge>
            </template>
            <template #config>
              <BaseAlert type="success" title="配置能力" description="通过 v-model 接管展开项，业务侧可以持久化或联动校验状态。" compact />
            </template>
          </BaseAccordion>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="不可折回" subtitle="allowCollapse=false 适合必须保留一个当前配置段的场景。">
          <BaseAccordion v-model="lockedAccordion" :items="accordionItems" size="lg" surface="muted" :allow-collapse="false" aria-label="不可折回折叠面板">
            <template #usage>
              <BaseAlert type="info" title="使用说明" description="点击其它项会切换当前配置段，点击已展开项不会清空。" compact />
            </template>
            <template #config>
              <BaseDescriptionList
                :items="[
                  { key: 'collapse', label: '允许清空', value: '否', status: 'warning' },
                  { key: 'size', label: '尺寸', value: 'lg' },
                ]"
                compact
              />
            </template>
          </BaseAccordion>
        </BasePanel>

        <BasePanel title="嵌入式 Plain" subtitle="plain 表面、无边框和 keepMounted 适合嵌在侧栏或详情正文。">
          <BaseAccordion
            v-model="embeddedAccordion"
            :items="accordionItems"
            surface="plain"
            size="sm"
            :bordered="false"
            :divided="false"
            keep-mounted
            aria-label="嵌入式折叠面板"
          >
            <template #default="{ item }">
              <BaseAlert type="info" :title="item.title" :description="item.description || '暂无说明。'" compact />
            </template>
          </BaseAccordion>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="自管理状态" subtitle="不传 v-model 时通过 defaultValue 初始化，组件内部维护展开状态。">
          <BaseAccordion
            :items="accordionItems"
            :default-value="['usage']"
            multiple
            surface="muted"
            :show-chevron="false"
            aria-label="自管理折叠面板"
            @toggle="handleAccordionToggle"
          >
            <template #actions="{ expanded }">
              <BaseBadge :type="expanded ? 'primary' : 'neutral'" size="xs">{{ expanded ? "已打开" : "未打开" }}</BaseBadge>
            </template>
            <template #default="{ item, expanded }">
              <BaseDescriptionList
                :items="[
                  { key: 'key', label: '节点', value: item.key, status: expanded ? 'primary' : 'neutral' },
                  { key: 'mode', label: '状态来源', value: 'internal' },
                ]"
                compact
              />
            </template>
          </BaseAccordion>
          <template #footer>
            <span class="navigation-result">最近事件：{{ accordionEvent }}</span>
          </template>
        </BasePanel>

        <BasePanel title="整组禁用" subtitle="权限不足或流程锁定时禁用所有触发器，但保留内容状态可读。">
          <BaseAccordion :items="accordionItems" :default-value="['usage']" disabled surface="card" aria-label="禁用折叠面板">
            <template #default="{ item }">
              <BaseAlert type="warning" :title="item.title" description="当前流程锁定，只展示已有配置。" compact />
            </template>
          </BaseAccordion>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'tree'" class="detail-stack">
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

  <section v-else-if="activeComponentKey === 'list'" class="detail-stack">
    <PlaygroundDemoSection title="动态列表" subtitle="展示自定义行内容、状态标签、行内动作和 transition-group 动效。" icon="List">
      <BasePanel title="增强默认列表" subtitle="默认渲染即可覆盖图标、说明、徽标、meta、选中和禁用态。">
        <BaseList
          :items="rowListItems"
          variant="row"
          surface="muted"
          divided
          clickable
          :active-key="activeRowListKey"
          aria-label="增强默认列表"
          @item-click="(item: RowListItem) => (activeRowListKey = item.id)"
        />
        <template #footer>
          <span class="navigation-result">当前行：{{ activeRowListKey }}</span>
        </template>
      </BasePanel>

      <div class="demo-grid">
        <BasePanel title="卡片列表" subtitle="适合任务队列、结果列表和带动作的行内容。">
          <BaseList :items="listItems" size="lg" clickable :active-key="activeRowListKey" @item-click="(item: RowListItem) => (activeRowListKey = item.id)">
            <template #default="{ item }">
              <div class="flex min-w-0 items-center gap-3">
                <span class="list-demo-icon">
                  <BaseIcon :name="item.icon" size="16" aria-hidden="true" />
                </span>
                <div class="min-w-0">
                  <strong class="block truncate text-xs font-black text-slate-800 dark:text-slate-100">{{ item.title }}</strong>
                  <span class="mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500">{{ item.description }}</span>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <span class="hidden text-[10px] font-black text-slate-400 sm:inline">{{ item.meta }}</span>
                <BaseBadge :type="item.type">{{ item.status }}</BaseBadge>
                <BaseActionMenu :actions="[{ key: 'preview', label: '预览', icon: 'Eye' }, { key: 'copy', label: '复制', icon: 'Copy' }]" />
              </div>
            </template>
          </BaseList>
        </BasePanel>

        <BasePanel title="轻量单行" subtitle="适合目录、分类列表和只需要中文标题的导航项。">
          <BaseList
            :items="simpleListItems"
            variant="plain"
            size="sm"
            simple
            :bordered="false"
            :active-key="activeSimpleListKey"
            clickable
            @item-click="(item: SimpleListItem) => (activeSimpleListKey = item.id)"
          />
        </BasePanel>

        <BasePanel title="单行带计数" subtitle="标题和右侧 meta 固定在同一行，适合侧栏分类和轻量统计。">
          <BaseList
            :items="simpleMetaListItems"
            variant="plain"
            size="xs"
            surface="transparent"
            simple
            :bordered="false"
            clickable
            active-key="form"
            aria-label="单行带计数列表"
          />
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="空态列表" subtitle="没有数据时使用内置空态行，适合筛选结果和权限列表。">
          <BaseList :items="[]" variant="row" surface="transparent" empty-text="暂无匹配组件" aria-label="空态列表" />
        </BasePanel>

        <BasePanel title="紧凑行" subtitle="xs 尺寸、透明表面适合侧栏和浮层中的短列表。">
          <BaseList
            :items="rowListItems"
            variant="plain"
            size="xs"
            surface="transparent"
            :bordered="false"
            clickable
            :active-key="activeRowListKey"
            @item-click="(item: RowListItem) => (activeRowListKey = item.id)"
          >
            <template #default="{ item, active, disabled }">
              <span class="min-w-0 truncate text-xs font-black" :class="active ? 'text-primary' : 'text-slate-700 dark:text-slate-200'">{{ item.title }}</span>
              <span class="ml-auto flex shrink-0 items-center gap-2">
                <BaseBadge :type="item.type" size="xs">{{ disabled ? "禁用" : item.meta }}</BaseBadge>
              </span>
            </template>
          </BaseList>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="加载列表" subtitle="异步刷新时使用 loading 锁定行交互，并展示轻量状态行。">
          <BaseList
            :items="rowListItems"
            variant="row"
            surface="muted"
            loading
            loading-text="正在加载组件列表"
            aria-label="加载中的动态列表"
          />
        </BasePanel>

        <BasePanel title="整组禁用" subtitle="流程锁定或权限不足时禁用所有行，但保留当前内容可读。">
          <BaseList
            :items="rowListItems"
            variant="row"
            surface="transparent"
            disabled
            clickable
            active-key="queue"
            aria-label="禁用动态列表"
          />
        </BasePanel>
      </div>
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

.tree-custom-node {
  @apply flex min-w-0 flex-1 items-center gap-2;
}

.tree-custom-node strong {
  @apply min-w-0 truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.tree-custom-node small {
  @apply hidden min-w-0 truncate text-[10px] font-bold text-slate-400 dark:text-slate-500 sm:block;
}

.list-demo-icon {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-primary dark:bg-slate-800;
}

.tab-demo-custom-icon {
  @apply flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400;
}

.tab-demo-custom-icon.is-active {
  @apply bg-primary text-white;
}
</style>
