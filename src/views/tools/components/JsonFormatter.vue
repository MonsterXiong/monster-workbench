<script setup lang="ts">
import { ref } from "vue";
import { Code, Trash2, Copy, AlertTriangle } from "lucide-vue-next";

const emit = defineEmits<{
  (e: "copy", text: string): void;
  (e: "toast", msg: string, type?: "success" | "error"): void;
}>();

const jsonInput = ref("");
const jsonOutput = ref("");
const jsonError = ref("");

function handleFormatJson(spacing = 2) {
  jsonError.value = "";
  if (!jsonInput.value.trim()) {
    jsonOutput.value = "";
    return;
  }
  try {
    const parsed = JSON.parse(jsonInput.value);
    jsonOutput.value = JSON.stringify(parsed, null, spacing);
  } catch (err) {
    jsonError.value = err instanceof Error ? err.message : "无效的 JSON 格式";
  }
}

function handleMinifyJson() {
  jsonError.value = "";
  if (!jsonInput.value.trim()) {
    jsonOutput.value = "";
    return;
  }
  try {
    const parsed = JSON.parse(jsonInput.value);
    jsonOutput.value = JSON.stringify(parsed);
  } catch (err) {
    jsonError.value = err instanceof Error ? err.message : "无效的 JSON 格式";
  }
}

function handleClearJson() {
  jsonInput.value = "";
  jsonOutput.value = "";
  jsonError.value = "";
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- 头部栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-2 shrink-0">
      <div class="tool-section-title">
        <Code class="h-4.5 w-4.5 text-blue-600" />
        JSON 美化与压缩工具
      </div>
    </div>

    <!-- 主体内容 (Flex-1) -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4 min-h-0">
      <!-- 输入端 -->
      <div class="flex flex-col min-h-0 gap-1.5">
        <div class="flex items-center justify-between shrink-0">
          <span class="text-xs font-bold text-slate-500">JSON 输入</span>
          <button class="flex items-center gap-1 text-[11px] text-error font-bold hover:underline" @click="handleClearJson">
            <Trash2 class="h-3.5 w-3.5" /> 清空
          </button>
        </div>
        <textarea
          v-model="jsonInput"
          placeholder="请在此处粘贴或输入需要处理的 JSON 字符串..."
          class="workbench-textarea flex-1 p-3 leading-5 resize-none overflow-y-auto font-mono text-[11px]"
        ></textarea>
      </div>

      <!-- 输出端 -->
      <div class="flex flex-col min-h-0 gap-1.5">
        <div class="flex items-center justify-between shrink-0">
          <span class="text-xs font-bold text-slate-500">处理输出</span>
          <button
            class="flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline"
            :disabled="!jsonOutput"
            @click="emit('copy', jsonOutput)"
          >
            <Copy class="h-3.5 w-3.5" /> 复制结果
          </button>
        </div>
        <div class="visual-result-panel flex-1 p-4 overflow-y-auto no-scrollbar">
          <div v-if="jsonError" class="flex items-start gap-2 text-error font-semibold leading-5">
            <AlertTriangle class="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{{ jsonError }}</span>
          </div>
          <pre v-else-if="jsonOutput" class="whitespace-pre-wrap font-mono break-all text-slate-700 font-semibold">{{ jsonOutput }}</pre>
          <span v-else class="text-slate-400 font-bold italic">等待格式化输出...</span>
        </div>
      </div>
    </div>

    <!-- 底部控制按钮组 -->
    <div class="flex flex-wrap gap-3 mt-4 border-t border-slate-100 pt-4 shrink-0">
      <button class="workbench-btn bg-primary text-primary-content text-xs h-9.5 px-5 font-bold" @click="handleFormatJson(2)">
        格式化 (2空格)
      </button>
      <button class="workbench-btn border border-slate-200 bg-base-100 hover:bg-slate-50 text-slate-700 text-xs h-9.5 px-5 font-bold" @click="handleFormatJson(4)">
        格式化 (4空格)
      </button>
      <button class="workbench-btn border border-slate-200 bg-base-100 hover:bg-slate-50 text-slate-700 text-xs h-9.5 px-5 font-bold" @click="handleMinifyJson">
        压缩为一行
      </button>
    </div>
  </div>
</template>

<style scoped>
.tool-section-title {
  @apply text-sm font-extrabold text-slate-800 flex items-center gap-2;
}
.visual-result-panel {
  @apply rounded-2xl border border-slate-300 bg-slate-50/20 text-slate-600 font-mono text-xs relative shadow-inner;
}
</style>
