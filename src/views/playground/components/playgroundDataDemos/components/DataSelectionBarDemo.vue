<script setup lang="ts">
import { ref } from "vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const selectionCount = ref(3);
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="批量操作栏" subtitle="表格、多选列表和文件管理都可以直接复用。" icon="ListChecks">
      <div class="demo-grid">
        <BaseSelectionBar :count="selectionCount" description="批量动作 and 已选上下文固定在同一处。" actions-label="已选组件批量操作" @clear="selectionCount = 0">
          <template #default="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">批量归档</BaseButton>
            <BaseButton type="danger" size="sm" outline :disabled="interactiveDisabled">删除</BaseButton>
          </template>
        </BaseSelectionBar>

        <BaseSelectionBar :count="0" compact description="没有选中项时清空按钮自动禁用。" surface="muted" />

        <BaseSelectionBar
          :count="12"
          label="已勾选资源"
          item-label="个文件"
          description="适合文件管理、资源列表 and 任务队列。"
          clear-text="取消勾选"
          icon="Files"
          size="lg"
          surface="muted"
          actions-label="文件批量操作"
        >
          <template #default="{ interactiveDisabled }">
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">移动到</BaseButton>
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">打标签</BaseButton>
          </template>
        </BaseSelectionBar>

        <BaseSelectionBar
          :count="5"
          description="loading 时清空按钮 and 动作会进入不可用态。"
          loading
          loading-text="批量操作处理中"
          compact
        >
          <template #default="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">处理中</BaseButton>
          </template>
        </BaseSelectionBar>

        <BaseSelectionBar
          :count="3"
          description="plain 表面适合嵌入 BasePanel 内部。"
          surface="plain"
          icon=""
          :show-clear="false"
          aria-label="嵌套批量操作栏"
        >
          <template #default="{ interactiveDisabled }">
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">应用选择</BaseButton>
          </template>
        </BaseSelectionBar>

        <BaseSelectionBar
          :count="2"
          description="禁用态用于权限不足或流程锁定。"
          disabled
          compact
          sticky
        >
          <template #default="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">批量更新</BaseButton>
          </template>
        </BaseSelectionBar>

        <div class="selection-pressure-box">
          <BaseSelectionBar
            :count="128"
            label="已选择非常长的一组跨页面资源 and 待处理组件"
            item-label="条资源记录"
            description="用于验证已选数量、长说明、动作按钮 and 清空按钮在侧栏、抽屉、窄表格底部这类空间不足的场景里不会横向溢出。"
            clear-text="清空这批很长的选择结果"
            icon="ListChecks"
            compact
            wrap-label
            wrap-description
            actions-label="长文案批量操作"
          >
            <template #default="{ interactiveDisabled }">
              <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">执行这个非常长的批量动作名称</BaseButton>
              <BaseBadge type="warning" variant="outline" :disabled="interactiveDisabled">跨页面选择</BaseBadge>
            </template>
          </BaseSelectionBar>
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

.selection-pressure-box {
  @apply max-w-[320px] min-w-0;
}
</style>
