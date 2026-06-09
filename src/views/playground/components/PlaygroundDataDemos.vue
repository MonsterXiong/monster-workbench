<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../composables/useToast";
import { removeByValue } from "../../../utils";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const { triggerToast } = useToast();

const searchValue = ref("组件");
const selectionCount = ref(3);
const tablePage = ref(1);
const tablePageSize = ref(10);
const activeFilters = ref([
  { key: "category", label: "分类", value: "数据展示", type: "primary" as const },
  { key: "status", label: "状态", value: "已接入", type: "success" as const },
  { key: "owner", label: "负责人", value: "组件平台", type: "neutral" as const, removable: false },
]);
const readonlyFilters = [
  { key: "category", label: "分类", value: "数据展示", type: "primary" as const, removable: false },
  { key: "status", label: "状态", value: "已接入", type: "success" as const, removable: false },
];
const longFilterItems = [
  { key: "resource", label: "资源路径", value: "workspace/components/data-display/filter-bar/very-long-resource-name", type: "primary" as const },
  { key: "owner", label: "负责人", value: "组件平台与工作台体验协作小组", type: "neutral" as const, removable: false },
  { key: "state", label: "状态", value: "等待复核", type: "warning" as const },
];

const dataTableColumns = [
  { key: "name", title: "组件", width: "30%" },
  { key: "category", title: "分类", width: "20%" },
  { key: "status", title: "状态", width: "18%" },
  { key: "updatedAt", title: "更新时间", width: "18%" },
  { key: "rowActions", title: "操作", width: "14%", align: "right" as const },
];

const dataTableRows = [
  { name: "BaseFilterBar", category: "数据展示", status: "已接入", updatedAt: "2026-06-08" },
  { name: "BaseDataTable", category: "数据展示", status: "新增", updatedAt: "2026-06-08" },
  { name: "BaseConfirmAction", category: "操作控件", status: "已接入", updatedAt: "2026-06-08" },
  { name: "BaseResizablePanels", category: "布局容器", status: "优化中", updatedAt: "2026-06-07" },
];

const longDataTableColumns = [
  { key: "name", title: "资源名称", width: "38%", wrap: true },
  { key: "owner", title: "负责人", width: "24%", wrap: true },
  { key: "status", title: "状态", width: "18%" },
  { key: "rowActions", title: "操作", width: "20%", align: "right" as const },
];

const longDataTableRows = [
  {
    name: "workspace/components/data-display/base-data-table-with-very-long-resource-name",
    owner: "组件平台与工作台体验协作小组",
    status: "复核中",
  },
  {
    name: "workspace/components/data-display/filter-and-pagination-integration-case",
    owner: "前端基础组件",
    status: "已接入",
  },
];

const detailItems = [
  { key: "category", label: "组件分类", value: "数据展示", status: "primary" as const },
  { key: "owner", label: "负责人", value: "组件平台", status: "success" as const },
  { key: "density", label: "默认密度", value: "标准 / 紧凑" },
  { key: "usage", label: "高频场景", value: "列表页、详情页、资源管理" },
];

const handleFilterRemove = (filter: { key: string }) => {
  activeFilters.value = removeByValue(activeFilters.value, (item) => item.key, filter.key);
};

const handleFilterClear = () => {
  activeFilters.value = [];
};

const handleSearch = (value: string) => {
  triggerToast(`已执行筛选：${value || "空查询"}`, "info");
};

const handlePageChange = (payload: { page: number; pageSize: number }) => {
  triggerToast(`分页切换：第 ${payload.page} 页 / ${payload.pageSize} 条`, "info");
};
</script>

