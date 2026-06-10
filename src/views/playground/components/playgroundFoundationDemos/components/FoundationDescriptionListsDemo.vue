<script setup lang="ts">
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const descriptionItems = [
  { key: "name", label: "组件名称", value: "BaseDescriptionList", status: "primary" as const },
  { key: "category", label: "所属分类", value: "基础控件" },
  { key: "coverage", label: "覆盖能力", value: "属性 / 状态 / 描述", status: "success" as const },
  { key: "density", label: "显示密度", value: "compact", description: "适合侧栏和详情摘要" },
  { key: "remark", label: "备注", value: "支持跨列", description: "span 可用于长字段", span: 2 as const },
];

const auditDescriptionItems = [
  { key: "version", label: "版本", value: "0.0.3", status: "success" as const },
  { key: "owner", label: "维护团队", value: "组件平台" },
  { key: "scene", label: "高频场景", value: "详情页 / 审批页 / 配置确认", span: 2 as const },
  { key: "risk", label: "风险等级", value: "低", status: "neutral" as const },
  { key: "updated", label: "最近更新", value: "2026-06-08", description: "通过类型与架构检查" },
];

const longDescriptionItems = [
  {
    key: "resource",
    label: "资源路径",
    value: "workspace://components/foundation/BaseDescriptionList/very-long-detail-summary-field",
    description: "用于验证长路径、长标识符和跨系统资源名在属性网格内自然换行。",
    status: "primary" as const,
    span: 2 as const,
  },
  {
    key: "owner",
    label: "责任团队",
    value: "组件平台 / Playground 治理小组",
    description: "说明文本较长时不会挤压右侧列，也不会产生横向滚动。",
  },
  {
    key: "hash",
    label: "配置摘要",
    value: "sha256:4f8c9a1b2d3e5f7098a6c4d2e1f0b9a7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1",
    description: "开启 wrapValue 后完整展示。",
    status: "success" as const,
  },
];

const keyValueItems = [
  { key: "runtime", label: "运行态", value: "正常", icon: "Activity", status: "success" as const, description: "实时状态" },
  { key: "version", label: "版本", value: "0.0.3", icon: "Package", description: "当前包版本" },
  { key: "quality", label: "质量门禁", value: "通过", icon: "ShieldCheck", status: "primary" as const },
];

const keyValueAuditItems = [
  { key: "build", label: "构建状态", value: "已通过", icon: "CircleCheck", status: "success" as const, description: "typecheck / architecture" },
  { key: "coverage", label: "覆盖范围", value: "6 个状态", icon: "LayoutGrid", status: "primary" as const },
  { key: "risk", label: "残余风险", value: "低", icon: "ShieldCheck", status: "neutral" as const },
  { key: "note", label: "备注", value: "适合侧栏摘要、详情卡片和确认页", icon: "FileText", span: 2 as const },
];

