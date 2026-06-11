<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useCreativeGoalStore } from '../../../stores/creative-goal';
import { useCreativeBatchStore } from '../../../stores/creative-batch';
import BaseInput from '../../../components/common/BaseInput.vue';
import BaseTextarea from '../../../components/common/BaseTextarea.vue';
import BaseNumberInput from '../../../components/common/BaseNumberInput.vue';
import BaseSegmented from '../../../components/common/BaseSegmented.vue';
import BaseButton from '../../../components/common/BaseButton.vue';
import { Play } from 'lucide-vue-next';

// 注入 Store
const creativeGoalStore = useCreativeGoalStore();
const creativeBatchStore = useCreativeBatchStore();

// UI 状态
const formTab = ref('goal');
const formTabs = [
  { label: '目标配置', value: 'goal' },
  { label: '批量任务', value: 'batch' }
];

// --- 目标表单状态 ---
const goalForm = ref({
  title: "创作目标",
  description: "把一个创作目标拆成角色、场景、道具与审查任务。",
  characterCount: 1,
  sceneCount: 1,
  propCount: 1,
  reviewCount: 1,
});

const { goalRunning, goalResult } = storeToRefs(creativeGoalStore);

const runGoal = async () => {
  try {
    await creativeGoalStore.runGoalMultiAgentStub({
      projectId: "creative-main-project",
      title: goalForm.value.title,
      description: goalForm.value.description,
      budgetJson: JSON.stringify({
        maxTasks: 12,
        maxRunningTasks: 3,
        maxRetries: 1,
        maxConsecutiveFailures: 3,
      }),
      roleSpecs: [
        { roleKey: "character", taskType: "goal.character.stub", description: "角色草稿", taskCount: goalForm.value.characterCount },
        { roleKey: "scene", taskType: "goal.scene.stub", description: "场景草稿", taskCount: goalForm.value.sceneCount },
        { roleKey: "prop", taskType: "goal.prop.stub", description: "道具草稿", taskCount: goalForm.value.propCount },
        { roleKey: "review", taskType: "goal.review.stub", description: "合并审查", taskCount: goalForm.value.reviewCount },
      ],
      mergeTaskType: "goal.merge_review_stub",
    });
  } catch (e) {}
};

const stopGoal = async () => {
  if (goalResult.value?.id) {
    await creativeGoalStore.stopCreativeGoal(goalResult.value.id);
  }
};

// --- 批量表单状态 ---
const batchJobForm = ref({
  name: "批量模拟任务",
  mode: "mock",
  totalCount: 100,
  concurrency: 5,
  maxRetries: 0,
});

const batchModeOptions = [
  { label: "模拟验证", value: "mock" },
  { label: "提示词生成", value: "prompt" },
  { label: "图片生成", value: "real" },
];

watch(() => batchJobForm.value.mode, (mode) => {
  if (mode === "mock") {
    batchJobForm.value.name = "批量模拟任务";
    batchJobForm.value.concurrency = 5;
    batchJobForm.value.maxRetries = 0;
  } else if (mode === "prompt") {
    batchJobForm.value.name = "批量提示词任务";
    batchJobForm.value.concurrency = 3;
    batchJobForm.value.maxRetries = 1;
  } else {
    batchJobForm.value.name = "批量真实图片任务";
    batchJobForm.value.concurrency = 2;
    batchJobForm.value.maxRetries = 2;
  }
}, { immediate: true });

const createBatchJob = async () => {
  try {
    const isPromptBatch = batchJobForm.value.mode === "prompt";
    const isRealBatch = batchJobForm.value.mode === "real";
    await creativeBatchStore.createBatchImageJob({
      projectId: "creative-main-project",
      name: batchJobForm.value.name,
      batchType: isRealBatch ? "demo.image.generate" : isPromptBatch ? "demo.image.prompt" : "demo.image.mock",
      totalCount: batchJobForm.value.totalCount,
      concurrency: batchJobForm.value.concurrency,
      maxRetries: batchJobForm.value.maxRetries,
      promptTemplate: null,
      imageSize: null,
      providerId: null,
      model: null,
      providerConfig: null,
      budgetJson: JSON.stringify({
        stage: isRealBatch ? "real" : isPromptBatch ? "prompt" : "mock",
        maxConsecutiveFailures: isRealBatch ? 20 : isPromptBatch ? 5 : 20,
      }),
    });
  } catch (e) {}
};

</script>

<template>
  <div class="flex flex-col h-full text-slate-800 text-sm">
    <div class="px-3 pt-3 pb-2">
      <BaseSegmented v-model="formTab" :options="formTabs" block size="sm" />
    </div>

    <!-- 目标配置 Tab -->
    <div v-if="formTab === 'goal'" class="flex-1 overflow-y-auto p-4 custom-scrollbar">
      <div class="space-y-4">
        <BaseInput v-model="goalForm.title" label="目标名称" />
        <BaseTextarea v-model="goalForm.description" label="目标描述" :rows="3" />
        <div class="grid grid-cols-2 gap-3">
          <BaseNumberInput v-model="goalForm.characterCount" label="角色任务数" :min="1" :max="4" />
          <BaseNumberInput v-model="goalForm.sceneCount" label="场景任务数" :min="1" :max="4" />
          <BaseNumberInput v-model="goalForm.propCount" label="道具任务数" :min="1" :max="4" />
          <BaseNumberInput v-model="goalForm.reviewCount" label="审查任务数" :min="1" :max="4" />
        </div>
      </div>

      <div class="mt-6 space-y-2">
        <BaseButton type="primary" size="sm" block :disabled="goalRunning" :loading="goalRunning" @click="runGoal">
          <Play class="w-4 h-4 mr-1.5" /> 发起执行目标
        </BaseButton>
        <BaseButton type="neutral" size="sm" block :disabled="!goalResult?.id" @click="stopGoal">
          停止目标
        </BaseButton>
      </div>
    </div>

    <!-- 批量任务 Tab -->
    <div v-if="formTab === 'batch'" class="flex-1 overflow-y-auto p-4 custom-scrollbar">
      <div class="space-y-4">
        <BaseSegmented v-model="batchJobForm.mode" :options="batchModeOptions" block size="sm" />
        <BaseInput v-model="batchJobForm.name" label="任务名称" />
        <BaseNumberInput v-model="batchJobForm.totalCount" label="执行总数" :min="1" :max="1000" />
        <div class="grid grid-cols-2 gap-3">
          <BaseNumberInput v-model="batchJobForm.concurrency" label="并发数量" :min="1" :max="10" />
          <BaseNumberInput v-model="batchJobForm.maxRetries" label="最大重试次数" :min="0" :max="3" />
        </div>
      </div>

      <div class="mt-6 space-y-2">
        <BaseButton type="primary" size="sm" block @click="createBatchJob">
          创建批量任务
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}
</style>
