<script setup lang="ts">
import { useI18n } from "../../../composables/useI18n";
import { formatTemplate, getTotalPages } from "../../../utils";

defineProps<{
  total: number;
  page: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  (e: "changePage", page: number): void;
}>();

const { t } = useI18n();

function totalPages(total: number, pageSize: number) {
  return getTotalPages(total, pageSize);
}
</script>

<template>
  <div class="flex items-center justify-between mt-5 border-t border-slate-200 dark:border-slate-800 pt-4 shrink-0 select-none">
    <span class="text-[11px] text-slate-400 dark:text-slate-500 font-bold">
      {{ formatTemplate(t("navigation.pagination.total"), { total }) }}
    </span>
    <div class="flex items-center gap-2">
      <BaseButton
        type="neutral"
        outline
        size="sm"
        :disabled="page === 1"
        @click="emit('changePage', page - 1)"
      >
        {{ t("navigation.pagination.prev") }}
      </BaseButton>
      <span class="px-3 py-1 bg-primary/10 text-primary font-extrabold rounded-lg text-xs min-w-[70px] text-center">
        {{ page }} / {{ totalPages(total, pageSize) }}
      </span>
      <BaseButton
        type="neutral"
        outline
        size="sm"
        :disabled="page >= totalPages(total, pageSize)"
        @click="emit('changePage', page + 1)"
      >
        {{ t("navigation.pagination.next") }}
      </BaseButton>
    </div>
  </div>
</template>
