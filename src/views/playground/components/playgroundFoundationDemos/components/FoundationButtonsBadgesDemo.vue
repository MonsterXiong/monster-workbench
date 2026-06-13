<script setup lang="ts">
import { ExternalLink, LoaderCircle, Plus } from "lucide-vue-next";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="按钮徽标" subtitle="按钮和徽标是所有业务动作、状态摘要的基础颗粒。" icon="MousePointer">
      <div class="foundation-grid">
        <BasePanel title="按钮语义" subtitle="覆盖主按钮、普通按钮、成功、警告、危险、幽灵和链接形态。">
          <div class="button-demo-row">
            <BaseButton type="primary">保存</BaseButton>
            <BaseButton type="neutral">取消</BaseButton>
            <BaseButton type="success">通过</BaseButton>
            <BaseButton type="warning">提醒</BaseButton>
            <BaseButton type="danger">删除</BaseButton>
            <BaseButton type="ghost">轻量</BaseButton>
            <BaseButton type="link">详情</BaseButton>
          </div>
          <BaseDivider compact />
          <div class="button-demo-row">
            <BaseButton type="primary" size="xs">XS</BaseButton>
            <BaseButton type="primary" size="sm">SM</BaseButton>
            <BaseButton type="primary" size="md">MD</BaseButton>
            <BaseButton type="primary" size="lg">LG</BaseButton>
            <BaseButton type="neutral" outline>轮廓</BaseButton>
            <BaseButton type="primary" loading>保存中</BaseButton>
            <BaseButton type="primary" disabled>禁用</BaseButton>
          </div>
          <BaseDivider compact dashed label="图标与形态" />
          <div class="button-demo-row">
            <BaseButton type="primary" round>
              <template #icon><BaseIcon name="Save" size="14" /></template>
              圆角保存
            </BaseButton>
            <BaseButton type="neutral" outline>
              <template #icon><BaseIcon name="Download" size="14" /></template>
              导出
            </BaseButton>
            <BaseButton type="primary" circle aria-label="新增组件" title="新增组件">
              <template #icon><BaseIcon name="Plus" size="14" /></template>
            </BaseButton>
            <BaseButton type="neutral" circle aria-label="刷新列表" title="刷新列表">
              <template #icon><BaseIcon name="RefreshCw" size="14" /></template>
            </BaseButton>
            <BaseButton type="danger" circle outline aria-label="删除组件" title="删除组件">
              <template #icon><BaseIcon name="Trash2" size="14" /></template>
            </BaseButton>
          </div>
          <BaseDivider compact dashed label="表单按钮" />
          <div class="button-demo-row">
            <BaseButton type="primary" native-type="submit">提交表单</BaseButton>
            <BaseButton type="neutral" native-type="reset" outline>重置</BaseButton>
            <BaseButton type="success" block>整行确认</BaseButton>
          </div>
          <BaseDivider compact dashed label="原生能力" />
          <div class="button-demo-row">
            <BaseButton type="primary" :icon="Plus">原生图标</BaseButton>
            <BaseButton color="#6366f1">品牌色</BaseButton>
            <BaseButton type="primary" loading :loading-icon="LoaderCircle">自定义加载</BaseButton>
            <BaseButton tag="a" href="#/playground" type="link" :icon="ExternalLink">链接标签</BaseButton>
            <BaseButton type="primary" auto-insert-space>保存</BaseButton>
          </div>
        </BasePanel>

        <BasePanel title="徽标状态" subtitle="用于行状态、卡片标签、数量提示和语义摘要.">
          <div class="badge-demo-row">
            <BaseBadge type="primary">Primary</BaseBadge>
            <BaseBadge type="success">Success</BaseBadge>
            <BaseBadge type="warning">Warning</BaseBadge>
            <BaseBadge type="danger">Danger</BaseBadge>
            <BaseBadge type="neutral">Neutral</BaseBadge>
          </div>
          <BaseDivider compact dashed label="形态" />
          <div class="badge-demo-row">
            <BaseBadge type="primary" variant="solid" dot>Solid</BaseBadge>
            <BaseBadge type="success" variant="outline" dot>Outline</BaseBadge>
            <BaseBadge type="warning" size="xs">XS</BaseBadge>
            <BaseBadge type="neutral" size="md">MD</BaseBadge>
          </div>
          <BaseDivider compact dashed label="交互" />
          <div class="badge-demo-row">
            <BaseBadge type="primary" size="lg" clickable title="点击查看筛选" @click="triggerToast('点击了徽标', 'info')">可点击</BaseBadge>
            <BaseBadge type="success" closable close-label="移除已接入标签" @close="triggerToast('徽标已移除', 'info')">可关闭</BaseBadge>
            <BaseBadge type="warning" dot closable close-label="移除风险标签">风险项</BaseBadge>
            <BaseBadge type="danger" disabled closable>禁用关闭</BaseBadge>
            <BaseBadge type="neutral" variant="outline" aria-label="只读状态：归档">归档</BaseBadge>
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

.foundation-grid {
  @apply grid min-w-0 gap-3 xl:grid-cols-2;
}

.button-demo-row,
.badge-demo-row {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}
</style>
