<script setup lang="ts">
import { computed, ref } from "vue";
import {
  BellRing,
  Database,
  FileText,
  FunctionSquare,
  ListTree,
  LoaderCircle,
  MousePointer,
  PanelsLeftRight,
  Workflow,
} from "lucide-vue-next";
import PlaygroundCatalog from "./components/PlaygroundCatalog.vue";
import PlaygroundDetailHeader from "./components/PlaygroundDetailHeader.vue";
import PlaygroundActionDemos from "./components/PlaygroundActionDemos.vue";
import PlaygroundDataDemos from "./components/PlaygroundDataDemos.vue";
import PlaygroundDisplayDemos from "./components/PlaygroundDisplayDemos.vue";
import PlaygroundFeedbackDemos from "./components/PlaygroundFeedbackDemos.vue";
import PlaygroundFormDemos from "./components/PlaygroundFormDemos.vue";
import PlaygroundFoundationDemos from "./components/PlaygroundFoundationDemos.vue";
import PlaygroundLayoutDemos from "./components/PlaygroundLayoutDemos.vue";
import PlaygroundLoadingDemos from "./components/PlaygroundLoadingDemos.vue";
import PlaygroundNavigationDemos from "./components/PlaygroundNavigationDemos.vue";
import PlaygroundUtilsDemos from "./components/PlaygroundUtilsDemos.vue";
import PlaygroundWorkflowDemos from "./components/PlaygroundWorkflowDemos.vue";
import { findByValue, firstItem, hasItem } from "../../utils";

type ComponentGroupKey =
  | "foundation"
  | "action"
  | "form"
  | "data"
  | "display"
  | "navigation"
  | "layout"
  | "workflow"
  | "feedback"
  | "loading"
  | "utils";

interface ComponentEntry {
  key: string;
  name: string;
  title: string;
  description: string;
}

interface ComponentGroup {
  key: ComponentGroupKey;
  title: string;
  icon: unknown;
  components: ComponentEntry[];
}

