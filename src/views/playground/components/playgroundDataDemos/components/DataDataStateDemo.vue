<script setup lang="ts">
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="数据状态" subtitle="把加载、空态、错误和正常内容收拢成统一的数据状态容器。" icon="CircleDashed">
      <div class="demo-grid">
        <BaseDataState
          state="ready"
          title="正常内容"
          description="ready 状态直接渲染默认插槽。"
          actions-label="正常内容操作"
          content-label="正常内容摘要"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">刷新</BaseButton>
          </template>
          <template #default="{ interactiveDisabled }">
            <BaseDescriptionList
              :items="[
                { key: 'status', label: '状态', value: interactiveDisabled ? '锁定' : '已加载', status: interactiveDisabled ? 'neutral' : 'success' },
                { key: 'count', label: '记录数', value: '24' },
              ]"
              compact
            />
          </template>
        </BaseDataState>

        <BaseDataState
          state="loading"
          title="加载状态"
          description="适合表格、列表和详情骨架。"
          loading-text="加载组件数据"
          actions-label="加载状态操作"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">刷新</BaseButton>
          </template>
        </BaseDataState>

        <BaseDataState
          state="empty"
          title="空状态"
          empty-title="没有匹配结果"
          description="暂无符合条件的数据。"
          compact
          empty-actions-label="空状态操作"
        >
          <template #empty="{ interactiveDisabled }">
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">新建组件</BaseButton>
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">重置筛选</BaseButton>
          </template>
        </BaseDataState>

        <BaseDataState
          state="error"
          title="错误状态"
          error-title="加载失败"
          error-message="请检查筛选条件或稍后重试。"
          actions-label="错误状态操作"
          error-extra-label="错误状态附加信息"
          compact
          @retry="triggerToast('已重新加载', 'info')"
        >
          <template #error="{ interactiveDisabled }">
            <BaseBadge type="warning" variant="outline" :disabled="interactiveDisabled">可重试</BaseBadge>
          </template>
        </BaseDataState>

        <BaseDataState
          state="ready"
          title="审计摘要"
          description="muted 表面和大尺寸适合配置确认页。"
          surface="muted"
          size="lg"
          content-label="审计摘要内容"
        >
          <template #default="{ interactiveDisabled }">
            <BaseKeyValueList
              :items="[
                { key: 'status', label: '状态', value: interactiveDisabled ? '锁定' : '已通过', status: interactiveDisabled ? 'neutral' : 'success', icon: 'CircleCheck' },
                { key: 'owner', label: '负责人', value: '组件平台', icon: 'Users' },
              ]"
              :columns="2"
              surface="card"
            />
          </template>
        </BaseDataState>

        <BaseDataState
          state="ready"
          title="Plain 嵌套"
          description="无边框表面适合放入面板正文。"
          surface="plain"
          :bordered="false"
          ready-empty-text="暂无详情内容"
        />

        <BaseDataState
          state="loading"
          title="禁用加载"
          description="流程锁定时保留当前状态但禁止操作。"
          loading-text="等待任务完成"
          actions-label="禁用加载操作"
          disabled
          compact
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">取消任务</BaseButton>
          </template>
        </BaseDataState>

        <div class="data-state-pressure-box">
          <BaseDataState
            state="ready"
            title="非常长的数据状态标题需要在侧栏、抽屉和窄表格详情中稳定换行"
            description="用于验证标题、说明、头部动作、默认内容、徽标和按钮在 320px 容器里不会横向溢出，也不会因为长词或长路径导致布局破坏。"
            compact
            wrap-title
            wrap-description
            actions-label="长文案数据状态操作"
            content-label="长文案数据状态内容"
          >
            <template #actions="{ interactiveDisabled }">
              <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">同步这个非常长的数据视图名称</BaseButton>
            </template>
            <template #default="{ interactiveDisabled }">
              <BaseBadge type="primary" variant="outline" :disabled="interactiveDisabled">workspace/data-state/very-long-resource-label</BaseBadge>
              <BaseBadge type="neutral" variant="outline" :disabled="interactiveDisabled">包含跨页面状态摘要</BaseBadge>
            </template>
          </BaseDataState>
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

.data-state-pressure-box {
  @apply max-w-[320px] min-w-0;
}
</style>
