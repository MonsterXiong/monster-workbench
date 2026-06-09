<script setup lang="ts">
import { ref, onMounted } from "vue";
import { FolderTree } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import AppPathSelector from "../../../components/common/AppPathSelector.vue";
import { useToolsStore } from "../../../stores/tools";
import { useI18n } from "../../../composables/useI18n";
import { formatTemplate, getErrorMessage, isBlank } from "../../../utils";

const emit = defineEmits<{
  (e: "toast", msg: string, type?: "success" | "error"): void;
}>();

const { t } = useI18n();
const toolsStore = useToolsStore();
const {
  dirGenerator,
  dirGeneratorDefaultPath,
  dirGeneratorCreateLoading,
} = storeToRefs(toolsStore);

const defaultAppDataDir = ref("");

function loadExampleData() {
  toolsStore.loadDirGeneratorExample();
}

onMounted(async () => {
  await toolsStore.loadDirGeneratorDefaultPath(t("tools.dirGen.noBrowserDir"));
  defaultAppDataDir.value = dirGeneratorDefaultPath.value;
});

async function handleGenerateStructure() {
  if (isBlank(dirGenerator.value.treeInput)) {
    emit("toast", t("tools.dirGen.emptyError"), "error");
    return;
  }
  try {
    await toolsStore.createDirectoryStructure();
    emit("toast", t("tools.dirGen.successMsg"), "success");
  } catch (err) {
    emit("toast", getErrorMessage(err, t("tools.dirGen.failedMsg")), "error");
  }
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- 头部栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2 shrink-0">
      <div class="tool-section-title">
        <FolderTree class="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
        {{ t("tools.dirGen.title") }}
      </div>
    </div>

    <!-- 主体 Flex 内容 -->
    <div class="flex-1 flex flex-col gap-4 mt-4 min-h-0">
      <!-- 根目录输入及选择 -->
      <div class="flex flex-col gap-1.5 shrink-0">
        <label class="text-xs font-bold text-slate-500">{{ t("tools.dirGen.rootPathLabel") }}</label>
        <AppPathSelector
          v-model="dirGenerator.rootPath"
          :placeholder="t('tools.dirGen.rootPathPlaceholder')"
        />
        <p class="text-[10px] text-slate-400 font-semibold truncate">{{ formatTemplate(t("tools.dirGen.defaultPathTip"), { path: defaultAppDataDir }) }}</p>
      </div>

      <!-- 选项和重置栏 -->
      <div class="flex items-center justify-between shrink-0 py-0.5 select-none">
        <label class="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
          <input
            v-model="dirGenerator.includeTopDir"
            type="checkbox"
            class="checkbox checkbox-xs rounded border-slate-300 dark:border-slate-700 checkbox-primary cursor-pointer"
          />
          <span>{{ t("tools.dirGen.includeTopDir") }}</span>
        </label>
        <div class="flex items-center gap-3">
          <BaseButton
            type="neutral"
            outline
            size="xs"
            class="tool-mini-btn"
            @click="loadExampleData"
          >
            {{ t("tools.dirGen.exampleBtn") }}
          </BaseButton>
          <BaseButton
            type="danger"
            outline
            size="xs"
            class="tool-mini-btn"
            @click="dirGenerator.treeInput = ''"
          >
            {{ t("tools.dirGen.clearBtn") }}
          </BaseButton>
        </div>
      </div>

      <!-- 树形图文本输入 textarea (Flex-1) -->
      <div class="flex-1 flex flex-col min-h-0">
        <textarea
          v-model="dirGenerator.treeInput"
          :placeholder="t('tools.dirGen.textareaPlaceholder')"
          class="workbench-textarea flex-1 p-3 text-xs leading-5 resize-none overflow-y-auto"
        ></textarea>
      </div>

      <!-- 物理生成按钮 (最底部) -->
      <div class="pt-2 flex justify-end shrink-0">
        <BaseButton
          type="warning"
          class="tool-action-btn"
          :loading="dirGeneratorCreateLoading"
          @click="handleGenerateStructure"
        >
          {{ t("tools.dirGen.generateBtn") }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-section-title {
  @apply text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2;
}

:deep(.tool-mini-btn.el-button) {
  border-radius: 9999px;
}

:deep(.tool-action-btn.el-button--warning) {
  border-radius: 9999px;
  border-color: rgba(245, 158, 11, 0.72);
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  color: #ffffff;
  box-shadow: 0 10px 24px -12px rgba(249, 115, 22, 0.72);
}

:deep(.tool-action-btn.el-button--warning:hover) {
  border-color: rgba(249, 115, 22, 0.88);
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  color: #ffffff;
}
</style>