<template>
  <section v-if="activeComponentKey === 'filter-bar'" class="detail-stack">
    <PlaygroundDemoSection title="增强后的筛选条" subtitle="标题区、筛选数量、动作区和摘要区一起收口。" icon="ListFilter">
      <div class="demo-grid">
        <BaseFilterBar
          v-model:search-value="searchValue"
          title="组件筛选"
          description="适合列表页顶部，把搜索、筛选控件、结果感知和主动作放在同一处。"
          search-placeholder="搜索组件、分类或负责人"
          :filters="activeFilters"
          :count="24"
          count-label="个组件"
          search-id="component-filter-search"
          search-name="componentFilter"
          search-clear-text="清空搜索"
          clear-text="清空筛选"
          search-aria-controls="component-filter-result"
          @search="handleSearch"
          @remove-filter="handleFilterRemove"
          @clear="handleFilterClear"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">
              <template #icon><BaseIcon name="Plus" size="14" /></template>
              新建筛选
            </BaseButton>
          </template>
          <template #filters="{ interactiveDisabled }">
            <BaseBadge type="primary" variant="outline" :disabled="interactiveDisabled">高频组件</BaseBadge>
            <BaseBadge type="success" variant="outline" :disabled="interactiveDisabled">已接入</BaseBadge>
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">更多条件</BaseButton>
          </template>
        </BaseFilterBar>

        <BaseFilterBar
          v-model:search-value="searchValue"
          compact
          title="快速筛选"
          description="侧栏、抽屉和窄表格顶部更适合这种密度。"
          search-placeholder="快速筛选"
          :filters="readonlyFilters"
          :count="8"
          surface="muted"
          :show-clear="false"
        />

        <BaseFilterBar
          title="条件摘要"
          description="不需要搜索框时，只展示筛选结果与动作。"
          :filters="readonlyFilters"
          :count="2"
          count-label="个条件"
          :show-search="false"
          size="lg"
          surface="muted"
          :show-clear="false"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">保存视图</BaseButton>
          </template>
          <template #filters="{ interactiveDisabled }">
            <BaseBadge type="primary" variant="outline" :disabled="interactiveDisabled">已保存视图</BaseBadge>
          </template>
        </BaseFilterBar>

        <BaseFilterBar
          title="加载筛选"
          description="异步加载筛选条件时锁定输入与清空动作。"
          search-placeholder="加载中"
          :filters="activeFilters.slice(0, 1)"
          loading
          compact
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">同步条件</BaseButton>
          </template>
        </BaseFilterBar>

        <BaseFilterBar
          title="禁用筛选"
          description="权限不足或流程锁定时保持当前筛选可见。"
          :filters="activeFilters.slice(0, 2)"
          disabled
          compact
        >
          <template #filters="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">只读条件</BaseButton>
          </template>
        </BaseFilterBar>

        <BaseFilterBar
          title="Plain 嵌套筛选"
          description="无边框表面适合嵌入面板正文。"
          :filters="[]"
          surface="plain"
          :divided="false"
          :show-summary-when-empty="false"
          aria-label="嵌套筛选条"
        />

        <div class="filter-pressure-box">
          <BaseFilterBar
            v-model:search-value="searchValue"
            compact
            title="非常长的组件筛选标题会在窄容器中稳定截断"
            description="用于验证标题、说明、搜索框、筛选标签、动作区和清空按钮在侧栏、抽屉、窄表格顶部这类空间不足的场景里不会产生横向溢出。"
            search-placeholder="搜索长资源名称"
            :filters="longFilterItems"
            :count="128"
            count-label="条长结果"
            search-clear-text="清空搜索"
            clear-text="清空筛选"
            search-on-input
            :search-debounce="150"
            :search-min-length="2"
            @search="handleSearch"
          >
            <template #actions="{ interactiveDisabled }">
              <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">应用这个很长的筛选视图名称</BaseButton>
            </template>
            <template #filters="{ interactiveDisabled }">
              <BaseBadge type="warning" variant="outline" :disabled="interactiveDisabled">长文案筛选标签不会撑破容器</BaseBadge>
            </template>
          </BaseFilterBar>
        </div>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'detail-card'" class="detail-stack">
    <PlaygroundDemoSection title="详情卡片" subtitle="详情页、侧栏和资源摘要里常见的对象身份与属性组合。" icon="IdCard">
      <div class="demo-grid">
        <BaseDetailCard
          title="BaseDataTable"
          description="用于展示资源管理、任务列表和配置项列表的标准数据表格。"
          icon="Table2"
          status="已接入"
          status-label="接入状态：已接入"
          status-type="success"
          meta="updated 2026-06-08"
          meta-label="更新时间"
          :items="detailItems"
          size="lg"
          actions-label="BaseDataTable 操作"
          tags-label="BaseDataTable 标签"
          body-label="BaseDataTable 组合建议"
          list-label="BaseDataTable 属性"
        >
          <template #actions>
            <BaseButton type="neutral" size="sm">预览</BaseButton>
            <BaseButton type="primary" size="sm">编辑</BaseButton>
          </template>
          <template #tags>
            <BaseBadge type="primary">表格</BaseBadge>
            <BaseBadge type="neutral">分页</BaseBadge>
            <BaseBadge type="success" variant="outline">稳定</BaseBadge>
          </template>
          <BaseAlert type="info" title="组合建议" description="详情卡片适合承载对象身份、状态、属性和底部动作。" compact />
        </BaseDetailCard>

        <BaseDetailCard
          title="紧凑详情"
          description="适合抽屉、右侧栏和列表内展开详情。"
          icon="PanelRight"
          status="Compact"
          status-label="密度：紧凑"
          status-type="primary"
          :items="detailItems.slice(0, 3)"
          compact
          muted
        />

        <BaseDetailCard
          title="可点击详情"
          description="适合资源入口卡、对象选择器和可跳转详情。"
          icon="MousePointerClick"
          status="可进入"
          status-label="入口状态：可进入"
          status-type="primary"
          meta="clickable"
          meta-label="交互模式"
          :items="detailItems.slice(0, 2)"
          clickable
          aria-label="打开可点击详情卡"
          actions-label="可点击详情内部操作"
          @click="triggerToast('打开详情卡片', 'info')"
        >
          <template #actions>
            <BaseButton type="neutral" size="sm" @click="triggerToast('触发卡片内部动作', 'success')">内部动作</BaseButton>
          </template>
          <template #tags>
            <BaseBadge type="primary" variant="outline">入口卡</BaseBadge>
            <BaseBadge type="neutral" variant="outline">键盘可触发</BaseBadge>
          </template>
        </BaseDetailCard>

        <BaseDetailCard
          title="加载详情"
          description="保持对象身份区域，内容区等待数据返回。"
          icon="LoaderCircle"
          status="Loading"
          status-type="neutral"
          meta="pending"
          meta-label="加载状态"
          loading
          loading-text="详情数据加载中"
        >
          <BaseSkeletonCard compact />
        </BaseDetailCard>

        <BaseDetailCard
          title="禁用详情"
          description="权限不足时保留摘要，但禁止点击入口。"
          icon="Lock"
          status="只读"
          status-label="权限状态：只读"
          status-type="neutral"
          :items="detailItems.slice(0, 2)"
          disabled
          clickable
          aria-label="禁用详情卡"
        />

        <BaseDetailCard
          title="Plain 嵌套详情"
          description="无边框表面适合嵌套在 BasePanel 或抽屉内部。"
          icon="FileText"
          status="Plain"
          status-type="primary"
          surface="plain"
          :items="detailItems.slice(0, 3)"
          compact
        />

        <BaseDetailCard
          title="非常长的资源详情标题需要在侧栏与抽屉中稳定换行"
          description="详情卡片常用于资源摘要、对象选择器和配置预览，标题、说明、元信息与属性值都可能来自远端数据，需要在窄容器下保持可读且不横向溢出。"
          icon="TextCursorInput"
          status="Long"
          status-label="长文案示例"
          status-type="warning"
          meta="updated by component-platform / workspace/detail-card/very-long-resource-path"
          meta-label="长元信息"
          :items="[
            { key: 'name', label: '资源名称', value: 'monster-workbench-component-detail-card-with-very-long-name', description: '长属性值不撑破容器', span: 2 },
            { key: 'owner', label: '负责人', value: '组件平台', status: 'primary' },
            { key: 'state', label: '状态', value: '等待复核', status: 'warning' },
          ]"
          wrap-title
          wrap-description
          wrap-meta
          wrap-list-label
          wrap-list-value
          wrap-list-description
          :max-description-lines="4"
          :columns="2"
          list-label="长文案详情属性"
        >
          <template #footer>
            <BaseFormActions compact justify="end" :divided="false" aria-label="长文案详情操作">
              <BaseButton type="neutral" size="sm">忽略</BaseButton>
              <BaseButton type="primary" size="sm">复核</BaseButton>
            </BaseFormActions>
          </template>
        </BaseDetailCard>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'data-table'" class="detail-stack">
    <PlaygroundDemoSection title="数据表格" subtitle="列表页最常见的工具条、筛选、表格和分页组合。" icon="Table2">
      <BaseDataTable
        v-model:page="tablePage"
        v-model:page-size="tablePageSize"
        title="组件清单"
        description="适合资源管理、任务列表和配置项列表等高频页面。"
        :columns="dataTableColumns"
        :data="dataTableRows"
        :count="dataTableRows.length"
        :total="42"
        row-key="name"
        :selected-keys="['BaseDataTable']"
        table-caption="组件清单数据表格"
        actions-label="组件清单操作"
        filters-label="组件清单筛选"
        body-label="组件清单表格内容"
        pagination-label="组件清单分页"
        loading-text="组件清单加载中"
        @page-change="handlePageChange"
      >
        <template #meta="{ interactiveDisabled }">
          <BaseBadge type="success" dot :disabled="interactiveDisabled">运行中</BaseBadge>
        </template>
        <template #actions="{ interactiveDisabled }">
          <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">导出</BaseButton>
          <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">新增</BaseButton>
        </template>
        <template #filters="{ interactiveDisabled }">
          <BaseBadge type="primary" variant="outline" :disabled="interactiveDisabled">数据展示</BaseBadge>
          <BaseBadge type="neutral" variant="outline" :disabled="interactiveDisabled">最近更新</BaseBadge>
        </template>
        <template #status="{ row }">
          <BaseBadge :type="row.status === '已接入' ? 'success' : row.status === '新增' ? 'primary' : 'warning'">
            {{ row.status }}
          </BaseBadge>
        </template>
        <template #rowActions="{ row }">
          <BaseActionMenu
            :actions="[
              { key: 'preview', label: '预览', icon: 'Eye' },
              { key: 'copy', label: '复制名称', icon: 'Copy' },
            ]"
            aria-label="行操作"
            @select="triggerToast(`${row.name}: ${$event.label}`, 'info')"
          />
        </template>
      </BaseDataTable>
    </PlaygroundDemoSection>

    <PlaygroundDemoSection title="加载形态" subtitle="保持工具条和分页稳定，只替换表格区域状态。" icon="LoaderCircle">
      <BaseDataTable
        title="加载中的组件"
        description="loading 状态下表格自动显示骨架行。"
        :columns="dataTableColumns.slice(0, 4)"
        :data="[]"
        :total="0"
        :skeleton-rows="4"
        loading-text="组件列表加载中"
        actions-label="加载表格操作"
        body-label="加载表格内容"
        loading
      >
        <template #actions="{ interactiveDisabled }">
          <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">刷新</BaseButton>
        </template>
      </BaseDataTable>
    </PlaygroundDemoSection>

    <PlaygroundDemoSection title="密度与空态" subtitle="表面、禁用、空态分页策略和列对齐都由包装层统一透传。" icon="Rows3">
      <div class="demo-grid">
        <BaseDataTable
          title="审计表格"
          description="muted 表面和大尺寸适合配置确认页。"
          :columns="dataTableColumns.slice(0, 4)"
          :data="dataTableRows.slice(0, 2)"
          :count="2"
          :total="2"
          row-key="name"
          :selected-keys="['BaseFilterBar']"
          surface="muted"
          size="lg"
          compact
          :show-pagination="false"
          body-label="审计表格内容"
        />
        <BaseDataTable
          title="空结果"
          description="空态可隐藏分页，适合筛选无结果场景。"
          :columns="dataTableColumns.slice(0, 3)"
          :data="[]"
          :total="0"
          empty-text="暂无匹配组件"
          empty-icon="SearchX"
          hide-pagination-when-empty
          compact
          body-label="空结果表格内容"
        />
        <BaseDataTable
          title="禁用表格"
          description="plain 表面适合嵌套在面板内部，并可整体禁用交互。"
          :columns="dataTableColumns.slice(0, 3)"
          :data="dataTableRows.slice(0, 2)"
          :total="2"
          surface="plain"
          :bordered="false"
          :hover="false"
          disabled
          compact
          :show-pagination="false"
          body-label="禁用表格内容"
        />

        <div class="data-table-pressure-box">
          <BaseDataTable
            title="非常长的表格标题会在侧栏和抽屉中稳定换行"
            description="用于验证工具条、筛选标签、表格单元格、行操作和分页区域在 320px 容器里不会撑出页面横向滚动。"
            :columns="longDataTableColumns"
            :data="longDataTableRows"
            :count="longDataTableRows.length"
            :total="longDataTableRows.length"
            row-key="name"
            compact
            wrap-title
            wrap-description
            wrap-cells
            table-min-width="0"
            actions-label="长文案表格操作"
            filters-label="长文案表格筛选"
            body-label="长文案表格内容"
            pagination-label="长文案表格分页"
          >
            <template #actions="{ interactiveDisabled }">
              <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">同步这个非常长的表格视图名称</BaseButton>
            </template>
            <template #filters="{ interactiveDisabled }">
              <BaseBadge type="primary" variant="outline" :disabled="interactiveDisabled">workspace/data-table/very-long-filter-label</BaseBadge>
            </template>
            <template #status="{ row }">
              <BaseBadge :type="row.status === '已接入' ? 'success' : 'warning'" variant="outline">
                {{ row.status }}
              </BaseBadge>
            </template>
            <template #rowActions>
              <BaseButton type="neutral" size="sm">查看详情</BaseButton>
            </template>
          </BaseDataTable>
        </div>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'table-toolbar'" class="detail-stack">
    <PlaygroundDemoSection title="列表工具栏" subtitle="统一列表页身份、统计感知和顶部动作。" icon="Table2">
      <div class="demo-grid">
        <BaseTableToolbar
          title="组件列表"
          description="适合放在列表页、表格页和资源管理页顶部。"
          :count="24"
          actions-label="组件列表操作"
          content-label="组件列表补充筛选"
        >
          <template #meta="{ interactiveDisabled }">
            <BaseBadge type="success" dot :disabled="interactiveDisabled">已接入</BaseBadge>
          </template>
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">刷新</BaseButton>
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">新增组件</BaseButton>
          </template>
          <template #default="{ interactiveDisabled }">
            <BaseBadge type="primary" variant="outline" :disabled="interactiveDisabled">最近同步</BaseBadge>
            <BaseBadge type="neutral" variant="outline" :disabled="interactiveDisabled">包含 10 个分类</BaseBadge>
          </template>
        </BaseTableToolbar>

        <BaseTableToolbar
          title="紧凑工具栏"
          description="适合抽屉、侧栏和窄表格顶部。"
          :count="8"
          count-label="项筛选"
          icon="ListFilter"
          compact
          surface="muted"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">清空</BaseButton>
          </template>
          <template #default="{ interactiveDisabled }">
            <BaseBadge type="primary" variant="outline" :disabled="interactiveDisabled">数据展示</BaseBadge>
            <BaseBadge type="success" variant="outline" :disabled="interactiveDisabled">已同步</BaseBadge>
          </template>
        </BaseTableToolbar>

        <BaseTableToolbar
          title="嵌套工具栏"
          description="plain 表面可以嵌入 BasePanel 或详情卡正文。"
          :count="3"
          icon=""
          surface="plain"
          :divided="false"
          size="lg"
        >
          <template #meta="{ interactiveDisabled }">
            <BaseStatusDot type="primary" label="Plain" orientation="horizontal" :aria-disabled="interactiveDisabled ? 'true' : undefined" />
          </template>
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">应用</BaseButton>
          </template>
        </BaseTableToolbar>

        <BaseTableToolbar
          title="加载中"
          description="异步列表初始化时保留标题区和动作区域。"
          :count="0"
          icon="LoaderCircle"
          loading
          loading-text="列表工具栏加载中"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">刷新</BaseButton>
          </template>
        </BaseTableToolbar>

        <BaseTableToolbar
          title="禁用工具栏"
          description="权限不足或流程锁定时整体降低可交互性。"
          :count="12"
          icon="Lock"
          disabled
          compact
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">保存</BaseButton>
          </template>
          <template #default="{ interactiveDisabled }">
            <BaseBadge type="neutral" variant="outline" :disabled="interactiveDisabled">只读</BaseBadge>
          </template>
        </BaseTableToolbar>

        <div class="toolbar-pressure-box">
          <BaseTableToolbar
            title="非常长的列表工具栏标题需要在侧栏和抽屉中稳定换行"
            description="用于验证标题、描述、统计数量、状态徽标、动作按钮和补充标签在窄容器中不会撑出横向滚动，也不会让按钮文字盖住后续内容。"
            :count="128"
            count-label="条资源记录"
            icon="Rows3"
            compact
            wrap-title
            wrap-description
            actions-label="长文案工具栏操作"
            content-label="长文案工具栏标签"
          >
            <template #meta="{ interactiveDisabled }">
              <BaseBadge type="warning" variant="outline" :disabled="interactiveDisabled">长文案状态标记</BaseBadge>
            </template>
            <template #actions="{ interactiveDisabled }">
              <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">同步这个非常长的视图名称</BaseButton>
            </template>
            <template #default="{ interactiveDisabled }">
              <BaseBadge type="primary" variant="outline" :disabled="interactiveDisabled">workspace/table-toolbar/very-long-filter-label</BaseBadge>
              <BaseBadge type="neutral" variant="outline" :disabled="interactiveDisabled">包含跨页面列表统计</BaseBadge>
            </template>
          </BaseTableToolbar>
        </div>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'selection-bar'" class="detail-stack">
    <PlaygroundDemoSection title="批量操作栏" subtitle="表格、多选列表和文件管理都可以直接复用。" icon="ListChecks">
      <div class="demo-grid">
        <BaseSelectionBar :count="selectionCount" description="批量动作和已选上下文固定在同一处。" actions-label="已选组件批量操作" @clear="selectionCount = 0">
          <template #default="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">批量归档</BaseButton>
            <BaseButton type="danger" size="sm" outline :disabled="interactiveDisabled">删除</BaseButton>
          </template>
        </BaseSelectionBar>

        <BaseSelectionBar :count="0" compact description="没有选中项时清空按钮自动禁用。" surface="muted" />

        <BaseSelectionBar
          :count="12"
          label="已勾选资源"
          item-label="个文件"
          description="适合文件管理、资源列表和任务队列。"
          clear-text="取消勾选"
          icon="Files"
          size="lg"
          surface="muted"
          actions-label="文件批量操作"
        >
          <template #default="{ interactiveDisabled }">
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">移动到</BaseButton>
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">打标签</BaseButton>
          </template>
        </BaseSelectionBar>

        <BaseSelectionBar
          :count="5"
          description="loading 时清空按钮和动作会进入不可用态。"
          loading
          loading-text="批量操作处理中"
          compact
        >
          <template #default="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">处理中</BaseButton>
          </template>
        </BaseSelectionBar>

        <BaseSelectionBar
          :count="3"
          description="plain 表面适合嵌入 BasePanel 内部。"
          surface="plain"
          icon=""
          :show-clear="false"
          aria-label="嵌套批量操作栏"
        >
          <template #default="{ interactiveDisabled }">
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">应用选择</BaseButton>
          </template>
        </BaseSelectionBar>

        <BaseSelectionBar
          :count="2"
          description="禁用态用于权限不足或流程锁定。"
          disabled
          compact
          sticky
        >
          <template #default="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">批量更新</BaseButton>
          </template>
        </BaseSelectionBar>

        <div class="selection-pressure-box">
          <BaseSelectionBar
            :count="128"
            label="已选择非常长的一组跨页面资源和待处理组件"
            item-label="条资源记录"
            description="用于验证已选数量、长说明、动作按钮和清空按钮在侧栏、抽屉、窄表格底部这类空间不足的场景里不会横向溢出。"
            clear-text="清空这批很长的选择结果"
            icon="ListChecks"
            compact
            wrap-label
            wrap-description
            actions-label="长文案批量操作"
          >
            <template #default="{ interactiveDisabled }">
              <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">执行这个非常长的批量动作名称</BaseButton>
              <BaseBadge type="warning" variant="outline" :disabled="interactiveDisabled">跨页面选择</BaseBadge>
            </template>
          </BaseSelectionBar>
        </div>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'data-state'" class="detail-stack">
    <PlaygroundDemoSection title="数据状态" subtitle="把加载、空态、错误和正常内容收拢成统一的数据状态容器。" icon="CircleDashed">
      <div class="demo-grid">
        <BaseDataState
          state="ready"
          title="正常内容"
          description="ready 状态直接渲染默认插槽。"
          actions-label="正常内容操作"
          content-label="正常内容摘要"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">刷新</BaseButton>
          </template>
          <template #default="{ interactiveDisabled }">
            <BaseDescriptionList
              :items="[
                { key: 'status', label: '状态', value: interactiveDisabled ? '锁定' : '已加载', status: interactiveDisabled ? 'neutral' : 'success' },
                { key: 'count', label: '记录数', value: '24' },
              ]"
              compact
            />
          </template>
        </BaseDataState>

        <BaseDataState
          state="loading"
          title="加载状态"
          description="适合表格、列表和详情骨架。"
          loading-text="加载组件数据"
          actions-label="加载状态操作"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">刷新</BaseButton>
          </template>
        </BaseDataState>

        <BaseDataState
          state="empty"
          title="空状态"
          empty-title="没有匹配结果"
          description="暂无符合条件的数据。"
          compact
          empty-actions-label="空状态操作"
        >
          <template #empty="{ interactiveDisabled }">
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">新建组件</BaseButton>
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">重置筛选</BaseButton>
          </template>
        </BaseDataState>

        <BaseDataState
          state="error"
          title="错误状态"
          error-title="加载失败"
          error-message="请检查筛选条件或稍后重试。"
          actions-label="错误状态操作"
          error-extra-label="错误状态附加信息"
          compact
          @retry="triggerToast('已重新加载', 'info')"
        >
          <template #error="{ interactiveDisabled }">
            <BaseBadge type="warning" variant="outline" :disabled="interactiveDisabled">可重试</BaseBadge>
          </template>
        </BaseDataState>

        <BaseDataState
          state="ready"
          title="审计摘要"
          description="muted 表面和大尺寸适合配置确认页。"
          surface="muted"
          size="lg"
          content-label="审计摘要内容"
        >
          <template #default="{ interactiveDisabled }">
            <BaseKeyValueList
              :items="[
                { key: 'status', label: '状态', value: interactiveDisabled ? '锁定' : '已通过', status: interactiveDisabled ? 'neutral' : 'success', icon: 'CircleCheck' },
                { key: 'owner', label: '负责人', value: '组件平台', icon: 'Users' },
              ]"
              :columns="2"
              surface="card"
            />
          </template>
        </BaseDataState>

        <BaseDataState
          state="ready"
          title="Plain 嵌套"
          description="无边框表面适合放入面板正文。"
          surface="plain"
          :bordered="false"
          ready-empty-text="暂无详情内容"
        />

        <BaseDataState
          state="loading"
          title="禁用加载"
          description="流程锁定时保留当前状态但禁止操作。"
          loading-text="等待任务完成"
          actions-label="禁用加载操作"
          disabled
          compact
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">取消任务</BaseButton>
          </template>
        </BaseDataState>

        <div class="data-state-pressure-box">
          <BaseDataState
            state="ready"
            title="非常长的数据状态标题需要在侧栏、抽屉和窄表格详情中稳定换行"
            description="用于验证标题、说明、头部动作、默认内容、徽标和按钮在 320px 容器里不会横向溢出，也不会因为长词或长路径导致布局破坏。"
            compact
            wrap-title
            wrap-description
            actions-label="长文案数据状态操作"
            content-label="长文案数据状态内容"
          >
            <template #actions="{ interactiveDisabled }">
              <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">同步这个非常长的数据视图名称</BaseButton>
            </template>
            <template #default="{ interactiveDisabled }">
              <BaseBadge type="primary" variant="outline" :disabled="interactiveDisabled">workspace/data-state/very-long-resource-label</BaseBadge>
              <BaseBadge type="neutral" variant="outline" :disabled="interactiveDisabled">包含跨页面状态摘要</BaseBadge>
            </template>
          </BaseDataState>
        </div>
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

.filter-pressure-box {
  @apply max-w-[320px] min-w-0;
}

.toolbar-pressure-box {
  @apply max-w-[320px] min-w-0;
}

.selection-pressure-box {
  @apply max-w-[320px] min-w-0;
}

.data-state-pressure-box {
  @apply max-w-[320px] min-w-0;
}

.data-table-pressure-box {
  @apply max-w-[320px] min-w-0;
}
</style>
