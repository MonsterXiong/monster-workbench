<script setup lang="ts">
import { ref, computed } from "vue";
import { Sparkles } from "lucide-vue-next";

import { useToast } from "../../composables/useToast";
import { useClipboard } from "../../composables/useClipboard";
import { useI18n } from "../../composables/useI18n";
import { formatTemplate, range } from "../../utils";

// 引入 6 个独立的工具子组件
import DirGenerator from "./components/DirGenerator.vue";
import PortCleaner from "./components/PortCleaner.vue";
import JsonFormatter from "./components/JsonFormatter.vue";
import Base64Converter from "./components/Base64Converter.vue";
import TimestampConverter from "./components/TimestampConverter.vue";
import DirReader from "./components/DirReader.vue";

// 10 个 Tab 状态控制 (1~10)
const activeTab = ref<number>(1);

const { triggerToast } = useToast();
const { copyText } = useClipboard();
const { t } = useI18n();

const toolTabs = computed(() => [
  { key: 1, title: t("tools.tabs.dirGen"), icon: "FolderTree" },
  { key: 2, title: t("tools.tabs.portCleaner"), icon: "ShieldAlert" },
  { key: 3, title: t("tools.tabs.jsonFormat"), icon: "Code" },
  { key: 4, title: t("tools.tabs.base64"), icon: "Binary" },
  { key: 5, title: t("tools.tabs.timestamp"), icon: "Clock" },
  ...range(1, 6).map((num) => ({
    key: num + 5,
    title: formatTemplate(t("tools.tabs.upcoming"), { num }),
    icon: "Sparkles",
  })),
]);

function handleToast(msg: string, type?: "error" | "success") {
  triggerToast(msg, type);
}

function handleCopy(text: string) {
  copyText(text);
}
</script>

<template>
  <div class="workbench-page-shell gap-4">
    <!-- 顶部 10 个 Tab 切换组，使用 BaseTab 支持横向滑动 -->
    <div class="tool-tab-scroll-wrapper no-scrollbar shrink-0">
      <BaseTab v-model="activeTab" :tabs="toolTabs" variant="pills" />
    </div>

    <!-- 工具卡片面板 -->
    <div class="grid grid-cols-1 flex-1 min-h-0">
      <section class="workbench-card tool-card-container h-full overflow-hidden flex flex-col min-h-0">
        <!-- Tab 1: 目录结构 (左右1:1分割) -->
        <div v-if="activeTab === 1" class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:divide-x lg:divide-slate-200 dark:lg:divide-slate-800 h-full min-h-0">
          <DirGenerator
            class="h-full min-h-0"
            @toast="handleToast"
          />
          <DirReader
            class="lg:pl-8 h-full min-h-0"
            @toast="handleToast"
            @copy="handleCopy"
          />
        </div>

        <!-- Tab 2: 端口诊断清理 -->
        <PortCleaner
          v-else-if="activeTab === 2"
          @toast="handleToast"
        />

        <!-- Tab 3: JSON 美化/压缩 -->
        <JsonFormatter
          v-else-if="activeTab === 3"
          @copy="handleCopy"
          @toast="handleToast"
        />

        <!-- Tab 4: Base64 编解码 -->
        <Base64Converter
          v-else-if="activeTab === 4"
          @copy="handleCopy"
          @toast="handleToast"
        />

        <!-- Tab 5: 时间戳转换 -->
        <TimestampConverter
          v-else-if="activeTab === 5"
          @copy="handleCopy"
          @toast="handleToast"
        />

        <!-- Tab 6 ~ 10. 敬请期待面板 -->
        <div v-else class="flex flex-col h-full justify-between min-h-0">
          <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
            <div class="tool-section-title">
              <Sparkles class="h-4.5 w-4.5 text-blue-500 animate-pulse" />
              {{ formatTemplate(t('tools.upcomingTitle'), { num: activeTab - 5 }) }}
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center justify-center text-center gap-4 min-h-0">
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 dark:bg-blue-950/40 text-blue-500 border border-blue-500/20 shadow-md">
              <Sparkles class="h-8 w-8 animate-spin" />
            </div>
            <div>
              <h3 class="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {{ t('tools.upcomingDescTitle') }}
              </h3>
              <p class="text-[11px] text-slate-500 font-semibold mt-2 leading-relaxed max-w-sm">
                {{ t('tools.upcomingDesc') }}
              </p>
            </div>
          </div>
          <div class="shrink-0 pt-2"></div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tool-tab-scroll-wrapper {
  @apply overflow-x-auto pb-1.5 flex;
}
.tool-card-container {
  @apply p-6;
}
.tool-section-title {
  @apply text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2;
}
</style>
