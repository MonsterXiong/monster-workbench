<script setup lang="ts">
import { Database, AlertTriangle, RotateCcw } from "lucide-vue-next";
import AppPathSelector from "../../../components/common/AppPathSelector.vue";
import { useI18n } from "../../../composables/useI18n";

const { t } = useI18n();

defineProps<{
  localPath: string;
}>();

const emit = defineEmits<{
  (e: "updateDataDir", newPath: string): void;
  (e: "exportBackup"): void;
  (e: "importBackup"): void;
  (e: "resetApp"): void;
}>();
</script>

<template>
  <div class="space-y-4 select-none">
    <div>
      <h3 class="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
        {{ t('settings.data.dataTitle') }}
      </h3>
    </div>

    <!-- 数据目录自定义设置 -->
    <div class="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
      <div class="flex flex-col gap-1">
        <div class="text-xs font-bold text-slate-800 dark:text-slate-200">{{ t('settings.data.dataDirLabel') }}</div>
        <div class="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-normal mt-0.5">
          {{ t('settings.data.dataDirDesc') }}
        </div>
      </div>
      <div class="mt-1">
        <AppPathSelector
          :model-value="localPath"
          :placeholder="t('settings.data.dataDirPlaceholder')"
          type="folder"
          @update:model-value="emit('updateDataDir', $event)"
        />
      </div>
    </div>

    <!-- 数据库导入与导出备份 -->
    <div class="setting-item">
      <div class="flex items-center gap-3">
        <div class="setting-icon-wrapper bg-success/10 text-success">
          <Database class="h-4.5 w-4.5" />
        </div>
        <div>
          <div class="setting-title">{{ t('settings.data.dbBackupLabel') }}</div>
          <div class="setting-desc text-slate-500 dark:text-slate-400">{{ t('settings.data.dbBackupDesc') }}</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <BaseButton
          type="neutral"
          outline
          size="sm"
          @click="emit('exportBackup')"
        >
          {{ t('settings.data.exportBtn') }}
        </BaseButton>
        <BaseButton
          type="primary"
          size="sm"
          @click="emit('importBackup')"
        >
          {{ t('settings.data.importBtn') }}
        </BaseButton>
      </div>
    </div>

    <!-- 物理清除与一键出厂重置 -->
    <div class="p-4 rounded-2xl bg-error/5 border border-error/20 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
      <div class="flex items-start gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-error/15 text-error">
          <AlertTriangle class="h-4.5 w-4.5" />
        </div>
        <div>
          <h4 class="text-xs font-black text-slate-800 dark:text-slate-200">{{ t('settings.data.resetTitle') }}</h4>
          <p class="text-[10px] text-slate-600 dark:text-slate-400 font-semibold leading-relaxed mt-1">
            {{ t('settings.data.resetDesc') }}
          </p>
        </div>
      </div>
      <BaseButton
        type="danger"
        outline
        size="sm"
        class="shrink-0"
        @click="emit('resetApp')"
      >
        <template #icon><RotateCcw class="h-3.5 w-3.5" /></template>
        {{ t('settings.data.resetBtn') }}
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.setting-item {
  @apply flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 transition-all duration-300;
}
.setting-item:hover {
  @apply border-blue-500/40 bg-blue-500/5 dark:border-blue-400/40 dark:bg-blue-400/5;
}
.setting-icon-wrapper {
  @apply flex h-9 w-9 items-center justify-center rounded-xl shrink-0 transition-transform duration-300;
}
.setting-item:hover .setting-icon-wrapper {
  @apply scale-105;
}
.setting-title {
  @apply text-xs font-black text-slate-800 dark:text-slate-200;
}
.setting-desc {
  @apply text-[10px] font-semibold mt-0.5;
}
</style>
