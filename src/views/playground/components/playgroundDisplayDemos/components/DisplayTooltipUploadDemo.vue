<script setup lang="ts">
import { ref } from "vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const controlledTooltipOpen = ref(true);
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="悬浮提示" subtitle="工具提示补充短说明，支持方向、禁用、受控打开、视口避让和多行文案。" icon="MessageCircleQuestion">
      <div class="demo-grid">
        <BasePanel title="基础方向" subtitle="hover 或 focus 都会打开，Escape 可关闭当前提示。">
          <div class="tooltip-row">
            <BaseTooltip content="顶部提示">
              <template #default="{ tooltipId }">
                <BaseButton type="neutral" size="sm" :aria-describedby="tooltipId">Top</BaseButton>
              </template>
            </BaseTooltip>
            <BaseTooltip content="右侧提示支持长文案换行，适合解释紧凑图标按钮。" placement="right" multiline>
              <BaseButton type="neutral" size="sm">Right</BaseButton>
            </BaseTooltip>
            <BaseTooltip content="底部提示" placement="bottom">
              <template #default="{ tooltipId }">
                <BaseButton type="neutral" size="sm" :aria-describedby="tooltipId">Bottom</BaseButton>
              </template>
            </BaseTooltip>
            <BaseTooltip content="左侧提示" placement="left">
              <BaseButton type="neutral" size="sm">Left</BaseButton>
            </BaseTooltip>
            <BaseTooltip content="禁用提示" disabled>
              <BaseButton type="neutral" size="sm">Disabled</BaseButton>
            </BaseTooltip>
          </div>
        </BasePanel>

        <BasePanel title="裁切容器" subtitle="提示层 Teleport 到 body，不会被 overflow 容器裁掉。">
          <div class="tooltip-clip-demo">
            <BaseTooltip
              content="这个提示来自 overflow hidden 容器内部，浮层应该完整显示，并且靠近视口边缘时自动避让。"
              placement="right"
              multiline
              :max-width="260"
            >
              <BaseButton type="primary" size="sm">容器内按钮</BaseButton>
            </BaseTooltip>
          </div>
        </BasePanel>

        <BasePanel title="受控状态" subtitle="业务侧可以通过 v-model:open 驱动提示显隐。">
          <div class="tooltip-row">
            <BaseButton type="neutral" size="sm" @click="controlledTooltipOpen = !controlledTooltipOpen">
              {{ controlledTooltipOpen ? "关闭提示" : "打开提示" }}
            </BaseButton>
            <BaseTooltip
              v-model:open="controlledTooltipOpen"
              content="受控提示可用于新手引导、局部状态说明和首次进入页面时的轻提示。"
              placement="bottom"
              multiline
              :show-delay="0"
              :hide-delay="0"
            >
              <BaseBadge type="primary" variant="outline">受控入口</BaseBadge>
            </BaseTooltip>
          </div>
        </BasePanel>

        <BasePanel title="窄容器长文案" subtitle="长文案会按最大宽度换行，不撑破内容区。">
          <div class="tooltip-narrow-demo">
            <BaseTooltip
              placement="bottom"
              multiline
              :max-width="220"
              content="非常长的解释文案用于说明某个高频图标按钮的作用、风险和触发时机，窄容器下也需要稳定换行。"
            >
              <BaseButton type="neutral" size="sm">长文案提示</BaseButton>
            </BaseTooltip>
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

.demo-grid {
  @apply grid items-start gap-4 lg:grid-cols-2;
}

.tooltip-row {
  @apply flex min-w-0 flex-wrap items-center gap-3;
}

.tooltip-clip-demo {
  @apply flex h-24 max-w-[220px] items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950;
}

.tooltip-narrow-demo {
  @apply w-full max-w-[180px];
}
</style>
