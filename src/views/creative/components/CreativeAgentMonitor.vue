<script setup lang="ts">
import { Terminal, Clock, PlayCircle, Loader2 } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import CreativeTaskForm from './CreativeTaskForm.vue';
import BaseSegmented from '../../../components/common/BaseSegmented.vue';
import { useCreativeFormatters } from '../../../composables/useCreativeFormatters';
import { useCreativeBatchStore } from '../../../stores/creative-batch';
import { useCreativeProjectStore } from '../../../stores/creative-project';
import { useCreativeTaskStore } from '../../../stores/creative-task';

const activeTab = ref('properties');
const tabs = [
  { label: '属性配置', value: 'properties' },
  { label: 'Agent 监控', value: 'monitor' }
];

const creativeProjectStore = useCreativeProjectStore();
const creativeTaskStore = useCreativeTaskStore();
const creativeBatchStore = useCreativeBatchStore();
const { statusLabel, userFacingTaskType, userFacingEventMessage } = useCreativeFormatters();

const { activeCreativeProjectId, creativeProjectHistoryTasks } = storeToRefs(creativeProjectStore);
const { promptWorkflowActivity, reviewResultActivity } = storeToRefs(creativeTaskStore);
const { batchJobTasks, batchJobActivity } = storeToRefs(creativeBatchStore);

const activeStatuses = new Set(['queued', 'running', 'retrying', 'cancelling']);

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const queueItems = computed(() => {
  const tasksById = new Map<number, (typeof creativeProjectHistoryTasks.value)[number]>();
  for (const task of creativeProjectHistoryTasks.value) {
    if (task.projectId === activeCreativeProjectId.value) tasksById.set(task.id, task);
  }
  for (const task of batchJobTasks.value) {
    if (task.projectId === activeCreativeProjectId.value) tasksById.set(task.id, task);
  }

  return Array.from(tasksById.values())
    .sort((left, right) => {
      const leftActive = activeStatuses.has(left.status) ? 1 : 0;
      const rightActive = activeStatuses.has(right.status) ? 1 : 0;
      if (leftActive !== rightActive) return rightActive - leftActive;
      return right.updatedAt.localeCompare(left.updatedAt);
    })
    .slice(0, 8)
    .map((task) => ({
      id: task.id,
      title: `#${task.sequenceNo || task.id} ${userFacingTaskType(task.taskType)}`,
      status: task.status,
      statusText: statusLabel(task.status),
    }));
});

const logs = computed(() => [
  ...promptWorkflowActivity.value.map((item) => ({
    id: `prompt-${item.taskId}-${item.createdAt}`,
    projectId: item.projectId,
    time: formatTime(item.createdAt),
    msg: userFacingEventMessage(item.message) || statusLabel(item.status),
    type: item.status === 'failed' ? 'error' : item.status === 'succeeded' ? 'success' : 'info',
  })),
  ...reviewResultActivity.value.map((item) => ({
    id: `review-${item.taskId}-${item.createdAt}`,
    projectId: item.projectId,
    time: formatTime(item.createdAt),
    msg: userFacingEventMessage(item.message) || statusLabel(item.status),
    type: item.status === 'failed' ? 'error' : item.status === 'succeeded' ? 'success' : 'info',
  })),
  ...batchJobActivity.value.map((item) => ({
    id: `batch-${item.batchJobId}-${item.createdAt}`,
    projectId: item.projectId,
    time: formatTime(item.createdAt),
    msg: userFacingEventMessage(item.message) || statusLabel(item.status),
    type: item.status === 'failed' ? 'error' : item.status === 'completed' ? 'success' : 'info',
  })),
]
  .filter((item) => !item.projectId || item.projectId === activeCreativeProjectId.value)
  .slice(0, 80));
</script>

<template>
  <div class="h-full flex flex-col bg-white overflow-hidden text-sm">
    <!-- Header with Tabs -->
    <div class="h-14 flex items-center px-4 shrink-0 justify-center select-none border-b border-slate-100">
      <BaseSegmented v-model="activeTab" :options="tabs" size="sm" class="w-full max-w-[200px]" />
    </div>

    <!-- Properties Tab Content -->
    <div v-show="activeTab === 'properties'" class="flex-1 overflow-hidden">
      <CreativeTaskForm />
    </div>

    <!-- Monitor Tab Content -->
    <div v-show="activeTab === 'monitor'" class="flex-1 flex flex-col overflow-hidden">

      <!-- Queue Section -->
      <div class="h-1/2 flex flex-col border-b border-slate-100">
        <div class="p-3 pb-2 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider select-none shrink-0">
          <Clock class="w-3.5 h-3.5" />
          任务队列
        </div>
        <div class="flex-1 overflow-y-auto p-3 pt-0 space-y-2 custom-scrollbar">
          <div
            v-for="item in queueItems"
            :key="item.id"
            class="p-2 rounded-lg border flex items-start gap-3"
            :class="item.status === 'running' ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100 text-slate-500'"
          >
            <Loader2 v-if="item.status === 'running'" class="w-4 h-4 text-blue-500 animate-spin shrink-0 mt-0.5" />
            <PlayCircle v-else class="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate" :class="item.status === 'running' ? 'text-blue-900' : 'text-slate-600'">
                {{ item.title }}
              </div>
              <div class="text-xs mt-0.5" :class="item.status === 'running' ? 'text-blue-600' : 'text-slate-400'">
                {{ item.statusText }}
              </div>
            </div>
          </div>
          <div v-if="!queueItems.length" class="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-400">
            当前项目暂无任务队列记录
          </div>
        </div>
      </div>

      <!-- Terminal Logs Section -->
      <div class="h-1/2 flex flex-col bg-slate-950 text-slate-300 border-t border-slate-800">
        <div class="p-3 pb-2 flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider select-none shrink-0 border-b border-slate-800">
          <Terminal class="w-3.5 h-3.5" />
          执行日志
        </div>
        <div class="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed custom-scrollbar">
          <div v-for="log in logs" :key="log.id" class="flex gap-2 mb-1">
            <span class="text-slate-500 shrink-0">[{{ log.time }}]</span>
            <span :class="{
              'text-emerald-400': log.type === 'success',
              'text-rose-400': log.type === 'error',
              'text-sky-400': log.type === 'info'
            }">{{ log.msg }}</span>
          </div>
          <div v-if="!logs.length" class="text-slate-500">当前项目暂无执行日志</div>
          <!-- Blinking cursor -->
          <div class="flex gap-2 mt-1">
            <span class="w-1.5 h-3 bg-slate-400 animate-pulse inline-block mt-0.5"></span>
          </div>
        </div>
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
