<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  FolderOpen,
  Trash2,
  UploadCloud,
  Image as ImageIcon,
  FileText,
  Search,
  X,
  Eye,
  RefreshCw,
} from "lucide-vue-next";
import { fileManagerService, type UploadedFileInfo } from "../../services/file-manager.service";
import { systemService } from "../../services/system.service";
import { navigationService } from "../../services/navigation.service";
import { useAppStore } from "../../stores/app";
import { isTauriRuntime } from "../../services/runtime";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useToast } from "../../composables/useToast";
import { useConfirm } from "../../composables/useConfirm";

const appStore = useAppStore();
const { triggerToast } = useToast();
const { confirm } = useConfirm();

const files = ref<UploadedFileInfo[]>([]);
const loading = ref(false);
const keyword = ref("");
const typeFilter = ref<string | undefined>(undefined);

// 预览弹窗
const previewUrl = ref("");
const showPreview = ref(false);

// 获取文件列表
async function fetchFiles() {
  loading.value = true;
  try {
    files.value = await fileManagerService.listUploadedFiles(typeFilter.value);
  } catch (err) {
    triggerToast(err instanceof Error ? err.message : "获取文件列表失败");
  } finally {
    loading.value = false;
  }
}

onMounted(fetchFiles);

// 筛选后的文件列表
const filteredFiles = computed(() => {
  if (!keyword.value.trim()) return files.value;
  const kw = keyword.value.toLowerCase();
  return files.value.filter(
    (f) => f.file_name.toLowerCase().includes(kw) || f.rel_path.toLowerCase().includes(kw)
  );
});

// 图片预览 URL
function getImgUrl(relPath: string) {
  if (!relPath) return "";
  if (!isTauriRuntime()) return "";
  const absPath = appStore.localPath + "/" + relPath;
  return convertFileSrc(absPath);
}

