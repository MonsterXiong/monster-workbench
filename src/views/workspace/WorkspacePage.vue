<script setup lang="ts">
import { ArrowRight, FlaskConical } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useI18n } from "../../composables/useI18n";

const { t } = useI18n();
const router = useRouter();

const openCreativePlayground = () => {
  void router.push("/creative");
};
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

    <section
      class="mb-6 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-white px-5 py-4 shadow-sm shadow-primary/5 dark:border-primary/30 dark:bg-slate-900 md:flex-row md:items-center md:justify-between"
    >
      <div class="flex min-w-0 items-start gap-4">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FlaskConical class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <div class="text-xs font-bold uppercase tracking-wide text-primary">{{ t('workspace.creativeEntryEyebrow') }}</div>
          <h2 class="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{{ t('workspace.creativeEntryTitle') }}</h2>
          <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {{ t('workspace.creativeEntryDesc') }}
          </p>
        </div>
      </div>
      <el-button type="primary" size="large" class="shrink-0 font-bold" @click="openCreativePlayground">
        <FlaskConical class="mr-2 h-4 w-4" />
        {{ t('workspace.creativeEntryAction') }}
        <ArrowRight class="ml-2 h-4 w-4" />
      </el-button>
    </section>

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
