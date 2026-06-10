<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const searchValue = ref("组件");
const resetOnlySearchValue = ref("清空仅重置输入");
const foundationPage = ref(2);
const foundationPageSize = ref(20);

const handleSearch = (value: string) => {
  triggerToast(`已执行筛选：${value || "空查询"}`, "info");
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="搜索分页" subtitle="列表页、弹窗选择器和资源管理页最常用的检索组合。" icon="Search">
      <BasePanel title="检索结果" subtitle="搜索输入支持清空、加载、回车搜索；分页支持页码和页容量切换。">
        <p id="search-keyboard-hint" class="sr-only">搜索框支持回车提交，Escape 清空当前关键词。</p>
        <div class="search-pagination-demo">
          <BaseSearchInput
            id="component-search-input"
            name="componentSearch"
            v-model="searchValue"
            placeholder="搜索组件、分类或状态"
            autocomplete="off"
            enterkeyhint="search"
            spellcheck="false"
            aria-describedby="search-keyboard-hint"
            @search="handleSearch"
            @clear="triggerToast('搜索已清空', 'info')"
          />
          <BaseSearchInput model-value="加载中" placeholder="加载态" loading loading-text="正在搜索组件" />
          <BaseSearchInput
            model-value="错误关键词"
            label="错误搜索"
            placeholder="错误态"
            error
            error-message="关键词包含暂不支持的特殊字符。"
            clear-text="清空错误关键词"
          />
          <BaseSearchInput model-value="只读查询" placeholder="只读态" readonly surface="muted" />
          <BaseSearchInput model-value="禁用查询" placeholder="禁用态带值" disabled />
          <BaseSearchInput
            v-model="searchValue"
            placeholder="即时搜索"
            search-on-input
            surface="plain"
            :clearable="false"
            :debounce="260"
            :min-length="2"
            trim-on-input-search
            @search="triggerToast(`即时搜索：${$event || '空查询'}`, 'info')"
          >
            <template #suffix>
              <BaseBadge type="primary" variant="outline">Live</BaseBadge>
            </template>
          </BaseSearchInput>
          <BaseSearchInput
            model-value="  前后有空格  "
            placeholder="回车搜索会裁剪空白"
            clear-text="清空裁剪搜索"
            @search="triggerToast(`搜索值：${$event || '空查询'}`, 'info')"
          />
          <BaseSearchInput v-model="searchValue" placeholder="后缀与清空共存" clear-text="清空后缀搜索">
            <template #suffix>
              <BaseBadge type="success" variant="outline">Enter 提交长后缀</BaseBadge>
            </template>
          </BaseSearchInput>
          <BaseSearchInput v-model="searchValue" placeholder="带前缀搜索" size="lg" surface="muted">
            <template #prefix>
              <BaseIcon name="Command" size="14" class="text-slate-400" aria-hidden="true" />
            </template>
          </BaseSearchInput>
          <BaseSearchInput
            v-model="resetOnlySearchValue"
            placeholder="清空不触发搜索"
            clear-text="仅清空输入"
            :search-on-clear="false"
            @clear="triggerToast('只触发 clear，不触发 search', 'info')"
            @search="triggerToast('这条不应由清空触发', 'warning')"
          />
          <div class="search-demo-narrow">
            <BaseSearchInput
              model-value="组件平台资源编排"
              placeholder="非常长的搜索占位文案会保持输入与清空按钮稳定"
              size="sm"
              clear-text="清空长文案搜索"
              aria-label="窄容器搜索"
            />
          </div>
        </div>
        <BaseDivider compact />
        <div class="pagination-demo-stack">
          <BasePagination
            v-model:page="foundationPage"
            v-model:page-size="foundationPageSize"
            :total="128"
            show-edges
            aria-label="完整分页"
            @change="triggerToast(`分页：${$event.page} / ${$event.pageSize}`, 'info')"
          />
          <BasePagination
            :page="18"
            :page-size="25"
            :page-size-options="[10, 20, 50]"
            :total="980"
            show-edges
            :sibling-count="2"
            size="lg"
            aria-label="长列表分页"
          />
          <BasePagination
            v-model:page="foundationPage"
            v-model:page-size="foundationPageSize"
            :total="42"
            compact
            surface="muted"
            :show-page-size="false"
          />
          <BasePagination
            v-model:page="foundationPage"
            v-model:page-size="foundationPageSize"
            :total="128"
            simple
            surface="plain"
            :show-summary="false"
          />
          <BasePagination
            v-model:page="foundationPage"
            v-model:page-size="foundationPageSize"
            :total="0"
            loading
            loading-text="正在加载分页"
            size="lg"
          />
          <BasePagination
            :page="4"
            :page-size="20"
            :total="128"
            loading
            loading-text="正在同步列表"
            show-edges
            surface="muted"
            aria-label="非空加载分页"
          />
          <BasePagination
            :page="1"
            :page-size="10"
            :total="0"
            disabled
            compact
            :show-page-size="false"
          />
          <BasePagination
            :page="12"
            :page-size="20"
            :total="0"
            show-edges
            surface="muted"
            aria-label="空结果分页"
          />
          <BasePagination
            :page="999"
            :page-size="10"
            :page-size-options="[10, 10, 0, -5, 20]"
            :total="42"
            show-edges
            surface="plain"
            aria-label="越界页码分页"
          />
          <div class="pagination-demo-narrow">
            <BasePagination
              :page="-4"
              :page-size="12"
              :page-size-options="[]"
              :total="96"
              compact
              show-edges
              aria-label="窄容器分页"
            />
          </div>
        </div>
      </BasePanel>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.search-pagination-demo {
  @apply grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_260px];
}

.search-demo-narrow {
  @apply max-w-[280px] min-w-0;
}

.pagination-demo-stack {
  @apply grid min-w-0 gap-3;
}

.pagination-demo-narrow {
  @apply max-w-[320px] min-w-0;
}
</style>
