import { computed, ref, type ComputedRef, type Ref } from "vue";
import { imageWorkbenchService } from "../services/image-workbench.service";
import { resolveDisplayImageSrc } from "../services/image-source.service";
import { isTauriRuntime } from "../services/runtime";
import { formatTemplate } from "../utils";
import { BROWSER_REFERENCE_IMAGE_PATH, toAssetCard } from "./image-workbench-helpers";
import { useFileManagerStore } from "./file-manager";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchMode,
  ImageWorkbenchReferenceRole,
} from "../types/image-workbench";

export const IMAGE_WORKBENCH_REFERENCE_LIMIT = 4;
const DEFAULT_REFERENCE_ROLES: ImageWorkbenchReferenceRole[] = ["person", "prop", "scene", "style"];

type ImageWorkbenchReferenceItem = {
  key: string;
  assetId: string;
  displayUrl: string;
  sourcePath: string;
  label: string;
  role: ImageWorkbenchReferenceRole;
  isUploaded: boolean;
};

interface ImageWorkbenchReferenceStateContext {
  assets: ComputedRef<ImageWorkbenchAsset[]>;
  assetLibrary: Ref<ImageWorkbenchAsset[]>;
  selectedAsset: ComputedRef<ImageWorkbenchAsset | null>;
  selectedAssetId: Ref<string>;
  mode: Ref<ImageWorkbenchMode>;
  loading: Ref<boolean>;
  error: Ref<string>;
  notice: Ref<string>;
  t: (key: string) => string;
}