// 格式化文件大小
function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// 格式化时间
function formatDate(timestamp: number): string {
  if (!timestamp) return "-";
  const d = new Date(timestamp * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// 上传文件
async function handleUpload() {
  try {
    const selected = await systemService.selectFile();
    if (selected) {
      await systemService.uploadFile(selected, "image");
      triggerToast("文件上传成功！");
      await fetchFiles();
    }
  } catch (err) {
    triggerToast(err instanceof Error ? err.message : "文件上传失败");
  }
}

// 删除文件（二次确认）
async function handleDelete(file: UploadedFileInfo) {
  try {
    const check = await fileManagerService.isFileReferenced(appStore.localPath, file.rel_path);
    let confirmMsg = `确定要删除文件 "${file.file_name}" 吗？\n此操作无法撤销。`;
    if (check.referenced) {
      confirmMsg = `【强力删除警告】该文件目前已被以下网址导航项所使用：\n${check.usage.join("、")}\n\n若强行删除，磁盘上的图片文件将被彻底抹除，并且上述网址导航的图片路径将自动置空以防死链。是否确定继续？`;
    }

    const ok = await confirm({
      title: check.referenced ? "强力删除并解绑引用" : "删除文件",
      message: confirmMsg,
      confirmText: check.referenced ? "解绑并强制删除" : "确定删除",
      danger: true,
    });
    if (!ok) return;

    if (check.referenced) {
      await navigationService.clearFileReferences(appStore.localPath, file.rel_path);
    }

    await fileManagerService.deleteUploadedFile(file.rel_path);
    triggerToast("文件已成功删除并解除关联！");
    await fetchFiles();
  } catch (err) {
    triggerToast(err instanceof Error ? err.message : "删除文件失败");
  }
}

// 预览图片
function handlePreview(file: UploadedFileInfo) {
  if (file.file_type === "image") {
    previewUrl.value = getImgUrl(file.rel_path);
    showPreview.value = true;
  }
}

// 切换类型筛选
function changeTypeFilter(type: string | undefined) {
  typeFilter.value = type;
  fetchFiles();
}

// 复制相对存储路径
function handleCopyRelPath(relPath: string) {
  try {
    navigator.clipboard.writeText(relPath);
    triggerToast("已复制相对存储路径！");
  } catch (err) {
    const textarea = document.createElement("textarea");
    textarea.value = relPath;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    triggerToast("已复制相对存储路径！");
  }
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-base-100 rounded-3xl p-5 border border-slate-200/60 shadow-sm relative">
    <!-- 顶部控制栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5 mb-1 gap-3 shrink-0">
      <div class="flex items-center gap-2.5">
        <div class="h-9 w-9 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
          <FolderOpen class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-sm font-black text-slate-800 tracking-wide">文件管理</h2>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="workbench-btn border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 h-8 text-[11px] font-bold px-3.5"
          @click="fetchFiles"
        >
          <RefreshCw class="h-3 w-3 mr-1" :class="{ 'animate-spin': loading }" />
          刷新
        </button>
        <button
          class="workbench-btn bg-primary text-primary-content h-8 text-[11px] font-bold px-4 shadow-sm shadow-primary/10"
          @click="handleUpload"
        >
          <UploadCloud class="h-3.5 w-3.5 mr-1" />
          上传
        </button>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4 pb-1 shrink-0">
      <!-- 类型筛选 -->
      <div class="flex items-center gap-2">
        <button
          class="type-tab-btn"
          :class="typeFilter === undefined ? 'bg-blue-600 text-white font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'"
          @click="changeTypeFilter(undefined)"
        >
          全部
        </button>
        <button
          class="type-tab-btn"
          :class="typeFilter === 'image' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'"
          @click="changeTypeFilter('image')"
        >
          <ImageIcon class="h-3 w-3" />
          图片
        </button>
        <button
          class="type-tab-btn"
          :class="typeFilter === 'file' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'"
          @click="changeTypeFilter('file')"
        >
          <FileText class="h-3 w-3" />
          文件
        </button>
      </div>

      <!-- 搜索框 -->
      <div class="relative w-full md:w-72">
        <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          <Search class="h-3.5 w-3.5" />
        </div>
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索文件名..."
          class="workbench-input h-9 w-full pr-8 text-xs"
          style="padding-left: 32px !important;"
        />
        <button
          v-if="keyword"
          class="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
          @click="keyword = ''"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="flex-1 overflow-y-auto mt-4 min-h-0">
      <!-- 加载中 -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <RefreshCw class="h-6 w-6 text-blue-500 animate-spin" />
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredFiles.length === 0" class="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div class="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
          <FolderOpen class="h-7 w-7" />
        </div>
        <div>
          <h3 class="text-xs font-bold text-slate-700">暂无上传文件</h3>
          <p class="text-[10px] text-slate-400 font-semibold mt-1">点击右上方"上传"添加文件</p>
        </div>
      </div>

      <!-- 文件表格 -->
      <div v-else class="w-full">
        <table class="w-full text-xs">
          <thead class="sticky top-0 bg-white z-10">
            <tr class="border-b border-slate-100">
              <th class="text-left py-2.5 px-3 font-bold text-slate-500 w-14">预览</th>
              <th class="text-left py-2.5 px-3 font-bold text-slate-500">文件名</th>
              <th class="text-left py-2.5 px-3 font-bold text-slate-500 w-20">类型</th>
              <th class="text-left py-2.5 px-3 font-bold text-slate-500 w-20">大小</th>
              <th class="text-left py-2.5 px-3 font-bold text-slate-500 w-36">上传时间</th>
              <th class="text-center py-2.5 px-3 font-bold text-slate-500 w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="file in filteredFiles"
              :key="file.rel_path"
              class="border-b border-slate-50 hover:bg-slate-50/80 transition-colors"
            >
              <!-- 缩略图 -->
              <td class="py-2 px-3">
                <div class="h-9 w-9 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden">
                  <img
                    v-if="file.file_type === 'image'"
                    :src="getImgUrl(file.rel_path)"
                    class="h-full w-full object-cover cursor-pointer"
                    @click="handlePreview(file)"
                  />
                  <FileText v-else class="h-4 w-4 text-slate-400" />
                </div>
              </td>
              <!-- 文件名 -->
              <td
                class="py-2 px-3 cursor-pointer group/cell hover:bg-slate-100/40 rounded-xl transition"
                title="双击或点击复制文件的相对存储路径"
                @click="handleCopyRelPath(file.rel_path)"
              >
                <p class="text-slate-700 font-bold truncate max-w-[200px] group-hover/cell:text-blue-600 transition" :title="file.file_name">
                  {{ file.file_name }}
                </p>
                <p class="text-[10px] text-slate-400 truncate max-w-[200px]" :title="file.rel_path">
                  {{ file.rel_path }}
                </p>
              </td>
              <!-- 类型 -->
              <td class="py-2 px-3">
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  :class="file.file_type === 'image' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'"
                >
                  {{ file.file_type === 'image' ? '图片' : '文件' }}
                </span>
              </td>
              <!-- 大小 -->
              <td class="py-2 px-3 text-slate-500">{{ formatSize(file.file_size) }}</td>
              <!-- 时间 -->
              <td class="py-2 px-3 text-slate-500">{{ formatDate(file.modified) }}</td>
              <!-- 操作 -->
              <td class="py-2 px-3">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    v-if="file.file_type === 'image'"
                    class="h-6 w-6 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-blue-600 transition"
                    title="预览"
                    @click="handlePreview(file)"
                  >
                    <Eye class="h-3 w-3" />
                  </button>
                  <button
                    class="h-6 w-6 rounded-md border border-slate-200 bg-white hover:bg-red-50 flex items-center justify-center text-slate-500 hover:text-red-600 hover:border-red-200 transition"
                    title="删除"
                    @click="handleDelete(file)"
                  >
                    <Trash2 class="h-3 w-3" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 底部统计 -->
    <div class="flex items-center justify-between mt-4 border-t border-slate-100 pt-3 shrink-0">
      <span class="text-[11px] text-slate-400 font-bold">共{{ filteredFiles.length }}个文件</span>
    </div>

    <!-- 图片预览弹窗 -->
    <transition
      enter-active-class="ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showPreview"
        class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-8"
        @click.self="showPreview = false"
      >
        <div class="relative max-w-[80vw] max-h-[80vh]">
          <img :src="previewUrl" class="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain" />
          <button
            class="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-white shadow-md flex items-center justify-center text-slate-500 hover:text-slate-700 transition"
            @click="showPreview = false"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.type-tab-btn {
  @apply flex-shrink-0 px-4 py-1.5 text-[11px] font-extrabold rounded-full transition-all duration-200 cursor-pointer border border-transparent flex items-center gap-1;
}
</style>
