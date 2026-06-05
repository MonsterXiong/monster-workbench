<script setup lang="ts">
/**
 * 全局确认弹窗组件
 * 支持普通模式和 danger 模式（红色警告风格）
 * 点击遮罩层可关闭弹窗
 */
import { useConfirm } from '../../composables/useConfirm';
import { AlertTriangle, Info } from 'lucide-vue-next';

const { visible, options, handleConfirm, handleCancel } = useConfirm();
</script>

<template>
  <transition
    enter-active-class="ease-out duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      @click.self="handleCancel"
    >
      <transition
        enter-active-class="ease-out duration-300"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="ease-in duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div class="relative w-full max-w-[360px] rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
          <!-- 图标 + 标题 -->
          <div class="flex items-center gap-3 mb-4">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
              :class="options.danger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'"
            >
              <AlertTriangle v-if="options.danger" class="h-5 w-5" />
              <Info v-else class="h-5 w-5" />
            </div>
            <h3 class="text-sm font-black text-slate-800">{{ options.title }}</h3>
          </div>

          <!-- 消息内容 -->
          <p class="text-xs text-slate-500 leading-relaxed whitespace-pre-line pl-[52px]">{{ options.message }}</p>

          <!-- 操作按钮 -->
          <div class="mt-6 flex items-center justify-end gap-2.5">
            <button
              class="workbench-btn border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 h-9 px-4 text-xs font-bold"
              @click="handleCancel"
            >
              {{ options.cancelText }}
            </button>
            <button
              class="workbench-btn text-white text-xs font-bold h-9 px-4 shadow-sm"
              :class="options.danger ? 'bg-red-600 hover:bg-red-700 shadow-red-600/10' : 'bg-primary hover:bg-primary/90 shadow-primary/10'"
              @click="handleConfirm"
            >
              {{ options.confirmText }}
            </button>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
