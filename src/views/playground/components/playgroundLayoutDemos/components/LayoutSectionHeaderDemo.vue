<script setup lang="ts">
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="区块标题" subtitle="用于面板、侧栏、表单段落和工作区内部的小标题。" icon="Heading">
      <BasePanel title="标题组合" subtitle="覆盖图标、说明、元信息、动作和分隔线。">
        <div class="section-header-demo-stack">
          <BaseSectionHeader
            title="资源摘要"
            description="标准区块标题，适合卡片或页面内容区顶部。"
            icon="FolderTree"
            icon-size="lg"
            :level="2"
            meta-label="资源摘要状态"
            actions-label="资源摘要操作"
          >
            <template #meta>
              <BaseBadge type="success" size="sm">已同步</BaseBadge>
            </template>
            <template #actions>
              <BaseButton type="neutral" size="sm">刷新</BaseButton>
              <BaseButton type="primary" size="sm">新增</BaseButton>
            </template>
          </BaseSectionHeader>

          <BaseSectionHeader
            title="带分隔线"
            description="divided 状态会保留线条下方间距，避免贴住后续内容。"
            icon="PanelTop"
            divided
            spacing="lg"
          >
            <template #actions>
              <BaseBadge type="primary" variant="outline">Divided</BaseBadge>
            </template>
          </BaseSectionHeader>
          <BaseDescriptionList
            :items="[
              { key: 'gap', label: '线后间距', value: '已保留', status: 'success' },
              { key: 'usage', label: 'usage', value: '列表、表单段落、侧栏块' },
            ]"
            compact
          />
        </div>
      </BasePanel>

      <div class="section-header-demo-grid">
        <BasePanel title="密度与大小" subtitle="适配侧栏、抽屉和主内容区。">
          <div class="section-header-demo-stack">
            <BaseSectionHeader title="小尺寸" description="用于窄侧栏。" icon="Rows3" size="sm" compact />
            <BaseSectionHeader title="默认尺寸" description="用于常规内容区。" icon="PanelTop" />
            <BaseSectionHeader title="大尺寸" description="用于主要区块。" icon="LayoutDashboard" size="lg" />
          </div>
        </BasePanel>

        <BasePanel title="长说明与禁用" subtitle="覆盖换行说明、普通标题和不可用状态。">
          <div class="section-header-demo-stack">
            <BaseSectionHeader
              title="普通标题样式"
              description="不强制大写，更适合中文业务标题和说明较长的场景，说明文字可以自然换行。"
              icon="FileText"
              :uppercase="false"
              wrap-description
              align="start"
            />
            <BaseSectionHeader
              title="禁用状态"
              description="权限不足或上下文不可用时保持标题结构。"
              icon="Lock"
              disabled
              compact
            />
            <BaseSectionHeader
              title="很长的区块标题可以换行并保持右侧动作区稳定"
              description="wrapTitle 与 wrapDescription 适合资源名称、策略名称或较长说明的区块标题。"
              icon="TextCursorInput"
              align="start"
              wrap-title
              wrap-description
              :uppercase="false"
            >
              <template #actions>
                <BaseBadge type="primary" variant="outline">Wrap</BaseBadge>
              </template>
            </BaseSectionHeader>
            <BaseSectionHeader
              title="无底部间距"
              description="spacing=none 适合紧贴内部内容的嵌套标题。"
              icon="Rows3"
              compact
              spacing="none"
              :level="4"
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

.section-header-demo-stack {
  @apply grid gap-3;
}

.section-header-demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}
</style>
