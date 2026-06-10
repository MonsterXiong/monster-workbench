<script setup lang="ts">
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const simpleTableColumns = [
  { key: "name", title: "组件", width: "32%" },
  { key: "usage", title: "用途", width: "34%" },
  { key: "status", title: "状态", width: "18%" },
  { key: "owner", title: "维护", width: "16%", align: "right" as const },
];

const simpleTableRows = [
  { name: "BaseButton", usage: "动作入口", status: "稳定", owner: "基础组" },
  { name: "BaseSearchInput", usage: "列表搜索", status: "稳定", owner: "基础组" },
  { name: "BasePagination", usage: "分页导航", status: "新增展示", owner: "数据组" },
  { name: "BaseTable", usage: "轻量表格", status: "待增强", owner: "数据组" },
];

const nestedTableColumns = [
  { key: "name", title: "组件", width: "22%" },
  { key: "meta.version", title: "版本", width: "13%", align: "center" as const },
  { key: "meta.owner", title: "负责人", width: "18%" },
  { key: "meta.trace", title: "追踪标识", wrap: true, ariaLabel: "组件追踪标识" },
];

const nestedTableRows = [
  {
    name: "BaseDescriptionList",
    meta: {
      id: "foundation-description-list",
      version: "0.0.3",
      owner: "基础组",
      trace: "trace://playground/foundation/BaseDescriptionList/long-readable-path-for-wrapping-check",
    },
  },
  {
    name: "BaseKeyValueList",
    meta: {
      id: "foundation-key-value-list",
      version: "0.0.3",
      owner: "基础组",
      trace: "trace://playground/foundation/BaseKeyValueList/sidebar-summary-and-detail-card",
    },
  },
  {
    name: "BaseTable",
    meta: {
      id: "foundation-table",
      version: "0.0.4",
      owner: "数据组",
      trace: "trace://playground/foundation/BaseTable/nested-key-and-long-cell-content",
    },
  },
];
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="轻量表格" subtitle="基础表格适合小型数据、嵌套面板和不需要完整工具条的列表。" icon="Table2">
      <div class="simple-table-grid">
        <BasePanel title="紧凑表格" subtitle="支持自定义单元格、条纹和 hover。">
          <BaseTable
            aria-label="紧凑组件表格"
            :columns="simpleTableColumns"
            :data="simpleTableRows"
            row-key="name"
            :selected-keys="['BasePagination']"
            size="sm"
          >
            <template #name="{ row }">
              <strong class="simple-table-name">{{ row.name }}</strong>
            </template>
            <template #status="{ row }">
              <BaseBadge :type="row.status === '稳定' ? 'success' : row.status === '待增强' ? 'warning' : 'primary'" variant="outline">
                {{ row.status }}
              </BaseBadge>
            </template>
          </BaseTable>
        </BasePanel>
        <BasePanel title="审计表格" subtitle="caption、列对齐、muted 表面和选中行适合确认页。">
          <BaseTable
            caption="组件审计表格"
            :columns="simpleTableColumns"
            :data="simpleTableRows"
            row-key="name"
            :selected-keys="['BaseButton', 'BaseSearchInput']"
            surface="muted"
            size="lg"
            empty-icon="SearchX"
          >
            <template #name="{ row }">
              <strong class="simple-table-name">{{ row.name }}</strong>
            </template>
            <template #owner="{ row }">
              <BaseStatusDot type="primary" :label="row.owner" orientation="horizontal" />
            </template>
          </BaseTable>
        </BasePanel>
        <BasePanel title="长字段表格" subtitle="支持嵌套 key、列级换行和自定义最小宽度。">
          <BaseTable
            aria-label="嵌套字段轻量表格"
            :columns="nestedTableColumns"
            :data="nestedTableRows"
            row-key="meta.id"
            :selected-keys="['foundation-table']"
            min-width="640px"
            size="sm"
          >
            <template #name="{ row }">
              <strong class="simple-table-name">{{ row.name }}</strong>
            </template>
          </BaseTable>
        </BasePanel>
        <BasePanel title="加载与空态" subtitle="轻量表格内置加载骨架和空态。">
          <div class="table-state-stack">
            <BaseTable
              aria-label="加载中的轻量表格"
              :columns="simpleTableColumns.slice(0, 3)"
              :data="[]"
              loading
              loading-text="正在加载组件表格"
              :skeleton-rows="4"
              size="sm"
            />
            <BaseTable aria-label="空轻量表格" :columns="simpleTableColumns.slice(0, 2)" :data="[]" size="sm" empty-text="暂无组件记录" empty-icon="FolderOpen" />
            <BaseTable
              aria-label="禁用 plain 表格"
              :columns="simpleTableColumns.slice(0, 3)"
              :data="simpleTableRows.slice(0, 2)"
              surface="plain"
              :bordered="false"
              :hover="false"
              disabled
              size="sm"
            />
          </div>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.simple-table-grid {
  @apply grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)];
}

.simple-table-name {
  @apply text-xs font-black text-slate-800 dark:text-slate-100;
}

.table-state-stack {
  @apply flex min-w-0 flex-col gap-3;
}
</style>
