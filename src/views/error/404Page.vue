<script setup lang="ts">
import { useRouter } from "vue-router";
import { Compass } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";

const router = useRouter();
const { t } = useI18n();

const goBack = () => {
  router.push("/");
};
</script>

<template>
  <div class="relative min-h-[75vh] flex items-center justify-center p-6 overflow-hidden select-none">
    <!-- 装饰性渐变发光背景圆，不破坏浅色系 -->
    <div class="absolute w-[350px] h-[350px] bg-gradient-to-r from-blue-300/20 to-purple-300/20 rounded-full blur-3xl -top-10 -left-10 animate-pulse"></div>
    <div class="absolute w-[300px] h-[300px] bg-gradient-to-r from-pink-300/10 to-blue-300/20 rounded-full blur-3xl -bottom-10 -right-10 animate-pulse" style="animation-delay: 2s"></div>

    <div class="relative z-10 text-center max-w-lg w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-workbench rounded-[32px] p-10 flex flex-col items-center">
      <!-- 罗盘动画图标 -->
      <div class="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 shadow-inner mb-6">
        <Compass class="h-12 w-12 animate-[spin_8s_linear_infinite]" />
      </div>

      <h1 class="text-7xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 select-all">
        404
      </h1>

      <h3 class="text-lg font-bold text-slate-850 dark:text-slate-100 mt-4">
        {{ t("error.p404.title") }}
      </h3>

      <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-sm">
        {{ t("error.p404.desc") }}
      </p>

      <div class="mt-8 w-full">
        <BaseButton type="primary" block size="md" @click="goBack">
          {{ t("error.backToWorkspace") }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 阴影与微调 */
.shadow-workbench {
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.04);
}
</style>
