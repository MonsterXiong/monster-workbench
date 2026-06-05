<script setup lang="ts">
import { ref } from "vue";
import { Binary, Trash2, Copy, AlertTriangle } from "lucide-vue-next";

const emit = defineEmits<{
  (e: "copy", text: string): void;
  (e: "toast", msg: string, type?: "success" | "error"): void;
}>();

const base64Input = ref("");
const base64Output = ref("");
const base64Error = ref("");

function handleEncodeBase64() {
  base64Error.value = "";
  if (!base64Input.value) {
    base64Output.value = "";
    return;
  }
  try {
    base64Output.value = btoa(unescape(encodeURIComponent(base64Input.value)));
  } catch (err) {
    base64Error.value = "编码失败，内容可能包含无法识别的字符。";
  }
}

function handleDecodeBase64() {
  base64Error.value = "";
  if (!base64Input.value.trim()) {
    base64Output.value = "";
    return;
  }
  try {
    base64Output.value = decodeURIComponent(escape(atob(base64Input.value.trim())));
  } catch (err) {
    base64Error.value = "解码失败，可能不是标准的 Base64 字符串。";
  }
}

function handleClearBase64() {
  base64Input.value = "";
  base64Output.value = "";
  base64Error.value = "";
}
</script>

<template>
  <div class="flex flex-col h-[520px] min-h-0">
    <!-- 头部栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-2 shrink-0">
      <div class="tool-section-title">
        <Binary class="h-4.5 w-4.5 text-blue-600" />
        Base64 双向字符处理
      </div>
    </div>

    <!-- 主体内容 (Flex-1) -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4 min-h-0">
      <!-- 输入端 -->
      <div class="flex flex-col min-h-0 gap-1.5">
        <div class="flex items-center justify-between shrink-0">
          <span class="text-xs font-bold text-slate-500">待处理文本</span>
          <button class="flex items-center gap-1 text-[11px] text-error font-bold hover:underline" @click="handleClearBase64">
            <Trash2 class="h-3.5 w-3.5" /> 清空
          </button>
        </div>
        <textarea
          v-model="base64Input"
          placeholder="请输入您要进行 Base64 编码或解码的文本..."
          class="workbench-textarea visual-textarea flex-1 p-3 leading-5 resize-none overflow-y-auto"
        ></textarea>
      </div>

      <!-- 输出端 -->
      <div class="flex flex-col min-h-0 gap-1.5">
        <div class="flex items-center justify-between shrink-0">
          <span class="text-xs font-bold text-slate-500">结果输出</span>
          <button
            class="flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline"
            :disabled="!base64Output"
            @click="emit('copy', base64Output)"
          >
            <Copy class="h-3.5 w-3.5" /> 复制结果
          </button>
        </div>
        <div class="visual-result-panel flex-1 p-4 overflow-y-auto no-scrollbar">
          <div v-if="base64Error" class="flex items-start gap-2 text-error font-semibold leading-5">
            <AlertTriangle class="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{{ base64Error }}</span>
          </div>
          <pre v-else-if="base64Output" class="whitespace-pre-wrap font-mono break-all text-slate-700 font-semibold">{{ base64Output }}</pre>
          <span v-else class="text-slate-400 font-bold italic">等待处理输出...</span>
        </div>
      </div>
    </div>

    <!-- 底部控制按钮组 -->
    <div class="flex flex-wrap gap-3 mt-4 border-t border-slate-100 pt-4 shrink-0">
      <button class="workbench-btn bg-primary text-primary-content text-xs h-9.5 px-6 font-bold" @click="handleEncodeBase64">
        Base64 编码
      </button>
      <button class="workbench-btn border border-primary text-primary hover:bg-primary/5 text-xs h-9.5 px-6 font-semibold" @click="handleDecodeBase64">
        Base64 解码
      </button>
    </div>
  </div>
</template>

<style scoped>
.tool-section-title {
  @apply text-sm font-extrabold text-slate-800 flex items-center gap-2;
}
.visual-textarea {
  border: 1px solid #cbd5e1 !important;
  background-color: #f8fafc !important;
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.03) !important;
  transition: all 0.2s ease !important;
  font-family: monospace !important;
  font-size: 0.75rem !important;
}
.visual-textarea:focus {
  border-color: #2563eb !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
  background-color: #ffffff !important;
  outline: none !important;
}
.visual-result-panel {
  @apply rounded-2xl border border-slate-300 bg-slate-50/20 text-slate-600 font-mono text-xs relative shadow-inner;
}
</style>
