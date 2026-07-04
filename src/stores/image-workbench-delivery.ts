import type { ComputedRef, Ref } from "vue";
import { imageWorkbenchService } from "../services/image-workbench.service";
import { systemService } from "../services/system.service";
import { formatBytes, formatTemplate } from "../utils";
import type {
  CleanupImageWorkbenchDeletedAssetsResult,
  CleanupImageWorkbenchInvalidAssetsResult,
  ImageWorkbenchAsset,
  ImageWorkbenchJob,
} from "../types/image-workbench";

interface ImageWorkbenchDeliveryActionsContext {
  currentJob: ComputedRef<ImageWorkbenchJob | null>;
  selectedAsset: ComputedRef<ImageWorkbenchAsset | null>;
  notice: Ref<string>;
  refreshWorkbenchLists: () => Promise<void>;
  runWithLoading: <T>(runner: () => Promise<T>) => Promise<T>;
  t: (key: string) => string;
}

export function createImageWorkbenchDeliveryActions({
  currentJob,
  selectedAsset,
  notice,
  refreshWorkbenchLists,
  runWithLoading,
  t,
}: ImageWorkbenchDeliveryActionsContext) {
  async function openSelectedAssetLocation() {
    if (!selectedAsset.value) {
      return;
    }
    const assetPath = selectedAsset.value.filePath;
    try {
      await systemService.openPath(assetPath);
    } catch {
      notice.value = `${t("imageWorkbench.errors.openPathUnavailable")} ${assetPath}`;
    }
  }

  async function exportCurrentJob() {
    if (!currentJob.value) {
      throw new Error(t("imageWorkbench.errors.noCurrentJob"));
    }
    const exportPath = await runWithLoading(() => imageWorkbenchService.exportJob(currentJob.value!.id));
    await openExportPath(exportPath, notice, t);
    return exportPath;
  }

  async function exportSelectedAsset() {
    if (!selectedAsset.value) {
      throw new Error(t("imageWorkbench.errors.noSelectedAsset"));
    }
    const exportPath = await runWithLoading(() => imageWorkbenchService.exportAsset(selectedAsset.value!.id));
    await openExportPath(exportPath, notice, t);
    return exportPath;
  }

  async function cleanupDeletedAssets() {
    const result = await runWithLoading(() => imageWorkbenchService.cleanupDeletedAssets());
    await refreshWorkbenchLists();
    notice.value = buildCleanupNotice(result, t);
    return result;
  }

  async function cleanupInvalidAssets() {
    const result = await runWithLoading(() => imageWorkbenchService.cleanupInvalidAssets());
    await refreshWorkbenchLists();
    notice.value = buildInvalidAssetCleanupNotice(result, t);
    return result;
  }

  return {
    openSelectedAssetLocation,
    exportCurrentJob,
    exportSelectedAsset,
    cleanupDeletedAssets,
    cleanupInvalidAssets,
  };
}

async function openExportPath(exportPath: string, notice: Ref<string>, t: (key: string) => string) {
  try {
    await systemService.openPath(exportPath);
  } catch {
    notice.value = `${t("imageWorkbench.errors.openExportPathUnavailable")} ${exportPath}`;
  }
}

function buildCleanupNotice(
  result: CleanupImageWorkbenchDeletedAssetsResult,
  t: (key: string) => string
) {
  if (!result.scannedAssets) {
    return t("imageWorkbench.assetCleanup.summaryEmpty");
  }
  return formatTemplate(t("imageWorkbench.assetCleanup.summary"), {
    scanned: result.scannedAssets,
    removed: result.removedFiles,
    missing: result.missingFiles,
    skipped: result.skippedFiles,
    bytes: formatBytes(result.removedBytes, { decimals: 1 }),
  });
}

function buildInvalidAssetCleanupNotice(
  result: CleanupImageWorkbenchInvalidAssetsResult,
  t: (key: string) => string
) {
  if (!result.removedAssets) {
    return t("imageWorkbench.assetCleanup.invalidSummaryEmpty");
  }
  return formatTemplate(t("imageWorkbench.assetCleanup.invalidSummary"), {
    scanned: result.scannedAssets,
    removed: result.removedAssets,
    missing: result.missingAssets,
    corrupt: result.corruptAssets,
  });
}
