<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import { useLoading } from "../../../composables/useLoading";
import { clearTimeoutHandle, resetTimeoutHandle, type TimeoutHandle } from "../../../utils";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const { showLoading, hideLoading } = useLoading();

let loadingTimer: TimeoutHandle | null = null;

const triggerGlobalLoading = () => {
  showLoading("正在同步组件状态...");
  loadingTimer = resetTimeoutHandle(loadingTimer, () => {
    hideLoading();
    loadingTimer = null;
  }, 1200);
};

onBeforeUnmount(() => {
  clearTimeoutHandle(loadingTimer);
  loadingTimer = null;
});
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

    <PlaygroundDemoSection title="语义与展示控制" subtitle="语义色、说明、静态动画和延迟显示适合更细的加载反馈。" icon="SlidersHorizontal">
      <div class="loading-control-grid">
        <BasePanel title="语义状态" subtitle="不同任务阶段可以使用不同 tone。">
          <div class="loading-tone-grid">
            <BaseLoading type="spinner" tone="primary" text="同步中" direction="horizontal" compact surface="muted" bordered />
            <BaseLoading type="ring" tone="success" text="已连接" direction="horizontal" compact surface="muted" bordered />
            <BaseLoading type="dots" tone="warning" text="重试中" direction="horizontal" compact surface="muted" bordered />
            <BaseLoading type="spinner" tone="danger" text="恢复中" direction="horizontal" compact surface="muted" bordered />
          </div>
        </BasePanel>
        <BasePanel title="显示控制" subtitle="可隐藏指示器或文案，保留可访问名称。">
          <div class="loading-inline-demo">
            <BaseLoading
              type="spinner"
              text="正在比对长任务状态"
              description="只展示文案和说明，适合已有图标的标题区。"
              :show-indicator="false"
              wrap-text
              surface="muted"
              bordered
              compact
            />
            <BaseLoading type="ring" tone="neutral" :show-text="false" aria-label="静默同步中" surface="muted" bordered compact />
          </div>
        </BasePanel>
        <BasePanel title="延迟与低动效" subtitle="避免闪烁，也支持关闭动画。">
          <div class="loading-inline-demo">
            <BaseLoading type="dots" text="延迟显示" description="短任务可设置 delay 避免一闪而过。" :delay="120" direction="horizontal" compact surface="muted" bordered />
            <BaseLoading type="skeleton" text="静态骨架" :skeleton-lines="3" :animated="false" surface="card" bordered compact />
          </div>
        </BasePanel>
      </div>
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
        <BasePanel title="封面卡片" subtitle="媒体占位适合图文卡、资源预览和详情页头图。">
          <BaseSkeletonCard media media-ratio="wide" avatar avatar-shape="square" actions action-align="between" :lines="3" surface="muted" />
        </BasePanel>
        <BasePanel title="紧凑列表" subtitle="适合侧栏、列表行和小卡片。">
          <div class="skeleton-demo-stack">
            <BaseSkeletonCard compact avatar :lines="2" surface="muted" />
            <BaseSkeletonCard compact :title-lines="1" :lines="3" surface="plain" :bordered="false" />
          </div>
        </BasePanel>
        <BasePanel title="详情占位" subtitle="更多正文行和更大的动作按钮，适合详情页。">
          <BaseSkeletonCard avatar actions :lines="6" :action-count="3" size="lg" surface="muted" aria-label="详情正在加载" />
        </BasePanel>
        <BasePanel title="无头部内容" subtitle="嵌入已有标题区时只保留正文骨架。">
          <BaseSkeletonCard :show-header="false" :lines="5" actions action-align="start" surface="plain" :bordered="false" />
        </BasePanel>
        <BasePanel title="静态占位" subtitle="列表首屏或低动效场景可关闭动画。">
          <BaseSkeletonCard media media-ratio="video" :lines="4" :title-lines="1" :action-count="1" actions :animated="false" />
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
        <BasePanel title="长文案与内嵌值" subtitle="支持区间、精度、换行和轨道内数值。" divided>
          <div class="progress-stack">
            <BaseProgress
              label="跨环境资源初始化进度会在标题较长时自动换行并保持数值区稳定"
              description="适合导入、发布、迁移这类说明较长的任务，说明最多显示两行，避免把面板撑得过高。"
              :value="37.6"
              :min="20"
              :max="80"
              :precision="1"
              wrap-label
              wrap-description
              surface="muted"
              bordered
            />
            <BaseProgress
              label="发布流水线"
              description="轨道内展示当前百分比，适合空间较紧的任务行。"
              :value="72"
              type="success"
              size="lg"
              value-placement="track"
              aria-value-text="发布流水线进度 72%，预计 2 分钟完成"
            />
            <BaseProgress
              label="导入任务"
              description="头部和轨道同时显示，用于强调关键任务。"
              :value="48"
              type="primary"
              size="lg"
              striped
              value-placement="both"
              value-text="48% 已导入"
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

.loading-control-grid {
  @apply grid min-w-0 gap-4 xl:grid-cols-3;
}

.loading-tone-grid {
  @apply grid min-w-0 gap-3 sm:grid-cols-2;
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
  @apply grid min-w-0 gap-4 xl:grid-cols-2;
}

.global-loading-row {
  @apply flex min-w-0 flex-wrap items-center gap-3;
}
</style>
