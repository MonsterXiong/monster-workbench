import { nextTick, type ComputedRef, type Ref } from "vue";
import type { useImageWorkbenchStore } from "../../stores/image-workbench";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchMode,
  ImageWorkbenchReferenceRole,
} from "../../types/image-workbench";
import type { ImageWorkbenchAssetShelfView } from "./imageWorkbenchReview";
import {
  getImageWorkbenchTaskPresetConfig,
  type ImageWorkbenchTaskEntryKey,
  type ImageWorkbenchTaskPresetKey,
  usesImageWorkbenchReferenceEntry,
} from "./imageWorkbenchTaskLauncher";

interface ImageWorkbenchTaskEntrySelectOptions {
  useSelectedAsset?: boolean;
}

interface UseImageWorkbenchTaskFlowOptions {
  activeScenePreset: Ref<ImageWorkbenchTaskPresetKey | null>;
  activeTaskEntry: Ref<ImageWorkbenchTaskEntryKey>;
  assetShelfView: Ref<ImageWorkbenchAssetShelfView>;
  commandSettingsOpen: Ref<boolean>;
  isStoryboardTask: ComputedRef<boolean>;
  promptTextareaRef: Ref<HTMLTextAreaElement | null>;
  referenceComposerOpen: Ref<boolean>;
  sceneGuideOpen: Ref<boolean>;
  selectedAsset: ComputedRef<ImageWorkbenchAsset | null>;
  selectedAssetUnavailableReason: ComputedRef<string>;
  showWorkspaceStart: ComputedRef<boolean>;
  showsReferenceInput: ComputedRef<boolean>;
  sourceAssetShelfPreloaded: Ref<boolean>;
  store: ReturnType<typeof useImageWorkbenchStore>;
  t: (key: string) => string;
  upscaleScale: Ref<2 | 4>;
  applyDefaultReferenceRoles: (role?: ImageWorkbenchReferenceRole) => void;
  defaultReferenceRoleForTask: (key?: ImageWorkbenchTaskEntryKey) => ImageWorkbenchReferenceRole;
  handleUseSelectedAssetAsReference: () => boolean;
  syncStoryboardDraftFromPrompt: () => void;
}

