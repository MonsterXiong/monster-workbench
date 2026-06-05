<script setup lang="ts">
/**
 * 全局 Toast 渲染组件
 * 从 useToast composable 读取共享状态并渲染提示信息
 */
import { useToast } from '../../composables/useToast';
import { CircleCheckBig } from 'lucide-vue-next';

const { showToast, toastMsg } = useToast();
</script>

<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="transform translate-y-2 opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-2 opacity-0"
  >
    <div
      v-if="showToast"
      class="fixed bottom-8 right-8 z-[200] flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-800/15"
    >
      <CircleCheckBig class="h-4 w-4 text-emerald-400" />
      {{ toastMsg }}
    </div>
  </transition>
</template>