export function createImageWorkbenchReferenceState({
  assets,
  assetLibrary,
  selectedAsset,
  selectedAssetId,
  mode,
  loading,
  error,
  notice,
  t,
}: ImageWorkbenchReferenceStateContext) {
  const fileManagerStore = useFileManagerStore();
  const referenceImagePath = ref("");
  const referenceAssetIds = ref<string[]>([]);
  const referenceRoles = ref<Record<string, ImageWorkbenchReferenceRole>>({});
  const allKnownAssets = computed(() => [...assets.value, ...assetLibrary.value]);
  const referenceAssets = computed(() =>
    referenceAssetIds.value
      .map((assetId) => allKnownAssets.value.find((asset) => asset.id === assetId) ?? null)
      .filter((asset): asset is ImageWorkbenchAsset => Boolean(asset))
  );
  const referenceAsset = computed(() => referenceAssets.value[0] ?? null);
  const referenceAssetId = computed(() => referenceAsset.value?.id || "");
  const referenceItems = computed<ImageWorkbenchReferenceItem[]>(() => {
    const uploadedItems = referenceImagePath.value
      ? [
          {
            key: "uploaded",
            assetId: "",
            displayUrl: resolveDisplayImageSrc(referenceImagePath.value),
            sourcePath: referenceImagePath.value,
            label: referenceImagePath.value,
            role: resolveReferenceRole("uploaded", 0),
            isUploaded: true,
          },
        ]
      : [];
    const assetItems = referenceAssets.value.map((asset, assetIndex) => {
      const index = uploadedItems.length + assetIndex;
      return {
        key: asset.id,
        assetId: asset.id,
        displayUrl: toAssetCard(asset).displayUrl,
        sourcePath: asset.filePath,
        label: `${t("imageWorkbench.reference.assetSource")} · ${asset.width || "-"}x${asset.height || "-"}`,
        role: resolveReferenceRole(asset.id, index),
        isUploaded: false,
      };
    });
    return uploadedItems.concat(assetItems);
  });
  const hasReferenceImage = computed(() => Boolean(referenceItems.value.length));
  const referenceCount = computed(() => referenceItems.value.length);
  const referenceLimitReached = computed(() => referenceCount.value >= IMAGE_WORKBENCH_REFERENCE_LIMIT);
  const referenceImageDisplayUrl = computed(() =>
    referenceItems.value[0]?.displayUrl || ""
  );
  const referenceImageSourcePath = computed(() =>
    referenceItems.value[0]?.sourcePath || ""
  );
  const referenceImageLabel = computed(() => {
    if (!referenceItems.value.length) {
      return "";
    }
    if (referenceItems.value.length === 1) {
      return referenceItems.value[0]?.label || "";
    }
    return `${t("imageWorkbench.reference.countPrefix")} ${referenceItems.value.length}`;
  });
  const canUseSelectedAssetAsReference = computed(() =>
    Boolean(
      selectedAsset.value &&
      (!selectedAsset.value.integrityStatus || selectedAsset.value.integrityStatus === "ok") &&
      canAddReferenceAsset(selectedAsset.value.id) &&
      !loading.value
    )
  );

  function setUploadedReferenceImage(importedPath: string) {
    referenceImagePath.value = importedPath;
    mode.value = "img2img";
    notice.value = t("imageWorkbench.reference.selectedNotice");
  }

  async function selectReferenceImage() {
    if (!referenceImagePath.value && referenceLimitReached.value) {
      rejectReferenceLimit();
      return "";
    }
    let uploadedPath = "";
    try {
      uploadedPath = (await fileManagerStore.uploadSelectedImage()) || "";
    } catch (err) {
      if (isTauriRuntime()) {
        throw err;
      }
    }
    if (!uploadedPath && isTauriRuntime()) {
      return "";
    }
    const selectedPath = uploadedPath || BROWSER_REFERENCE_IMAGE_PATH;
    const importedPath =
      uploadedPath && isTauriRuntime()
        ? (await imageWorkbenchService.importReference({ sourcePath: uploadedPath })).filePath
        : selectedPath;
    setUploadedReferenceImage(importedPath);
    return importedPath;
  }

  function useSelectedAssetAsReference(assetId = selectedAssetId.value) {
    const asset = allKnownAssets.value.find((item) => item.id === assetId) ?? selectedAsset.value;
    if (!asset) {
      error.value = t("imageWorkbench.errors.noSelectedAsset");
      return false;
    }
    if (asset.integrityStatus && asset.integrityStatus !== "ok") {
      error.value = t("imageWorkbench.errors.invalidReferenceAsset");
      return false;
    }
    selectedAssetId.value = asset.id;
    if (!addReferenceAsset(asset)) {
      return false;
    }
    if (!["img2img", "inpaint", "person_consistency"].includes(mode.value)) {
      mode.value = "img2img";
    }
    error.value = "";
    notice.value = t("imageWorkbench.reference.assetSelectedNotice");
    return true;
  }

  function addReferenceAsset(asset: ImageWorkbenchAsset) {
    if (!referenceAssetIds.value.includes(asset.id)) {
      if (!canAddReferenceAsset(asset.id)) {
        return false;
      }
      referenceAssetIds.value = [...referenceAssetIds.value, asset.id];
    }
    return true;
  }

  function toggleAssetReference(assetId: string) {
    const asset = allKnownAssets.value.find((item) => item.id === assetId);
    if (!asset) {
      error.value = t("imageWorkbench.errors.noSelectedAsset");
      return false;
    }
    if (asset.integrityStatus && asset.integrityStatus !== "ok") {
      error.value = t("imageWorkbench.errors.invalidReferenceAsset");
      return false;
    }
    selectedAssetId.value = asset.id;
    if (referenceAssetIds.value.includes(asset.id)) {
      referenceAssetIds.value = referenceAssetIds.value.filter((item) => item !== asset.id);
      removeReferenceRole(asset.id);
      notice.value = t("imageWorkbench.reference.assetRemovedNotice");
    } else {
      if (!addReferenceAsset(asset)) {
        return false;
      }
      mode.value = ["img2img", "inpaint", "person_consistency"].includes(mode.value) ? mode.value : "img2img";
      notice.value = t("imageWorkbench.reference.assetSelectedNotice");
    }
    error.value = "";
    return true;
  }

  function removeReferenceAsset(assetId: string) {
    referenceAssetIds.value = referenceAssetIds.value.filter((item) => item !== assetId);
    removeReferenceRole(assetId);
  }

  function removeUploadedReferenceImage() {
    referenceImagePath.value = "";
    removeReferenceRole("uploaded");
  }

  function clearReferenceImage() {
    referenceAssetIds.value = [];
    referenceImagePath.value = "";
    referenceRoles.value = {};
    if (["img2img", "person_consistency"].includes(mode.value)) {
      mode.value = "txt2img";
    }
  }

  function setSingleAssetReference(assetId = selectedAssetId.value) {
    const asset = allKnownAssets.value.find((item) => item.id === assetId) ?? selectedAsset.value;
    if (!asset) {
      error.value = t("imageWorkbench.errors.noSelectedAsset");
      return false;
    }
    if (asset.integrityStatus && asset.integrityStatus !== "ok") {
      error.value = t("imageWorkbench.errors.invalidReferenceAsset");
      return false;
    }
    selectedAssetId.value = asset.id;
    referenceAssetIds.value = [asset.id];
    referenceImagePath.value = "";
    referenceRoles.value = keepReferenceRoles([asset.id]);
    error.value = "";
    return true;
  }

  function setAssetReferences(assetIds: string[]) {
    const nextIds: string[] = [];
    for (const assetId of assetIds) {
      if (!assetId || nextIds.includes(assetId)) {
        continue;
      }
      const asset = allKnownAssets.value.find((item) => item.id === assetId);
      if (!asset) {
        error.value = t("imageWorkbench.errors.noSelectedAsset");
        return false;
      }
      if (asset.integrityStatus && asset.integrityStatus !== "ok") {
        error.value = t("imageWorkbench.errors.invalidReferenceAsset");
        return false;
      }
      nextIds.push(asset.id);
    }
    const maxAssetRefs = IMAGE_WORKBENCH_REFERENCE_LIMIT - (referenceImagePath.value ? 1 : 0);
    if (nextIds.length > maxAssetRefs) {
      return rejectReferenceLimit();
    }
    referenceAssetIds.value = nextIds;
    referenceRoles.value = keepReferenceRoles([
      ...(referenceImagePath.value ? ["uploaded"] : []),
      ...nextIds,
    ]);
    error.value = "";
    return true;
  }

  function syncReferenceAssetFromKnownAssets(knownAssets: ImageWorkbenchAsset[]) {
    const knownAssetIds = new Set(knownAssets.map((asset) => asset.id));
    const maxAssetRefs = IMAGE_WORKBENCH_REFERENCE_LIMIT - (referenceImagePath.value ? 1 : 0);
    referenceAssetIds.value = referenceAssetIds.value
      .filter((assetId) => knownAssetIds.has(assetId))
      .slice(0, Math.max(0, maxAssetRefs));
    referenceRoles.value = keepReferenceRoles([
      ...(referenceImagePath.value ? ["uploaded"] : []),
      ...referenceAssetIds.value,
    ]);
  }

  function isAssetReferenceSelected(assetId: string) {
    return referenceAssetIds.value.includes(assetId);
  }

  function canAddReferenceAsset(assetId: string) {
    return referenceAssetIds.value.includes(assetId) || referenceCount.value < IMAGE_WORKBENCH_REFERENCE_LIMIT;
  }

  function rejectReferenceLimit() {
    const message = formatTemplate(t("imageWorkbench.errors.referenceLimitReached"), {
      count: IMAGE_WORKBENCH_REFERENCE_LIMIT,
    });
    error.value = message;
    notice.value = message;
    return false;
  }

  function resolveReferenceRole(key: string, index: number): ImageWorkbenchReferenceRole {
    return referenceRoles.value[key] || DEFAULT_REFERENCE_ROLES[index] || "style";
  }

  function setReferenceRole(key: string, role: ImageWorkbenchReferenceRole) {
    if (!DEFAULT_REFERENCE_ROLES.includes(role)) {
      return;
    }
    referenceRoles.value = {
      ...referenceRoles.value,
      [key]: role,
    };
  }

  function removeReferenceRole(key: string) {
    const next = { ...referenceRoles.value };
    delete next[key];
    referenceRoles.value = next;
  }

  function keepReferenceRoles(keys: string[]) {
    const allowed = new Set(keys);
    return Object.fromEntries(
      Object.entries(referenceRoles.value).filter(([key]) => allowed.has(key))
    ) as Record<string, ImageWorkbenchReferenceRole>;
  }

  return {
    referenceImagePath,
    referenceAssetId,
    referenceAssetIds,
    referenceRoles,
    referenceAsset,
    referenceAssets,
    referenceItems,
    referenceCount,
    referenceLimit: IMAGE_WORKBENCH_REFERENCE_LIMIT,
    referenceLimitReached,
    hasReferenceImage,
    referenceImageDisplayUrl,
    referenceImageSourcePath,
    referenceImageLabel,
    canUseSelectedAssetAsReference,
    selectReferenceImage,
    setUploadedReferenceImage,
    useSelectedAssetAsReference,
    toggleAssetReference,
    setReferenceRole,
    setAssetReferences,
    setSingleAssetReference,
    removeReferenceAsset,
    removeUploadedReferenceImage,
    clearReferenceImage,
    syncReferenceAssetFromKnownAssets,
    isAssetReferenceSelected,
  };
}
