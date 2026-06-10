<script setup lang="ts">
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";
</script>

<template>
  <section class="detail-stack">
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
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.skeleton-demo-grid {
  @apply grid min-w-0 gap-4 lg:grid-cols-2;
}

.skeleton-demo-stack {
  @apply grid min-w-0 gap-3;
}
</style>
