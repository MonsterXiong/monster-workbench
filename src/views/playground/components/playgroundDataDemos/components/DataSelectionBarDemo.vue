<script setup lang="ts">
import { ref } from "vue";
import BaseSelectionBar from "../../../../../components/common/BaseSelectionBar.vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const selectionCount = ref(3);
const selectionInstanceText = ref("等待实例操作");
const selectionInstanceRef = ref<InstanceType<typeof BaseSelectionBar> | null>(null);

const readSelectionElement = () => {
  const element = selectionInstanceRef.value?.getElement();
  selectionInstanceText.value = element ? `DOM: ${element.tagName.toLowerCase()}.${element.classList[0] || "root"}` : "未读取到 DOM";
};

const focusSelectionClear = () => {
  const element = selectionInstanceRef.value?.focusClearButton();
  selectionInstanceText.value = element ? "已聚焦清空按钮" : "清空按钮不可用";
};

const clearSelectionByRef = () => {
  selectionInstanceRef.value?.clear();
  selectionInstanceText.value = "已通过实例清空选择";
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="批量操作栏" subtitle="表格、多选列表和文件管理都可以直接复用。" icon="ListChecks">
      <div class="demo-grid">
        <BaseSelectionBar
          ref="selectionInstanceRef"
          data-native-selection-bar-ref="base-selection-bar-instance"
          :count="selectionCount"
          description="批量动作 and 已选上下文固定在同一处。"
          actions-label="已选组件批量操作"
          @clear="selectionCount = 0"
        >
          <template #default="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">批量归档</BaseButton>
            <BaseButton type="danger" size="sm" outline :disabled="interactiveDisabled">删除</BaseButton>
          </template>
        </BaseSelectionBar>

        <BasePanel title="实例能力" subtitle="批量操作栏可以读取根节点、聚焦清空按钮和触发清空。">
          <div class="selection-instance-panel">
            <div class="selection-instance-copy">
              <BaseIcon name="Workflow" size="14" aria-hidden="true" />
              <span>{{ selectionInstanceText }}</span>
            </div>
            <div class="selection-instance-actions">
              <BaseButton size="xs" type="secondary" outline @click="readSelectionElement">DOM</BaseButton>
              <BaseButton size="xs" type="secondary" outline @click="focusSelectionClear">聚焦清空</BaseButton>
              <BaseButton size="xs" type="secondary" outline @click="clearSelectionByRef">清空</BaseButton>
            </div>
          </div>
        </BasePanel>

        <BaseSelectionBar :count="0" compact description="没有选中项时清空按钮自动禁用。" surface="muted" />

        <BaseSelectionBar
          :count="12"
          label="已勾选资源"
          item-label="个文件"
          description="适合文件管理、资源列表 and 任务队列。"
          clear-text="取消勾选"
          icon="Files"
          size="lg"
          surface="muted"
          actions-label="文件批量操作"
        >
          <template #default="{ interactiveDisabled }">
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">移动到</BaseButton>
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">打标签</BaseButton>
          </template>
        </BaseSelectionBar>

        <BaseSelectionBar
          :count="5"
          description="loading 时清空按钮 and 动作会进入不可用态。"
          loading
          loading-text="批量操作处理中"
          compact
        >
          <template #default="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">处理中</BaseButton>
          </template>
        </BaseSelectionBar>

        <BaseSelectionBar
          :count="3"
          description="plain 表面适合嵌入 BasePanel 内部。"
          surface="plain"
          icon=""
          :show-clear="false"
          aria-label="嵌套批量操作栏"
        >
          <template #default="{ interactiveDisabled }">
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">应用选择</BaseButton>
          </template>
        </BaseSelectionBar>

        <BaseSelectionBar
          :count="2"
          description="禁用态用于权限不足或流程锁定。"
          disabled
          compact
          sticky
        >
          <template #default="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">批量更新</BaseButton>
          </template>
        </BaseSelectionBar>

        <div class="selection-pressure-box">
          <BaseSelectionBar
            :count="128"
            label="已选择非常长的一组跨页面资源 and 待处理组件"
            item-label="条资源记录"
            description="用于验证已选数量、长说明、动作按钮 and 清空按钮在侧栏、抽屉、窄表格底部这类空间不足的场景里不会横向溢出。"
            clear-text="清空这批很长的选择结果"
            icon="ListChecks"
            compact
            wrap-label
            wrap-description
            actions-label="长文案批量操作"
          >
            <template #default="{ interactiveDisabled }">
              <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">执行这个非常长的批量动作名称</BaseButton>
              <BaseBadge type="warning" variant="outline" :disabled="interactiveDisabled">跨页面选择</BaseBadge>
            </template>
          </BaseSelectionBar>
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

.selection-pressure-box {
  @apply max-w-[320px] min-w-0;
}

.selection-instance-panel {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.selection-instance-copy {
  @apply flex min-w-0 items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.selection-instance-copy span {
  @apply min-w-0 truncate;
}

.selection-instance-actions {
  @apply flex shrink-0 flex-wrap items-center gap-2;
}
</style>
