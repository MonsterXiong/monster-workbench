<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import CreativeWorkflowDemo from './CreativeWorkflowDemo.vue';

defineProps<{
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggleLeft'): void;
  (e: 'toggleRight'): void;
}>();
</script>

<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- Header -->
    <header class="h-14 flex items-center px-6 shrink-0 bg-white border-b border-slate-100 shadow-sm z-10">
      <div class="flex items-center gap-2">
        <h1 class="font-bold text-slate-800 text-base">创作流工作台</h1>
        <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 select-none">Beta</span>
      </div>
    </header>

    <!-- Workspace Content -->
    <div class="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 relative">
      <!-- Left Toggle Button (pinned to left edge) -->
      <button
        @click="emit('toggleLeft')"
        class="absolute left-0 top-1/2 -translate-y-1/2 z-50 w-5 h-12 bg-white border border-slate-200 rounded-r-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-300 shadow-sm transition-colors cursor-pointer select-none border-l-0"
        title="切换左侧边栏"
      >
        <ChevronRight v-if="!showLeftSidebar" class="w-4 h-4" />
        <ChevronLeft v-else class="w-4 h-4" />
      </button>

      <!-- Right Toggle Button (pinned to right edge) -->
      <button
        @click="emit('toggleRight')"
        class="absolute right-0 top-1/2 -translate-y-1/2 z-50 w-5 h-12 bg-white border border-slate-200 rounded-l-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-300 shadow-sm transition-colors cursor-pointer select-none border-r-0"
        title="切换右侧边栏"
      >
        <ChevronLeft v-if="!showRightSidebar" class="w-4 h-4" />
        <ChevronRight v-else class="w-4 h-4" />
      </button>

      <!-- Content -->
      <CreativeWorkflowDemo />
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 6px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #cbd5e1;
}
</style>
