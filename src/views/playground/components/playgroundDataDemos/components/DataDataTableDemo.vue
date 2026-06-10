<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const tablePage = ref(1);
const tablePageSize = ref(10);

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

const handlePageChange = (payload: { page: number; pageSize: number }) => {
  triggerToast(`分页切换：第 ${payload.page} 页 / ${payload.pageSize} 条`, "info");
};
</script>

<template>
  <section class="detail-stack">
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
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}

.data-table-pressure-box {
  @apply max-w-[320px] min-w-0;
}
</style>
