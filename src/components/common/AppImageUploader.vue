<script setup lang="ts">
/**
 * 全局通用图片上传与预览组件
 * 封装了选择本地文件、物理拷贝到应用目录、生成 WebView 安全链接预览以及一键清除逻辑
 */
import { ref } from "vue";
import { UploadCloud, Image as ImageIcon, X } from "lucide-vue-next";
import { systemService } from "../../services/system.service";
import { useAppStore } from "../../stores/app";
import { isTauriRuntime } from "../../services/runtime";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useToast } from "../../composables/useToast";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    aspectRatio?: "contain" | "cover";
  }>(),
  {
    label: "",
    aspectRatio: "contain",
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", val: string): void;
}>();

const appStore = useAppStore();
const { triggerToast } = useToast();
const uploading = ref(false);

// WebView 转换本地路径预览
function getImgUrl(relPath: string) {
  if (!relPath) return "";
  if (!isTauriRuntime()) {
    return "https://api.dicebear.com/7.x/identicon/svg?seed=" + encodeURIComponent(relPath);
  }
  const absPath = appStore.localPath + "/" + relPath;
  return convertFileSrc(absPath);
}

// 选择并上传图片
async function handleUpload() {
  if (uploading.value) return;
  uploading.value = true;
  try {
    const selected = await systemService.selectFile();
    if (selected) {
      const relPath = await systemService.uploadFile(selected, "image");
      emit("update:modelValue", relPath);
      triggerToast("图片上传成功");
    }
  } catch (err) {
    triggerToast(err instanceof Error ? err.message : "图片上传失败");
  } finally {
    uploading.value = false;
  }
}

// 移除图片
function handleClear() {
  emit("update:modelValue", "");
}
</script>

<template>
  <div class="flex flex-col gap-1.5 w-full">
    <label v-if="label" class="text-[11px] font-bold text-slate-550">{{ label }}</label>
    
    <div
      v-if="modelValue"
      class="relative h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group/upload"
    >
      <img
        :src="getImgUrl(modelValue)"
        class="h-full w-full"
        :class="aspectRatio === 'cover' ? 'object-cover' : 'object-contain p-2'"
      />
      <button
        type="button"
        class="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/upload:opacity-100 cursor-pointer shadow-sm hover:bg-red-600 hover:scale-110 active:scale-95 hover:rotate-90 transition-all duration-200"
        @click="handleClear"
      >
        <X class="h-3 w-3" />
      </button>
    </div>
    
    <button
      v-else
      type="button"
      class="h-16 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 flex flex-col items-center justify-center gap-1 transition-all duration-300 cursor-pointer disabled:opacity-50 group/uploader hover:shadow-sm"
      :disabled="uploading"
      @click="handleUpload"
    >
      <component
        :is="aspectRatio === 'cover' ? ImageIcon : UploadCloud"
        class="h-4 w-4 text-slate-400 group-hover/uploader:text-blue-500 group-hover/uploader:-translate-y-0.5 transition-all duration-300"
        :class="{ 'animate-pulse': uploading }"
      />
      <span class="text-[9px] font-bold text-slate-400 group-hover/uploader:text-blue-600 transition-colors duration-300">
        {{ uploading ? '上传中...' : '点击上传' }}
      </span>
    </button>
  </div>
</template>
