<script setup lang="ts">
import { UploadCloud } from "lucide-vue-next";
import { useI18n } from "../../../composables/useI18n";

const { t } = useI18n();

defineProps<{
  isDragging: boolean;
}>();
</script>

<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="isDragging"
      class="absolute inset-0 z-[150] rounded-3xl bg-primary/10 backdrop-blur-[2px] border-2 border-dashed border-primary flex flex-col items-center justify-center pointer-events-none"
    >
      <div class="bg-white dark:bg-slate-900 px-6 py-5 rounded-3xl shadow-xl flex flex-col items-center gap-3 border border-slate-200 dark:border-slate-800">
        <div class="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <UploadCloud class="h-6 w-6 animate-bounce" />
        </div>
        <div class="text-center">
          <p class="text-xs font-black text-slate-800 dark:text-slate-100">{{ t('fileManager.dragDropRelease') }}</p>
          <p class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">{{ t('fileManager.dragDropDesc') }}</p>
        </div>
      </div>
    </div>
  </transition>
</template>
