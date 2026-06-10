<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import { removeByValue } from "../../../../../utils";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const searchValue = ref("组件");
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

const handleFilterRemove = (filter: { key: string }) => {
  activeFilters.value = removeByValue(activeFilters.value, (item) => item.key, filter.key);
};

const handleFilterClear = () => {
  activeFilters.value = [];
};

const handleSearch = (value: string) => {
  triggerToast(`已执行筛选：${value || "空查询"}`, "info");
};
</script>

<template>
  <section class="detail-stack">
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
</style>
