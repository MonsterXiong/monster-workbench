<script setup lang="ts">
import { ref } from "vue";
import {
  FolderTree,
  ShieldAlert,
  Code,
  Binary,
  Clock,
  Sparkles,
  CheckCircle2
} from "lucide-vue-next";

import { useToast } from "../../composables/useToast";

// 引入 6 个独立的工具子组件
import DirGenerator from "./components/DirGenerator.vue";
import PortCleaner from "./components/PortCleaner.vue";
import JsonFormatter from "./components/JsonFormatter.vue";
import Base64Converter from "./components/Base64Converter.vue";
import TimestampConverter from "./components/TimestampConverter.vue";
import DirReader from "./components/DirReader.vue";

// 10 个 Tab 状态控制 (1~10)
const activeTab = ref(1);

const { triggerToast } = useToast();

function handleToast(msg: string, type?: "error" | "success") {
  triggerToast(msg);
}

function handleCopy(text: string) {
  if (!text) return;
  try {
    navigator.clipboard.writeText(text);
    triggerToast("已复制到剪贴板！");
  } catch (err) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    triggerToast("已复制到剪贴板！");
  }
}
</script>

<template>
  <div class="flex flex-col h-full space-y-4 min-h-0">
    <!-- 顶部 10 个 Tab 切换组，支持横向无缝滑动 -->
    <div class="tool-tab-scroll-wrapper no-scrollbar shrink-0">
      <div class="flex gap-2">
        <button
          class="tool-tab-btn"
          :class="activeTab === 1 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="activeTab = 1"
        >
          <FolderTree class="h-4 w-4" />
          目录结构
        </button>
        <button
          class="tool-tab-btn"
          :class="activeTab === 2 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="activeTab = 2"
        >
          <ShieldAlert class="h-4 w-4" />
          端口占用清理
        </button>
        <button
          class="tool-tab-btn"
          :class="activeTab === 3 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="activeTab = 3"
        >
          <Code class="h-4 w-4" />
          JSON 美化/压缩
        </button>
        <button
          class="tool-tab-btn"
          :class="activeTab === 4 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="activeTab = 4"
        >
          <Binary class="h-4 w-4" />
          Base64 编解码
        </button>
        <button
          class="tool-tab-btn"
          :class="activeTab === 5 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="activeTab = 5"
        >
          <Clock class="h-4 w-4" />
          时间戳转换器
        </button>
        <!-- Tab 6 ~ 10 期待占位 -->
        <button
          v-for="i in [6, 7, 8, 9, 10]"
          :key="i"
          class="tool-tab-btn opacity-60 text-slate-400 hover:opacity-100 hover:text-slate-600"
          @click="activeTab = i"
        >
          <Sparkles class="h-3.5 w-3.5" />
          期待工具 #{{ i - 5 }}
        </button>
      </div>
    </div>

    <!-- 工具卡片面板 -->
    <div class="grid grid-cols-1 flex-1 min-h-0">
      <section class="workbench-card tool-card-container h-full overflow-hidden flex flex-col min-h-0">
        <!-- Tab 1: 目录结构 (左右1:1分割) -->
        <div v-if="activeTab === 1" class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:divide-x lg:divide-slate-200 h-full min-h-0">
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
          <div class="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
            <div class="tool-section-title">
              <Sparkles class="h-4.5 w-4.5 text-blue-500 animate-pulse" />
              期待工具 #{{ activeTab - 5 }} 正在积极开发中
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center justify-center text-center gap-4 min-h-0">
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 shadow-md shadow-blue-500/5 border border-blue-100">
              <Sparkles class="h-8 w-8 animate-spin" />
            </div>
            <div>
              <h3 class="text-sm font-extrabold text-slate-800">探索无限可能</h3>
              <p class="text-[11px] text-slate-400 font-semibold mt-2 leading-relaxed max-w-sm">
                更多高效开发者助手工具正在积极进行排期与开发。后续我们将陆续引入：
                正则测试器、哈希与加解密计算、SVG 路径预览和图片无损压缩等。敬请期待！
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
.tool-tab-btn {
  @apply flex-shrink-0 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border border-transparent;
}
.tool-tab-btn:hover {
  @apply border-slate-200/50 bg-slate-100/50;
}
.tool-card-container {
  @apply p-6;
}
.tool-section-title {
  @apply text-sm font-extrabold text-slate-800 flex items-center gap-2;
}
</style>
