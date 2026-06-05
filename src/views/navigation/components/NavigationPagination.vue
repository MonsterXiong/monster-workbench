<script setup lang="ts">
defineProps<{
  total: number;
  page: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  (e: "changePage", page: number): void;
}>();

function totalPages(total: number, pageSize: number) {
  return Math.ceil(total / pageSize) || 1;
}
</script>

<template>
  <div class="flex items-center justify-between mt-5 border-t border-slate-100 pt-4 shrink-0">
    <span class="text-[11px] text-slate-400 font-bold">共{{ total }}条</span>
    <div class="flex items-center gap-2">
      <button
        class="workbench-btn border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 h-8 px-3 text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="page === 1"
        @click="emit('changePage', page - 1)"
      >
        上一页
      </button>
      <span class="px-3 py-1 bg-blue-50 text-blue-600 font-extrabold rounded-lg text-xs min-w-[70px] text-center">
        {{ page }} / {{ totalPages(total, pageSize) }}
      </span>
      <button
        class="workbench-btn border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 h-8 px-3 text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="page >= totalPages(total, pageSize)"
        @click="emit('changePage', page + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>