const componentGroups: ComponentGroup[] = [
  {
    key: "foundation",
    title: "基础控件",
    icon: MousePointer,
    components: [
      { key: "buttons-badges", name: "BaseButton / BaseBadge", title: "按钮徽标", description: "语义色、尺寸、加载、禁用、轮廓和点标。" },
      { key: "search-pagination", name: "BaseSearchInput / BasePagination", title: "搜索分页", description: "搜索输入、清空、加载、分页、页容量切换。" },
      { key: "empty-error", name: "BaseEmpty / BaseError", title: "空态错误", description: "空数据、重试、错误说明和操作入口。" },
      { key: "description-lists", name: "BaseDescriptionList / BaseKeyValueList / BaseStatusDot", title: "描述列表", description: "属性网格、键值摘要、状态点和紧凑模式。" },
      { key: "simple-table", name: "BaseTable", title: "轻量表格", description: "基础表格、加载态、空态、紧凑尺寸和自定义单元格。" },
    ],
  },
  {
    key: "action",
    title: "操作控件",
    icon: MousePointer,
    components: [
      { key: "command-palette", name: "BaseCommandPalette", title: "命令面板", description: "搜索、分组、快捷键、回车触发。" },
      { key: "action-menu", name: "BaseActionMenu", title: "操作菜单", description: "更多操作、危险动作、禁用项、快捷键和方向。" },
      { key: "toolbar", name: "BaseToolbar", title: "工具栏", description: "左中右操作组、紧凑模式和组合动作。" },
      { key: "confirm-action", name: "BaseConfirmAction", title: "确认动作", description: "删除、重置、归档等二次确认动作。" },
      { key: "form-actions", name: "BaseFormActions", title: "表单动作栏", description: "说明区、状态区、按钮布局、吸底形态。" },
    ],
  },
  {
    key: "form",
    title: "表单输入",
    icon: FileText,
    components: [
      { key: "text-inputs", name: "BaseInput / BaseTextarea / BaseNumberInput", title: "文本数值", description: "文本、数字、长文本、错误态和禁用态。" },
      { key: "choice-controls", name: "BaseSelect / BaseCheckbox / BaseRadioGroup / BaseSwitch", title: "选择开关", description: "下拉、勾选、单选、开关和禁用态。" },
      { key: "form-shell", name: "BaseForm / BaseFormItem", title: "表单容器", description: "标题、列布局、提交、底部动作区。" },
      { key: "form-item", name: "BaseFormItem", title: "表单字段", description: "标签、说明、帮助、错误、成功和跨列布局。" },
      { key: "tag-input", name: "BaseTagInput", title: "标签输入", description: "添加、粘贴、去重、重复、清空和状态。" },
      { key: "path-selector", name: "AppPathSelector", title: "路径选择", description: "目录 / 文件模式、桌面运行选择、浏览器降级。" },
      { key: "image-uploader", name: "AppImageUploader", title: "图片上传", description: "上传、预览、清空、封面裁切。" },
      { key: "date-range", name: "BaseDateRange", title: "日期范围", description: "时间筛选、快捷范围、错误态和禁用态。" },
      { key: "slider", name: "BaseSlider", title: "滑块", description: "范围、步进、紧凑态、禁用态和数字输入联动。" },
    ],
  },
  {
    key: "data",
    title: "数据展示",
    icon: Database,
    components: [
      { key: "filter-bar", name: "BaseFilterBar", title: "筛选条", description: "标题区、搜索、筛选摘要、清空和动作区。" },
      { key: "detail-card", name: "BaseDetailCard", title: "详情卡片", description: "对象身份、状态、属性、标签和动作组合。" },
      { key: "data-table", name: "BaseDataTable", title: "数据表格", description: "工具条、筛选、表格、分页和行操作组合。" },
      { key: "table-toolbar", name: "BaseTableToolbar", title: "列表工具栏", description: "标题、统计、动作区和补充操作。" },
      { key: "selection-bar", name: "BaseSelectionBar", title: "批量操作栏", description: "已选数量、批量动作、清空选择。" },
      { key: "data-state", name: "BaseDataState", title: "数据状态", description: "加载、空态、错误和正常内容。" },
    ],
  },
  {
    key: "display",
    title: "内容呈现",
    icon: FileText,
    components: [
      { key: "stat-card", name: "BaseStatCard", title: "统计卡片", description: "指标、趋势、语义色和图标摘要。" },
      { key: "info-card", name: "BaseInfoCard", title: "信息卡片", description: "标题、说明、元信息、动作区和可点击态。" },
      { key: "avatar-divider", name: "BaseAvatar / BaseDivider", title: "头像分隔", description: "成员身份、在线状态、横向与纵向分隔。" },
      { key: "code-copy", name: "BaseCodeBlock / BaseCopyButton", title: "代码复制", description: "代码块、行号、换行、复制反馈和错误兜底。" },
      { key: "tooltip-upload", name: "BaseTooltip", title: "悬浮提示", description: "悬浮说明、方向、禁用和多行提示。" },
      { key: "upload", name: "BaseUpload", title: "文件上传", description: "拖拽、点击、限制、状态和拒绝事件。" },
    ],
  },
  {
    key: "navigation",
    title: "导航组织",
    icon: ListTree,
    components: [
      { key: "breadcrumb", name: "BaseBreadcrumb", title: "面包屑", description: "层级导航、折叠路径、返回入口和当前项。" },
      { key: "tabs", name: "BaseTab", title: "标签页", description: "胶囊、下划线、图标、徽标和禁用状态。" },
      { key: "accordion", name: "BaseAccordion", title: "折叠面板", description: "单开、多开、紧凑、禁用项和插槽内容。" },
      { key: "tree", name: "BaseTree", title: "树形导航", description: "目录层级、展开折叠、节点点击和递归渲染。" },
      { key: "list", name: "BaseList", title: "动态列表", description: "列表动效、自定义行内容、状态和行内动作。" },
    ],
  },
  {
    key: "layout",
    title: "布局容器",
    icon: PanelsLeftRight,
    components: [
      { key: "page-shell", name: "BasePageShell", title: "页面外壳", description: "页面头、工具栏、内容区、侧栏和页脚组合。" },
      { key: "page-header", name: "BasePageHeader", title: "页面头部", description: "面包屑、标题、元信息和动作区。" },
      { key: "section-header", name: "BaseSectionHeader", title: "区块标题", description: "图标、说明、元信息、动作区和分隔线。" },
      { key: "panel", name: "BasePanel", title: "基础面板", description: "标题、图标、操作、页脚、表面和交互态。" },
      { key: "field-group", name: "BaseFieldGroup", title: "字段分组", description: "标题、说明、图标、列布局和页脚。" },
      { key: "resizable-panels", name: "BaseResizablePanels", title: "拖拽面板", description: "最小最大值、拖拽反馈、横向布局。" },
      { key: "three-column-layout", name: "BaseThreeColumnLayout", title: "三栏布局", description: "左右侧栏拖拽、收缩展开和边缘展开入口。" },
    ],
  },
  {
    key: "workflow",
    title: "流程反馈",
    icon: Workflow,
    components: [
      { key: "stepper", name: "BaseStepper", title: "步骤条", description: "流程步骤、完成态、当前态、错误态和点击切换。" },
      { key: "timeline", name: "BaseTimeline", title: "时间线", description: "事件记录、状态标记、时间信息和紧凑模式。" },
    ],
  },
  {
    key: "feedback",
    title: "反馈浮层",
    icon: BellRing,
    components: [
      { key: "alert", name: "BaseAlert", title: "提示条", description: "信息、成功、警告、危险和可关闭状态。" },
      { key: "toast-message", name: "BaseToast / BaseMessage", title: "轻提示", description: "底部 Toast、顶部 Message、队列和语义状态。" },
      { key: "dialog", name: "BaseDialog", title: "对话框", description: "标题、正文、底部动作和关闭回调。" },
      { key: "drawer", name: "BaseDrawer", title: "抽屉", description: "左右侧滑出、表单内容和底部动作。" },
    ],
  },
  {
    key: "utils",
    title: "工具函数",
    icon: FunctionSquare,
    components: [
      { key: "utils-number", name: "number", title: "数值工具", description: "数值解析、范围归一化、分桶统计、分页边界和典型异常输入。" },
      { key: "utils-csv", name: "csv", title: "CSV 工具", description: "CSV/TSV 解析、自动分隔符、多行引号、列摘要和安全导出。" },
      { key: "utils-array", name: "array", title: "数组工具", description: "去重、分组、分页、筛选、排序、索引 diff 和 keyed diff。" },
      { key: "utils-object", name: "object", title: "对象工具", description: "record 处理、路径读写、cleanup、patch、对象 diff 和 deep diff。" },
      { key: "utils-tree", name: "tree", title: "树形工具", description: "tree to list、list to tree、lookup、诊断、可见节点和 diff by key。" },
      { key: "utils-json-path", name: "json / path", title: "JSON 与路径", description: "循环 JSON、中文路径、Windows 路径、安全子路径和文件名清理。" },
      { key: "utils-runtime", name: "async / color / date", title: "运行时工具", description: "异步任务、批处理摘要、颜色转换/对比与日期范围/日历工具。" },
      { key: "utils-text", name: "string / encoding / id / keyboard", title: "文本与输入工具", description: "文本清理、编码摘要、稳定 ID、DOM ID 和键盘快捷键。" },
      { key: "utils-data", name: "file / storage / url", title: "文件存储 URL", description: "文件选择摘要、Storage key/TTL、URL 与 query 参数处理。" },
      { key: "utils-browser", name: "browser / clipboard / dom", title: "浏览器能力工具", description: "视口、媒体查询、剪贴板结果、DOM 可见区域摘要。" },
      { key: "utils-business", name: "compare / error / format / search / selection / validation / value", title: "业务通用工具", description: "排序、错误展示、格式化、搜索、选择、校验和值解析。" },
    ],
  },
  {
    key: "loading",
    title: "加载占位",
    icon: LoaderCircle,
    components: [
      { key: "loading", name: "BaseLoading", title: "加载指示", description: "旋转、圆环、点状和骨架加载。" },
      { key: "skeleton-card", name: "BaseSkeletonCard", title: "骨架卡片", description: "头像、文本行、按钮占位和卡片加载态。" },
      { key: "progress", name: "BaseProgress", title: "进度条", description: "进度值、状态色、条纹和尺寸。" },
    ],
  },
];

