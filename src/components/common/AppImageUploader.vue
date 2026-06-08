<script setup lang="ts">
/**
 * 全局通用图片上传与预览组件
 * 封装了选择本地文件、物理拷贝到应用目录、生成 WebView 安全链接预览以及一键清除逻辑
 */
import { computed, ref } from "vue";
import { UploadCloud, Image as ImageIcon, X } from "lucide-vue-next";
import { useFileManagerStore } from "../../stores/file-manager";
import { useToast } from "../../composables/useToast";
import { useI18n } from "../../composables/useI18n";
import { createRandomId } from "../../utils";

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

const fileManagerStore = useFileManagerStore();
const { triggerToast } = useToast();
const { t } = useI18n();
const uploading = ref(false);
const uploaderId = createRandomId("");
const labelId = `app-image-uploader-label-${uploaderId}`;
const imageLabel = computed(() => props.label || t("common.uploader.previewImage"));
const uploadLabel = computed(() => props.label ? `${t("common.uploader.clickUpload")}：${props.label}` : t("common.uploader.uploadImage"));
const clearLabel = computed(() => props.label ? `${t("common.uploader.clearImage")}：${props.label}` : t("common.uploader.clearImage"));

// WebView 转换本地路径预览
function getImgUrl(relPath: string) {
  return fileManagerStore.getImgUrl(relPath);
}

// 选择并上传图片
async function handleUpload() {
  if (uploading.value) return;
  uploading.value = true;
  try {
    const relPath = await fileManagerStore.uploadSelectedImage();
    if (relPath) {
      emit("update:modelValue", relPath);
      triggerToast(t('common.uploader.success'), "success");
    }
  } catch (err) {
    triggerToast(err instanceof Error ? err.message : t('common.uploader.failed'), "error");
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
    <label v-if="label" :id="labelId" class="text-[11px] font-bold text-slate-500 dark:text-slate-400">{{ label }}</label>
    
    <div
      v-if="modelValue"
      class="relative h-16 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden group/upload"
      role="group"
      :aria-labelledby="label ? labelId : undefined"
    >
      <img
        :src="getImgUrl(modelValue)"
        :alt="imageLabel"
        class="h-full w-full"
        :class="aspectRatio === 'cover' ? 'object-cover' : 'object-contain p-2'"
      />
      <button
        type="button"
        class="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/upload:opacity-100 focus-visible:opacity-100 cursor-pointer shadow-sm hover:bg-red-600 hover:scale-110 active:scale-95 hover:rotate-90 transition-all duration-200"
        :aria-label="clearLabel"
        :title="clearLabel"
        @click="handleClear"
      >
        <X class="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
    
    <button
      v-else
      type="button"
      class="h-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary bg-slate-50/30 dark:bg-slate-900/20 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-all duration-300 cursor-pointer disabled:opacity-50 group/uploader hover:shadow-sm"
      :disabled="uploading"
      :aria-busy="uploading"
      :aria-label="uploadLabel"
      :title="uploadLabel"
      @click="handleUpload"
    >
      <component
        :is="aspectRatio === 'cover' ? ImageIcon : UploadCloud"
        class="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover/uploader:text-primary group-hover/uploader:-translate-y-0.5 transition-all duration-300"
        :class="{ 'animate-pulse': uploading }"
        aria-hidden="true"
      />
      <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 group-hover/uploader:text-primary transition-colors duration-300">
        {{ uploading ? t('common.uploader.uploading') : t('common.uploader.clickUpload') }}
      </span>
    </button>
  </div>
</template>
