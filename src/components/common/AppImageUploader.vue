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
import { createRandomId, getErrorMessage } from "../../utils";

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
const previewFit = computed(() => (props.aspectRatio === "cover" ? "cover" : "contain"));
const uploadIcon = computed(() => (props.aspectRatio === "cover" ? ImageIcon : UploadCloud));

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
    triggerToast(getErrorMessage(err, t('common.uploader.failed')), "error");
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
  <div class="app-image-uploader">
    <label v-if="label" :id="labelId" class="app-image-uploader__label">{{ label }}</label>

    <div
      v-if="modelValue"
      class="app-image-uploader__preview"
      role="group"
      :aria-labelledby="label ? labelId : undefined"
    >
      <el-image
        :src="getImgUrl(modelValue)"
        :alt="imageLabel"
        class="app-image-uploader__image"
        :fit="previewFit"
      >
        <template #error>
          <div class="app-image-uploader__image-fallback">
            <ImageIcon class="h-5 w-5" aria-hidden="true" />
          </div>
        </template>
      </el-image>
      <el-button
        class="app-image-uploader__clear"
        type="danger"
        circle
        size="small"
        :icon="X"
        :aria-label="clearLabel"
        :title="clearLabel"
        @click="handleClear"
      />
    </div>

    <el-button
      v-else
      class="app-image-uploader__trigger"
      :disabled="uploading"
      :aria-busy="uploading"
      :aria-label="uploadLabel"
      :title="uploadLabel"
      @click="handleUpload"
    >
      <span class="app-image-uploader__trigger-inner">
        <span class="app-image-uploader__icon">
          <component
            :is="uploadIcon"
            class="h-5 w-5"
            :class="{ 'animate-pulse': uploading }"
            aria-hidden="true"
          />
        </span>
        <span class="app-image-uploader__text">
          {{ uploading ? t('common.uploader.uploading') : t('common.uploader.clickUpload') }}
        </span>
      </span>
    </el-button>
  </div>
</template>

<style scoped>
.app-image-uploader {
  @apply flex w-full min-w-0 flex-col gap-1.5;
}

.app-image-uploader__label {
  @apply text-[11px] font-bold leading-4 text-slate-500 dark:text-slate-400;
}

.app-image-uploader__preview {
  @apply relative flex h-20 w-full min-w-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 dark:border-slate-800 dark:bg-slate-950;
}

.app-image-uploader__preview:hover,
.app-image-uploader__preview:focus-within {
  @apply border-slate-300 shadow-md dark:border-slate-700;
}

.app-image-uploader__image {
  @apply h-full w-full bg-slate-50 dark:bg-slate-900;
}

.app-image-uploader__image :deep(.el-image__inner) {
  @apply h-full w-full;
}

.app-image-uploader__image :deep(.el-image__inner[style*="contain"]) {
  @apply p-2;
}

.app-image-uploader__image-fallback {
  @apply flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600;
}

.app-image-uploader__clear {
  @apply absolute right-2 top-2 opacity-0 shadow-sm transition duration-200;
}

.app-image-uploader__preview:hover .app-image-uploader__clear,
.app-image-uploader__preview:focus-within .app-image-uploader__clear {
  @apply opacity-100;
}

.app-image-uploader__trigger {
  @apply h-20 w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-0 py-0 text-slate-500 shadow-sm transition duration-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400;
}

.app-image-uploader__trigger:not(.is-disabled):hover,
.app-image-uploader__trigger:not(.is-disabled):focus-visible {
  border-color: rgb(var(--color-primary) / 0.45);
  background-color: rgb(var(--color-primary) / 0.04);
  color: rgb(var(--color-primary));
  @apply shadow-md;
}

.app-image-uploader__trigger.is-disabled {
  @apply opacity-60;
}

.app-image-uploader__trigger :deep(span) {
  @apply flex;
}

.app-image-uploader__trigger-inner {
  @apply h-full w-full flex-col items-center justify-center gap-1.5;
}

.app-image-uploader__icon {
  @apply h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition duration-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500;
}

.app-image-uploader__trigger:not(.is-disabled):hover .app-image-uploader__icon,
.app-image-uploader__trigger:not(.is-disabled):focus-visible .app-image-uploader__icon {
  border-color: rgb(var(--color-primary) / 0.28);
  color: rgb(var(--color-primary));
}

.app-image-uploader__text {
  @apply max-w-full text-[11px] font-black leading-4;
}

@media (prefers-reduced-motion: reduce) {
  .app-image-uploader__preview,
  .app-image-uploader__clear,
  .app-image-uploader__trigger,
  .app-image-uploader__icon {
    transition: none !important;
  }
}
</style>