export function useImageWorkbenchTaskFlow(options: UseImageWorkbenchTaskFlowOptions) {
  function ensureReferenceTaskContext() {
    if (options.showsReferenceInput.value) {
      return;
    }
    options.activeTaskEntry.value = "reference";
    options.activeScenePreset.value = null;
    options.store.mode = "img2img";
  }

  function handleToggleReferenceComposer() {
    ensureReferenceTaskContext();
    options.referenceComposerOpen.value = !options.referenceComposerOpen.value;
    if (options.referenceComposerOpen.value) {
      options.commandSettingsOpen.value = false;
    }
  }

  function handleOpenReferenceComposer() {
    ensureReferenceTaskContext();
    options.referenceComposerOpen.value = true;
    options.commandSettingsOpen.value = false;
  }

  function handleToggleCommandSettings() {
    options.commandSettingsOpen.value = !options.commandSettingsOpen.value;
    if (options.commandSettingsOpen.value) {
      options.referenceComposerOpen.value = false;
    }
  }

  function handleOpenCommandSettings() {
    options.commandSettingsOpen.value = true;
    options.referenceComposerOpen.value = false;
  }

  async function handleEnableImageProviderConcurrency() {
    await options.store.enableImageProviderConcurrency();
  }

  function modeLabel(mode: ImageWorkbenchMode | string) {
    return options.t(`imageWorkbench.modes.${mode}`);
  }

  function syncTaskEntryFromMode() {
    if (options.store.mode === "txt2img") {
      options.activeTaskEntry.value = "create";
      return;
    }
    if (options.store.mode === "inpaint") {
      options.activeTaskEntry.value = "edit";
      return;
    }
    if (options.store.mode === "person_consistency") {
      options.activeTaskEntry.value = "person";
      return;
    }
    if (options.store.mode.startsWith("upscale_")) {
      options.activeTaskEntry.value = "upscale";
      return;
    }
    options.activeTaskEntry.value = options.store.hasReferenceImage ? "reference" : "style";
  }

  function focusPromptInput() {
    void nextTick(() => options.promptTextareaRef.value?.focus());
  }

  function handleUpscaleScaleSelect(scale: 2 | 4) {
    options.upscaleScale.value = scale;
    const targetMode: ImageWorkbenchMode = scale === 4 ? "upscale_4x" : "upscale_2x";
    options.store.mode = targetMode;
    options.store.quantity = 1;
    options.store.prompt = options.t("imageWorkbench.asset.upscaleDefaultPrompt");
  }

  function prepareSourceAssetShelf() {
    options.assetShelfView.value = "library";
    if (
      !options.sourceAssetShelfPreloaded.value &&
      options.store.assetLibraryHasMore &&
      !options.store.assetLibraryLoadingMore
    ) {
      options.sourceAssetShelfPreloaded.value = true;
      void options.store.loadMoreAssetLibrary().catch(() => {
        options.sourceAssetShelfPreloaded.value = false;
      });
    }
  }

  function handleNewWorkbenchTask() {
    options.activeTaskEntry.value = "create";
    options.activeScenePreset.value = null;
    options.store.mode = "txt2img";
    options.store.clearSelectedAsset();
    options.sceneGuideOpen.value = true;
    options.referenceComposerOpen.value = false;
    options.commandSettingsOpen.value = false;
    void nextTick(() => {
      if (!options.showWorkspaceStart.value) {
        focusPromptInput();
      }
    });
  }

  function handleSceneTaskSelect(key: ImageWorkbenchTaskEntryKey) {
    handleTaskEntrySelect(key);
    options.sceneGuideOpen.value = true;
  }

  function handleToggleSceneGuide() {
    options.sceneGuideOpen.value = !options.sceneGuideOpen.value;
    if (options.sceneGuideOpen.value && options.isStoryboardTask.value) {
      options.syncStoryboardDraftFromPrompt();
    }
  }

  function handleTaskEntrySelect(
    key: ImageWorkbenchTaskEntryKey,
    selectOptions: ImageWorkbenchTaskEntrySelectOptions = {}
  ) {
    options.activeTaskEntry.value = key;
    options.activeScenePreset.value = null;
    options.referenceComposerOpen.value = usesImageWorkbenchReferenceEntry(key) && !options.store.hasReferenceImage;
    if (key !== "edit") {
      options.store.closeInpaintEditor();
    }
    if (key === "create") {
      options.store.mode = "txt2img";
      focusPromptInput();
      return;
    }
    if (key === "reference") {
      options.store.mode = "img2img";
      const usedSelectedReference = ensureSelectedAssetReference();
      options.applyDefaultReferenceRoles(options.defaultReferenceRoleForTask(key));
      if (usedSelectedReference) {
        options.referenceComposerOpen.value = false;
      }
      if (!usedSelectedReference) {
        options.store.notice = options.t("imageWorkbench.tasks.referenceNotice");
      }
      focusPromptInput();
      return;
    }
    if (key === "edit") {
      options.store.mode = "inpaint";
      options.store.quantity = 1;
      options.store.closeInpaintEditor();
      options.referenceComposerOpen.value = false;
      options.commandSettingsOpen.value = false;
      prepareSourceAssetShelf();
      if (selectOptions.useSelectedAsset) {
        prepareInpaintForSelectedAsset();
        return;
      }
      options.store.clearSelectedAsset();
      options.store.notice = options.t("imageWorkbench.input.guidance.editNeedImage");
      return;
    }
    if (key === "upscale") {
      handleUpscaleScaleSelect(2);
      prepareSourceAssetShelf();
      if (!selectOptions.useSelectedAsset) {
        options.store.clearSelectedAsset();
      }
      options.store.notice = options.selectedAssetUnavailableReason.value ||
        (selectOptions.useSelectedAsset && options.selectedAsset.value
          ? options.t("imageWorkbench.tasks.upscaleNotice")
          : options.t("imageWorkbench.tasks.needImageNotice"));
      return;
    }
    if (key === "person" || key === "storyboard") {
      options.store.mode = "person_consistency";
      const usedSelectedReference = ensureSelectedAssetReference();
      options.applyDefaultReferenceRoles(options.defaultReferenceRoleForTask(key));
      if (usedSelectedReference) {
        options.referenceComposerOpen.value = false;
      }
      if (key === "person") {
        options.store.prompt = options.store.prompt.trim() || options.t("imageWorkbench.asset.personDefaultPrompt");
      }
      if (key === "storyboard") {
        options.syncStoryboardDraftFromPrompt();
        options.sceneGuideOpen.value = true;
      }
      options.store.notice = options.selectedAssetUnavailableReason.value ||
        (usedSelectedReference || options.store.hasReferenceImage
          ? options.t(key === "storyboard" ? "imageWorkbench.tasks.storyboardNotice" : "imageWorkbench.tasks.personNotice")
          : options.t("imageWorkbench.tasks.needReferenceNotice"));
      focusPromptInput();
      return;
    }
    options.store.mode = "img2img";
    if (options.store.canUseSelectedAssetAsReference) {
      if (options.handleUseSelectedAssetAsReference()) {
        options.applyDefaultReferenceRoles(options.defaultReferenceRoleForTask(key));
        options.referenceComposerOpen.value = false;
      }
    }
    options.store.prompt = options.store.prompt.trim() || options.t("imageWorkbench.asset.styleDefaultPrompt");
    options.applyDefaultReferenceRoles(options.defaultReferenceRoleForTask(key));
    options.store.notice = options.selectedAssetUnavailableReason.value ||
      (options.store.hasReferenceImage
        ? options.t("imageWorkbench.tasks.styleNotice")
        : options.t("imageWorkbench.tasks.needReferenceNotice"));
    focusPromptInput();
  }

  function prepareInpaintForSelectedAsset() {
    options.store.mode = "inpaint";
    options.store.quantity = 1;
    options.referenceComposerOpen.value = false;
    if (options.store.canRunInpaint) {
      options.sceneGuideOpen.value = false;
      options.commandSettingsOpen.value = false;
      options.store.startInpaintSelectedAsset();
      return true;
    }
    if (options.selectedAssetUnavailableReason.value) {
      options.store.notice = options.selectedAssetUnavailableReason.value;
    } else if (options.selectedAsset.value) {
      options.store.notice = options.t("imageWorkbench.errors.inpaintDeferred");
    } else {
      options.store.notice = options.t("imageWorkbench.tasks.needImageNotice");
    }
    return false;
  }

  function ensureSelectedAssetReference() {
    return !options.store.hasReferenceImage &&
      options.store.canUseSelectedAssetAsReference &&
      options.handleUseSelectedAssetAsReference();
  }

  function handleTaskPresetApply(key: ImageWorkbenchTaskPresetKey) {
    const preset = getImageWorkbenchTaskPresetConfig(key);
    if (!preset) {
      return;
    }
    handleTaskEntrySelect(preset.entryKey);
    options.activeScenePreset.value = key;
    options.sceneGuideOpen.value = preset.entryKey === "edit" || preset.entryKey === "upscale";
    options.store.prompt = options.t(preset.promptKey);
    options.store.outputQuality = "high";
    focusPromptInput();
  }

  function handleInspectorTaskEntryChange(key: ImageWorkbenchTaskEntryKey) {
    options.activeTaskEntry.value = key;
    options.activeScenePreset.value = null;
    options.sceneGuideOpen.value = false;
    if (key === "upscale") {
      options.upscaleScale.value = options.store.mode === "upscale_4x" ? 4 : 2;
    }
    if (key === "storyboard") {
      options.store.mode = "person_consistency";
      options.syncStoryboardDraftFromPrompt();
      options.sceneGuideOpen.value = true;
    }
    if (key === "reference" || key === "style" || key === "person" || key === "storyboard") {
      focusPromptInput();
    }
  }

  function handleInspectorTaskEntrySync() {
    syncTaskEntryFromMode();
    if (options.activeTaskEntry.value === "upscale") {
      options.upscaleScale.value = options.store.mode === "upscale_4x" ? 4 : 2;
    }
  }

  function syncTaskEntryForQualityFix(issue: string) {
    handleInspectorTaskEntryChange(issue === "identity" ? "person" : "edit");
  }

  return {
    focusPromptInput,
    handleEnableImageProviderConcurrency,
    handleInspectorTaskEntryChange,
    handleInspectorTaskEntrySync,
    handleNewWorkbenchTask,
    handleOpenCommandSettings,
    handleOpenReferenceComposer,
    handleSceneTaskSelect,
    handleTaskEntrySelect,
    handleTaskPresetApply,
    handleToggleCommandSettings,
    handleToggleReferenceComposer,
    handleToggleSceneGuide,
    handleUpscaleScaleSelect,
    modeLabel,
    prepareInpaintForSelectedAsset,
    syncTaskEntryForQualityFix,
    syncTaskEntryFromMode,
  };
}
