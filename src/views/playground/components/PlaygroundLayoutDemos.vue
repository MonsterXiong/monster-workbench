<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../composables/useToast";
import { joinBy } from "../../../utils";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const { triggerToast } = useToast();

const panelSummary = ref("28% / 72%");
const verticalPanelSummary = ref("58% / 42%");
const plainPanelSummary = ref("34% / 33% / 33%");
const threeColumnSummary = ref("220px / 280px");
const compactThreeColumnSummary = ref("120px / 140px");
const leftSidebarCollapsed = ref(false);
const rightSidebarCollapsed = ref(false);
const compactLeftSidebarCollapsed = ref(true);
const compactRightSidebarCollapsed = ref(false);
const fieldGroupCollapsed = ref(false);

const pageHeaderBreadcrumbs = [
  { key: "workspace", label: "工作台", icon: "LayoutDashboard" },
  { key: "components", label: "组件库", icon: "Boxes" },
  { key: "page-header", label: "页面头部" },
];

const pageShellBreadcrumbs = [
  { key: "workspace", label: "工作台", icon: "LayoutDashboard" },
  { key: "components", label: "组件库", icon: "Boxes" },
  { key: "page-shell", label: "页面外壳" },
];

type PanelResizePayload = { panes: Array<{ size: number }> };

const formatPanelSummary = (payload: PanelResizePayload) => joinBy(payload.panes, (pane) => `${Math.round(pane.size)}%`, " / ");

const handlePanelResized = (payload: PanelResizePayload) => {
  panelSummary.value = formatPanelSummary(payload);
};

const handleVerticalPanelResized = (payload: PanelResizePayload) => {
  verticalPanelSummary.value = formatPanelSummary(payload);
};

const handlePlainPanelResized = (payload: PanelResizePayload) => {
  plainPanelSummary.value = formatPanelSummary(payload);
};

const handleThreeColumnResize = (payload: { leftWidth: number; rightWidth: number }) => {
  threeColumnSummary.value = `${Math.round(payload.leftWidth)}px / ${Math.round(payload.rightWidth)}px`;
};

const handleCompactThreeColumnResize = (payload: { leftWidth: number; rightWidth: number }) => {
  compactThreeColumnSummary.value = `${Math.round(payload.leftWidth)}px / ${Math.round(payload.rightWidth)}px`;
};
</script>

