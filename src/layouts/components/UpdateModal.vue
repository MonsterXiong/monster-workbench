<script setup lang="ts">
import { useUpdateStore } from "../../stores/update";
import { useAppStore } from "../../stores/app";
import { ArrowUpCircle, RefreshCw } from "lucide-vue-next";

const updateStore = useUpdateStore();
const appStore = useAppStore();

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
</script>

<template>
  <transition
    enter-active-class="ease-out duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="ease-in duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="updateStore.showModal"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
    >
      <!-- 弹窗容器 -->
      <transition
        enter-active-class="ease-out duration-300"
        enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        enter-to-class="opacity-100 translate-y-0 sm:scale-100"
        leave-active-class="ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0 sm:scale-100"
        leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
      >
        <div
          class="relative w-full max-w-[420px] overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl transition-all"
        >
          <!-- 渐变点缀背景效果 -->
          <div class="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-50/60 blur-xl"></div>
          <div class="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-indigo-50/40 blur-xl"></div>

          <!-- 图标区域 -->
          <div class="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-md shadow-blue-100/50">
            <ArrowUpCircle v-if="!updateStore.updating" class="h-8 w-8 animate-bounce" style="animation-duration: 2s" />
            <RefreshCw v-else class="h-6 w-6 animate-spin" />
          </div>

          <!-- 标题 & 版本比对 -->
          <div class="relative text-center">
            <h3 class="text-base font-black tracking-tight text-slate-800">
              {{ updateStore.updating ? "正在为您升级系统" : "发现全新版本可用" }}
            </h3>
            
            <div class="mt-2.5 flex items-center justify-center gap-2">
              <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-500">
                当前: V{{ appStore.version }}
              </span>
              <span class="text-slate-350 text-xs">➔</span>
              <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600">
                新版: V{{ updateStore.updateInfo?.version }}
              </span>
            </div>
          </div>

          <!-- 更新日志主体 -->
          <div class="relative mt-5">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">更新日志</span>
              <span v-if="updateStore.updateInfo?.date" class="text-[10px] text-slate-400">
                发布日期: {{ updateStore.updateInfo.date.split('T')[0] }}
              </span>
            </div>
            
            <div class="max-h-44 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-left shadow-inner">
              <div
                v-if="updateStore.updateInfo?.body"
                class="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-600"
              >
                {{ updateStore.updateInfo.body }}
              </div>
              <div v-else class="text-center py-4 italic text-slate-400 text-xs">
                性能细节微调及已知缺陷的修复。
              </div>
            </div>
          </div>

          <!-- 操作按钮区 -->
          <div class="relative mt-6">
            <!-- 正常状态 -->
            <div v-if="!updateStore.updating" class="flex gap-3">
              <button
                type="button"
                class="flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-500 transition duration-150 hover:bg-slate-50 hover:text-slate-700 active:scale-95"
                @click="updateStore.cancelUpdate"
              >
                稍后更新
              </button>
              <button
                type="button"
                class="flex-1 cursor-pointer rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition duration-150 hover:bg-blue-700 hover:scale-[1.01] active:scale-95"
                @click="updateStore.confirmUpdate"
              >
                立即升级
              </button>
            </div>

            <!-- 下载升级状态 -->
            <div v-else class="space-y-2.5">
              <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  class="h-full bg-blue-600 transition-all duration-300"
                  :style="{ width: `${updateStore.appProgress.percent}%` }"
                ></div>
              </div>
              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span>{{ updateStore.message }}</span>
                <span class="font-medium">
                  {{ formatBytes(updateStore.appProgress.downloaded) }} / {{ formatBytes(updateStore.appProgress.total) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
