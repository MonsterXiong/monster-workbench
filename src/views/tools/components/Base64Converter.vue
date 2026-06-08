<script setup lang="ts">
import { ref } from "vue";
import { Binary, Trash2, Copy, AlertTriangle } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useToolsStore } from "../../../stores/tools";
import { useI18n } from "../../../composables/useI18n";
import { decodeBase64Utf8, encodeBase64Utf8 } from "../../../utils";

const emit = defineEmits<{
  (e: "copy", text: string): void;
  (e: "toast", msg: string, type?: "success" | "error"): void;
}>();

const { t } = useI18n();
const toolsStore = useToolsStore();
const { base64Converter } = storeToRefs(toolsStore);

const base64Output = ref("");
const base64Error = ref("");

function handleEncodeBase64() {
  base64Error.value = "";
  if (!base64Converter.value.base64Input) {
    base64Output.value = "";
    return;
  }
  try {
    base64Output.value = encodeBase64Utf8(base64Converter.value.base64Input);
  } catch (err) {
    base64Error.value = t("tools.base64.encodeError");
  }
}

function handleDecodeBase64() {
  base64Error.value = "";
  if (!base64Converter.value.base64Input.trim()) {
    base64Output.value = "";
    return;
  }
  try {
    base64Output.value = decodeBase64Utf8(base64Converter.value.base64Input.trim());
  } catch (err) {
    base64Error.value = t("tools.base64.decodeError");
  }
}

function handleClearBase64() {
  base64Converter.value.base64Input = "";
  base64Output.value = "";
  base64Error.value = "";
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- 头部栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2 shrink-0">
      <div class="tool-section-title">
        <Binary class="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
        {{ t("tools.base64.title") }}
      </div>
    </div>

    <!-- 主体内容 (Flex-1) -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4 min-h-0">
      <!-- 输入端 -->
      <div class="flex flex-col min-h-0 gap-1.5">
        <div class="flex items-center justify-between shrink-0 select-none">
          <span class="text-xs font-bold text-slate-500">{{ t("tools.base64.inputLabel") }}</span>
          <BaseButton
            type="danger"
            outline
            size="xs"
            @click="handleClearBase64"
          >
            <template #icon><Trash2 class="h-3 w-3" /></template>
            {{ t("tools.base64.clearBtn") }}
          </BaseButton>
        </div>
        <textarea
          v-model="base64Converter.base64Input"
          :placeholder="t('tools.base64.inputPlaceholder')"
          class="workbench-textarea flex-1 p-3 leading-5 resize-none overflow-y-auto"
        ></textarea>
      </div>

      <!-- 输出端 -->
      <div class="flex flex-col min-h-0 gap-1.5">
        <div class="flex items-center justify-between shrink-0 select-none">
          <span class="text-xs font-bold text-slate-500">{{ t("tools.base64.outputLabel") }}</span>
          <BaseButton
            type="link"
            size="xs"
            :disabled="!base64Output"
            @click="emit('copy', base64Output)"
          >
            <template #icon><Copy class="h-3.5 w-3.5" /></template>
            {{ t("tools.base64.copyBtn") }}
          </BaseButton>
        </div>
        <div class="visual-result-panel flex-1 p-4 overflow-y-auto no-scrollbar">
          <div v-if="base64Error" class="flex items-start gap-2 text-error font-semibold leading-5 select-none">
            <AlertTriangle class="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{{ base64Error }}</span>
          </div>
          <pre v-else-if="base64Output" class="whitespace-pre-wrap font-mono break-all text-slate-800 dark:text-slate-200 font-semibold">{{ base64Output }}</pre>
          <span v-else class="text-slate-400 font-bold italic select-none">{{ t("tools.base64.waitingOutput") }}</span>
        </div>
      </div>
    </div>

    <!-- 底部控制按钮组 -->
    <div class="flex flex-wrap gap-3 mt-4 border-t border-slate-200 dark:border-slate-800 pt-4 shrink-0">
      <BaseButton type="primary" size="sm" @click="handleEncodeBase64">
        {{ t("tools.base64.encodeBtn") }}
      </BaseButton>
      <BaseButton type="neutral" outline size="sm" @click="handleDecodeBase64">
        {{ t("tools.base64.decodeBtn") }}
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