const activeGroupKey = ref<ComponentGroupKey>("data");
const activeComponentKey = ref("filter-bar");

const coveredComponentKeys = [
  "buttons-badges",
  "search-pagination",
  "empty-error",
  "description-lists",
  "simple-table",
  "filter-bar",
  "detail-card",
  "data-table",
  "table-toolbar",
  "selection-bar",
  "data-state",
  "command-palette",
  "action-menu",
  "toolbar",
  "confirm-action",
  "form-actions",
  "text-inputs",
  "choice-controls",
  "form-shell",
  "form-item",
  "tag-input",
  "path-selector",
  "image-uploader",
  "date-range",
  "slider",
  "stat-card",
  "info-card",
  "avatar-divider",
  "code-copy",
  "tooltip-upload",
  "upload",
  "alert",
  "toast-message",
  "dialog",
  "drawer",
  "breadcrumb",
  "tabs",
  "accordion",
  "tree",
  "list",
  "page-shell",
  "page-header",
  "section-header",
  "panel",
  "field-group",
  "resizable-panels",
  "three-column-layout",
  "stepper",
  "timeline",
  "loading",
  "skeleton-card",
  "progress",
  "utils-number",
  "utils-csv",
  "utils-array",
  "utils-object",
  "utils-tree",
  "utils-json-path",
  "utils-runtime",
  "utils-text",
  "utils-data",
  "utils-browser",
  "utils-business",
];

