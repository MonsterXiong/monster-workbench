<script setup lang="ts">
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const avatarImageSrc =
  "data:image/svg+xml;utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Crect%20width='64'%20height='64'%20rx='18'%20fill='%232563eb'/%3E%3Ccircle%20cx='32'%20cy='25'%20r='12'%20fill='white'%20opacity='.92'/%3E%3Cpath%20d='M13%2058c3-15%2013-23%2019-23s16%208%2019%2023'%20fill='white'%20opacity='.78'/%3E%3C/svg%3E";
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="头像分隔" subtitle="成员身份、状态点和内容区分隔是详情页和协作区高频组合。" icon="Users">
      <div class="demo-grid">
        <BasePanel title="协作成员" subtitle="覆盖尺寸、姓名首字母、图片、状态点和可点击入口。">
          <div class="avatar-row">
            <BaseAvatar name="刘雄成" status="online" size="xl" clickable @click="triggerToast('打开刘雄成资料', 'info')" />
            <BaseAvatar name="Design System" status="busy" size="lg" />
            <BaseAvatar name="AI" status="offline" size="sm" />
            <BaseAvatar name="Q" size="xs" status="none" />
            <BaseBadge type="success" variant="outline">在线</BaseBadge>
          </div>
          <BaseDivider label="图片与兜底" />
          <div class="avatar-row">
            <BaseAvatar name="组件平台" :src="avatarImageSrc" alt="组件平台头像" status="online" size="lg" shape="rounded" />
            <BaseAvatar name="Broken Image" src="data:image/png;base64,broken" status="busy" fallback="BI" />
            <BaseAvatar name="加载头像" loading status="online" />
            <BaseAvatar name="禁用头像" disabled status="offline" />
          </div>
        </BasePanel>

        <BasePanel title="头像组" subtitle="列表、详情页、审批人和协作成员常用重叠展示。">
          <div class="avatar-stack" aria-label="协作成员头像组">
            <BaseAvatar name="刘雄成" status="online" />
            <BaseAvatar name="Design System" status="busy" />
            <BaseAvatar name="Monster Tools" status="online" />
            <BaseAvatar name="Reviewer" status="offline" />
            <span class="avatar-overflow" aria-label="还有 6 位成员">+6</span>
          </div>
          <BaseDivider label="长姓名" align="start" />
          <div class="avatar-row">
            <BaseAvatar name="非常长的中文负责人姓名" size="lg" status="online" />
            <BaseAvatar name="Very Long Product Designer Name" shape="rounded" />
            <BaseAvatar icon="UserRound" aria-label="匿名成员" status="none" />
          </div>
        </BasePanel>

        <BasePanel title="分隔线形态" subtitle="横向、纵向、语义色、粗细、装饰性和不同 label 对齐方式。">
          <BaseDivider label="分组" icon="Rows3" />
          <div class="divider-preview">
            <span>基础信息</span>
            <BaseDivider direction="vertical" aria-label="基础信息与操作状态分隔" />
            <span>操作状态</span>
            <BaseDivider direction="vertical" dashed tone="primary" aria-label="操作状态与审查记录分隔" />
            <span>审查记录</span>
          </div>
          <BaseDivider label="起始标签" dashed align="start" tone="primary" />
          <BaseDivider label="结束标签" dotted align="end" compact tone="success" />
          <BaseDivider label="粗分隔" tone="warning" thickness="md" spacing="sm" />
          <BaseDivider decorative thickness="lg" tone="danger" spacing="sm" aria-label="装饰性分隔线" />
        </BasePanel>

        <BasePanel title="窄容器" subtitle="头像和分隔线在侧栏里也保持稳定。">
          <div class="avatar-narrow-demo">
            <div class="avatar-row">
              <BaseAvatar name="侧栏成员" status="online" size="sm" />
              <BaseAvatar name="配置负责人" status="busy" size="sm" />
              <BaseAvatar name="归档成员" status="offline" size="sm" />
            </div>
            <BaseDivider label="状态" compact tone="primary" />
            <BaseDivider label="非常长的侧栏分隔说明文本" compact dotted tone="warning" aria-label="侧栏长标签分隔线" />
            <BaseStatusDot type="success" label="已同步" description="头像组无横向溢出" />
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

.avatar-row,
.divider-preview {
  @apply flex min-w-0 flex-wrap items-center gap-3;
}

.avatar-stack {
  @apply flex min-w-0 items-center;
}

.avatar-stack :deep(.base-avatar),
.avatar-overflow {
  @apply ring-2 ring-white dark:ring-slate-900;
}

.avatar-stack :deep(.base-avatar + .base-avatar),
.avatar-stack .avatar-overflow {
  @apply -ml-2;
}

.avatar-overflow {
  @apply inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-black text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300;
}

.avatar-narrow-demo {
  @apply grid w-full max-w-[240px] gap-3;
}

.divider-preview {
  @apply text-xs font-bold text-slate-500 dark:text-slate-400;
}
</style>
