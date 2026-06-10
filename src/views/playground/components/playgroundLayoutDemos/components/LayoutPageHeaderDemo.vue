<script setup lang="ts">
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const pageHeaderBreadcrumbs = [
  { key: "workspace", label: "工作台", icon: "LayoutDashboard" },
  { key: "components", label: "组件库", icon: "Boxes" },
  { key: "page-header", label: "页面头部" },
];
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="页面头部" subtitle="聚合面包屑、页面身份、状态标签和右侧主动作。" icon="PanelTop">
      <BasePageHeader
        title="组件沙箱"
        description="统一承载页面标题、说明、图标、面包屑、元信息和操作区。"
        icon="Boxes"
        :breadcrumbs="pageHeaderBreadcrumbs"
        size="lg"
        :level="2"
        meta-label="组件沙箱状态"
        actions-label="组件沙箱操作"
        backable
        @back="triggerToast('返回上一级', 'info')"
        @select-breadcrumb="triggerToast(`选择面包屑：${$event.label}`, 'info')"
      >
        <template #meta>
          <BaseBadge type="success">已接入</BaseBadge>
          <BaseStatusDot type="primary" label="Light / Dark" description="主题态" />
        </template>
        <template #actions>
          <BaseButton type="neutral" size="sm">导出</BaseButton>
          <BaseButton type="primary" size="sm">新增组件</BaseButton>
        </template>
      </BasePageHeader>

      <BasePageHeader
        title="紧凑头部"
        description="适合抽屉、详情侧栏和嵌套工作区。"
        icon="Rows3"
        compact
        size="sm"
        :level="3"
        surface="muted"
      >
        <template #actions>
          <BaseActionMenu :actions="[{ key: 'rename', label: '重命名', icon: 'Pencil' }, { key: 'archive', label: '归档', icon: 'Archive' }]" />
        </template>
      </BasePageHeader>

      <div class="page-header-demo-grid">
        <BasePageHeader
          title="无边框头部"
          description="适合放在 BasePageShell、弹窗或已有卡片内部。"
          icon="PanelTop"
          compact
          :level="3"
          surface="plain"
        >
          <template #meta>
            <BaseBadge type="neutral" variant="outline">Plain</BaseBadge>
          </template>
        </BasePageHeader>

        <BasePageHeader
          title="加载中头部"
          description="页面切换、权限加载或保存中可保持操作区结构。"
          icon="LoaderCircle"
          compact
          :level="3"
          loading
        >
          <template #actions>
            <BaseButton type="neutral" size="sm" disabled>导出</BaseButton>
            <BaseButton type="primary" size="sm" loading>保存中</BaseButton>
          </template>
        </BasePageHeader>

        <BasePageHeader
          title="禁用操作"
          description="权限不足时保留页面身份，但关闭返回和主动作。"
          icon="Lock"
          backable
          disabled
          compact
          :level="3"
        >
          <template #actions>
            <BaseButton type="neutral" size="sm" disabled>只读</BaseButton>
          </template>
        </BasePageHeader>

        <BasePageHeader
          title="很长的页面标题可以按需换行并保持右侧动作区不被挤出容器"
          description="wrapTitle 适合资源名称、任务名称或路径较长的页面头部，避免窄屏时被截断到无法识别。"
          icon="TextCursorInput"
          compact
          surface="muted"
          :level="3"
          wrap-title
        >
          <template #meta>
            <BaseBadge type="primary" variant="outline">Wrap</BaseBadge>
          </template>
        </BasePageHeader>

        <BasePageHeader
          title="吸顶头部"
          description="长内容区域可以使用 sticky 保持上下文。"
          icon="Pin"
          compact
          sticky
          surface="muted"
          :level="3"
        >
          <template #meta>
            <BaseStatusDot type="success" label="Sticky" description="已启用" />
          </template>
        </BasePageHeader>
      </div>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.page-header-demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}
</style>
