<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Clock, RefreshCw, Copy } from "lucide-vue-next";

const emit = defineEmits<{
  (e: "copy", text: string): void;
  (e: "toast", msg: string, type?: "success" | "error"): void;
}>();

const currentTimestamp = ref(Math.floor(Date.now() / 1000));
let timerId: number | null = null;
const tsInput = ref(String(Math.floor(Date.now() / 1000)));
const tsOutput = ref("");
const dateInput = ref("");
const dateOutput = ref("");

function updateCurrentTime() {
  currentTimestamp.value = Math.floor(Date.now() / 1000);
}

onMounted(() => {
  timerId = window.setInterval(updateCurrentTime, 1000);
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  dateInput.value = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
});

onUnmounted(() => {
  if (timerId !== null) {
    clearInterval(timerId);
  }
});

function handleConvertTsToDate() {
  if (!tsInput.value.trim()) {
    tsOutput.value = "请输入时间戳";
    return;
  }
  try {
    let rawVal = Number(tsInput.value.trim());
    if (tsInput.value.trim().length >= 13) {
      rawVal = Math.floor(rawVal / 1000);
    }
    const date = new Date(rawVal * 1000);
    if (isNaN(date.getTime())) {
      tsOutput.value = "无效的时间戳";
      return;
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    tsOutput.value = `${y}-${m}-${d} ${h}:${min}:${s}`;
  } catch {
    tsOutput.value = "转换失败";
  }
}

function handleConvertDateToTs() {
  if (!dateInput.value.trim()) {
    dateOutput.value = "请输入日期时间字符串";
    return;
  }
  try {
    const cleaned = dateInput.value.trim().replace(/\//g, "-");
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) {
      dateOutput.value = "无效的日期时间格式（推荐：YYYY-MM-DD HH:mm:ss）";
      return;
    }
    dateOutput.value = `${Math.floor(date.getTime() / 1000)} 秒\n${date.getTime()} 毫秒`;
  } catch {
    dateOutput.value = "转换失败";
  }
}

function handleUseCurrentTs() {
  tsInput.value = String(currentTimestamp.value);
  handleConvertTsToDate();
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- 头部栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-2 shrink-0">
      <div class="tool-section-title">
        <Clock class="h-4.5 w-4.5 text-blue-600" />
        Unix 时间戳双向转换
      </div>
      <!-- 实时当前时间戳气泡 -->
      <div class="flex items-center gap-2 bg-blue-50 border border-blue-150 px-3 py-1 rounded-full text-xs font-bold text-blue-600 shrink-0">
        <RefreshCw class="h-3 w-3 animate-spin text-blue-500" />
        <span>当前时间戳：{{ currentTimestamp }}</span>
      </div>
    </div>

    <!-- 主体 Flex 内容 (Flex-1) -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 min-h-0 py-1">
      <!-- 转换一：时间戳转北京时间 -->
      <div class="rounded-2xl border border-slate-200 bg-slate-50/20 p-5 flex flex-col gap-4 min-h-0">
        <div class="text-xs font-black text-slate-700 uppercase tracking-wide shrink-0">时间戳 ➜ 本地日期时间</div>
        <div class="flex gap-2.5 shrink-0">
          <input
            v-model="tsInput"
            type="text"
            placeholder="时间戳（秒级或毫秒级）"
            class="workbench-input h-10 flex-1"
          />
          <button class="workbench-btn border border-slate-200 bg-base-100 hover:bg-slate-50 text-slate-700 h-10 text-xs px-3 font-bold" @click="handleUseCurrentTs">
            当前值
          </button>
        </div>
        <button class="workbench-btn bg-primary text-primary-content h-10 text-xs font-bold shrink-0 shadow-sm shadow-primary/10" @click="handleConvertTsToDate">
          开始转换
        </button>
        <div class="visual-result-box flex-1 min-h-0 items-start overflow-y-auto">
          <span class="text-slate-800 font-bold select-all leading-5 pr-2 break-all">{{ tsOutput || "等待输入转换" }}</span>
          <button
            v-if="tsOutput"
            class="text-blue-600 hover:text-blue-800 transition shrink-0 mt-0.5"
            title="复制"
            @click="emit('copy', tsOutput)"
          >
            <Copy class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- 转换二：日期时间转时间戳 -->
      <div class="rounded-2xl border border-slate-200 bg-slate-50/20 p-5 flex flex-col gap-4 min-h-0">
        <div class="text-xs font-black text-slate-700 uppercase tracking-wide shrink-0">本地日期时间 ➜ 时间戳</div>
        <div class="shrink-0">
          <input
            v-model="dateInput"
            type="text"
            placeholder="格式：YYYY-MM-DD HH:mm:ss"
            class="workbench-input h-10 w-full"
          />
        </div>
        <button class="workbench-btn bg-primary text-primary-content h-10 text-xs font-bold shrink-0 shadow-sm shadow-primary/10" @click="handleConvertDateToTs">
          开始转换
        </button>
        <div class="visual-result-box flex-1 min-h-0 items-start overflow-y-auto">
          <span class="text-slate-800 font-bold whitespace-pre-wrap select-all leading-5 pr-2 break-all">{{ dateOutput || "等待输入转换" }}</span>
          <button
            v-if="dateOutput && !dateOutput.startsWith('无效')"
            class="text-blue-600 hover:text-blue-800 transition shrink-0 mt-0.5"
            title="复制"
            @click="emit('copy', dateOutput.split(' ')[0])"
          >
            <Copy class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-section-title {
  @apply text-sm font-extrabold text-slate-800 flex items-center gap-2;
}
.visual-result-box {
  @apply rounded-2xl border border-slate-300 bg-white p-4 font-mono text-xs flex justify-between shadow-inner;
}
</style>
