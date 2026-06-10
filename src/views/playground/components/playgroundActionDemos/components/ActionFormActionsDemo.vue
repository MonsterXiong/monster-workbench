<script setup lang="ts">
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="表单动作栏" subtitle="说明区、状态区和按钮区的职责更清晰。" icon="PanelBottomOpen">
      <div class="demo-grid">
        <BasePanel title="模型参数" subtitle="适合与 BaseForm、BaseFieldGroup、BasePanel 组合。">
          <div class="form-actions-sticky-demo">
            <div class="form-actions-sticky-demo__content">
              <BaseList
                :items="[
                  { id: 'model', title: '模型名称', meta: 'gpt-image-2' },
                  { id: 'timeout', title: '超时策略', meta: '86400s' },
                  { id: 'queue', title: '队列模式', meta: '并发' },
                  { id: 'review', title: '审核状态', meta: '待保存' },
                ]"
                variant="plain"
                simple
                :bordered="false"
              />
            </div>
            <BaseFormActions
              sticky
              surface="default"
              title="待保存修改"
              description="滚动较长时保持操作入口稳定。"
              justify="end"
              actions-label="模型参数操作"
              meta-label="保存状态"
            >
              <template #meta>
                <BaseStatusDot type="warning" label="有 3 项变更" description="尚未保存" />
              </template>
              <BaseButton type="neutral" size="sm">取消</BaseButton>
              <BaseButton type="primary" size="sm">保存配置</BaseButton>
            </BaseFormActions>
          </div>
        </BasePanel>

        <BasePanel title="紧凑动作" subtitle="抽屉、侧栏和小表单使用 compact。">
          <BaseFormActions compact surface="muted" title="字段动作" description="用于局部配置保存。" justify="between" actions-label="字段动作">
            <BaseButton type="ghost" size="sm">重置</BaseButton>
            <BaseButton type="primary" size="sm">应用</BaseButton>
          </BaseFormActions>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="加载锁定" subtitle="异步保存时锁定内容区，保留状态反馈。">
          <BaseFormActions loading loading-text="正在保存权限策略" surface="default" title="保存中" description="按钮区不可交互，状态仍可被读到。">
            <template #meta>
              <BaseBadge type="warning" variant="outline">处理中</BaseBadge>
            </template>
            <BaseButton type="neutral" size="sm">返回</BaseButton>
            <BaseButton type="primary" size="sm">保存</BaseButton>
          </BaseFormActions>
        </BasePanel>

        <BasePanel title="窄容器堆叠" subtitle="长文案和按钮在窄侧栏内不撑破布局。">
          <div class="form-actions-narrow-demo">
            <BaseFormActions
              surface="muted"
              wrap-text
              title="同步一个跨工作区且名称很长的组件配置"
              description="用于验证标题、描述和操作按钮在受限宽度内自动换行和堆叠。"
              justify="end"
              actions-label="窄容器操作"
            >
              <BaseButton type="neutral" size="sm">稍后处理</BaseButton>
              <BaseButton type="primary" size="sm">立即同步</BaseButton>
            </BaseFormActions>
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
  @apply grid gap-4 lg:grid-cols-2;
}

.form-actions-sticky-demo {
  @apply max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950;
}

.form-actions-sticky-demo__content {
  @apply min-h-44 pb-3;
}

.form-actions-narrow-demo {
  @apply max-w-72 min-w-0;
}
</style>
