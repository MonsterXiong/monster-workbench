<script setup lang="ts">
import { computed } from "vue";
import { ShieldAlert, Radio, Cpu } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useConfirm } from "../../../composables/useConfirm";
import { useToast } from "../../../composables/useToast";
import { useToolsStore } from "../../../stores/tools";
import { useI18n } from "../../../composables/useI18n";
import { formatTemplate, isPort } from "../../../utils";

const { confirm } = useConfirm();
const { triggerToast } = useToast();
const { t } = useI18n();

const toolsStore = useToolsStore();
const {
  portCleaner,
  portQueryLoading,
  portProcessList,
  hasQueriedPort,
  queryInstancesLoading,
  processInstances,
  hasQueriedInstances,
  killLoadingPid,
  killAllLoading,
} = storeToRefs(toolsStore);

async function handleQueryPort() {
  if (!isPort(portCleaner.value.portInput)) {
    triggerToast(t("tools.portCleaner.invalidPort"), "error");
    return;
  }
  try {
    await toolsStore.queryPortProcess();
  } catch (err: any) {
    triggerToast(err?.message || t("tools.portCleaner.queryPortFailed"), "error");
  }
}

async function handleKillProcess(pid: number) {
  const ok = await confirm({
    title: t("tools.portCleaner.killProcessTitle"),
    message: formatTemplate(t("tools.portCleaner.killProcessConfirm"), { pid }),
    confirmText: t("common.confirm"),
    danger: true,
  });
  if (!ok) return;
  try {
    await toolsStore.killPortProcess(pid);
    triggerToast(formatTemplate(t("tools.portCleaner.killProcessSuccess"), { pid }), "success");
  } catch (err: any) {
    triggerToast(err?.message || t("tools.portCleaner.killProcessFailed"), "error");
  }
}

async function handleQueryInstances() {
  const name = portCleaner.value.processNameInput.trim();
  if (!name) {
    triggerToast(t("tools.portCleaner.inputProcessName"), "error");
    return;
  }
  try {
    await toolsStore.queryProcessInstances();
  } catch (err: any) {
    triggerToast(err?.message || t("tools.portCleaner.queryInstancesFailed"), "error");
  }
}

async function handleKillInstance(pid: number) {
  const ok = await confirm({
    title: t("tools.portCleaner.killInstanceTitle"),
    message: formatTemplate(t("tools.portCleaner.killInstanceConfirm"), { pid }),
    confirmText: t("common.confirm"),
    danger: true,
  });
  if (!ok) return;

  try {
    await toolsStore.killProcessInstance(pid);
    triggerToast(formatTemplate(t("tools.portCleaner.killInstanceSuccess"), { pid }), "success");
  } catch (err: any) {
    triggerToast(err?.message || t("tools.portCleaner.killInstanceFailed"), "error");
  }
}

async function handleKillAllInstances() {
  const name = portCleaner.value.processNameInput.trim();
  if (!name) return;

  const count = processInstances.value.length;
  const ok = await confirm({
    title: t("tools.portCleaner.killAllTitle"),
    message: formatTemplate(t("tools.portCleaner.killAllConfirm"), { name, count }),
    confirmText: t("common.confirm"),
    danger: true,
  });
  if (!ok) return;

  try {
    await toolsStore.killAllProcessInstances();
    triggerToast(formatTemplate(t("tools.portCleaner.killAllSuccess"), { name }), "success");
  } catch (err: any) {
    triggerToast(err?.message || t("tools.portCleaner.killAllFailed"), "error");
  }
}

// 端口表格列 - 响应式翻译
const portColumns = computed(() => [
  { key: "proto", title: t("tools.portCleaner.colProto"), width: "12%" },
  { key: "local_addr", title: t("tools.portCleaner.colLocalAddr") },
  { key: "state", title: t("tools.portCleaner.colState"), width: "15%" },
  { key: "pid", title: t("tools.portCleaner.colPid"), width: "15%" },
  { key: "name", title: t("tools.portCleaner.colName") },
  { key: "action", title: t("tools.portCleaner.colAction"), width: "15%" }
]);

// 实例表格列 - 响应式翻译
const instanceColumns = computed(() => [
  { key: "pid", title: t("tools.portCleaner.colPid"), width: "15%" },
  { key: "name", title: t("tools.portCleaner.colServiceName") },
  { key: "session_name", title: t("tools.portCleaner.colSessionName") },
  { key: "session_num", title: t("tools.portCleaner.colSessionNum") },
  { key: "mem_usage", title: t("tools.portCleaner.colMemUsage") },
  { key: "action", title: t("tools.portCleaner.colAction"), width: "15%" }
]);
</script>

