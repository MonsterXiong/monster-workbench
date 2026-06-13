<script setup lang="ts">
import { useI18n } from "../../composables/useI18n";

const { t } = useI18n();
</script>

<template>
  <div class="h-full overflow-y-auto">
    <!-- 顶部欢迎区 -->
    <div class="mb-10 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{{ t('workspace.title') }}</h1>
        <p class="mt-2 text-slate-500 text-sm">{{ t('workspace.welcome') }}</p>
      </div>
      <el-button type="primary" size="large" class="shadow-lg shadow-primary/30 rounded-full px-6 font-medium tracking-wide">
        {{ t('workspace.exploreBtn') }}
      </el-button>
    </div>

    <!-- 展示卡片区域 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

      <!-- 极简卡片 1 -->
      <el-card shadow="hover" class="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-lg">💡</div>
          <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">{{ t('workspace.card1Title') }}</h2>
        </div>
        <p class="text-slate-500 text-sm leading-relaxed mt-2">{{ t('workspace.card1Desc') }}</p>
      </el-card>

      <!-- 极简卡片 2 -->
      <el-card shadow="hover" class="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-lg">🌙</div>
          <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">{{ t('workspace.card2Title') }}</h2>
        </div>
        <p class="text-slate-500 text-sm leading-relaxed mt-2">{{ t('workspace.card2Desc') }}</p>
      </el-card>

      <!-- 玻璃态卡片 (微渐变+毛玻璃) -->
      <el-card shadow="hover" class="border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent relative overflow-hidden dark:bg-transparent">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-primary/20 rounded-full blur-3xl"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">✨</div>
            <h2 class="text-base font-bold text-primary">{{ t('workspace.card3Title') }}</h2>
          </div>
          <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mt-2">{{ t('workspace.card3Desc') }}</p>
        </div>
      </el-card>

    </div>
  </div>
</template>
