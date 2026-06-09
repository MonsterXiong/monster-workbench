<script setup lang="ts">
import { computed } from "vue";
import { FileText, Eye, Trash2 } from "lucide-vue-next";
import { useI18n } from "../../../composables/useI18n";
import { useClipboard } from "../../../composables/useClipboard";
import { formatBytes, formatUnixTimestamp, hasItem } from "../../../utils";

const { t } = useI18n();
const { copyText } = useClipboard();

const props = defineProps<{
  data: any[];
  loading: boolean;
  isBatchMode: boolean;
  selectedPaths: string[];
  imgUrlGetter: (relPath: string) => string;
}>();

const emit = defineEmits<{
  (e: "toggleSelection", relPath: string): void;
  (e: "toggleSelectAll"): void;
  (e: "preview", row: any): void;
  (e: "delete", row: any): void;
}>();

// 响应式动态列定义
const columns = computed(() => {
  const list = [];
  if (props.isBatchMode) {
    list.push({ key: "select", title: "", width: "48px" });
  } else {
    list.push({ key: "preview", title: t("fileManager.previewCol"), width: "64px" });
  }
  list.push({ key: "file_name", title: t("fileManager.nameCol") });
  list.push({ key: "file_type", title: t("fileManager.typeCol"), width: "90px" });
  list.push({ key: "file_size", title: t("fileManager.sizeCol"), width: "90px" });
  list.push({ key: "modified", title: t("fileManager.timeCol"), width: "160px" });
  list.push({ key: "action", title: t("fileManager.actionCol"), width: "90px" });
  return list;
});

function formatModifiedTime(timestamp: number): string {
  if (!timestamp) return "-";
  return formatUnixTimestamp(timestamp, "second", "YYYY-MM-DD HH:mm", "-");
}

</script>

<template>
  <div class="flex-1 overflow-y-auto mt-4 min-h-0">
    <BaseTable
      :columns="columns"
      :data="data"
      :loading="loading"
      size="sm"
    >
      <!-- 多选表头/列 -->
      <template #select="{ row }">
        <div class="flex items-center">
          <input
            type="checkbox"
            class="checkbox checkbox-xs cursor-pointer"
            :checked="hasItem(selectedPaths, row.rel_path)"
            @change="emit('toggleSelection', row.rel_path)"
          />
        </div>
      </template>

      <!-- 预览缩略图 -->
      <template #preview="{ row }">
        <div class="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
          <img
            v-if="row.file_type === 'image'"
            :src="imgUrlGetter(row.rel_path)"
            class="h-full w-full object-cover cursor-pointer animate-fade-in"
            @click="emit('preview', row)"
          />
          <FileText v-else class="h-4 w-4 text-slate-400 dark:text-slate-500" />
        </div>
      </template>

      <template #file_name="{ row }">
        <div
          class="group/cell hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-xl p-1 transition cursor-pointer select-none"
          :title="isBatchMode ? '' : t('fileManager.copiedPath')"
          @click.stop="isBatchMode ? emit('toggleSelection', row.rel_path) : copyText(row.rel_path, t('fileManager.copiedPath'))"
        >
          <p
            class="text-slate-750 dark:text-slate-200 font-bold truncate max-w-[240px] transition"
            :class="{ 'group-hover/cell:text-primary': !isBatchMode }"
            :title="row.file_name"
          >
            {{ row.file_name }}
          </p>
          <p class="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[240px]" :title="row.rel_path">
            {{ row.rel_path }}
          </p>
        </div>
      </template>

      <!-- 文件类型 -->
      <template #file_type="{ row }">
        <span
          class="text-[10px] font-bold px-2 py-0.5 rounded-full"
          :class="row.file_type === 'image' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-primary/10 text-primary'"
        >
          {{ row.file_type === 'image' ? t('fileManager.types.image') : t('fileManager.types.file') }}
        </span>
      </template>

      <!-- 文件大小 -->
      <template #file_size="{ row }">
        <span class="text-slate-500 font-medium">{{ formatBytes(row.file_size, { decimals: 1 }) }}</span>
      </template>

      <!-- 修改时间 -->
      <template #modified="{ row }">
        <span class="text-slate-500 font-medium">{{ formatModifiedTime(row.modified) }}</span>
      </template>

      <!-- 操作列 -->
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1.5" :class="{ 'opacity-30 pointer-events-none': isBatchMode }">
          <div
            v-if="row.file_type === 'image'"
            role="button"
            class="h-6 w-6 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary transition cursor-pointer shadow-sm"
            :title="t('fileManager.previewTitle')"
            @click="emit('preview', row)"
          >
            <Eye class="h-3 w-3" />
          </div>
          <div
            role="button"
            class="h-6 w-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-error/10 flex items-center justify-center text-slate-400 hover:text-error hover:border-error/20 transition cursor-pointer shadow-sm"
            :title="t('fileManager.deleteTitle')"
            @click="emit('delete', row)"
          >
            <Trash2 class="h-3 w-3" />
          </div>
        </div>
      </template>
    </BaseTable>
  </div>
</template>
