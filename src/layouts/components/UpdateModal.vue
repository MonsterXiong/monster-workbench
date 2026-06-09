<script setup lang="ts">
import { useUpdateStore } from "../../stores/update";
import { useAppStore } from "../../stores/app";
import { ArrowUpCircle, RefreshCw } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { formatBytesProgress, formatDateOnly } from "../../utils";

const updateStore = useUpdateStore();
const appStore = useAppStore();
const { t } = useI18n();
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
          class="relative w-full max-w-[420px] overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl transition-all"
        >
          <!-- 渐变点缀背景效果 -->
          <div class="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-xl"></div>
          <div class="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-xl"></div>

          <!-- 图标区域 -->
          <div class="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-md shadow-primary/5">
            <ArrowUpCircle v-if="!updateStore.updating" class="h-8 w-8 animate-bounce" style="animation-duration: 2s" />
            <RefreshCw v-else class="h-6 w-6 animate-spin" />
          </div>

          <!-- 标题 & 版本比对 -->
          <div class="relative text-center">
            <h3 class="text-base font-black tracking-tight text-slate-850 dark:text-slate-100">
              {{ updateStore.updating ? t('updater.updatingTitle') : t('updater.newVersionTitle') }}
            </h3>

            <div class="mt-2.5 flex items-center justify-center gap-2">
              <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {{ t('updater.currentVersion') }}: V{{ appStore.version }}
              </span>
              <span class="text-slate-400 dark:text-slate-500 text-xs">➔</span>
              <span class="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                {{ t('updater.newVersionLabel') }}: V{{ updateStore.updateInfo?.version }}
              </span>
            </div>
          </div>

          <!-- 更新日志主体 -->
          <div class="relative mt-5">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ t('updater.logTitle') }}</span>
              <span v-if="updateStore.updateInfo?.date" class="text-[10px] text-slate-400 dark:text-slate-500">
                {{ t('updater.releaseDate') }}: {{ formatDateOnly(updateStore.updateInfo.date) }}
              </span>
            </div>

            <div class="max-h-44 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 text-left shadow-inner">
              <div
                v-if="updateStore.updateInfo?.body"
                class="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-600 dark:text-slate-350"
              >
                {{ updateStore.updateInfo.body }}
              </div>
              <div v-else class="text-center py-4 italic text-slate-400 dark:text-slate-500 text-xs">
                {{ t('updater.defaultLog') }}
              </div>
            </div>
          </div>

          <!-- 操作按钮区 -->
          <div class="relative mt-6">
            <!-- 正常状态 -->
            <div v-if="!updateStore.updating" class="flex gap-3">
              <BaseButton
                type="neutral"
                outline
                class="flex-1"
                @click="updateStore.cancelUpdate"
              >
                {{ t('updater.later') }}
              </BaseButton>
              <BaseButton
                type="primary"
                class="flex-1"
                @click="updateStore.confirmUpdate"
              >
                {{ t('updater.updateNow') }}
              </BaseButton>
            </div>

            <!-- 下载升级状态 -->
            <div v-else class="space-y-2.5">
              <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  class="h-full bg-primary transition-all duration-300"
                  :style="{ width: `${updateStore.appProgress.percent}%` }"
                ></div>
              </div>
              <div class="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                <span>{{ updateStore.message }}</span>
                <span class="font-medium">
                  {{ formatBytesProgress(updateStore.appProgress.downloaded, updateStore.appProgress.total) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
