<script setup lang="ts">
import { useLoading } from "../../../composables/useLoading";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const { showLoading, hideLoading } = useLoading();

let loadingTimer: number | undefined;

const triggerGlobalLoading = () => {
  window.clearTimeout(loadingTimer);
  showLoading("正在同步组件状态...");
  loadingTimer = window.setTimeout(() => {
    hideLoading();
  }, 1200);
};
</script>

<template>
  <section v-if="activeComponentKey === 'loading'" class="detail-stack">
    <PlaygroundDemoSection title="加载指示" subtitle="覆盖旋转、圆环、点状和骨架四种常见加载反馈。" icon="LoaderCircle">
      <div class="loading-grid">
        <BasePanel title="Spinner" subtitle="默认加载，适合局部内容刷新。">
          <BaseLoading type="spinner" size="lg" text="加载中" surface="muted" bordered min-height="180px" />
        </BasePanel>
        <BasePanel title="Ring" subtitle="圆环加载，适合状态同步和轻量任务。">
          <BaseLoading type="ring" size="lg" text="同步中" surface="card" bordered min-height="180px" />
        </BasePanel>
        <BasePanel title="Dots" subtitle="点状加载，适合短时间处理。">
          <BaseLoading type="dots" size="lg" text="处理中" surface="plain" min-height="180px" />
        </BasePanel>
        <BasePanel title="Skeleton" subtitle="块状内容预占，可配置行数。">
          <BaseLoading type="skeleton" text="正在载入详情" surface="muted" bordered :skeleton-lines="5" min-height="180px" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>

    <PlaygroundDemoSection title="尺寸与布局" subtitle="不同密度容器里保持视觉比例，也支持行内加载。" icon="MoveHorizontal">
      <BasePanel title="Inline Sizes" subtitle="xs / sm / md / lg">
        <div class="size-row">
          <BaseLoading type="spinner" size="xs" text="XS" direction="horizontal" compact surface="muted" bordered />
          <BaseLoading type="ring" size="sm" text="SM" direction="horizontal" compact surface="muted" bordered />
          <BaseLoading type="dots" size="md" text="MD" direction="horizontal" compact surface="muted" bordered />
          <BaseLoading type="spinner" size="lg" text="LG" direction="horizontal" compact surface="muted" bordered />
        </div>
        <BaseDivider compact />
        <div class="loading-inline-demo">
          <BaseLoading type="spinner" size="sm" text="保存中" direction="horizontal" align="start" compact aria-label="表单正在保存" />
          <BaseLoading type="skeleton" size="sm" text="加载摘要" :skeleton-lines="2" surface="card" bordered compact />
        </div>
      </BasePanel>
    </PlaygroundDemoSection>

    <PlaygroundDemoSection title="全局加载" subtitle="通过 useLoading 触发应用级加载遮罩，适合跨页面长任务。 " icon="MonitorUp">
      <BasePanel title="GlobalLoading" subtitle="宿主组件挂载在 Layout 中，业务侧只调用 composable。">
        <div class="global-loading-row">
          <BaseButton type="primary" @click="triggerGlobalLoading">
            <template #icon><BaseIcon name="LoaderCircle" size="15" /></template>
            触发全局加载
          </BaseButton>
          <BaseAlert type="info" title="功能型组件" description="GlobalLoading 不作为普通局部组件复用，而是应用级遮罩宿主。" compact />
        </div>
      </BasePanel>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'skeleton-card'" class="detail-stack">
    <PlaygroundDemoSection title="骨架卡片" subtitle="列表、详情、卡片加载前提供稳定布局占位。" icon="PanelTop">
      <div class="skeleton-demo-grid">
        <BasePanel title="标准卡片" subtitle="头像、标题、正文和动作区保持稳定结构。">
          <BaseSkeletonCard avatar actions :lines="4" :action-count="2" aria-label="标准卡片加载中" />
        </BasePanel>
        <BasePanel title="紧凑列表" subtitle="适合侧栏、列表行和小卡片。">
          <div class="skeleton-demo-stack">
            <BaseSkeletonCard compact avatar :lines="2" surface="muted" />
            <BaseSkeletonCard compact :lines="3" surface="plain" :bordered="false" />
          </div>
        </BasePanel>
        <BasePanel title="详情占位" subtitle="更多正文行和更大的动作按钮，适合详情页。">
          <BaseSkeletonCard avatar actions :lines="6" :action-count="3" size="lg" surface="muted" aria-label="详情正在加载" />
        </BasePanel>
        <BasePanel title="嵌套占位" subtitle="plain 表面适合放入已有容器内部。">
          <BaseSkeletonCard avatar actions :lines="4" :action-count="1" surface="plain" :bordered="false" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'progress'" class="detail-stack">
    <PlaygroundDemoSection title="进度条" subtitle="任务执行、容量占用、导入导出和发布进度都可以复用。" icon="ChartNoAxesColumnIncreasing">
      <div class="progress-demo-grid">
        <BasePanel title="状态进度" subtitle="不同语义色用于不同任务阶段。" divided>
          <div class="progress-stack">
            <BaseProgress label="类型校验" description="vue-tsc 通过。" :value="100" type="success" surface="muted" bordered />
            <BaseProgress label="架构检查" description="分层红线通过。" :value="100" type="primary" striped />
            <BaseProgress label="视觉复核" description="浏览器验证进行中。" :value="62" type="warning" />
            <BaseProgress label="异常任务" description="失败项需要重新处理。" :value="18" type="danger" size="sm" />
          </div>
        </BasePanel>
        <BasePanel title="缓冲与不确定态" subtitle="适合上传、下载、排队和后台同步。" divided>
          <div class="progress-stack">
            <BaseProgress label="资源上传" description="已上传 42%，本地缓冲 68%。" :value="42" :buffer-value="68" type="primary" striped value-text="42% / 缓冲 68%" />
            <BaseProgress label="等待队列" description="等待远端服务返回执行进度。" :value="0" indeterminate type="neutral" value-text="排队中" />
            <BaseProgress label="容量占用" description="缓存目录已接近上限。" :value="86" type="warning" size="lg" surface="card" bordered />
          </div>
        </BasePanel>
        <BasePanel title="尺寸与禁用" subtitle="紧凑条适合列表，禁用态适合锁定流程。" divided>
          <div class="progress-stack">
            <BaseProgress label="XS 细条" :value="35" size="xs" :show-value="false" aria-label="XS 细条进度" />
            <BaseProgress label="紧凑任务" description="用于表格行和侧栏摘要。" :value="54" size="sm" compact surface="muted" bordered />
            <BaseProgress label="流程锁定" description="权限不足时保留当前进度。" :value="72" type="neutral" disabled />
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

.demo-grid,
.loading-grid {
  @apply grid min-w-0 gap-4 lg:grid-cols-2;
}

.loading-grid {
  @apply xl:grid-cols-4;
}

.size-row {
  @apply grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4;
}

.loading-inline-demo {
  @apply grid min-w-0 gap-3 lg:grid-cols-[220px_minmax(0,1fr)];
}

.skeleton-demo-grid {
  @apply grid min-w-0 gap-4 lg:grid-cols-2;
}

.skeleton-demo-stack {
  @apply grid min-w-0 gap-3;
}

.progress-stack {
  @apply flex min-w-0 flex-col gap-4;
}

.progress-demo-grid {
  @apply grid min-w-0 gap-4 xl:grid-cols-3;
}

.global-loading-row {
  @apply flex min-w-0 flex-wrap items-center gap-3;
}
</style>
