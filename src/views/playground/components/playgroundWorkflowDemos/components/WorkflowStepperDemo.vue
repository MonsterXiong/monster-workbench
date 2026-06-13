<script setup lang="ts">
import { ref } from "vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const workflowStep = ref(1);
const releaseStep = ref(2);
const simpleStep = ref(1);
const stepperInstanceText = ref("等待实例操作");
const stepperInstanceRef = ref<{
  getNativeSteps: () => unknown;
  getElement: () => HTMLElement | null;
  getStepElement: (target: number | string) => HTMLElement | null;
  focusStep: (target?: number | string) => HTMLElement | null;
} | null>(null);

const workflowSteps = [
  { key: "prepare", title: "准备资料", description: "收集输入、依赖和组件约束。" },
  { key: "scan", title: "扫描缺口", description: "检查沙箱覆盖和缺失状态。" },
  { key: "build", title: "补齐示例", description: "补充演示内容和交互状态。", error: true },
  { key: "verify", title: "执行验证", description: "完成类型与视觉检查。", disabled: true },
];

const releaseSteps = [
  { key: "draft", title: "草稿", description: "整理组件接口和沙箱示例。" },
  { key: "review", title: "复核", description: "设计和交互状态检查。" },
  { key: "publish", title: "发布", description: "合入公共组件规范。" },
  { key: "archive", title: "归档", description: "同步文档和记忆。" },
];

const simpleSteps = [
  { key: "input", title: "录入" },
  { key: "validate", title: "校验" },
  { key: "confirm", title: "确认" },
];

const readStepperElement = () => {
  const element = stepperInstanceRef.value?.getElement();
  stepperInstanceText.value = element ? "根节点：步骤条容器" : "未读取到根节点";
};

const focusCurrentStep = () => {
  const element = stepperInstanceRef.value?.focusStep();
  stepperInstanceText.value = element ? `当前步骤: ${element.textContent?.trim() || "-"}` : "未找到当前步骤";
};

const focusBuildStep = () => {
  const element = stepperInstanceRef.value?.focusStep("build");
  stepperInstanceText.value = element ? `补齐示例: ${element.textContent?.trim() || "-"}` : "未找到补齐示例步骤";
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="步骤条" subtitle="展示流程进度、点击切换、错误态、禁用态和稳定底座能力。" icon="Footprints">
      <BasePanel title="横向流程" subtitle="完成态、当前态、错误态和禁用态，支持线性点击。">
        <BaseStepper
          ref="stepperInstanceRef"
          data-native-stepper-ref="base-stepper-instance"
          v-model:current="workflowStep"
          :steps="workflowSteps"
          clickable
          linear
          surface="muted"
        />
        <div class="stepper-instance-panel">
          <div class="stepper-instance-copy">
            <BaseIcon name="Workflow" size="14" aria-hidden="true" />
            <span>实例能力</span>
            <strong>{{ stepperInstanceText }}</strong>
          </div>
          <div class="stepper-instance-actions">
            <BaseButton size="xs" type="secondary" outline @click="readStepperElement">读取根节点</BaseButton>
            <BaseButton size="xs" type="secondary" outline @click="focusCurrentStep">聚焦当前</BaseButton>
            <BaseButton size="xs" type="secondary" outline @click="focusBuildStep">聚焦补齐</BaseButton>
          </div>
        </div>
      </BasePanel>
      <BasePanel title="竖向流程" subtitle="窄栏和详情侧栏可使用竖向排布。">
        <BaseStepper :steps="workflowSteps" :current="2" vertical size="sm" surface="plain" :bordered="false" />
      </BasePanel>
      <BasePanel title="简洁模式" subtitle="复用简洁步骤模式，并保留项目尺寸和双向绑定。">
        <BaseStepper
          v-model:current="simpleStep"
          :steps="simpleSteps"
          clickable
          simple
          align-center
          surface="plain"
          :bordered="false"
        />
      </BasePanel>
      <BasePanel title="状态映射" subtitle="完成态和当前态映射仍通过统一接口承接。">
        <BaseStepper
          v-model:current="releaseStep"
          :steps="releaseSteps"
          clickable
          align-center
          :columns="4"
          finish-status="finish"
          process-status="process"
          size="lg"
        />
      </BasePanel>
      <div class="stepper-state-grid">
        <BaseStepper :steps="[]" :current="0" empty-text="暂无可执行步骤" surface="muted" />
        <BaseStepper :steps="releaseSteps" :current="1" loading loading-text="正在同步步骤状态" surface="muted" />
      </div>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.stepper-instance-panel {
  @apply mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.stepper-instance-copy {
  @apply flex min-w-0 items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.stepper-instance-copy strong {
  @apply min-w-0 truncate text-slate-800 dark:text-slate-100;
}

.stepper-instance-actions {
  @apply flex shrink-0 flex-wrap items-center gap-2;
}

.stepper-state-grid {
  @apply grid min-w-0 gap-3 lg:grid-cols-2;
}
</style>
