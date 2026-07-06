import { computed, type ComputedRef, type Ref } from "vue";
import {
  IMAGE_WORKBENCH_LARGE_BATCH_THRESHOLD,
  supportsModeForConfig,
  supportsNativeModeForConfig,
} from "./image-workbench-helpers";
import type { AiModelConfig } from "../types/ai";
import type { ImageWorkbenchMode } from "../types/image-workbench";

export function normalizePositiveImageWorkbenchQuantity(value: unknown, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(1, Math.floor(numeric));
}

export function createImageWorkbenchGenerationState(options: {
  mode: Ref<ImageWorkbenchMode>;
  quantity: Ref<number>;
  activeImageConfig: ComputedRef<AiModelConfig>;
  supportsCurrentProviderMode: ComputedRef<boolean>;
  currentModeContextUnavailableReason: ComputedRef<string>;
  t: (key: string) => string;
}) {
  const generationQuantity = computed(() =>
    options.mode.value === "inpaint" || options.mode.value.startsWith("upscale_")
      ? 1
      : normalizePositiveImageWorkbenchQuantity(options.quantity.value, 1)
  );
  const shouldConfirmLargeGeneration = computed(
    () => generationQuantity.value >= IMAGE_WORKBENCH_LARGE_BATCH_THRESHOLD
  );
  const imageModeProtocolNotice = computed(() => {
    if (!["img2img", "inpaint", "person_consistency"].includes(options.mode.value)) {
      return "";
    }
    if (!options.supportsCurrentProviderMode.value || options.currentModeContextUnavailableReason.value) {
      return "";
    }
    return supportsNativeModeForConfig(options.activeImageConfig.value, options.mode.value)
      ? options.t("imageWorkbench.reference.nativeProtocolNotice")
      : options.t("imageWorkbench.reference.fallbackProtocolNotice");
  });

  return {
    generationQuantity,
    shouldConfirmLargeGeneration,
    imageModeProtocolNotice,
  };
}

export function createImageWorkbenchModeCapabilityState(options: {
  activeImageConfig: ComputedRef<AiModelConfig>;
  hasUsableReferenceImage: ComputedRef<boolean>;
  loading: Ref<boolean>;
  selectedAssetUsable: ComputedRef<boolean>;
}) {
  const canRunInpaint = computed(() =>
    options.selectedAssetUsable.value &&
    supportsModeForConfig(options.activeImageConfig.value, "inpaint") &&
    !options.loading.value
  );
  const canRunStyleContinuation = computed(() =>
    options.selectedAssetUsable.value &&
    supportsModeForConfig(options.activeImageConfig.value, "img2img") &&
    !options.loading.value
  );
  const canRunPersonConsistency = computed(() =>
    (options.selectedAssetUsable.value || options.hasUsableReferenceImage.value) &&
    supportsModeForConfig(options.activeImageConfig.value, "person_consistency") &&
    !options.loading.value
  );
  const canRunUpscale2x = computed(() =>
    options.selectedAssetUsable.value &&
    supportsModeForConfig(options.activeImageConfig.value, "upscale_2x") &&
    !options.loading.value
  );
  const canRunUpscale4x = computed(() =>
    options.selectedAssetUsable.value &&
    supportsModeForConfig(options.activeImageConfig.value, "upscale_4x") &&
    !options.loading.value
  );

  return {
    canRunInpaint,
    canRunPersonConsistency,
    canRunStyleContinuation,
    canRunUpscale2x,
    canRunUpscale4x,
  };
}