const playgroundPanes = [
  { key: "catalog", size: 18, minSize: 14, maxSize: 26, label: "组件目录" },
  { key: "detail", size: 82, minSize: 74, maxSize: 86, label: "组件详情" },
];

const activeGroup = computed(() => findByValue(componentGroups, (group) => group.key, activeGroupKey.value) ?? firstItem(componentGroups)!);
const activeEntry = computed(
  () => findByValue(activeGroup.value.components, (component) => component.key, activeComponentKey.value) ?? firstItem(activeGroup.value.components)!
);
const hasActiveDemo = computed(() => hasItem(coveredComponentKeys, activeComponentKey.value));

const detailBreadcrumbs = computed(() => [
  { key: activeGroup.value.key, label: activeGroup.value.title, icon: "Folder" },
  { key: activeEntry.value.key, label: activeEntry.value.name },
]);

const selectGroup = (key: string) => {
  const nextGroup = findByValue(componentGroups, (group) => group.key, key);
  if (!nextGroup) return;
  activeGroupKey.value = nextGroup.key;
  activeComponentKey.value = firstItem(nextGroup.components)?.key ?? "";
};

const selectComponent = (key: string) => {
  activeComponentKey.value = key;
};
</script>

<template>
  <main class="playground-page">
    <BaseResizablePanels
      class="playground-page__panels"
      :panes="playgroundPanes"
      :framed="false"
      :keyboard-step="2"
    >
      <template #catalog>
        <PlaygroundCatalog
          :groups="componentGroups"
          :active-group-key="activeGroupKey"
          :active-component-key="activeComponentKey"
          @select-group="selectGroup"
          @select-component="selectComponent"
        />
      </template>

      <template #detail>
        <section class="playground-page__detail">
          <PlaygroundDetailHeader
            :title="activeEntry.title"
            :description="activeEntry.description"
            :name="activeEntry.name"
            :breadcrumbs="detailBreadcrumbs"
          />

          <div class="playground-page__content">
            <PlaygroundFoundationDemos :active-component-key="activeComponentKey" />
            <PlaygroundDataDemos :active-component-key="activeComponentKey" />
            <PlaygroundActionDemos :active-component-key="activeComponentKey" />
            <PlaygroundFormDemos :active-component-key="activeComponentKey" />
            <PlaygroundDisplayDemos :active-component-key="activeComponentKey" />
            <PlaygroundNavigationDemos :active-component-key="activeComponentKey" />
            <PlaygroundLayoutDemos :active-component-key="activeComponentKey" />
            <PlaygroundWorkflowDemos :active-component-key="activeComponentKey" />
            <PlaygroundLoadingDemos :active-component-key="activeComponentKey" />
            <PlaygroundFeedbackDemos :active-component-key="activeComponentKey" />
            <PlaygroundUtilsDemos :active-component-key="activeComponentKey" />

            <section
              v-if="!hasActiveDemo"
              class="playground-page__placeholder"
            >
              <BaseDataState
                state="empty"
                title="演示正在组件化补齐"
                description="当前分类已进入细粒度目录，后续会继续按同一结构补充完整功能态。"
                empty-title="待完善演示"
                compact
              >
                <template #empty>
                  <BaseBadge type="primary" variant="outline">{{ activeEntry.name }}</BaseBadge>
                </template>
              </BaseDataState>
            </section>
          </div>
        </section>
      </template>
    </BaseResizablePanels>
  </main>
