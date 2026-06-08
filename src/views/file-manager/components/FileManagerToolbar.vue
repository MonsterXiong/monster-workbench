<script setup lang="ts">
import { FolderOpen, RefreshCw, SlidersHorizontal, UploadCloud, CheckSquare, Trash2 } from "lucide-vue-next";
import { useI18n } from "../../../composables/useI18n";
import { formatTemplate } from "../../../utils";

const { t } = useI18n();

defineProps<{
  isBatchMode: boolean;
  loading: boolean;
  selectedCount: number;
  filteredCount: number;
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
  (e: "enterBatchMode"): void;
  (e: "exitBatchMode"): void;
  (e: "toggleSelectAll"): void;
  (e: "batchDelete"): void;
  (e: "upload"): void;
}>();
</script>

<template>
  <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-1 gap-3 shrink-0 select-none">
    <div class="flex items-center gap-2.5">
      <div class="h-9 w-9 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 rounded-2xl flex items-center justify-center shadow-inner">
        <FolderOpen class="h-5 w-5" />
      </div>
      <div>
        <h2 class="text-sm font-black text-slate-850 dark:text-slate-100 tracking-wide">{{ t('fileManager.title') }}</h2>
      </div>
    </div>

    <!-- 操作按钮区域 -->
    <div class="flex items-center gap-2">
      <!-- 正常模式 -->
      <template v-if="!isBatchMode">
        <BaseButton
          type="neutral"
          outline
          size="sm"
          @click="emit('refresh')"
        >
          <template #icon>
            <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': loading }" />
          </template>
          {{ t('fileManager.refresh') }}
        </BaseButton>
        <BaseButton
          type="neutral"
          outline
          size="sm"
          @click="emit('enterBatchMode')"
        >
          <template #icon><SlidersHorizontal class="h-3 w-3" /></template>
          {{ t('fileManager.batchManage') }}
        </BaseButton>
        <BaseButton
          type="primary"
          size="sm"
          @click="emit('upload')"
        >
          <template #icon><UploadCloud class="h-3.5 w-3.5" /></template>
          {{ t('fileManager.upload') }}
        </BaseButton>
      </template>

      <!-- 批量模式 -->
      <template v-else>
        <BaseButton
          type="neutral"
          outline
          size="sm"
          @click="emit('toggleSelectAll')"
        >
          <template #icon><CheckSquare class="h-3 w-3" /></template>
          {{ selectedCount === filteredCount ? t('fileManager.cancelAll') : t('fileManager.selectAll') }}
        </BaseButton>
        <BaseButton
          type="danger"
          size="sm"
          :disabled="selectedCount === 0"
          @click="emit('batchDelete')"
        >
          <template #icon><Trash2 class="h-3 w-3" /></template>
          {{ formatTemplate(t('fileManager.deleteSelected'), { count: selectedCount }) }}
        </BaseButton>
        <BaseButton
          type="neutral"
          outline
          size="sm"
          @click="emit('exitBatchMode')"
        >
          {{ t('fileManager.exit') }}
        </BaseButton>
      </template>
    </div>
  </div>
</template>
