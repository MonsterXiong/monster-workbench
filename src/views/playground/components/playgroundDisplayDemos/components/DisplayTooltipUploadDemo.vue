<script setup lang="ts">
import { ref } from "vue";
import BaseTooltip from "../../../../../components/common/BaseTooltip.vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const controlledTooltipOpen = ref(false);
const tooltipEventText = ref("等待事件");
const instanceTooltipRef = ref<InstanceType<typeof BaseTooltip> | null>(null);
const tooltipMethodText = ref("等待实例方法触发");

const updateTooltipEvent = (eventName: string) => {
  tooltipEventText.value = eventName;
};

const openTooltipViaRef = () => {
  tooltipMethodText.value = "通过 open() 打开提示";
  instanceTooltipRef.value?.open();
};

const readTooltipElement = () => {
  tooltipMethodText.value = instanceTooltipRef.value?.getElement()
    ? "已读取提示触发节点"
    : "提示触发节点尚未挂载";
};

const updateTooltipPopper = () => {
  tooltipMethodText.value = "已调用 updatePopper()";
  instanceTooltipRef.value?.updatePopper();
};

const closeTooltipViaRef = () => {
  tooltipMethodText.value = "通过 close() 关闭提示";
  instanceTooltipRef.value?.close();
};
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

        <BasePanel title="触发与外观" subtitle="复用 Element Plus 触发、对齐、箭头和浅色提示能力。">
          <div class="tooltip-row">
            <BaseTooltip content="点击触发，再次点击或点击外部关闭。" trigger="click" placement="top-start" :show-delay="0">
              <BaseButton type="neutral" size="sm">Click</BaseButton>
            </BaseTooltip>
            <BaseTooltip content="右键菜单提示适合高级操作说明。" trigger="contextmenu" placement="right-start" multiline>
              <BaseButton type="neutral" size="sm">Context</BaseButton>
            </BaseTooltip>
            <BaseTooltip content="浅色提示用于低干扰说明。" effect="light" placement="bottom-end">
              <BaseButton type="neutral" size="sm">Light</BaseButton>
            </BaseTooltip>
            <BaseTooltip content="无箭头提示适合贴近图标按钮的紧凑场景。" placement="bottom-start" :show-arrow="false">
              <BaseButton type="neutral" size="sm">No arrow</BaseButton>
            </BaseTooltip>
            <BaseTooltip
              content="自动关闭提示适合临时引导，不需要业务侧手动收起。"
              trigger="click"
              placement="top-end"
              :show-delay="0"
              :auto-close="1800"
            >
              <BaseButton type="primary" size="sm">Auto close</BaseButton>
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

        <BasePanel title="原生透传与实例" subtitle="补齐 appendTo、popper 样式、键盘触发、生命周期事件和公开实例方法。">
          <div class="tooltip-native-demo">
            <div class="tooltip-row">
              <BaseTooltip
                content="这个提示通过 popperClass / popperStyle 接入业务样式，同时继续保持项目主题。"
                placement="top"
                effect="light"
                popper-class="base-tooltip-demo-popper"
                :popper-style="{ maxWidth: '280px' }"
                :trigger-keys="['Enter', 'Space']"
                append-to="body"
                multiline
                @before-show="updateTooltipEvent('before-show')"
                @show="updateTooltipEvent('show')"
                @before-hide="updateTooltipEvent('before-hide')"
                @hide="updateTooltipEvent('hide')"
              >
                <BaseButton type="primary" size="sm">事件提示</BaseButton>
              </BaseTooltip>
              <BaseBadge type="neutral" variant="outline">{{ tooltipEventText }}</BaseBadge>
            </div>
            <BaseDivider compact dashed label="实例能力" />
            <div class="tooltip-row">
              <BaseTooltip
                ref="instanceTooltipRef"
                data-native-tooltip-ref="base-tooltip-instance"
                content="这个提示通过组件公开方法打开、更新位置和关闭。"
                placement="bottom"
                effect="light"
                trigger="click"
                :show-delay="0"
                multiline
              >
                <BaseButton type="neutral" size="sm" outline>实例提示</BaseButton>
              </BaseTooltip>
              <BaseBadge type="neutral" variant="outline">{{ tooltipMethodText }}</BaseBadge>
            </div>
            <div class="tooltip-native-demo__actions">
              <BaseButton type="neutral" size="sm" outline @click="openTooltipViaRef">实例打开</BaseButton>
              <BaseButton type="neutral" size="sm" outline @click="readTooltipElement">读取 DOM</BaseButton>
              <BaseButton type="neutral" size="sm" outline @click="updateTooltipPopper">更新位置</BaseButton>
              <BaseButton type="neutral" size="sm" outline @click="closeTooltipViaRef">实例关闭</BaseButton>
            </div>
            <BaseAlert
              type="info"
              title="保持统一入口"
              description="业务侧只使用 BaseTooltip API；定位、键盘和浮层样式由 Element Plus 底座承接。"
              compact
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

.tooltip-native-demo {
  @apply grid min-w-0 gap-3;
}

.tooltip-native-demo__actions {
  @apply flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950;
}

:global(.base-tooltip-demo-popper.el-popper) {
  border-color: rgb(var(--color-primary) / 0.2);
  box-shadow: 0 16px 34px rgba(37, 99, 235, 0.14);
}
</style>