<template>
  <div class="flex flex-col h-full min-h-0 select-none">
    <!-- 头部栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2 shrink-0">
      <div class="tool-section-title">
        <ShieldAlert class="h-4.5 w-4.5 text-primary" />
        {{ t('tools.portCleaner.title') }}
      </div>
    </div>

    <!-- 主体：左右分列模块化布局 -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 min-h-0">

      <!-- 左侧：网络端口号占用诊断区块 -->
      <div class="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col min-h-0 gap-4.5">
        <!-- 卡片头部标题 -->
        <div class="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <Radio class="h-4.5 w-4.5 text-primary" />
          <span class="text-xs font-extrabold uppercase tracking-wider text-slate-400">{{ t('tools.portCleaner.portCardTitle') }}</span>
        </div>

        <!-- 查询端口输入行 -->
        <div class="flex flex-col gap-1.5 shrink-0">
          <label class="text-xs font-bold text-slate-500">{{ t('tools.portCleaner.portInputLabel') }}</label>
          <div class="flex gap-2">
            <BaseInput
              v-model="portCleaner.portInput"
              type="text"
              :placeholder="t('tools.portCleaner.portInputPlaceholder')"
              @keyup.enter="handleQueryPort"
            />
            <BaseButton
              :loading="portQueryLoading"
              @click="handleQueryPort"
            >
              {{ t('tools.portCleaner.portQueryBtn') }}
            </BaseButton>
          </div>
        </div>

        <!-- 端口诊断结果列表 -->
        <div class="flex-1 flex flex-col min-h-0 gap-1.5">
          <label class="text-xs font-bold text-slate-500">{{ t('tools.portCleaner.portResultLabel') }}</label>
          <div class="flex-1 min-h-0 relative">
            <BaseTable v-if="hasQueriedPort" size="sm" :columns="portColumns" :data="portProcessList" :striped="true" :hover="true">
              <template #proto="{ row }">
                <span class="font-mono text-slate-500">{{ row.proto }}</span>
              </template>
              <template #local_addr="{ row }">
                <span class="font-mono break-all text-slate-800 dark:text-slate-200">{{ row.local_addr }}</span>
              </template>
              <template #state="{ row }">
                <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold leading-none border border-slate-200/50 dark:border-slate-700/50">{{ row.state }}</span>
              </template>
              <template #pid="{ row }">
                <span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ row.pid }}</span>
              </template>
              <template #name="{ row }">
                <span class="font-bold truncate max-w-[100px]" :title="row.name">{{ row.name }}</span>
              </template>
              <template #action="{ row }">
                <BaseButton size="xs" type="danger" outline :disabled="killLoadingPid === row.pid" @click="handleKillProcess(row.pid)">
                  {{ t('tools.portCleaner.killBtn') }}
                </BaseButton>
              </template>
            </BaseTable>
            <div v-else class="h-full border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/30 flex items-center justify-center">
              <BaseEmpty :description="t('tools.portCleaner.portEmptyTip')" icon="Search" />
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：服务进程名实例诊断区块 -->
      <div class="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col min-h-0 gap-4.5">
        <!-- 卡片头部标题 -->
        <div class="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <Cpu class="h-4.5 w-4.5 text-primary" />
          <span class="text-xs font-extrabold uppercase tracking-wider text-slate-400">{{ t('tools.portCleaner.processCardTitle') }}</span>
        </div>

        <!-- 通过服务名查询实例输入行 -->
        <div class="flex flex-col gap-1.5 shrink-0">
          <label class="text-xs font-bold text-slate-500">{{ t('tools.portCleaner.processInputLabel') }}</label>
          <div class="flex gap-2">
            <BaseInput
              v-model="portCleaner.processNameInput"
              type="text"
              :placeholder="t('tools.portCleaner.processInputPlaceholder')"
              @keyup.enter="handleQueryInstances"
            />
            <BaseButton
              :loading="queryInstancesLoading"
              @click="handleQueryInstances"
            >
              {{ t('tools.portCleaner.processQueryBtn') }}
            </BaseButton>
          </div>
        </div>

        <!-- 实例诊断结果列表 -->
        <div class="flex-1 flex flex-col min-h-0 gap-1.5">
          <div class="flex items-center justify-between h-5">
            <label class="text-xs font-bold text-slate-500">{{ t('tools.portCleaner.processResultLabel') }}</label>
            <BaseButton
              v-if="processInstances.length > 0"
              size="xs"
              type="danger"
              :loading="killAllLoading"
              @click="handleKillAllInstances"
            >
              {{ formatTemplate(t('tools.portCleaner.killAllBtn'), { count: processInstances.length }) }}
            </BaseButton>
          </div>
          <div class="flex-1 min-h-0 relative">
            <BaseTable v-if="hasQueriedInstances" size="sm" :columns="instanceColumns" :data="processInstances" :striped="true" :hover="true">
              <template #pid="{ row }">
                <span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ row.pid }}</span>
              </template>
              <template #name="{ row }">
                <span class="font-bold truncate max-w-[90px]" :title="row.name">{{ row.name }}</span>
              </template>
              <template #session_name="{ row }">
                <span class="text-slate-500">{{ row.session_name }}</span>
              </template>
              <template #session_num="{ row }">
                <span class="font-mono text-slate-400">{{ row.session_num }}</span>
              </template>
              <template #mem_usage="{ row }">
                <span class="font-mono text-primary font-bold text-[10px]">{{ row.mem_usage }}</span>
              </template>
              <template #action="{ row }">
                <BaseButton size="xs" type="danger" outline :disabled="killLoadingPid === row.pid" @click="handleKillInstance(row.pid)">
                  {{ t('tools.portCleaner.killBtn') }}
                </BaseButton>
              </template>
            </BaseTable>
            <div v-else class="h-full border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/30 flex items-center justify-center">
              <BaseEmpty :description="t('tools.portCleaner.processEmptyTip')" icon="Search" />
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.tool-section-title {
  @apply text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2;
}
</style>
