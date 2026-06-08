<script setup lang="ts">
import { ref } from "vue";
import { Code, Trash2, Copy, AlertTriangle } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useToolsStore } from "../../../stores/tools";
import { useI18n } from "../../../composables/useI18n";
import { formatJsonText, minifyJsonText } from "../../../utils";

const emit = defineEmits<{
  (e: "copy", text: string): void;
  (e: "toast", msg: string, type?: "success" | "error"): void;
}>();

const { t } = useI18n();
const toolsStore = useToolsStore();
const { jsonFormatter } = storeToRefs(toolsStore);

const jsonOutput = ref("");
const jsonError = ref("");

function handleFormatJson(spacing = 2) {
  jsonError.value = "";
  if (!jsonFormatter.value.jsonInput.trim()) {
    jsonOutput.value = "";
    return;
  }
  try {
    jsonOutput.value = formatJsonText(jsonFormatter.value.jsonInput, spacing);
  } catch (err) {
    jsonError.value = err instanceof Error ? err.message : t("tools.jsonFormat.invalidJson");
  }
}

function handleMinifyJson() {
  jsonError.value = "";
  if (!jsonFormatter.value.jsonInput.trim()) {
    jsonOutput.value = "";
    return;
  }
  try {
    jsonOutput.value = minifyJsonText(jsonFormatter.value.jsonInput);
  } catch (err) {
    jsonError.value = err instanceof Error ? err.message : t("tools.jsonFormat.invalidJson");
  }
}

function handleClearJson() {
  jsonFormatter.value.jsonInput = "";
  jsonOutput.value = "";
  jsonError.value = "";
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- 头部栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2 shrink-0">
      <div class="tool-section-title">
        <Code class="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
        {{ t("tools.jsonFormat.title") }}
      </div>
    </div>

    <!-- 主体内容 (Flex-1) -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4 min-h-0">
      <!-- 输入端 -->
      <div class="flex flex-col min-h-0 gap-1.5">
        <div class="flex items-center justify-between shrink-0 select-none">
          <span class="text-xs font-bold text-slate-500">{{ t("tools.jsonFormat.inputLabel") }}</span>
          <BaseButton
            type="danger"
            outline
            size="xs"
            @click="handleClearJson"
          >
            <template #icon><Trash2 class="h-3.5 w-3.5" /></template>
            {{ t("tools.dirGen.clearBtn") }}
          </BaseButton>
        </div>
        <textarea
          v-model="jsonFormatter.jsonInput"
          :placeholder="t('tools.jsonFormat.inputPlaceholder')"
          class="workbench-textarea flex-1 p-3 leading-5 resize-none overflow-y-auto font-mono text-[11px]"
        ></textarea>
      </div>

      <!-- 输出端 -->
      <div class="flex flex-col min-h-0 gap-1.5">
        <div class="flex items-center justify-between shrink-0 select-none">
          <span class="text-xs font-bold text-slate-500">{{ t("tools.jsonFormat.outputLabel") }}</span>
          <BaseButton
            type="link"
            size="xs"
            :disabled="!jsonOutput"
            @click="emit('copy', jsonOutput)"
          >
            <template #icon><Copy class="h-3.5 w-3.5" /></template>
            {{ t("tools.base64.copyBtn") }}
          </BaseButton>
        </div>
        <div class="visual-result-panel flex-1 p-4 overflow-y-auto no-scrollbar">
          <div v-if="jsonError" class="flex items-start gap-2 text-error font-semibold leading-5 select-none">
            <AlertTriangle class="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{{ jsonError }}</span>
          </div>
          <pre v-else-if="jsonOutput" class="whitespace-pre-wrap font-mono break-all text-slate-800 dark:text-slate-200 font-semibold">{{ jsonOutput }}</pre>
          <span v-else class="text-slate-400 font-bold italic select-none">{{ t("tools.jsonFormat.waitingOutput") }}</span>
        </div>
      </div>
    </div>

    <!-- 底部控制按钮组 -->
    <div class="flex flex-wrap gap-3 mt-4 border-t border-slate-200 dark:border-slate-800 pt-4 shrink-0">
      <BaseButton type="primary" size="sm" @click="handleFormatJson(2)">
        {{ t("tools.jsonFormat.format2Spaces") }}
      </BaseButton>
      <BaseButton type="neutral" outline size="sm" @click="handleFormatJson(4)">
        {{ t("tools.jsonFormat.format4Spaces") }}
      </BaseButton>
      <BaseButton type="neutral" outline size="sm" @click="handleMinifyJson">
        {{ t("tools.jsonFormat.minifyBtn") }}
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.tool-section-title {
  @apply text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2;
}
.visual-result-panel {
  @apply rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 font-mono text-xs relative shadow-inner;
}
</style>
