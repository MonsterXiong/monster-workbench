<script setup lang="ts">
import { computed } from "vue";
import { ImagePlus, Images, Sparkles } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";

const props = defineProps<{
  referenceLimitReached: boolean;
  hasUploadedReference: boolean;
  hasAssetReference: boolean;
  canUseSelectedAsset: boolean;
  selectedAssetIsReference: boolean;
}>();

const emit = defineEmits<{
  upload: [];
  openLibrary: [];
  useSelected: [];
}>();

const { t } = useI18n();

const sourceOptions = computed(() => [
  {
    key: "upload" as const,
    label: t("imageWorkbench.reference.sourceUpload"),
    description: t("imageWorkbench.reference.sourceUploadDesc"),
    disabled: props.referenceLimitReached && !props.hasUploadedReference,
    active: props.hasUploadedReference,
  },
  {
    key: "library" as const,
    label: t("imageWorkbench.reference.sourceLibrary"),
    description: t("imageWorkbench.reference.sourceLibraryDesc"),
    disabled: props.referenceLimitReached,
    active: props.hasAssetReference,
  },
  {
    key: "selected" as const,
    label: t("imageWorkbench.reference.sourceSelected"),
    description: props.canUseSelectedAsset
      ? t("imageWorkbench.reference.sourceSelectedDesc")
      : t("imageWorkbench.reference.sourceSelectedEmpty"),
    disabled: !props.canUseSelectedAsset,
    active: props.selectedAssetIsReference,
  },
]);

function handleSourceClick(key: "upload" | "library" | "selected") {
  if (key === "upload") {
    emit("upload");
    return;
  }
  if (key === "library") {
    emit("openLibrary");
    return;
  }
  emit("useSelected");
}
</script>

<template>
  <div class="image-workbench-reference-source-grid">
    <button
      v-for="option in sourceOptions"
      :key="option.key"
      type="button"
      :class="{ 'is-active': option.active }"
      :disabled="option.disabled"
      @click="handleSourceClick(option.key)"
    >
      <ImagePlus v-if="option.key === 'upload'" class="h-3.5 w-3.5" />
      <Images v-else-if="option.key === 'library'" class="h-3.5 w-3.5" />
      <Sparkles v-else class="h-3.5 w-3.5" />
      <span>
        <strong>{{ option.label }}</strong>
        <small>{{ option.description }}</small>
      </span>
    </button>
  </div>
</template>