const keyValueLongItems = [
  {
    key: "job",
    label: "最近任务",
    value: "playground-review-description-and-key-value-list-2026-06-09",
    icon: "ListChecks",
    status: "primary" as const,
    description: "长任务名在侧栏摘要里需要完整保留，便于定位组件审查批次。",
  },
  {
    key: "trace",
    label: "Trace",
    value: "trace_01JZ9T7R9FZ7V4D4XMA7S4K1QZ/component-foundation-description-list",
    icon: "Route",
    status: "success" as const,
    description: "开启 wrapDescription 后说明会在卡片内换行。",
    span: 2 as const,
  },
];
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="描述列表" subtitle="属性网格和键值摘要用于详情、侧栏、卡片页脚和配置确认。" icon="ListTodo">
      <div class="foundation-grid">
        <BasePanel title="属性网格" subtitle="支持列数、紧凑、状态点和跨列字段。">
          <BaseDescriptionList aria-label="组件属性网格" :items="descriptionItems" :columns="2" compact />
        </BasePanel>
        <BasePanel title="审计摘要" subtitle="三列布局适合配置确认、审计结果和发布检查。">
          <BaseDescriptionList aria-label="审计摘要" :items="auditDescriptionItems" :columns="3" surface="muted" size="lg" />
        </BasePanel>
        <BasePanel title="嵌套形态" subtitle="plain 表面适合放入详情卡、抽屉和面板正文。">
          <BaseDescriptionList aria-label="嵌套描述列表" :items="auditDescriptionItems.slice(0, 4)" :columns="2" surface="plain" :bordered="false" />
        </BasePanel>
        <BasePanel title="长字段" subtitle="长路径、摘要哈希和跨系统标识可以主动开启换行。">
          <BaseDescriptionList
            aria-label="长字段描述列表"
            :items="longDescriptionItems"
            :columns="2"
            surface="muted"
            wrap-label
            wrap-value
            wrap-description
          />
        </BasePanel>
        <BasePanel title="状态兜底" subtitle="加载、空态和禁用态让异步详情区域更稳定。">
          <div class="description-state-stack">
            <BaseDescriptionList aria-label="加载中的描述列表" :items="[]" loading loading-text="正在加载属性" :skeleton-rows="5" compact />
            <BaseDescriptionList aria-label="空描述列表" :items="[]" empty-text="暂无可展示属性" empty-icon="Inbox" compact />
            <BaseDescriptionList aria-label="禁用描述列表" :items="descriptionItems.slice(0, 2)" disabled compact />
          </div>
        </BasePanel>
        <BasePanel title="状态点" subtitle="状态点适合表格行、卡片摘要、工具栏和只读属性里的轻量状态。">
          <div class="status-dot-demo-stack">
            <div class="status-dot-row">
              <BaseStatusDot type="primary" label="同步中" description="后台任务" pulse />
              <BaseStatusDot type="success" label="运行中" description="实时同步" />
              <BaseStatusDot type="warning" label="待处理" description="需要复核" />
              <BaseStatusDot type="danger" label="异常" description="等待重试" />
              <BaseStatusDot type="neutral" label="离线" description="未连接" disabled />
            </div>
            <BaseDivider compact dashed label="尺寸" />
            <div class="status-dot-size-grid">
              <BaseStatusDot type="success" size="xs" label="XS" orientation="horizontal" />
              <BaseStatusDot type="success" size="sm" label="SM" orientation="horizontal" />
              <BaseStatusDot type="success" size="md" label="MD" orientation="horizontal" />
              <BaseStatusDot type="success" size="lg" label="LG" orientation="horizontal" />
              <BaseStatusDot type="primary" size="md" aria-label="仅状态点：已选中" />
            </div>
          </div>
        </BasePanel>
        <BasePanel title="键值摘要" subtitle="更适合卡片内局部摘要和侧栏简要状态。">
          <div class="key-value-demo-stack">
            <BaseKeyValueList aria-label="运行态键值摘要" :items="keyValueItems" :columns="1" />
            <BaseKeyValueList aria-label="审计键值摘要" :items="keyValueAuditItems" :columns="2" surface="card" size="lg" />
            <BaseKeyValueList
              aria-label="长字段键值摘要"
              :items="keyValueLongItems"
              :columns="2"
              surface="muted"
              wrap-label
              wrap-value
              wrap-description
            />
            <BaseKeyValueList aria-label="嵌套键值摘要" :items="keyValueAuditItems.slice(0, 3)" :columns="3" surface="plain" :bordered="false" compact />
            <div class="key-value-state-grid">
              <BaseKeyValueList aria-label="加载中的键值摘要" :items="[]" loading loading-text="正在加载摘要" :skeleton-rows="4" compact />
              <BaseKeyValueList aria-label="空键值摘要" :items="[]" empty-text="暂无摘要指标" empty-icon="Inbox" compact />
              <BaseKeyValueList aria-label="禁用键值摘要" :items="keyValueItems.slice(0, 2)" disabled compact />
            </div>
          </div>
          <BaseDivider compact />
          <div class="status-dot-row">
            <BaseStatusDot type="success" label="运行中" description="实时同步" pulse />
            <BaseStatusDot type="warning" label="待处理" description="需要复核" />
            <BaseStatusDot type="danger" label="异常" description="等待重试" />
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

.status-dot-row {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}

.description-state-stack {
  @apply grid min-w-0 gap-3;
}

.key-value-demo-stack {
  @apply grid min-w-0 gap-3;
}

.key-value-state-grid {
  @apply grid min-w-0 gap-3 lg:grid-cols-3;
}

.status-dot-demo-stack {
  @apply grid min-w-0 gap-3;
}

.status-dot-size-grid {
  @apply grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-5;
}
</style>