</template>

<style scoped>
.playground-page {
  @apply h-full min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100;
  box-shadow:
    0 18px 42px rgba(15, 23, 42, 0.055),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.playground-page__panels {
  @apply h-full min-h-0 w-full;
}

.playground-page__panels > :deep(.base-resizable-panels__splitpanes),
.playground-page__panels > :deep(.base-resizable-panels__splitpanes > .splitpanes__pane),
.playground-page__panels > :deep(.base-resizable-panels__splitpanes > .splitpanes__pane > .base-resizable-panels__pane-inner) {
  @apply bg-transparent;
}

.playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--vertical > .splitpanes__splitter) {
  @apply w-1 cursor-col-resize;
  background-color: transparent;
}

.playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--vertical > .splitpanes__splitter::before) {
  content: "";
  @apply absolute left-1/2 top-0 h-full w-px -translate-x-1/2;
  background-color: rgb(203 213 225);
}

.playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--vertical > .splitpanes__splitter::after) {
  @apply h-10 w-1 rounded-full;
  background-color: rgb(100 116 139 / 0.5);
  box-shadow: none;
}

.playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--vertical > .splitpanes__splitter:hover),
.playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--vertical > .splitpanes__splitter:focus-visible),
.playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--dragging.splitpanes--vertical > .splitpanes__splitter) {
  background-color: transparent;
}

.playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--vertical > .splitpanes__splitter:hover::before),
.playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--vertical > .splitpanes__splitter:focus-visible::before),
.playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--dragging.splitpanes--vertical > .splitpanes__splitter::before) {
  background-color: rgb(203 213 225);
}

.playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--vertical > .splitpanes__splitter:hover::after),
.playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--vertical > .splitpanes__splitter:focus-visible::after),
.playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--dragging.splitpanes--vertical > .splitpanes__splitter::after) {
  @apply h-14 w-1.5;
}

:global(.dark) .playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--vertical > .splitpanes__splitter) {
  background-color: transparent;
}

:global(.dark) .playground-page__panels > :deep(.base-resizable-panels__splitpanes.splitpanes--vertical > .splitpanes__splitter::before) {
  background-color: rgb(30 41 59);
}

:global(.dark) .playground-page {
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

.playground-page__detail {
  @apply flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-slate-50/80 dark:bg-slate-950/70;
}

.playground-page__content {
  @apply min-h-0 flex-1 space-y-4 overflow-auto p-4;
}

.playground-page__placeholder {
  @apply max-w-3xl;
}

@media (max-width: 1023px) {
  .playground-page__detail {
    @apply min-h-[620px];
  }
}
</style>