<template>
  <section v-if="activeComponentKey === 'page-shell'" class="detail-stack">
    <PlaygroundDemoSection title="页面外壳" subtitle="把页面头、工具条、主内容、侧栏和底部操作收成稳定结构。" icon="LayoutDashboard">
      <BasePageShell
        title="组件工作区"
        description="适合列表页、配置页和资源管理页的顶层页面骨架。"
        icon="Boxes"
        :breadcrumbs="pageShellBreadcrumbs"
        aside-width="260px"
        size="lg"
        :header-level="2"
        header-wrap-title
        backable
        @back="triggerToast('页面外壳返回', 'info')"
      >
        <template #meta>
          <BaseBadge type="primary">页面级容器</BaseBadge>
          <BaseStatusDot type="success" label="已同步" description="刚刚" />
        </template>
        <template #actions>
          <BaseButton type="neutral" size="sm">预览</BaseButton>
          <BaseButton type="primary" size="sm">保存</BaseButton>
        </template>
        <template #toolbar>
          <BaseFilterBar compact title="工作区筛选" description="工具条区域可放筛选、搜索和批量入口。" :filters="[]" :count="24" />
        </template>
        <BaseDataState state="ready" title="主内容区" description="内容区域可以承载表格、表单、详情或自定义布局。">
          <BaseDescriptionList
            :items="[
              { key: 'layout', label: '布局', value: '主内容 + 侧栏' },
              { key: 'toolbar', label: '工具栏', value: '已启用', status: 'success' },
              { key: 'footer', label: '底部动作', value: '固定在外壳底部' },
            ]"
            compact
          />
        </BaseDataState>
        <template #aside>
          <BaseSectionHeader title="页面侧栏" description="放页面摘要、快捷动作和局部状态。" icon="PanelRight" compact />
          <BaseDescriptionList
            class="mt-3"
            :items="[
              { key: 'owner', label: '负责人', value: '组件平台' },
              { key: 'status', label: '状态', value: '持续完善', status: 'success' },
            ]"
            compact
          />
        </template>
        <template #footer>
          <BaseFormActions compact title="页面操作" description="页脚区域适合放保存、取消、下一步。">
            <BaseButton type="neutral" size="sm">取消</BaseButton>
            <BaseButton type="primary" size="sm">继续</BaseButton>
          </BaseFormActions>
        </template>
      </BasePageShell>

      <div class="page-shell-demo-grid">
        <BasePageShell
          title="嵌套外壳"
          description="无边框内容区适合放在已有面板内部。"
          icon="PanelTop"
          compact
          size="sm"
          surface="plain"
          header-surface="muted"
          :content-padded="false"
          :header-level="3"
        >
          <BaseFieldGroup compact title="嵌套内容" icon="LayoutTemplate" surface="muted">
            <BaseDescriptionList
              :items="[
                { key: 'surface', label: '内容表面', value: 'plain' },
                { key: 'padding', label: '内边距', value: '由内部组件负责', status: 'success' },
              ]"
              compact
            />
          </BaseFieldGroup>
        </BasePageShell>

        <BasePageShell
          title="加载外壳"
          description="页面切换或提交中锁定内容区。"
          icon="LoaderCircle"
          compact
          size="sm"
          loading
          header-surface="muted"
          :header-level="3"
        >
          <BaseDataState state="loading" title="加载中" description="保持页面结构稳定。" />
        </BasePageShell>

        <BasePageShell
          title="禁用外壳"
          description="只读场景保持页面身份和布局。"
          icon="Lock"
          compact
          size="sm"
          disabled
          surface="muted"
          :header-level="3"
        >
          <BaseFormItem label="配置名称" compact>
            <BaseInput model-value="继承配置" size="sm" />
          </BaseFormItem>
        </BasePageShell>

        <BasePageShell
          title="左侧栏外壳"
          description="侧栏可放在左侧，适合资源树、目录和筛选导航。"
          icon="PanelLeft"
          compact
          size="sm"
          surface="muted"
          header-surface="plain"
          aside-position="left"
          aside-width="180px"
          :header-level="3"
        >
          <template #aside>
            <BaseList
              :items="[
                { id: 'resource', title: '资源目录', meta: '12' },
                { id: 'filter', title: '筛选条件', meta: '5' },
                { id: 'history', title: '最近访问', meta: '8' },
              ]"
              variant="row"
              size="sm"
              surface="transparent"
              divided
            />
          </template>
          <BaseDescriptionList
            :items="[
              { key: 'aside', label: '侧栏位置', value: 'left', status: 'primary' },
              { key: 'width', label: '侧栏宽度', value: '180px' },
            ]"
            compact
          />
        </BasePageShell>

        <div class="page-shell-scroll-demo">
          <BasePageShell
            title="滚动工作区"
            description="内容区可独立滚动，头部和页脚保持稳定。"
            icon="Rows3"
            compact
            content-scrollable
            header-sticky
            toolbar-sticky
            footer-sticky
            :header-level="3"
          >
            <template #toolbar>
              <BaseToolbar compact>
                <template #left>
                  <BaseBadge type="primary" variant="outline">Sticky toolbar</BaseBadge>
                </template>
              </BaseToolbar>
            </template>
            <BaseList
              :items="[
                { id: 'a', title: '字段配置', meta: '8 项' },
                { id: 'b', title: '展示设置', meta: '6 项' },
                { id: 'c', title: '权限策略', meta: '4 项' },
                { id: 'd', title: '审计日志', meta: '12 条' },
                { id: 'e', title: '扩展动作', meta: '5 项' },
              ]"
              variant="plain"
            >
              <template #default="{ item }">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ item.title }}</span>
                <BaseBadge type="neutral" size="sm">{{ item.meta }}</BaseBadge>
              </template>
            </BaseList>
            <template #footer>
              <BaseFormActions compact justify="end">
                <BaseButton type="neutral" size="sm">暂存</BaseButton>
                <BaseButton type="primary" size="sm">保存</BaseButton>
              </BaseFormActions>
            </template>
          </BasePageShell>
        </div>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'page-header'" class="detail-stack">
    <PlaygroundDemoSection title="页面头部" subtitle="聚合面包屑、页面身份、状态标签和右侧主动作。" icon="PanelTop">
      <BasePageHeader
        title="组件沙箱"
        description="统一承载页面标题、说明、图标、面包屑、元信息和操作区。"
        icon="Boxes"
        :breadcrumbs="pageHeaderBreadcrumbs"
        size="lg"
        :level="2"
        meta-label="组件沙箱状态"
        actions-label="组件沙箱操作"
        backable
        @back="triggerToast('返回上一级', 'info')"
        @select-breadcrumb="triggerToast(`选择面包屑：${$event.label}`, 'info')"
      >
        <template #meta>
          <BaseBadge type="success">已接入</BaseBadge>
          <BaseStatusDot type="primary" label="Light / Dark" description="主题态" />
        </template>
        <template #actions>
          <BaseButton type="neutral" size="sm">导出</BaseButton>
          <BaseButton type="primary" size="sm">新增组件</BaseButton>
        </template>
      </BasePageHeader>

      <BasePageHeader
        title="紧凑头部"
        description="适合抽屉、详情侧栏和嵌套工作区。"
        icon="Rows3"
        compact
        size="sm"
        :level="3"
        surface="muted"
      >
        <template #actions>
          <BaseActionMenu :actions="[{ key: 'rename', label: '重命名', icon: 'Pencil' }, { key: 'archive', label: '归档', icon: 'Archive' }]" />
        </template>
      </BasePageHeader>

      <div class="page-header-demo-grid">
        <BasePageHeader
          title="无边框头部"
          description="适合放在 BasePageShell、弹窗或已有卡片内部。"
          icon="PanelTop"
          compact
          :level="3"
          surface="plain"
        >
          <template #meta>
            <BaseBadge type="neutral" variant="outline">Plain</BaseBadge>
          </template>
        </BasePageHeader>

        <BasePageHeader
          title="加载中头部"
          description="页面切换、权限加载或保存中可保持操作区结构。"
          icon="LoaderCircle"
          compact
          :level="3"
          loading
        >
          <template #actions>
            <BaseButton type="neutral" size="sm" disabled>导出</BaseButton>
            <BaseButton type="primary" size="sm" loading>保存中</BaseButton>
          </template>
        </BasePageHeader>

        <BasePageHeader
          title="禁用操作"
          description="权限不足时保留页面身份，但关闭返回和主动作。"
          icon="Lock"
          backable
          disabled
          compact
          :level="3"
        >
          <template #actions>
            <BaseButton type="neutral" size="sm" disabled>只读</BaseButton>
          </template>
        </BasePageHeader>

        <BasePageHeader
          title="很长的页面标题可以按需换行并保持右侧动作区不被挤出容器"
          description="wrapTitle 适合资源名称、任务名称或路径较长的页面头部，避免窄屏时被截断到无法识别。"
          icon="TextCursorInput"
          compact
          surface="muted"
          :level="3"
          wrap-title
        >
          <template #meta>
            <BaseBadge type="primary" variant="outline">Wrap</BaseBadge>
          </template>
        </BasePageHeader>

        <BasePageHeader
          title="吸顶头部"
          description="长内容区域可以使用 sticky 保持上下文。"
          icon="Pin"
          compact
          sticky
          surface="muted"
          :level="3"
        >
          <template #meta>
            <BaseStatusDot type="success" label="Sticky" description="已启用" />
          </template>
        </BasePageHeader>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'section-header'" class="detail-stack">
    <PlaygroundDemoSection title="区块标题" subtitle="用于面板、侧栏、表单段落和工作区内部的小标题。" icon="Heading">
      <BasePanel title="标题组合" subtitle="覆盖图标、说明、元信息、动作和分隔线。">
        <div class="section-header-demo-stack">
          <BaseSectionHeader
            title="资源摘要"
            description="标准区块标题，适合卡片或页面内容区顶部。"
            icon="FolderTree"
            icon-size="lg"
            :level="2"
            meta-label="资源摘要状态"
            actions-label="资源摘要操作"
          >
            <template #meta>
              <BaseBadge type="success" size="sm">已同步</BaseBadge>
            </template>
            <template #actions>
              <BaseButton type="neutral" size="sm">刷新</BaseButton>
              <BaseButton type="primary" size="sm">新增</BaseButton>
            </template>
          </BaseSectionHeader>

          <BaseSectionHeader
            title="带分隔线"
            description="divided 状态会保留线条下方间距，避免贴住后续内容。"
            icon="PanelTop"
            divided
            spacing="lg"
          >
            <template #actions>
              <BaseBadge type="primary" variant="outline">Divided</BaseBadge>
            </template>
          </BaseSectionHeader>
          <BaseDescriptionList
            :items="[
              { key: 'gap', label: '线后间距', value: '已保留', status: 'success' },
              { key: 'usage', label: '适用', value: '列表、表单段落、侧栏块' },
            ]"
            compact
          />
        </div>
      </BasePanel>

      <div class="section-header-demo-grid">
        <BasePanel title="密度与大小" subtitle="适配侧栏、抽屉和主内容区。">
          <div class="section-header-demo-stack">
            <BaseSectionHeader title="小尺寸" description="用于窄侧栏。" icon="Rows3" size="sm" compact />
            <BaseSectionHeader title="默认尺寸" description="用于常规内容区。" icon="PanelTop" />
            <BaseSectionHeader title="大尺寸" description="用于主要区块。" icon="LayoutDashboard" size="lg" />
          </div>
        </BasePanel>

        <BasePanel title="长说明与禁用" subtitle="覆盖换行说明、普通标题和不可用状态。">
          <div class="section-header-demo-stack">
            <BaseSectionHeader
              title="普通标题样式"
              description="不强制大写，更适合中文业务标题和说明较长的场景，说明文字可以自然换行。"
              icon="FileText"
              :uppercase="false"
              wrap-description
              align="start"
            />
            <BaseSectionHeader
              title="禁用状态"
              description="权限不足或上下文不可用时保持标题结构。"
              icon="Lock"
              disabled
              compact
            />
            <BaseSectionHeader
              title="很长的区块标题可以换行并保持右侧动作区稳定"
              description="wrapTitle 与 wrapDescription 适合资源名称、策略名称或较长说明的区块标题。"
              icon="TextCursorInput"
              align="start"
              wrap-title
              wrap-description
              :uppercase="false"
            >
              <template #actions>
                <BaseBadge type="primary" variant="outline">Wrap</BaseBadge>
              </template>
            </BaseSectionHeader>
            <BaseSectionHeader
              title="无底部间距"
              description="spacing=none 适合紧贴内部内容的嵌套标题。"
              icon="Rows3"
              compact
              spacing="none"
              :level="4"
            />
          </div>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'panel'" class="detail-stack">
    <PlaygroundDemoSection title="基础面板" subtitle="用于承载卡片、局部配置、侧栏摘要和可点击区域。" icon="PanelTop">
      <div class="panel-demo-grid">
        <BasePanel
          title="标准面板"
          description="标题、说明、图标、动作和页脚组合。"
          icon="LayoutTemplate"
          divided
          size="lg"
          :level="2"
          body-gap="md"
          actions-label="标准面板操作"
          body-label="标准面板内容"
          footer-label="标准面板页脚"
        >
          <template #actions>
            <BaseButton type="neutral" size="sm">预览</BaseButton>
            <BaseButton type="primary" size="sm">保存</BaseButton>
          </template>
          <BaseDescriptionList
            :items="[
              { key: 'surface', label: '表面', value: 'card' },
              { key: 'state', label: '状态', value: '可编辑', status: 'success' },
            ]"
            compact
          />
          <template #footer>
            <BaseFormActions compact justify="end" :divided="false">
              <BaseButton type="neutral" size="sm">取消</BaseButton>
              <BaseButton type="primary" size="sm">提交</BaseButton>
            </BaseFormActions>
          </template>
        </BasePanel>

        <BasePanel
          title="可点击面板"
          description="适合入口卡片、选择项和资源跳转。"
          clickable
          selected
          icon="MousePointerClick"
          muted
          aria-label="可点击入口面板"
          @click="triggerToast('点击面板', 'info')"
        >
          <BaseStatusDot type="primary" label="Hover / Focus" description="带键盘焦点反馈" />
        </BasePanel>

        <BasePanel
          title="加载面板"
          description="保持结构，提示内容正在更新。"
          icon="LoaderCircle"
          loading
          loading-text="同步配置"
          size="sm"
          body-gap="sm"
        >
          <BaseSkeletonCard compact surface="plain" :bordered="false" />
          <template #footer>
            <BaseFormActions compact justify="end" :divided="false">
              <BaseButton type="neutral" size="sm">刷新</BaseButton>
              <BaseButton type="primary" size="sm">保存</BaseButton>
            </BaseFormActions>
          </template>
        </BasePanel>

        <BasePanel title="禁用面板" description="权限不足或上下文不可用，正文会统一锁定。" icon="Lock" disabled size="sm" body-gap="sm">
          <BaseFormItem label="继承配置" compact>
            <BaseInput model-value="系统默认" size="sm" />
          </BaseFormItem>
          <template #footer>
            <BaseFormActions compact justify="end">
              <BaseButton type="primary" size="sm">保存配置</BaseButton>
            </BaseFormActions>
          </template>
        </BasePanel>

        <BasePanel title="Muted 表面" description="适合次级容器和侧栏。" icon="PanelBottom" surface="muted">
          <BaseStatusDot type="success" label="配置有效" description="可保存" />
        </BasePanel>

        <BasePanel title="Plain 表面" description="适合嵌套在已有卡片内部。" icon="Rows3" surface="plain" :padded="false" :level="4">
          <BaseFieldGroup compact title="内部字段组" icon="Rows3" surface="muted">
            <BaseDescriptionList
              :items="[
                { key: 'padding', label: '内边距', value: '由内部组件负责' },
                { key: 'border', label: '额外边框', value: '无', status: 'success' },
              ]"
              compact
            />
          </BaseFieldGroup>
        </BasePanel>

        <BasePanel
          title="很长的面板标题可以按需换行并保持右侧动作区稳定"
          description="wrapTitle 与 wrapSubtitle 适合资源名称、任务名称或跨模块摘要较长的容器标题。"
          icon="TextCursorInput"
          surface="muted"
          wrap-title
          wrap-subtitle
        >
          <template #actions>
            <BaseBadge type="primary" variant="outline">Wrap</BaseBadge>
          </template>
          <BaseDescriptionList
            :items="[
              { key: 'title', label: '标题', value: '允许换行', status: 'success' },
              { key: 'actions', label: '动作区', value: '不会挤出容器' },
            ]"
            compact
          />
        </BasePanel>

        <BasePanel
          title="正文间距"
          description="bodyGap 适合多块内容直接放入面板正文的场景。"
          icon="Rows3"
          body-gap="sm"
          size="sm"
        >
          <BaseStatusDot type="success" label="第一行" description="正文自动保留间距" />
          <BaseStatusDot type="primary" label="第二行" description="不用额外写容器 gap" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'field-group'" class="detail-stack">
    <PlaygroundDemoSection title="字段分组" subtitle="适合设置页局部区域和带页脚的小配置块。" icon="LayoutTemplate">
      <div class="field-group-demo-stack">
        <BaseFieldGroup
          title="基础配置"
          description="字段区、图标、动作、页脚和表单项在一个容器里，适合作为设置页和详情页的稳定配置段落。"
          icon="Settings2"
          :columns="2"
          size="lg"
          :level="2"
          body-gap="lg"
          divided
          wrap-description
          actions-label="基础配置操作"
          body-label="基础配置字段"
          footer-label="基础配置页脚"
        >
          <template #actions>
            <BaseBadge type="primary" variant="outline">Group</BaseBadge>
          </template>
          <BaseFormItem label="组件名称">
            <BaseInput model-value="BaseFieldGroup" />
          </BaseFormItem>
          <BaseFormItem label="密度">
            <BaseSegmented
              model-value="normal"
              :options="[
                { label: '标准', value: 'normal', icon: 'PanelTop' },
                { label: '紧凑', value: 'compact', icon: 'Rows3' },
              ]"
            />
          </BaseFormItem>
          <template #footer>
            <BaseFormActions compact justify="end" :divided="false">
              <BaseButton type="neutral" size="sm">重置</BaseButton>
              <BaseButton type="primary" size="sm">保存分组</BaseButton>
            </BaseFormActions>
          </template>
        </BaseFieldGroup>

        <div class="field-group-demo-grid">
          <BaseFieldGroup
            title="四列参数"
            description="适合高密度设置项和参数面板。"
            icon="SlidersHorizontal"
            :columns="4"
            compact
            size="sm"
            body-gap="sm"
            surface="muted"
          >
            <BaseFormItem label="间距" compact>
              <BaseNumberInput :model-value="12" size="sm" unit="px" />
            </BaseFormItem>
            <BaseFormItem label="密度" compact>
              <BaseSegmented
                model-value="normal"
                size="sm"
                :options="[
                  { label: '标准', value: 'normal' },
                  { label: '紧凑', value: 'compact' },
                ]"
              />
            </BaseFormItem>
            <BaseFormItem label="启用" compact>
              <BaseSwitch model-value label="继承主题" size="sm" compact />
            </BaseFormItem>
            <BaseFormItem label="状态" compact>
              <BaseStatusDot type="success" label="有效" description="可保存" />
            </BaseFormItem>
          </BaseFieldGroup>

          <BaseFieldGroup
            v-model:collapsed="fieldGroupCollapsed"
            collapsible
            compact
            title="可折叠分组"
            description="复杂配置页可以先收起低频设置。"
            icon="ChevronDown"
            body-label="可折叠分组内容"
            expand-label="展开低频设置"
            collapse-label="收起低频设置"
            :keep-mounted="false"
            @toggle="triggerToast($event ? '分组已收起' : '分组已展开', 'info')"
          >
            <BaseFormItem label="缓存策略" compact>
              <BaseSelect
                model-value="auto"
                size="sm"
                :options="[
                  { label: '自动', value: 'auto' },
                  { label: '手动', value: 'manual' },
                ]"
              />
            </BaseFormItem>
            <BaseFormItem label="状态" compact>
              <BaseStatusDot type="success" label="配置有效" description="可保存" />
            </BaseFormItem>
          </BaseFieldGroup>

          <BaseFieldGroup
            title="很长的字段分组标题可以按需换行并保持操作区稳定"
            description="wrapTitle 与 wrapDescription 适合资源名称、策略名称或跨系统配置说明较长的场景。"
            icon="TextCursorInput"
            surface="muted"
            align="start"
            wrap-title
            wrap-description
          >
            <template #actions>
              <BaseBadge type="primary" variant="outline">Wrap</BaseBadge>
            </template>
            <BaseDescriptionList
              :items="[
                { key: 'title', label: '标题', value: '允许换行', status: 'success' },
                { key: 'actions', label: '动作区', value: '不会挤出容器' },
              ]"
              compact
            />
          </BaseFieldGroup>

          <BaseFieldGroup
            compact
            title="加载分组"
            description="异步刷新时保留结构，并锁定内部表单和页脚动作。"
            icon="LoaderCircle"
            loading
            loading-text="加载设置"
            body-gap="sm"
          >
            <BaseSkeletonCard compact surface="plain" :bordered="false" />
            <template #footer>
              <BaseFormActions compact justify="end" :divided="false">
                <BaseButton type="neutral" size="sm">刷新</BaseButton>
                <BaseButton type="primary" size="sm">保存</BaseButton>
              </BaseFormActions>
            </template>
          </BaseFieldGroup>

          <BaseFieldGroup compact title="禁用分组" description="整组锁定时内部控件不可编辑。" icon="Lock" disabled>
            <BaseFormItem label="继承配置" compact>
              <BaseInput model-value="系统默认" size="sm" />
            </BaseFormItem>
            <BaseFormItem label="继承状态" compact success="来自全局模板">
              <BaseSwitch model-value label="启用继承" size="sm" compact />
            </BaseFormItem>
          </BaseFieldGroup>

          <BaseFieldGroup compact title="无边框分组" description="适合嵌套在其它面板内部。" icon="Rows3" surface="plain" :level="4">
            <BaseDescriptionList
              :items="[
                { key: 'surface', label: '表面', value: 'plain' },
                { key: 'nest', label: '嵌套', value: '不增加额外卡片边框', status: 'success' },
              ]"
              compact
            />
          </BaseFieldGroup>
        </div>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'resizable-panels'" class="detail-stack">
    <PlaygroundDemoSection title="拖拽面板" subtitle="横向布局、最小最大尺寸和拖拽反馈。" icon="PanelsLeftRight">
      <div class="resizable-demo-stack">
        <div class="resizable-demo-block resizable-demo-block--primary">
          <BaseSectionHeader title="横向工作台" description="常见资源树 + 主工作区，pane 级最小/最大值限制。" icon="PanelsLeftRight" compact>
            <template #actions>
              <BaseBadge type="primary" variant="outline">{{ panelSummary }}</BaseBadge>
            </template>
          </BaseSectionHeader>
          <div class="resizable-demo">
            <BaseResizablePanels
              aria-label="横向拖拽面板示例"
              :panes="[
                { key: 'nav', size: 28, minSize: 18, maxSize: 40, label: '资源导航' },
                { key: 'work', size: 72, minSize: 44, maxSize: 82, label: '主工作区' },
              ]"
              @resize="handlePanelResized"
              @resized="handlePanelResized"
            >
              <template #nav>
                <div class="pane-body pane-body--side">
                  <BaseSectionHeader title="资源导航" description="最小 18%，最大 40%。" icon="FolderTree" compact />
                  <BaseList :items="[{ id: 'a', title: '组件库' }, { id: 'b', title: '布局模板' }, { id: 'c', title: '交互状态' }]">
                    <template #default="{ item }">
                      <span class="text-xs font-black text-slate-700 dark:text-slate-200">{{ item.title }}</span>
                      <BaseIcon name="ChevronRight" size="14" class="text-slate-400" />
                    </template>
                  </BaseList>
                </div>
              </template>
              <template #work>
                <div class="pane-body">
                  <BaseSectionHeader title="主工作区" description="拖拽手柄 hover 高亮，中间加粗。" icon="PanelRight" compact />
                  <BaseDescriptionList
                    :items="[
                      { key: 'summary', label: '状态输出', value: panelSummary, status: 'primary' },
                      { key: 'minmax', label: '限制', value: 'pane 级 minSize / maxSize' },
                      { key: 'keyboard', label: '键盘', value: '方向键每次 4%' },
                    ]"
                    compact
                  />
                </div>
              </template>
            </BaseResizablePanels>
          </div>
        </div>

        <div class="resizable-demo-grid">
          <div class="resizable-demo-block">
            <BaseSectionHeader title="纵向堆叠" description="适合预览区、日志区、底部检查器等上下分区。" icon="Rows3" compact>
              <template #actions>
                <BaseBadge type="neutral" variant="outline">{{ verticalPanelSummary }}</BaseBadge>
              </template>
            </BaseSectionHeader>
            <div class="resizable-demo resizable-demo--compact">
              <BaseResizablePanels
                direction="vertical"
                size="sm"
                surface="muted"
                aria-label="纵向拖拽面板示例"
                :keyboard-step="3"
                :panes="[
                  { key: 'preview', size: 58, minSize: 36, maxSize: 72, label: '预览区' },
                  { key: 'logs', size: 42, minSize: 24, maxSize: 64, label: '日志区' },
                ]"
                @resize="handleVerticalPanelResized"
                @resized="handleVerticalPanelResized"
              >
                <template #preview>
                  <div class="pane-body">
                    <BaseSectionHeader title="预览区" description="上下拖拽改变工作区高度。" icon="Monitor" compact />
                    <BaseInfoCard title="任务预览" description="纵向 splitter 保留水平手柄，hover 时只高亮中间加粗部分。" icon="PanelTop" />
                  </div>
                </template>
                <template #logs>
                  <div class="pane-body pane-body--side">
                    <BaseSectionHeader title="日志区" description="最小 24%，最大 64%。" icon="FileText" compact />
                    <BaseDescriptionList
                      :items="[
                        { key: 'resize', label: 'resize', value: verticalPanelSummary, status: 'primary' },
                        { key: 'step', label: 'keyboardStep', value: '3%' },
                      ]"
                      compact
                      surface="muted"
                    />
                  </div>
                </template>
              </BaseResizablePanels>
            </div>
          </div>

          <div class="resizable-demo-block">
            <BaseSectionHeader title="无框三栏" description="外层背景由页面决定，组件仅提供透明热区和中心手柄。" icon="PanelTop" compact>
              <template #actions>
                <BaseBadge type="neutral" variant="outline">{{ plainPanelSummary }}</BaseBadge>
              </template>
            </BaseSectionHeader>
            <div class="resizable-demo resizable-demo--compact">
              <BaseResizablePanels
                :framed="false"
                surface="plain"
                size="lg"
                aria-label="无框三栏拖拽面板示例"
                :min-size="18"
                :max-size="64"
                :panes="[
                  { key: 'catalog', size: 34, label: '目录' },
                  { key: 'canvas', size: 33, label: '画布' },
                  { key: 'inspector', size: 33, label: '检查器' },
                ]"
                @resize="handlePlainPanelResized"
                @resized="handlePlainPanelResized"
              >
                <template #catalog>
                  <div class="pane-body pane-body--plain pane-body--side">
                    <BaseSectionHeader title="目录" description="全局 min 18%。" icon="ListTree" compact />
                  </div>
                </template>
                <template #canvas>
                  <div class="pane-body pane-body--plain">
                    <BaseSectionHeader title="画布" description="三栏均复用默认限制。" icon="LayoutTemplate" compact />
                    <div class="pane-note">透明表面适合嵌入已有工作台容器。</div>
                  </div>
                </template>
                <template #inspector>
                  <div class="pane-body pane-body--plain pane-body--side">
                    <BaseSectionHeader title="检查器" description="全局 max 64%。" icon="SlidersHorizontal" compact />
                  </div>
                </template>
              </BaseResizablePanels>
            </div>
          </div>
        </div>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'three-column-layout'" class="detail-stack">
    <PlaygroundDemoSection title="三栏布局" subtitle="左右侧栏可拖拽、可收缩，展开入口贴边 hover 显示。" icon="PanelsLeftRight">
      <div class="three-column-demo-stack">
        <div class="three-column-demo-block three-column-demo-block--primary">
          <BaseSectionHeader title="标准三栏工作台" description="拖拽、键盘步进、左右收缩和贴边 hover 展开入口。" icon="PanelsLeftRight" compact>
            <template #actions>
              <BaseBadge type="primary" variant="outline">{{ threeColumnSummary }}</BaseBadge>
            </template>
          </BaseSectionHeader>
          <div class="three-column-demo">
            <BaseThreeColumnLayout
              v-model:left-collapsed="leftSidebarCollapsed"
              v-model:right-collapsed="rightSidebarCollapsed"
              aria-label="标准三栏布局示例"
              main-label="主工作区"
              size="lg"
              :left-width="180"
              :right-width="220"
              :min-left-width="140"
              :max-left-width="260"
              :min-right-width="160"
              :max-right-width="300"
              left-label="资源栏"
              right-label="属性栏"
              left-collapse-label="收缩资源栏"
              right-collapse-label="收缩属性栏"
              left-expand-label="展开资源栏"
              right-expand-label="展开属性栏"
              @resize="handleThreeColumnResize"
              @collapse="triggerToast('侧栏已收缩', 'info')"
              @expand="triggerToast('侧栏已展开', 'info')"
            >
              <template #left>
                <div class="three-column-pane three-column-pane--side">
                  <BaseSectionHeader title="资源栏" description="目录、筛选和工作集入口。" icon="FolderTree" compact />
                  <BaseList
                    class="mt-3"
                    :items="[
                      { id: 'all', title: '全部组件', meta: '48' },
                      { id: 'layout', title: '布局容器', meta: '7' },
                      { id: 'form', title: '表单输入', meta: '8' },
                      { id: 'data', title: '数据展示', meta: '6' },
                    ]"
                    variant="plain"
                  >
                    <template #default="{ item }">
                      <span class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ item.title }}</span>
                      <BaseBadge type="neutral" size="sm">{{ item.meta }}</BaseBadge>
                    </template>
                  </BaseList>
                </div>
              </template>

              <div class="three-column-pane three-column-pane--main">
                <BaseSectionHeader title="主工作区" description="中间区域随左右栏状态自动伸缩。" icon="PanelTop" compact />
                <div class="three-column-workspace">
                  <BaseInfoCard title="概览面板" description="适合资源详情、配置编辑和复杂工作台页面。" icon="LayoutTemplate" />
                  <BaseDescriptionList
                    :items="[
                      { key: 'left', label: '左侧栏', value: leftSidebarCollapsed ? '已收缩' : '可拖拽', status: leftSidebarCollapsed ? 'warning' : 'success' },
                      { key: 'right', label: '右侧栏', value: rightSidebarCollapsed ? '已收缩' : '可拖拽', status: rightSidebarCollapsed ? 'warning' : 'success' },
                      { key: 'range', label: '宽度限制', value: '左 140-260px / 右 160-300px' },
                    ]"
                    compact
                  />
                </div>
              </div>

              <template #right>
                <div class="three-column-pane three-column-pane--side">
                  <BaseSectionHeader title="属性栏" description="放置状态、配置和上下文操作。" icon="SlidersHorizontal" compact />
                  <BaseFieldGroup class="mt-3" compact title="布局状态" icon="PanelRight">
                    <BaseStatusDot
                      :type="leftSidebarCollapsed || rightSidebarCollapsed ? 'warning' : 'success'"
                      label="侧栏状态"
                      :description="leftSidebarCollapsed || rightSidebarCollapsed ? '存在收缩栏' : '全部展开'"
                    />
                  </BaseFieldGroup>
                  <BaseToolbar class="mt-3" compact>
                    <template #left>
                      <BaseButton type="neutral" size="sm" @click="leftSidebarCollapsed = !leftSidebarCollapsed">
                        左栏
                      </BaseButton>
                      <BaseButton type="neutral" size="sm" @click="rightSidebarCollapsed = !rightSidebarCollapsed">
                        右栏
                      </BaseButton>
                    </template>
                  </BaseToolbar>
                </div>
              </template>
            </BaseThreeColumnLayout>
          </div>
        </div>

        <div class="three-column-demo-grid">
          <div class="three-column-demo-block">
            <BaseSectionHeader title="初始收缩" description="左侧栏默认收起，展开按钮贴边 hover 后显示。" icon="PanelLeftOpen" compact>
              <template #actions>
                <BaseBadge type="neutral" variant="outline">{{ compactThreeColumnSummary }}</BaseBadge>
              </template>
            </BaseSectionHeader>
            <div class="three-column-demo three-column-demo--compact">
              <BaseThreeColumnLayout
                v-model:left-collapsed="compactLeftSidebarCollapsed"
                v-model:right-collapsed="compactRightSidebarCollapsed"
                aria-label="初始收缩三栏布局示例"
                main-label="编辑区"
                size="sm"
                surface="plain"
                :bordered="false"
                :left-width="120"
                :right-width="140"
                :min-left-width="96"
                :max-left-width="180"
                :min-right-width="110"
                :max-right-width="200"
                left-label="导航"
                right-label="设置"
                @resize="handleCompactThreeColumnResize"
              >
                <template #left>
                  <div class="three-column-pane three-column-pane--plain">
                    <BaseSectionHeader title="导航" description="默认收起。" icon="ListTree" compact />
                  </div>
                </template>
                <div class="three-column-pane three-column-pane--main three-column-pane--plain">
                  <BaseSectionHeader title="编辑区" description="Plain 表面适合嵌入已有容器。" icon="PanelTop" compact />
                  <div class="pane-note">左侧贴边区域 hover 后展示展开入口。</div>
                </div>
                <template #right>
                  <div class="three-column-pane three-column-pane--plain">
                    <BaseSectionHeader title="设置" description="右侧仍可拖拽。" icon="SlidersHorizontal" compact />
                  </div>
                </template>
              </BaseThreeColumnLayout>
            </div>
          </div>

          <div class="three-column-demo-block">
            <BaseSectionHeader title="禁用态" description="权限不足或流程锁定时保留结构和宽度状态。" icon="Lock" compact />
            <div class="three-column-demo three-column-demo--compact">
              <BaseThreeColumnLayout
                aria-label="禁用三栏布局示例"
                main-label="只读区"
                size="sm"
                surface="muted"
                disabled
                :left-width="112"
                :right-width="128"
                :min-left-width="96"
                :max-left-width="160"
                :min-right-width="110"
                :max-right-width="180"
                left-label="只读导航"
                right-label="只读属性"
              >
                <template #left>
                  <div class="three-column-pane three-column-pane--side">
                    <BaseSectionHeader title="只读导航" description="禁用拖拽。" icon="Lock" compact />
                  </div>
                </template>
                <div class="three-column-pane three-column-pane--main">
                  <BaseSectionHeader title="只读区" description="分割线保留但不可操作。" icon="PanelTop" compact />
                  <BaseStatusDot type="warning" label="已锁定" description="等待权限开放" />
                </div>
                <template #right>
                  <div class="three-column-pane three-column-pane--side">
                    <BaseSectionHeader title="只读属性" description="禁用收缩。" icon="SlidersHorizontal" compact />
                  </div>
                </template>
              </BaseThreeColumnLayout>
            </div>
          </div>
        </div>
      </div>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.resizable-demo {
  @apply h-[360px] min-h-0;
}

