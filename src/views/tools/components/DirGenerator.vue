<script setup lang="ts">
import { ref, onMounted } from "vue";
import { FolderTree, FolderSearch2, RefreshCw } from "lucide-vue-next";
import { systemService } from "../../../services/system.service";
import type { PathItem } from "../../../services/system.service";

const emit = defineEmits<{
  (e: "toast", msg: string, type?: "success" | "error"): void;
}>();

const rootPath = ref("");
const defaultAppDataDir = ref("");
const includeTopDir = ref(true); // 默认含顶级目录
const createLoading = ref(false);

const treeInput = ref("");

function loadExampleData() {
  treeInput.value = `LifeOS/
├── 00_Inbox_收件箱/
│   ├── files.js
│   ├── notes_临时笔记/
│   ├── downloads_待处理下载/
│   └── ideas_想法草稿/`;
}

onMounted(async () => {
  try {
    defaultAppDataDir.value = await systemService.getAppDataDir();
  } catch {
    defaultAppDataDir.value = "浏览器暂无目录路径";
  }
});

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

function parseTreeText(text: string): PathItem[] {
  const lines = text.split('\n');
  const result: PathItem[] = [];
  const pathStack: string[] = [];

  for (let line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^([│\s├└─┬]*)(.*)$/);
    if (!match) continue;

    const prefix = match[1];
    const name = match[2].trim();
    if (!name) continue;

    const depth = Math.floor(prefix.length / 4);

    if (depth < pathStack.length) {
      pathStack.splice(depth);
    }
    pathStack[depth] = name;

    const cleanName = name.replace(/[/\\]+$/, "");
    const currentStack = pathStack.slice(0, depth).map(n => n.replace(/[/\\]+$/, ""));
    currentStack.push(cleanName);
    const fullRelPath = currentStack.join('/');

    const isFile = !name.endsWith('/') && !name.endsWith('\\') && cleanName.includes('.') && !cleanName.endsWith('.');

    result.push({
      path: fullRelPath,
      is_file: isFile
    });
  }
  return result;
}

async function handleGenerateStructure() {
  if (!treeInput.value.trim()) {
    emit("toast", "树形结构内容不能为空", "error");
    return;
  }
  createLoading.value = true;
  try {
    let items = parseTreeText(treeInput.value);

    // 过滤顶级目录逻辑
    if (!includeTopDir.value && items.length > 0) {
      const topDirName = items[0].path; // 如 "LifeOS"
      const prefix = topDirName + "/";
      items = items
        .filter(item => item.path !== topDirName)
        .map(item => {
          if (item.path.startsWith(prefix)) {
            return {
              ...item,
              path: item.path.substring(prefix.length)
            };
          }
          return item;
        });
    }

    await systemService.createDirectoryStructure(rootPath.value || null, items);
    emit("toast", "目录结构物理创建成功！");
  } catch (err) {
    emit("toast", err instanceof Error ? err.message : "创建失败", "error");
  } finally {
    createLoading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col h-[520px] min-h-0">
    <!-- 头部栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-2 shrink-0">
      <div class="tool-section-title">
        <FolderTree class="h-4.5 w-4.5 text-blue-600" />
        文件与目录结构物理生成
      </div>
    </div>

    <!-- 主体 Flex 内容，自动填充高度 -->
    <div class="flex-1 flex flex-col gap-4 mt-4 min-h-0">
      <!-- 根目录输入及选择 -->
      <div class="flex flex-col gap-1.5 shrink-0">
        <label class="text-xs font-bold text-slate-500">根目录（留空则默认在应用数据目录）</label>
        <div class="flex gap-2">
          <input
            v-model="rootPath"
            type="text"
            placeholder="请选择或输入根文件夹物理路径，或留空"
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
        <p class="text-[10px] text-slate-400 font-semibold truncate">默认生成在：{{ defaultAppDataDir }}</p>
      </div>

      <!-- 选项和重置栏 -->
      <div class="flex items-center justify-between shrink-0 py-0.5">
        <label class="flex items-center gap-2 text-xs font-bold text-slate-605 cursor-pointer select-none">
          <input
            v-model="includeTopDir"
            type="checkbox"
            class="checkbox checkbox-xs rounded border-slate-350 [--chkbg:#2563eb] [--chkfg:white] cursor-pointer"
          />
          <span>含顶级目录</span>
        </label>
        <div class="flex gap-3">
          <button
            class="text-[11px] text-blue-600 font-bold hover:underline"
            @click="loadExampleData"
          >
            一键生成示例数据
          </button>
          <button
            class="text-[11px] text-error font-bold hover:underline"
            @click="treeInput = ''"
          >
            清空树形图
          </button>
        </div>
      </div>

      <!-- 树形图文本输入 textarea (Flex-1) -->
      <div class="flex-1 flex flex-col min-h-0">
        <textarea
          v-model="treeInput"
          placeholder="请粘贴您的树形结构文本，有后缀自动创建文件，无后缀创建文件夹"
          class="workbench-textarea visual-textarea flex-1 p-3 text-xs leading-5 resize-none overflow-y-auto"
        ></textarea>
      </div>

      <!-- 物理生成按钮 (最底部) -->
      <div class="pt-2 flex justify-end shrink-0">
        <button
          class="workbench-btn bg-primary text-primary-content text-xs h-10 px-6 font-bold shadow-sm shadow-primary/10"
          :disabled="createLoading"
          @click="handleGenerateStructure"
        >
          <RefreshCw v-if="createLoading" class="h-3.5 w-3.5 animate-spin mr-1.5" />
          一键在本地创建结构
        </button>
      </div>
    </div>
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
