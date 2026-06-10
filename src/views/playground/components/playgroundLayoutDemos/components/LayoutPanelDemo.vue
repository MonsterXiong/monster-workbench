<script setup lang="ts">
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="基础面板" subtitle="用于承载卡片、局部配置、侧栏摘要和可点击区域。" icon="PanelTop">
      <div class="panel-demo-grid">
        <BasePanel
          title="标准面板"
          description="标题、说明、图标、动作和页脚组合。"
          icon="LayoutTemplate"
          divided
          size="lg"
          :level="2"
          body-gap="md"
          actions-label="标准面板操作"
          body-label="标准面板内容"
          footer-label="标准面板页脚"
        >
          <template #actions>
            <BaseButton type="neutral" size="sm">预览</BaseButton>
            <BaseButton type="primary" size="sm">保存</BaseButton>
          </template>
          <BaseDescriptionList
            :items="[
              { key: 'surface', label: '表面', value: 'card' },
              { key: 'state', label: '状态', value: '可编辑', status: 'success' },
            ]"
            compact
          />
          <template #footer>
            <BaseFormActions compact justify="end" :divided="false">
              <BaseButton type="neutral" size="sm">取消</BaseButton>
              <BaseButton type="primary" size="sm">提交</BaseButton>
            </BaseFormActions>
          </template>
        </BasePanel>

        <BasePanel
          title="可点击面板"
          description="适合入口卡片、选择项和资源跳转。"
          clickable
          selected
          icon="MousePointerClick"
          muted
          aria-label="可点击入口面板"
          @click="triggerToast('点击面板', 'info')"
        >
          <BaseStatusDot type="primary" label="Hover / Focus" description="带键盘焦点反馈" />
        </BasePanel>

        <BasePanel
          title="加载面板"
          description="保持结构，提示内容正在更新。"
          icon="LoaderCircle"
          loading
          loading-text="同步配置"
          size="sm"
          body-gap="sm"
        >
          <BaseSkeletonCard compact surface="plain" :bordered="false" />
          <template #footer>
            <BaseFormActions compact justify="end" :divided="false">
              <BaseButton type="neutral" size="sm">刷新</BaseButton>
              <BaseButton type="primary" size="sm">保存</BaseButton>
            </BaseFormActions>
          </template>
        </BasePanel>

        <BasePanel title="禁用面板" description="权限不足或上下文不可用，正文会统一锁定。" icon="Lock" disabled size="sm" body-gap="sm">
          <BaseFormItem label="继承配置" compact>
            <BaseInput model-value="系统默认" size="sm" />
          </BaseFormItem>
          <template #footer>
            <BaseFormActions compact justify="end">
              <BaseButton type="primary" size="sm">保存配置</BaseButton>
            </BaseFormActions>
          </template>
        </BasePanel>

        <BasePanel title="Muted 表面" description="适合次级容器和侧栏。" icon="PanelBottom" surface="muted">
          <BaseStatusDot type="success" label="配置有效" description="可保存" />
        </BasePanel>

        <BasePanel title="Plain 表面" description="适合嵌套在已有卡片内部。" icon="Rows3" surface="plain" :padded="false" :level="4">
          <BaseFieldGroup compact title="内部字段组" icon="Rows3" surface="muted">
            <BaseDescriptionList
              :items="[
                { key: 'padding', label: '内边距', value: '由内部组件负责' },
                { key: 'border', label: '额外边框', value: '无', status: 'success' },
              ]"
              compact
            />
          </BaseFieldGroup>
        </BasePanel>

        <BasePanel
          title="很长的面板标题可以按需换行并保持右侧动作区稳定"
          description="wrapTitle 与 wrapSubtitle 适合资源名称、任务名称或跨模块摘要较长的容器标题。"
          icon="TextCursorInput"
          surface="muted"
          wrap-title
          wrap-subtitle
        >
          <template #actions>
            <BaseBadge type="primary" variant="outline">Wrap</BaseBadge>
          </template>
          <BaseDescriptionList
            :items="[
              { key: 'title', label: '标题', value: '允许换行', status: 'success' },
              { key: 'actions', label: '动作区', value: '不会挤出容器' },
            ]"
            compact
          />
        </BasePanel>

        <BasePanel
          title="正文间距"
          description="bodyGap 适合多块内容直接放入面板正文的场景。"
          icon="Rows3"
          body-gap="sm"
          size="sm"
        >
          <BaseStatusDot type="success" label="第一行" description="正文自动保留间距" />
          <BaseStatusDot type="primary" label="第二行" description="不用额外写容器 gap" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.panel-demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}
</style>
