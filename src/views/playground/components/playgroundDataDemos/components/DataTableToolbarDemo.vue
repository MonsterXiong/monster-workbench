<script setup lang="ts">
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="列表工具栏" subtitle="统一列表页身份、统计感知和顶部动作。" icon="Table2">
      <div class="demo-grid">
        <BaseTableToolbar
          title="组件列表"
          description="适合放在列表页、表格页 and 资源管理页顶部。"
          :count="24"
          actions-label="组件列表操作"
          content-label="组件列表补充筛选"
        >
          <template #meta="{ interactiveDisabled }">
            <BaseBadge type="success" dot :disabled="interactiveDisabled">已接入</BaseBadge>
          </template>
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">刷新</BaseButton>
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">新增组件</BaseButton>
          </template>
          <template #default="{ interactiveDisabled }">
            <BaseBadge type="primary" variant="outline" :disabled="interactiveDisabled">最近同步</BaseBadge>
            <BaseBadge type="neutral" variant="outline" :disabled="interactiveDisabled">包含 10 个分类</BaseBadge>
          </template>
        </BaseTableToolbar>

        <BaseTableToolbar
          title="紧凑工具栏"
          description="适合抽屉、侧栏 and 窄表格顶部。"
          :count="8"
          count-label="项筛选"
          icon="ListFilter"
          compact
          surface="muted"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">清空</BaseButton>
          </template>
          <template #default="{ interactiveDisabled }">
            <BaseBadge type="primary" variant="outline" :disabled="interactiveDisabled">数据展示</BaseBadge>
            <BaseBadge type="success" variant="outline" :disabled="interactiveDisabled">已同步</BaseBadge>
          </template>
        </BaseTableToolbar>

        <BaseTableToolbar
          title="嵌套工具栏"
          description="plain 表面可以嵌入 BasePanel 或详情卡正文。"
          :count="3"
          icon=""
          surface="plain"
          :divided="false"
          size="lg"
        >
          <template #meta="{ interactiveDisabled }">
            <BaseStatusDot type="primary" label="Plain" orientation="horizontal" :aria-disabled="interactiveDisabled ? 'true' : undefined" />
          </template>
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">应用</BaseButton>
          </template>
        </BaseTableToolbar>

        <BaseTableToolbar
          title="加载中"
          description="异步列表初始化时保留标题区 and 动作区域。"
          :count="0"
          icon="LoaderCircle"
          loading
          loading-text="列表工具栏加载中"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">刷新</BaseButton>
          </template>
        </BaseTableToolbar>

        <BaseTableToolbar
          title="禁用工具栏"
          description="权限不足或流程锁定时整体降低可交互性。"
          :count="12"
          icon="Lock"
          disabled
          compact
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">保存</BaseButton>
          </template>
          <template #default="{ interactiveDisabled }">
            <BaseBadge type="neutral" variant="outline" :disabled="interactiveDisabled">只读</BaseBadge>
          </template>
        </BaseTableToolbar>

        <div class="toolbar-pressure-box">
          <BaseTableToolbar
            title="非常长的列表工具栏标题需要在侧栏 and 抽屉中稳定换行"
            description="用于验证标题、描述、统计数量、状态徽标、动作按钮 and 补充标签在窄容器中不会撑出横向滚动，也不会让按钮文字盖住后续内容。"
            :count="128"
            count-label="条资源记录"
            icon="Rows3"
            compact
            wrap-title
            wrap-description
            actions-label="长文案工具栏操作"
            content-label="长文案工具栏标签"
          >
            <template #meta="{ interactiveDisabled }">
              <BaseBadge type="warning" variant="outline" :disabled="interactiveDisabled">长文案状态标记</BaseBadge>
            </template>
            <template #actions="{ interactiveDisabled }">
              <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">同步这个非常长的视图名称</BaseButton>
            </template>
            <template #default="{ interactiveDisabled }">
              <BaseBadge type="primary" variant="outline" :disabled="interactiveDisabled">workspace/table-toolbar/very-long-filter-label</BaseBadge>
              <BaseBadge type="neutral" variant="outline" :disabled="interactiveDisabled">包含跨页面列表统计</BaseBadge>
            </template>
          </BaseTableToolbar>
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

.toolbar-pressure-box {
  @apply max-w-[320px] min-w-0;
}
</style>