.resizable-demo--compact {
  @apply h-[300px];
}

.resizable-demo-stack {
  @apply grid gap-4;
}

.resizable-demo-grid {
  @apply grid gap-4 xl:grid-cols-2;
}

.resizable-demo-block {
  @apply min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.resizable-demo-block--primary {
  @apply bg-slate-50/70 dark:bg-slate-950/40;
}

.three-column-demo {
  @apply h-[440px] min-h-0;
}

.three-column-demo--compact {
  @apply h-[320px];
}

.three-column-demo-stack {
  @apply grid gap-4;
}

.three-column-demo-grid {
  @apply grid gap-4 xl:grid-cols-2;
}

.three-column-demo-block {
  @apply min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.three-column-demo-block--primary {
  @apply bg-slate-50/70 dark:bg-slate-950/40;
}

.pane-body {
  @apply flex h-full min-h-0 flex-col gap-3 overflow-auto bg-white p-4 dark:bg-slate-900;
}

.pane-body--side {
  @apply bg-slate-50 dark:bg-slate-950;
}

.pane-body--plain {
  @apply bg-white/90 dark:bg-slate-900/80;
}

.pane-note {
  @apply rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-bold leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400;
  overflow-wrap: anywhere;
}

.three-column-pane {
  @apply flex h-full min-h-0 flex-col overflow-auto p-4;
}

.three-column-pane--side {
  @apply bg-white dark:bg-slate-900;
}

.three-column-pane--plain {
  @apply bg-white/90 dark:bg-slate-900/80;
}

.three-column-pane--main {
  @apply gap-4 bg-slate-50 dark:bg-slate-950;
}

.three-column-workspace {
  @apply grid gap-3;
}

.field-group-demo-stack {
  @apply grid min-w-0;
  gap: clamp(2.5rem, 4vw, 3rem);
}

.field-group-demo-grid {
  @apply grid min-w-0 items-start lg:grid-cols-2;
  gap: clamp(1.5rem, 3vw, 2rem);
}

.page-header-demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}

.page-shell-demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}

.page-shell-scroll-demo {
  @apply h-[300px] min-h-0;
}

.section-header-demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}

.section-header-demo-stack {
  @apply grid gap-3;
}

.panel-demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}
</style>
