<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../composables/useToast";
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

const detailItems = [
  { key: "category", label: "组件分类", value: "数据展示", status: "primary" as const },
  { key: "owner", label: "负责人", value: "组件平台", status: "success" as const },
  { key: "density", label: "默认密度", value: "标准 / 紧凑" },
  { key: "usage", label: "高频场景", value: "列表页、详情页、资源管理" },
];

const handleFilterRemove = (filter: { key: string }) => {
  activeFilters.value = activeFilters.value.filter((item) => item.key !== filter.key);
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
          @search="handleSearch"
          @remove-filter="handleFilterRemove"
          @clear="handleFilterClear"
        >
          <template #actions>
            <BaseButton type="primary" size="sm">
              <template #icon><BaseIcon name="Plus" size="14" /></template>
              新建筛选
            </BaseButton>
          </template>
          <template #filters>
            <BaseBadge type="primary" variant="outline">高频组件</BaseBadge>
            <BaseBadge type="success" variant="outline">已接入</BaseBadge>
            <BaseButton type="neutral" size="sm">更多条件</BaseButton>
          </template>
        </BaseFilterBar>

        <BaseFilterBar
          v-model:search-value="searchValue"
          compact
          title="快速筛选"
          description="侧栏、抽屉和窄表格顶部更适合这种密度。"
          search-placeholder="快速筛选"
          :filters="activeFilters.slice(0, 2)"
          :count="8"
          surface="muted"
        />

        <BaseFilterBar
          title="条件摘要"
          description="不需要搜索框时，只展示筛选结果与动作。"
          :filters="activeFilters.slice(0, 2)"
          :count="2"
          count-label="个条件"
          :show-search="false"
          size="lg"
          surface="muted"
        >
          <template #actions>
            <BaseButton type="neutral" size="sm">保存视图</BaseButton>
          </template>
          <template #filters>
            <BaseBadge type="primary" variant="outline">已保存视图</BaseBadge>
          </template>
        </BaseFilterBar>

        <BaseFilterBar
          title="加载筛选"
          description="异步加载筛选条件时锁定输入与清空动作。"
          search-placeholder="加载中"
          :filters="activeFilters.slice(0, 1)"
          loading
          compact
        />

        <BaseFilterBar
          title="禁用筛选"
          description="权限不足或流程锁定时保持当前筛选可见。"
          :filters="activeFilters.slice(0, 2)"
          disabled
          compact
        />

        <BaseFilterBar
          title="Plain 嵌套筛选"
          description="无边框表面适合嵌入面板正文。"
          :filters="[]"
          surface="plain"
          :divided="false"
          :show-summary-when-empty="false"
          aria-label="嵌套筛选条"
        />
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
          status-type="success"
          meta="updated 2026-06-08"
          :items="detailItems"
          size="lg"
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
          status-type="primary"
          meta="clickable"
          :items="detailItems.slice(0, 2)"
          clickable
          @click="triggerToast('打开详情卡片', 'info')"
        >
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
          loading
        >
          <BaseSkeletonCard compact />
        </BaseDetailCard>

        <BaseDetailCard
          title="禁用详情"
          description="权限不足时保留摘要，但禁止点击入口。"
          icon="Lock"
          status="只读"
          status-type="neutral"
          :items="detailItems.slice(0, 2)"
          disabled
          clickable
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
        @page-change="handlePageChange"
      >
        <template #meta>
          <BaseBadge type="success" dot>运行中</BaseBadge>
        </template>
        <template #actions>
          <BaseButton type="neutral" size="sm">导出</BaseButton>
          <BaseButton type="primary" size="sm">新增</BaseButton>
        </template>
        <template #filters>
          <BaseBadge type="primary" variant="outline">数据展示</BaseBadge>
          <BaseBadge type="neutral" variant="outline">最近更新</BaseBadge>
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
        loading
      />
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
        />
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'table-toolbar'" class="detail-stack">
    <PlaygroundDemoSection title="列表工具栏" subtitle="统一列表页身份、统计感知和顶部动作。" icon="Table2">
      <div class="demo-grid">
        <BaseTableToolbar title="组件列表" description="适合放在列表页、表格页和资源管理页顶部。" :count="24">
          <template #meta>
            <BaseBadge type="success" dot>已接入</BaseBadge>
          </template>
          <template #actions>
            <BaseButton type="neutral" size="sm">刷新</BaseButton>
            <BaseButton type="primary" size="sm">新增组件</BaseButton>
          </template>
          <BaseBadge type="primary" variant="outline">最近同步</BaseBadge>
          <BaseBadge type="neutral" variant="outline">包含 10 个分类</BaseBadge>
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
          <template #actions>
            <BaseButton type="neutral" size="sm">清空</BaseButton>
          </template>
          <BaseBadge type="primary" variant="outline">数据展示</BaseBadge>
          <BaseBadge type="success" variant="outline">已同步</BaseBadge>
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
          <template #meta>
            <BaseStatusDot type="primary" label="Plain" orientation="horizontal" />
          </template>
          <template #actions>
            <BaseButton type="primary" size="sm">应用</BaseButton>
          </template>
        </BaseTableToolbar>

        <BaseTableToolbar
          title="加载中"
          description="异步列表初始化时保留标题区和动作区域。"
          :count="0"
          icon="LoaderCircle"
          loading
        >
          <template #actions>
            <BaseButton type="neutral" size="sm" disabled>刷新</BaseButton>
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
          <template #actions>
            <BaseButton type="primary" size="sm">保存</BaseButton>
          </template>
          <BaseBadge type="neutral" variant="outline">只读</BaseBadge>
        </BaseTableToolbar>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'selection-bar'" class="detail-stack">
    <PlaygroundDemoSection title="批量操作栏" subtitle="表格、多选列表和文件管理都可以直接复用。" icon="ListChecks">
      <div class="demo-grid">
        <BaseSelectionBar :count="selectionCount" description="批量动作和已选上下文固定在同一处。" @clear="selectionCount = 0">
          <BaseButton type="neutral" size="sm">批量归档</BaseButton>
          <BaseButton type="danger" size="sm" outline>删除</BaseButton>
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
        >
          <BaseButton type="primary" size="sm">移动到</BaseButton>
          <BaseButton type="neutral" size="sm">打标签</BaseButton>
        </BaseSelectionBar>

        <BaseSelectionBar
          :count="5"
          description="loading 时清空按钮和动作会进入不可用态。"
          loading
          compact
        >
          <BaseButton type="neutral" size="sm" disabled>处理中</BaseButton>
        </BaseSelectionBar>

        <BaseSelectionBar
          :count="3"
          description="plain 表面适合嵌入 BasePanel 内部。"
          surface="plain"
          icon=""
          :show-clear="false"
          aria-label="嵌套批量操作栏"
        >
          <BaseButton type="primary" size="sm">应用选择</BaseButton>
        </BaseSelectionBar>

        <BaseSelectionBar
          :count="2"
          description="禁用态用于权限不足或流程锁定。"
          disabled
          compact
          sticky
        >
          <BaseButton type="neutral" size="sm">批量更新</BaseButton>
        </BaseSelectionBar>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'data-state'" class="detail-stack">
    <PlaygroundDemoSection title="数据状态" subtitle="把加载、空态、错误和正常内容收拢成统一的数据状态容器。" icon="CircleDashed">
      <div class="demo-grid">
        <BaseDataState state="ready" title="正常内容" description="ready 状态直接渲染默认插槽。">
          <template #actions>
            <BaseButton type="neutral" size="sm">刷新</BaseButton>
          </template>
          <BaseDescriptionList
            :items="[
              { key: 'status', label: '状态', value: '已加载', status: 'success' },
              { key: 'count', label: '记录数', value: '24' },
            ]"
            compact
          />
        </BaseDataState>
        <BaseDataState state="loading" title="加载状态" description="适合表格、列表和详情骨架。" loading-text="加载组件数据" />
        <BaseDataState state="empty" title="空状态" empty-title="没有匹配结果" description="暂无符合条件的数据。" compact />
        <BaseDataState
          state="error"
          title="错误状态"
          error-title="加载失败"
          error-message="请检查筛选条件或稍后重试。"
          compact
          @retry="triggerToast('已重新加载', 'info')"
        />
        <BaseDataState state="ready" title="审计摘要" description="muted 表面和大尺寸适合配置确认页。" surface="muted" size="lg">
          <BaseKeyValueList
            :items="[
              { key: 'status', label: '状态', value: '已通过', status: 'success', icon: 'CircleCheck' },
              { key: 'owner', label: '负责人', value: '组件平台', icon: 'Users' },
            ]"
            :columns="2"
            surface="card"
          />
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
          disabled
          compact
        />
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
</style>
