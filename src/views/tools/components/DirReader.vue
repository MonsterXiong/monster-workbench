<script setup lang="ts">
import { ref } from "vue";
import { FolderTree, FolderSearch2, RefreshCw, Settings } from "lucide-vue-next";
import { systemService } from "../../../services/system.service";

const emit = defineEmits<{
  (e: "toast", msg: string, type?: "success" | "error"): void;
  (e: "copy", text: string): void;
}>();

const rootPath = ref("");
const treeOutput = ref("");
const readLoading = ref(false);
const excludeDirsInput = ref("node_modules, .git, dist");
const maxDepth = ref(10);
const showConfigModal = ref(false);

async function handleSelectRootFolder() {
  try {
    const selected = await systemService.selectFolder();
    if (selected) {
      rootPath.value = selected;
    }
  } catch (err) {
    emit("toast", err instanceof Error ? err.message : "选择目录失败", "error");
  }
}

async function handleReadDirectoryTree() {
  if (!rootPath.value.trim()) {
    emit("toast", "请先选择需要读取的文件夹路径", "error");
    return;
  }

  readLoading.value = true;
  treeOutput.value = "";
  
  try {
    const skipDirs = excludeDirsInput.value
      .split(",")
      .map(d => d.trim())
      .filter(d => d.length > 0);

    const tree = await systemService.readDirectoryTree(rootPath.value, skipDirs, maxDepth.value || 10);
    treeOutput.value = tree;
    emit("toast", "目录树形结构读取成功！");
  } catch (err) {
    emit("toast", err instanceof Error ? err.message : "读取失败", "error");
  } finally {
    readLoading.value = false;
  }
}

function handleCopyTree() {
  if (!treeOutput.value) {
    emit("toast", "目录树为空，无内容可复制", "error");
    return;
  }
  emit("copy", treeOutput.value);
}
</script>

<template>
  <div class="flex flex-col h-[520px] min-h-0">
    <!-- 头部栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-2 shrink-0">
      <div class="tool-section-title">
        <FolderTree class="h-4.5 w-4.5 text-blue-600" />
        读取目录生成树形结构
      </div>
    </div>

    <!-- 主体 Flex 内容，自动填充高度 -->
    <div class="flex-1 flex flex-col gap-4 mt-4 min-h-0">
      <!-- 文件夹选择区域（必填） -->
      <div class="flex flex-col gap-1.5 shrink-0">
        <label class="text-xs font-bold text-slate-550 flex items-center gap-1">
          待读取的文件夹路径 <span class="text-error font-extrabold">*</span>
        </label>
        <div class="flex gap-2">
          <input
            v-model="rootPath"
            type="text"
            placeholder="请选择或输入要解析的物理文件夹绝对路径"
            class="workbench-input visual-input h-10 flex-1 text-xs"
          />
          <button
            class="workbench-btn border border-slate-200 bg-base-100 hover:bg-slate-50 text-slate-700 h-10 px-4 text-xs font-bold"
            @click="handleSelectRootFolder"
          >
            <FolderSearch2 class="h-4 w-4 mr-1.5" />
            选择目录
          </button>
        </div>
      </div>

      <!-- 选项和重置栏 -->
      <div class="flex items-center justify-between shrink-0 py-0.5">
        <span class="text-xs font-bold text-slate-400">生成的树形结构结果：</span>
        <div class="flex items-center gap-3">
          <!-- 齿轮配置按钮 -->
          <button
            type="button"
            class="text-[11px] text-slate-500 hover:text-blue-600 font-bold flex items-center gap-1 cursor-pointer"
            @click="showConfigModal = true"
          >
            <Settings class="h-3 w-3" />
            过滤与深度
          </button>

          <button
            class="text-[11px] text-blue-600 font-bold hover:underline"
            :disabled="!treeOutput"
            :class="{ 'opacity-40 cursor-not-allowed': !treeOutput }"
            @click="handleCopyTree"
          >
            一键复制树形图
          </button>
          <button
            class="text-[11px] text-error font-bold hover:underline"
            :disabled="!treeOutput"
            :class="{ 'opacity-40 cursor-not-allowed': !treeOutput }"
            @click="treeOutput = ''"
          >
            清空结果
          </button>
        </div>
      </div>

      <!-- 树形图文本只读 textarea展示 (Flex-1) -->
      <div class="flex-1 flex flex-col min-h-0">
        <textarea
          v-model="treeOutput"
          readonly
          placeholder="读取物理目录后，生成的树形图结构将在这里展示..."
          class="workbench-textarea visual-textarea flex-1 p-3 text-xs leading-5 font-mono resize-none overflow-y-auto"
        ></textarea>
      </div>

      <!-- 读取解析按钮 (最底部) -->
      <div class="pt-2 flex justify-end shrink-0">
        <button
          class="workbench-btn bg-primary text-primary-content text-xs h-10 px-6 font-bold shadow-sm shadow-primary/10"
          :disabled="readLoading"
          @click="handleReadDirectoryTree"
        >
          <RefreshCw v-if="readLoading" class="h-3.5 w-3.5 animate-spin mr-1.5" />
          读取并生成树形结构
        </button>
      </div>
    </div>

    <!-- 过滤与深度配置微型弹窗 -->
    <transition
      enter-active-class="ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showConfigModal"
        class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      >
        <transition
          enter-active-class="ease-out duration-250"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="ease-in duration-150"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div class="relative w-full max-w-[360px] overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <!-- 标题 -->
            <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Settings class="h-4.5 w-4.5 text-blue-600" />
              <h3 class="text-xs font-black text-slate-800 tracking-wide">过滤与深度配置</h3>
            </div>

            <!-- 表单内容 -->
            <div class="mt-4 space-y-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-[11px] font-bold text-slate-550">排除子文件夹（英文逗号隔开）</label>
                <input
                  v-model="excludeDirsInput"
                  type="text"
                  placeholder="如: node_modules, .git, dist"
                  class="workbench-input visual-input h-9 text-xs px-3"
                />
                <p class="text-[9px] text-slate-400 font-semibold">匹配到的文件夹将仅展示它本身，不递归读取子项。</p>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-[11px] font-bold text-slate-550">最大递归级别</label>
                <input
                  v-model.number="maxDepth"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="最大递归级别，默认 10"
                  class="workbench-input visual-input h-9 text-xs px-3"
                />
                <p class="text-[9px] text-slate-400 font-semibold">限制最大递归解析的层数，防止超大项目卡死。</p>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="mt-6 flex justify-end">
              <button
                type="button"
                class="workbench-btn bg-primary text-primary-content text-[11px] font-bold h-8.5 px-5 rounded-xl shadow-sm shadow-primary/10 cursor-pointer"
                @click="showConfigModal = false"
              >
                保存并确定
              </button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.tool-section-title {
  @apply text-sm font-extrabold text-slate-800 flex items-center gap-2;
}
.visual-input {
  border: 1px solid #cbd5e1 !important;
  background-color: #f8fafc !important;
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.03) !important;
  transition: all 0.2s ease !important;
}
.visual-input:focus {
  border-color: #2563eb !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
  background-color: #ffffff !important;
  outline: none !important;
}
.visual-textarea {
  border: 1px solid #cbd5e1 !important;
  background-color: #f8fafc !important;
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.03) !important;
  transition: all 0.2s ease !important;
}
.visual-textarea:focus {
  border-color: #2563eb !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
  background-color: #ffffff !important;
  outline: none !important;
}
</style>
