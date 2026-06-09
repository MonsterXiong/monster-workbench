<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Clock, RefreshCw, Copy } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useToolsStore } from "../../../stores/tools";
import { useI18n } from "../../../composables/useI18n";
import {
  clearIntervalHandle,
  createInterval,
  formatCurrentDate,
  formatDate,
  getCurrentUnixTimestamp,
  isBlank,
  parseDateInput,
  parseUnixTimestampInput,
  splitOnce,
  toUnixTimestamp,
  type IntervalHandle,
} from "../../../utils";

const emit = defineEmits<{
  (e: "copy", text: string): void;
  (e: "toast", msg: string, type?: "success" | "error"): void;
}>();

const { t } = useI18n();
const toolsStore = useToolsStore();
const { timestampConverter } = storeToRefs(toolsStore);

const currentTimestamp = ref(getCurrentUnixTimestamp());
let timerId: IntervalHandle | null = null;

const tsOutput = ref("");
const hasTsError = ref(false);
const dateInput = ref("");
const dateOutput = ref("");
const hasDateError = ref(false);

function updateCurrentTime() {
  currentTimestamp.value = getCurrentUnixTimestamp();
}

onMounted(() => {
  timerId = createInterval(updateCurrentTime, 1000);

  if (!timestampConverter.value.timestampInput) {
    timestampConverter.value.timestampInput = String(getCurrentUnixTimestamp());
  }

  dateInput.value = formatCurrentDate();
});

onUnmounted(() => {
  clearIntervalHandle(timerId);
  timerId = null;
});

function handleConvertTsToDate() {
  if (isBlank(timestampConverter.value.timestampInput)) {
    tsOutput.value = t("tools.timestamp.emptyTsError");
    hasTsError.value = true;
    return;
  }
  try {
    const date = parseUnixTimestampInput(timestampConverter.value.timestampInput);
    if (!date) {
      tsOutput.value = t("tools.timestamp.invalidTsError");
      hasTsError.value = true;
      return;
    }
    tsOutput.value = formatDate(date);
    hasTsError.value = false;
  } catch {
    tsOutput.value = t("tools.timestamp.convertFailed");
    hasTsError.value = true;
  }
}

function handleConvertDateToTs() {
  if (isBlank(dateInput.value)) {
    dateOutput.value = t("tools.timestamp.emptyDateError");
    hasDateError.value = true;
    return;
  }
  try {
    const date = parseDateInput(dateInput.value);
    if (!date) {
      dateOutput.value = t("tools.timestamp.invalidDateError");
      hasDateError.value = true;
      return;
    }
    dateOutput.value = `${toUnixTimestamp(date)} ${t('tools.timestamp.seconds')}\n${toUnixTimestamp(date, "millisecond")} ${t('tools.timestamp.milliseconds')}`;
    hasDateError.value = false;
  } catch {
    dateOutput.value = t("tools.timestamp.convertFailed");
    hasDateError.value = true;
  }
}

function handleUseCurrentTs() {
  timestampConverter.value.timestampInput = String(currentTimestamp.value);
  handleConvertTsToDate();
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- 头部栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2 shrink-0 select-none">
      <div class="tool-section-title">
        <Clock class="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
        {{ t("tools.timestamp.title") }}
      </div>
      <!-- 实时当前时间戳气泡 -->
      <div class="flex items-center gap-2 bg-blue-500/10 dark:bg-blue-955/20 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
        <RefreshCw class="h-3 w-3 animate-spin text-blue-500" />
        <span>{{ t("tools.timestamp.currentTsLabel") }}{{ currentTimestamp }}</span>
      </div>
    </div>

    <!-- 主体 Flex 内容 (Flex-1) -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 min-h-0 py-1">
      <!-- 转换一：时间戳转本地日期时间 -->
      <div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-5 flex flex-col gap-4 min-h-0">
        <div class="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide shrink-0 select-none">{{ t("tools.timestamp.tsToDateTitle") }}</div>
        <div class="flex gap-2.5 shrink-0">
          <BaseInput
            v-model="timestampConverter.timestampInput"
            :placeholder="t('tools.timestamp.tsPlaceholder')"
          />
          <BaseButton type="neutral" outline size="md" @click="handleUseCurrentTs">
            {{ t("tools.timestamp.currentValBtn") }}
          </BaseButton>
        </div>
        <BaseButton type="primary" size="md" block @click="handleConvertTsToDate">
          {{ t("tools.timestamp.convertBtn") }}
        </BaseButton>
        <div class="visual-result-box flex-1 min-h-0 items-start overflow-y-auto">
          <span class="text-slate-800 dark:text-slate-200 font-bold select-all leading-5 pr-2 break-all">{{ tsOutput || t("tools.timestamp.waitingInput") }}</span>
          <BaseButton
            v-if="tsOutput && !hasTsError"
            type="ghost"
            size="xs"
            class="text-blue-650 dark:text-blue-450 hover:text-blue-800 transition shrink-0 mt-0.5 !p-1 h-auto min-h-0"
            :title="t('tools.timestamp.copyBtnTitle')"
            @click="emit('copy', tsOutput)"
          >
            <template #icon><Copy class="h-3.5 w-3.5" /></template>
          </BaseButton>
        </div>
      </div>

      <!-- 转换二：日期时间转时间戳 -->
      <div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-5 flex flex-col gap-4 min-h-0">
        <div class="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide shrink-0 select-none">{{ t("tools.timestamp.dateToTsTitle") }}</div>
        <div class="shrink-0">
          <BaseInput
            v-model="dateInput"
            :placeholder="t('tools.timestamp.datePlaceholder')"
          />
        </div>
        <BaseButton type="primary" size="md" block @click="handleConvertDateToTs">
          {{ t("tools.timestamp.convertBtn") }}
        </BaseButton>
        <div class="visual-result-box flex-1 min-h-0 items-start overflow-y-auto">
          <span class="text-slate-800 dark:text-slate-200 font-bold whitespace-pre-wrap select-all leading-5 pr-2 break-all">{{ dateOutput || t("tools.timestamp.waitingInput") }}</span>
          <BaseButton
            v-if="dateOutput && !hasDateError"
            type="ghost"
            size="xs"
            class="text-blue-650 dark:text-blue-450 hover:text-blue-800 transition shrink-0 mt-0.5 !p-1 h-auto min-h-0"
            :title="t('tools.timestamp.copyBtnTitle')"
            @click="emit('copy', splitOnce(dateOutput, ' ').before)"
          >
            <template #icon><Copy class="h-3.5 w-3.5" /></template>
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-section-title {
  @apply text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2;
}
.visual-result-box {
  @apply rounded-2xl p-4 font-mono text-xs flex justify-between shadow-inner border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40;
}
</style>
