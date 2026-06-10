<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const fieldGroupCollapsed = ref(false);
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="字段分组" subtitle="适合设置页局部区域和带页脚的小配置块。" icon="LayoutTemplate">
      <div class="field-group-demo-stack">
        <BaseFieldGroup
          title="基础配置"
          description="字段区、图标、动作、页脚和表单项在一个容器里，适合作为设置页和详情页的稳定配置段落。"
          icon="Settings2"
          :columns="2"
          size="lg"
          :level="2"
          body-gap="lg"
          divided
          wrap-description
          actions-label="基础配置操作"
          body-label="基础配置字段"
          footer-label="基础配置页脚"
        >
          <template #actions>
            <BaseBadge type="primary" variant="outline">Group</BaseBadge>
          </template>
          <BaseFormItem label="组件名称">
            <BaseInput model-value="BaseFieldGroup" />
          </BaseFormItem>
          <BaseFormItem label="密度">
            <BaseSegmented
              model-value="normal"
              :options="[
                { label: '标准', value: 'normal', icon: 'PanelTop' },
                { label: '紧凑', value: 'compact', icon: 'Rows3' },
              ]"
            />
          </BaseFormItem>
          <template #footer>
            <BaseFormActions compact justify="end" :divided="false">
              <BaseButton type="neutral" size="sm">重置</BaseButton>
              <BaseButton type="primary" size="sm">保存分组</BaseButton>
            </BaseFormActions>
          </template>
        </BaseFieldGroup>

        <div class="field-group-demo-grid">
          <BaseFieldGroup
            title="四列参数"
            description="适合高密度设置项和参数面板。"
            icon="SlidersHorizontal"
            :columns="4"
            compact
            size="sm"
            body-gap="sm"
            surface="muted"
          >
            <BaseFormItem label="间距" compact>
              <BaseNumberInput :model-value="12" size="sm" unit="px" />
            </BaseFormItem>
            <BaseFormItem label="密度" compact>
              <BaseSegmented
                model-value="normal"
                size="sm"
                :options="[
                  { label: '标准', value: 'normal' },
                  { label: '紧凑', value: 'compact' },
                ]"
              />
            </BaseFormItem>
            <BaseFormItem label="启用" compact>
              <BaseSwitch model-value label="继承主题" size="sm" compact />
            </BaseFormItem>
            <BaseFormItem label="状态" compact>
              <BaseStatusDot type="success" label="有效" description="可保存" />
            </BaseFormItem>
          </BaseFieldGroup>

          <BaseFieldGroup
            v-model:collapsed="fieldGroupCollapsed"
            collapsible
            compact
            title="可折叠分组"
            description="复杂配置页可以先收起低频设置。"
            icon="ChevronDown"
            body-label="可折叠分组内容"
            expand-label="展开低频设置"
            collapse-label="收起低频设置"
            :keep-mounted="false"
            @toggle="triggerToast($event ? '分组已收起' : '分组已展开', 'info')"
          >
            <BaseFormItem label="缓存策略" compact>
              <BaseSelect
                model-value="auto"
                size="sm"
                :options="[
                  { label: '自动', value: 'auto' },
                  { label: '手动', value: 'manual' },
                ]"
              />
            </BaseFormItem>
            <BaseFormItem label="状态" compact>
              <BaseStatusDot type="success" label="配置有效" description="可保存" />
            </BaseFormItem>
          </BaseFieldGroup>

          <BaseFieldGroup
            title="很长的字段分组标题可以按需换行并保持操作区稳定"
            description="wrapTitle 与 wrapDescription 适合资源名称、策略名称或跨系统配置说明较长的场景。"
            icon="TextCursorInput"
            surface="muted"
            align="start"
            wrap-title
            wrap-description
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
          </BaseFieldGroup>

          <BaseFieldGroup
            compact
            title="加载分组"
            description="异步刷新时保留结构，并锁定内部表单和页脚动作。"
            icon="LoaderCircle"
            loading
            loading-text="加载设置"
            body-gap="sm"
          >
            <BaseSkeletonCard compact surface="plain" :bordered="false" />
            <template #footer>
              <BaseFormActions compact justify="end" :divided="false">
                <BaseButton type="neutral" size="sm">刷新</BaseButton>
                <BaseButton type="primary" size="sm">保存</BaseButton>
              </BaseFormActions>
            </template>
          </BaseFieldGroup>

          <BaseFieldGroup compact title="禁用分组" description="整组锁定时内部控件不可编辑。" icon="Lock" disabled>
            <BaseFormItem label="继承配置" compact>
              <BaseInput model-value="系统默认" size="sm" />
            </BaseFormItem>
            <BaseFormItem label="继承状态" compact success="来自全局模板">
              <BaseSwitch model-value label="启用继承" size="sm" compact />
            </BaseFormItem>
          </BaseFieldGroup>

          <BaseFieldGroup compact title="无边框分组" description="适合嵌套在其它面板内部。" icon="Rows3" surface="plain" :level="4">
            <BaseDescriptionList
              :items="[
                { key: 'surface', label: '表面', value: 'plain' },
                { key: 'nest', label: '嵌套', value: '不增加额外卡片边框', status: 'success' },
              ]"
              compact
            />
          </BaseFieldGroup>
        </div>
      </div>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.field-group-demo-stack {
  @apply grid min-w-0;
  gap: clamp(4rem, 6vw, 4.75rem);
}

.field-group-demo-grid {
  @apply grid min-w-0 items-start lg:grid-cols-2;
  gap: clamp(1.75rem, 3.25vw, 2.25rem);
}
</style>
