<script setup lang="ts">
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const detailItems = [
  { key: "category", label: "组件分类", value: "数据展示", status: "primary" as const },
  { key: "owner", label: "负责人", value: "组件平台", status: "success" as const },
  { key: "density", label: "默认密度", value: "标准 / 紧凑" },
  { key: "usage", label: "高频场景", value: "列表页、详情页、资源管理" },
];
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="详情卡片" subtitle="详情页、侧栏和资源摘要里常见的对象身份与属性组合。" icon="IdCard">
      <div class="demo-grid">
        <BaseDetailCard
          title="BaseDataTable"
          description="用于展示资源管理、任务列表和配置项列表的标准数据表格。"
          icon="Table2"
          status="已接入"
          status-label="接入状态：已接入"
          status-type="success"
          meta="updated 2026-06-08"
          meta-label="更新时间"
          :items="detailItems"
          size="lg"
          actions-label="BaseDataTable 操作"
          tags-label="BaseDataTable 标签"
          body-label="BaseDataTable 组合建议"
          list-label="BaseDataTable 属性"
        >
          <template #actions>
            <BaseButton type="neutral" size="sm">预览</BaseButton>
            <BaseButton type="primary" size="sm">编辑</BaseButton>
          </template>
          <template #tags>
            <BaseBadge type="primary">表格</BaseBadge>
            <BaseBadge type="neutral">分页</BaseBadge>
            <BaseBadge type="success" variant="outline">稳定</BaseBadge>
          </template>
          <BaseAlert type="info" title="组合建议" description="详情卡片适合承载对象身份、状态、属性和底部动作。" compact />
        </BaseDetailCard>

        <BaseDetailCard
          title="紧凑详情"
          description="适合抽屉、右侧栏和列表内展开详情。"
          icon="PanelRight"
          status="Compact"
          status-label="密度：紧凑"
          status-type="primary"
          :items="detailItems.slice(0, 3)"
          compact
          muted
        />

        <BaseDetailCard
          title="可点击详情"
          description="适合资源入口卡、对象选择器和可跳转详情。"
          icon="MousePointerClick"
          status="可进入"
          status-label="入口状态：可进入"
          status-type="primary"
          meta="clickable"
          meta-label="交互模式"
          :items="detailItems.slice(0, 2)"
          clickable
          aria-label="打开可点击详情卡"
          actions-label="可点击详情内部操作"
          @click="triggerToast('打开详情卡片', 'info')"
        >
          <template #actions>
            <BaseButton type="neutral" size="sm" @click="triggerToast('触发卡片内部动作', 'success')">内部动作</BaseButton>
          </template>
          <template #tags>
            <BaseBadge type="primary" variant="outline">入口卡</BaseBadge>
            <BaseBadge type="neutral" variant="outline">键盘可触发</BaseBadge>
          </template>
        </BaseDetailCard>

        <BaseDetailCard
          title="加载详情"
          description="保持对象身份区域，内容区等待数据返回。"
          icon="LoaderCircle"
          status="Loading"
          status-type="neutral"
          meta="pending"
          meta-label="加载状态"
          loading
          loading-text="详情数据加载中"
        >
          <BaseSkeletonCard compact />
        </BaseDetailCard>

        <BaseDetailCard
          title="禁用详情"
          description="权限不足时保留摘要，但禁止点击入口。"
          icon="Lock"
          status="只读"
          status-label="权限状态：只读"
          status-type="neutral"
          :items="detailItems.slice(0, 2)"
          disabled
          clickable
          aria-label="禁用详情卡"
        />

        <BaseDetailCard
          title="Plain 嵌套详情"
          description="无边框表面适合嵌套在 BasePanel 或抽屉内部。"
          icon="FileText"
          status="Plain"
          status-type="primary"
          surface="plain"
          :items="detailItems.slice(0, 3)"
          compact
        />

        <BaseDetailCard
          title="非常长的资源详情标题需要在侧栏与抽屉中稳定换行"
          description="详情卡片常用于资源摘要、对象选择器和配置预览，标题、说明、元信息与属性值都可能来自远端数据，需要在窄容器下保持可读且不横向溢出。"
          icon="TextCursorInput"
          status="Long"
          status-label="长文案示例"
          status-type="warning"
          meta="updated by component-platform / workspace/detail-card/very-long-resource-path"
          meta-label="长元信息"
          :items="[
            { key: 'name', label: '资源名称', value: 'monster-workbench-component-detail-card-with-very-long-name', description: '长属性值不撑破容器', span: 2 },
            { key: 'owner', label: '负责人', value: '组件平台', status: 'primary' },
            { key: 'state', label: '状态', value: '等待复核', status: 'warning' },
          ]"
          wrap-title
          wrap-description
          wrap-meta
          wrap-list-label
          wrap-list-value
          wrap-list-description
          :max-description-lines="4"
          :columns="2"
          list-label="长文案详情属性"
        >
          <template #footer>
            <BaseFormActions compact justify="end" :divided="false" aria-label="长文案详情操作">
              <BaseButton type="neutral" size="sm">忽略</BaseButton>
              <BaseButton type="primary" size="sm">复核</BaseButton>
            </BaseFormActions>
          </template>
        </BaseDetailCard>
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
</style>
