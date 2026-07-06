import { ref, type ComputedRef, type Ref } from "vue";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import type { ImageWorkbenchReferenceRole } from "../../types/image-workbench";
import type { ImageWorkbenchAssetCard } from "./imageWorkbenchReview";
import type { ImageWorkbenchTaskEntryKey, ImageWorkbenchTaskPresetKey } from "./imageWorkbenchTaskLauncher";
import { usesImageWorkbenchReferenceEntry } from "./imageWorkbenchTaskLauncher";

interface UseImageWorkbenchAssetSelectionOptions {
  activeScenePreset: Ref<ImageWorkbenchTaskPresetKey | null>;
  activeTaskEntry: Ref<ImageWorkbenchTaskEntryKey>;
  assetShelfDialogOpen: Ref<boolean>;
  commandSettingsOpen: Ref<boolean>;
  isInpaintWorkspace: ComputedRef<boolean>;
  referenceComposerOpen: Ref<boolean>;
  sceneGuideOpen: Ref<boolean>;
  selectedAssetCard: ComputedRef<ImageWorkbenchAssetCard | null>;
  store: ReturnType<typeof useImageWorkbenchStore>;
  t: (key: string) => string;
  applyDefaultReferenceRole: (keys: string | string[], role?: ImageWorkbenchReferenceRole) => void;
  applyDefaultReferenceRoles: () => void;
  defaultReferenceRoleForTask: (key?: ImageWorkbenchTaskEntryKey) => ImageWorkbenchReferenceRole;
  focusPromptInput: () => void;
  handleSelectReviewAsset: (asset: ImageWorkbenchAssetCard) => Promise<unknown>;
  handleUseSelectedAssetAsReference: () => boolean;
  prepareInpaintForSelectedAsset: () => void;
  syncTaskEntryForQualityFix: (issue: string) => void;
}

export function useImageWorkbenchAssetSelection(options: UseImageWorkbenchAssetSelectionOptions) {
  const previewAsset = ref<ImageWorkbenchAssetCard | null>(null);

  function closeTransientPanels() {
    options.assetShelfDialogOpen.value = false;
    options.sceneGuideOpen.value = false;
    options.commandSettingsOpen.value = false;
    options.referenceComposerOpen.value = false;
  }

  function openAssetPreview(asset: ImageWorkbenchAssetCard | null) {
    previewAsset.value = asset;
  }

  function handleOpenSelectedAssetPreview() {
    if (options.selectedAssetCard.value) {
      openAssetPreview(options.selectedAssetCard.value);
    }
  }

  async function handleSelectAssetAndShowDetails(asset: ImageWorkbenchAssetCard) {
    await options.handleSelectReviewAsset(asset);
    if (options.activeTaskEntry.value === "edit") {
      options.prepareInpaintForSelectedAsset();
      return;
    }
    if (usesImageWorkbenchReferenceEntry(options.activeTaskEntry.value) && !options.store.hasReferenceImage) {
      if (options.handleUseSelectedAssetAsReference()) {
        options.applyDefaultReferenceRole(asset.id);
      }
    }
  }

  async function handleOpenAssetPreview(asset: ImageWorkbenchAssetCard) {
    await handleSelectAssetAndShowDetails(asset);
    openAssetPreview(asset);
  }

  async function handleStartSourceSelect(asset: ImageWorkbenchAssetCard) {
    await handleSelectAssetAndShowDetails(asset);
    if (options.activeTaskEntry.value === "edit" || options.activeTaskEntry.value === "upscale") {
      options.assetShelfDialogOpen.value = false;
    }
  }

  async function handlePrepareQualityFixFromShelf(asset: ImageWorkbenchAssetCard) {
    await options.handleSelectReviewAsset(asset);
    const issue = options.store.prepareSelectedAssetQualityFix();
    if (!issue) {
      return;
    }
    options.syncTaskEntryForQualityFix(issue);
    closeTransientPanels();
  }

  async function handleReviewAssetFromShelf(asset: ImageWorkbenchAssetCard) {
    await options.handleSelectReviewAsset(asset);
    closeTransientPanels();
  }

  async function handleGalleryAssetClick(asset: ImageWorkbenchAssetCard) {
    if (asset.id === options.store.selectedAssetId && !options.isInpaintWorkspace.value) {
      handleClearSelectedAsset();
      return;
    }
    await handleSelectAssetAndShowDetails(asset);
  }

  function handleClearSelectedAsset() {
    options.sceneGuideOpen.value = false;
    options.store.clearSelectedAsset();
  }

  function handleCanvasBackgroundClick() {
    if (options.store.selectedAsset && !options.isInpaintWorkspace.value) {
      handleClearSelectedAsset();
    }
  }

  function handleWorkbenchKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && options.store.selectedAsset && !options.isInpaintWorkspace.value) {
      handleClearSelectedAsset();
    }
  }

  function handleUseSelectedReference() {
    if (options.handleUseSelectedAssetAsReference()) {
      options.applyDefaultReferenceRoles();
    }
    options.referenceComposerOpen.value = false;
  }

  function handleToggleReferenceFromShelf(asset: ImageWorkbenchAssetCard) {
    if (asset.integrityStatus && asset.integrityStatus !== "ok") {
      options.store.notice = options.t("imageWorkbench.errors.invalidReferenceAsset");
      return;
    }
    const currentIds = options.store.referenceAssets.map((referenceAsset) => referenceAsset.id);
    const isSelected = currentIds.includes(asset.id);
    const nextIds = isSelected
      ? currentIds.filter((assetId) => assetId !== asset.id)
      : [...currentIds, asset.id];
    if (!options.store.setAssetReferences(nextIds)) {
      return;
    }
    if (!isSelected) {
      const nextEntry = usesImageWorkbenchReferenceEntry(options.activeTaskEntry.value)
        ? options.activeTaskEntry.value
        : "reference";
      options.activeTaskEntry.value = nextEntry;
      options.activeScenePreset.value = null;
      options.store.mode =
        nextEntry === "person" || nextEntry === "storyboard"
          ? "person_consistency"
          : "img2img";
      options.store.notice = options.t("imageWorkbench.reference.assetSelectedNotice");
      options.referenceComposerOpen.value = false;
      options.applyDefaultReferenceRole(asset.id, options.defaultReferenceRoleForTask(nextEntry));
      options.focusPromptInput();
      return;
    }
    options.store.notice = options.t("imageWorkbench.reference.assetRemovedNotice");
  }

  return {
    handleCanvasBackgroundClick,
    handleClearSelectedAsset,
    handleGalleryAssetClick,
    handleOpenAssetPreview,
    handleOpenSelectedAssetPreview,
    handlePrepareQualityFixFromShelf,
    handleReviewAssetFromShelf,
    handleStartSourceSelect,
    handleToggleReferenceFromShelf,
    handleUseSelectedReference,
    handleWorkbenchKeydown,
    openAssetPreview,
    previewAsset,
  };
}
