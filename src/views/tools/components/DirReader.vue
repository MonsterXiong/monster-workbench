<script setup lang="ts">
import { ref } from "vue";
import { FolderTree, Settings } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import AppPathSelector from "../../../components/common/AppPathSelector.vue";
import { useToolsStore } from "../../../stores/tools";
import { useI18n } from "../../../composables/useI18n";

const emit = defineEmits<{
  (e: "toast", msg: string, type?: "success" | "error"): void;
  (e: "copy", text: string): void;
}>();

const { t } = useI18n();
const toolsStore = useToolsStore();
const { dirReader, dirReaderReadLoading } = storeToRefs(toolsStore);

const showConfigModal = ref(false);

async function handleReadDirectoryTree() {
  if (!dirReader.value.rootPath.trim()) {
    emit("toast", t("tools.dirReader.emptyPathError"), "error");
    return;
  }

  try {
    await toolsStore.readDirectoryTree();
    emit("toast", t("tools.dirReader.successMsg"), "success");
  } catch (err) {
    emit("toast", err instanceof Error ? err.message : t("tools.dirReader.failedMsg"), "error");
  }
}

function handleCopyTree() {
  if (!dirReader.value.treeOutput) {
    emit("toast", t("tools.dirReader.copyEmptyError"), "error");
    return;
  }
  emit("copy", dirReader.value.treeOutput);
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- 头部栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2 shrink-0">
      <div class="tool-section-title">
        <FolderTree class="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
        {{ t("tools.dirReader.title") }}
      </div>
    </div>

    <!-- 主体 Flex 内容 -->
    <div class="flex-1 flex flex-col gap-4 mt-4 min-h-0">
      <!-- 文件夹选择区域 -->
      <div class="flex flex-col gap-1.5 shrink-0">
        <label class="text-xs font-bold text-slate-500 flex items-center gap-1">
          {{ t("tools.dirReader.pathLabel") }} <span class="text-error font-extrabold">*</span>
        </label>
        <AppPathSelector
          v-model="dirReader.rootPath"
          :placeholder="t('tools.dirReader.pathPlaceholder')"
        />
      </div>

      <!-- 选项和重置栏 -->
      <div class="flex items-center justify-between shrink-0 py-0.5 select-none">
        <span class="text-xs font-bold text-slate-400">{{ t("tools.dirReader.resultLabel") }}</span>
        <div class="flex items-center gap-3">
          <!-- 齿轮配置按钮 -->
          <BaseButton
            type="neutral"
            outline
            size="xs"
            class="tool-mini-btn"
            @click="showConfigModal = true"
          >
            <template #icon><Settings class="h-3 w-3" /></template>
            {{ t("tools.dirReader.filterBtn") }}
          </BaseButton>

          <BaseButton
            type="neutral"
            outline
            size="xs"
            class="tool-mini-btn"
            :disabled="!dirReader.treeOutput"
            @click="handleCopyTree"
          >
            {{ t("tools.dirReader.copyBtn") }}
          </BaseButton>
          <BaseButton
            type="danger"
            outline
            size="xs"
            class="tool-mini-btn"
            :disabled="!dirReader.treeOutput"
            @click="dirReader.treeOutput = ''"
          >
            {{ t("tools.dirReader.clearBtn") }}
          </BaseButton>
        </div>
      </div>

      <!-- 树形图文本只读 textarea 展示 (Flex-1) -->
      <div class="flex-1 flex flex-col min-h-0">
        <textarea
          v-model="dirReader.treeOutput"
          readonly
          :placeholder="t('tools.dirReader.textareaPlaceholder')"
          class="workbench-textarea flex-1 p-3 text-xs leading-5 font-mono resize-none overflow-y-auto"
        ></textarea>
      </div>

      <!-- 读取解析按钮 (最底部) -->
      <div class="pt-2 flex justify-end shrink-0">
        <BaseButton
          class="tool-action-btn"
          :loading="dirReaderReadLoading"
          @click="handleReadDirectoryTree"
        >
          {{ t("tools.dirReader.generateBtn") }}
        </BaseButton>
      </div>
    </div>

    <!-- 过滤与深度配置弹窗 -->
    <BaseDialog v-model="showConfigModal" :title="t('tools.dirReader.modalTitle')" width="max-w-[360px]">
      <div class="space-y-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold text-slate-500">{{ t("tools.dirReader.excludeDirsLabel") }}</label>
          <BaseInput
            v-model="dirReader.excludeDirsInput"
            :placeholder="t('tools.dirReader.excludeDirsPlaceholder')"
            size="sm"
          />
          <p class="text-[9px] text-slate-400 font-semibold">{{ t("tools.dirReader.excludeDirsTip") }}</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold text-slate-500">{{ t("tools.dirReader.maxDepthLabel") }}</label>
          <BaseInput
            v-model="dirReader.maxDepth"
            type="number"
            :placeholder="t('tools.dirReader.maxDepthPlaceholder')"
            size="sm"
          />
          <p class="text-[9px] text-slate-400 font-semibold">{{ t("tools.dirReader.maxDepthTip") }}</p>
        </div>
      </div>
      <template #footer>
        <BaseButton size="sm" @click="showConfigModal = false">
          {{ t("tools.dirReader.saveBtn") }}
        </BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<style scoped>
.tool-section-title {
  @apply text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2;
}

:deep(.tool-mini-btn.el-button) {
  border-radius: 9999px;
}

:deep(.tool-action-btn.el-button--primary) {
  border-radius: 9999px;
  box-shadow: 0 10px 24px -12px rgba(37, 99, 235, 0.58);
}
</style>
