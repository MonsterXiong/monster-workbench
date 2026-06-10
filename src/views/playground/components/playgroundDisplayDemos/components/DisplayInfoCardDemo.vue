<script setup lang="ts">
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="信息卡片" subtitle="适合功能入口、状态说明、设置项和资源摘要。" icon="Info">
      <div class="demo-grid">
        <BaseInfoCard
          title="组件沙箱"
          description="承载公共组件的完整能力展示，按分类进入单组件详情。"
          icon="Boxes"
          meta="Playground"
          meta-label="组件沙箱状态"
          actions-label="组件沙箱操作"
          content-label="组件沙箱摘要"
          clickable
          wrap-description
          @click="triggerToast('打开组件沙箱入口', 'info')"
        >
          <BaseDescriptionList
            :items="[
              { key: 'state', label: '状态', value: '持续完善', status: 'primary' },
              { key: 'scope', label: '范围', value: 'Base* / App*' },
            ]"
            compact
          />
        </BaseInfoCard>

        <BaseInfoCard
          title="发布检查"
          description="信息卡可以承载警告、成功、危险等语义，保持统一密度。"
          icon="ShieldCheck"
          meta="Ready"
          meta-label="发布检查状态"
          type="success"
          compact
        >
          <BaseBadge type="success" variant="outline">类型检查通过</BaseBadge>
        </BaseInfoCard>

        <BaseInfoCard
          title="风险提示"
          description="危险语义用于不可逆操作、失败状态和需要用户关注的资源。"
          icon="TriangleAlert"
          meta="High"
          meta-label="风险等级"
          type="danger"
          surface="muted"
        >
          <BaseBadge type="danger" variant="outline">需要复核</BaseBadge>
        </BaseInfoCard>

        <BaseInfoCard
          title="等待处理"
          description="警告语义适合待审核、待同步和配置不完整的状态。"
          icon="Clock3"
          meta="Pending"
          meta-label="处理状态"
          type="warning"
          size="lg"
        />

        <BaseInfoCard
          title="纵向信息卡"
          description="纵向布局适合窄侧栏、移动视图和图标作为主视觉的入口。"
          icon="PanelTop"
          type="neutral"
          orientation="vertical"
          compact
          wrap-description
        >
          <BaseStatusDot type="primary" label="可用于侧栏" description="窄容器友好" />
        </BaseInfoCard>

        <div class="info-card-narrow-demo">
          <BaseInfoCard
            title="侧栏配置项标题很长时也要稳"
            description="宽度只有 320px 左右时，图标、标题、元信息、动作区和正文都需要自然换行，不遮挡也不撑开父容器。"
            icon="PanelLeft"
            meta="320px"
            meta-label="窄容器宽度"
            type="neutral"
            size="sm"
            wrap-title
            wrap-description
            actions-label="窄容器信息卡操作"
          >
            <template #default="{ interactiveDisabled }">
              <BaseStatusDot
                type="success"
                label="布局稳定"
                description="用于抽屉、资源栏 and 三栏布局侧边面板。"
                :disabled="interactiveDisabled"
              />
            </template>
            <template #actions="{ interactiveDisabled }">
              <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">查看</BaseButton>
              <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">应用</BaseButton>
            </template>
          </BaseInfoCard>
        </div>

        <BaseInfoCard
          title="非常长的信息卡标题需要允许换行并保持动作区稳定"
          description="配置项、资源摘要和跨系统提示经常包含很长的中文说明，卡片需要在列表、侧栏和抽屉中保持可读，不产生横向溢出。"
          icon="TextCursorInput"
          meta="Long"
          meta-label="长文案示例"
          type="primary"
          wrap-title
          wrap-description
          :max-description-lines="4"
          actions-label="长文案信息卡操作"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">查看</BaseButton>
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">处理</BaseButton>
          </template>
        </BaseInfoCard>

        <BaseInfoCard
          title="加载中"
          description="保持卡片高度和结构，等待远程数据返回。"
          icon="LoaderCircle"
          meta="Loading"
          meta-label="加载状态"
          loading
          loading-text="信息卡数据加载中"
          actions-label="加载信息卡操作"
        >
          <BaseSkeletonCard compact />
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :loading="interactiveDisabled">同步中</BaseButton>
          </template>
        </BaseInfoCard>

        <BaseInfoCard
          title="禁用入口"
          description="权限不足时保留入口说明，但禁止触发点击。"
          icon="Lock"
          meta="Readonly"
          meta-label="入口状态"
          clickable
          disabled
          aria-label="禁用的信息入口"
          actions-label="禁用信息卡操作"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">无权限</BaseButton>
          </template>
        </BaseInfoCard>

        <BaseInfoCard
          title="Plain 嵌套"
          description="无边框表面适合嵌在 BasePanel、BasePageShell 或详情卡内部。"
          icon="FileText"
          surface="plain"
          type="neutral"
        >
          <BaseDescriptionList
            :items="[
              { key: 'surface', label: '表面', value: 'plain' },
              { key: 'border', label: '边框', value: '无', status: 'success' },
            ]"
            compact
          />
        </BaseInfoCard>
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

.info-card-narrow-demo {
  @apply w-full max-w-[320px];
}
</style>
