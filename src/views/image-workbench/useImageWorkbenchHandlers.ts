import type { ImageWorkbenchAssetCard } from "./imageWorkbenchReview";
import type { useImageWorkbenchStore } from "../../stores/image-workbench";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchJob,
  ImageWorkbenchTemplate,
} from "../../types/image-workbench";

type Store = ReturnType<typeof useImageWorkbenchStore>;

/**
 * Page 上 30+ 个 store 薄包装的 handler 集中地，避免它们继续在路由 Page
 * 入口堆积。每个函数只把 UI 事件转发到 Pinia store 的对应 action，没有
 * 业务逻辑；如果 handler 需要 await 多步组合，再单独留在 Page 内。
 */
export function buildImageWorkbenchHandlers(store: Store) {
  async function handleSelectReviewAsset(asset: ImageWorkbenchAssetCard) {
    if (asset.jobId && asset.jobId !== store.currentJob?.id) {
      await store.selectJob(asset.jobId, asset.id);
      return;
    }
    store.selectAsset(asset.id);
  }

  function handleModelConfigChange(event: Event) {
    const target = event.target as HTMLSelectElement | null;
    store.selectImageModelConfig(target?.value || "");
  }

  return {
    handleSelectReviewAsset,
    handleGenerate: () => void store.runTxt2imgBatch(),
    handleCancel: () => void store.cancelCurrentJob(),
    handleRetry: () => void store.retryFailedTasks(),
    handleDeleteJob: () => void store.deleteCurrentJob(),
    handleCleanupDeletedAssets: () => void store.cleanupDeletedAssets(),
    handleSelectJob: (job: ImageWorkbenchJob) => void store.selectJob(job.id),
    handleToggleFavorite: (asset: ImageWorkbenchAsset) =>
      void store.toggleAssetFavorite(asset),
    handleSetAssetRating: (asset: ImageWorkbenchAsset, rating: number | null) =>
      void store.setAssetRating(asset, rating),
    handleApplyTemplate: (template: ImageWorkbenchTemplate) =>
      store.applyTemplate(template),
    handleDeleteTemplate: (template: ImageWorkbenchTemplate) =>
      void store.deleteTemplate(template.id),
    handleImportGeneratedAssets: () => void store.importGeneratedAssetsFromFolder(),
    handleSelectReferenceImage: () => void store.selectReferenceImage(),
    handleUseSelectedAssetAsReference: () => store.useSelectedAssetAsReference(),
    handleToggleAssetReference: (assetId: string) => store.toggleAssetReference(assetId),
    handleRemoveReferenceAsset: (assetId: string) => store.removeReferenceAsset(assetId),
    handleRemoveUploadedReferenceImage: () => store.removeUploadedReferenceImage(),
    handleClearReferenceImage: () => store.clearReferenceImage(),
    handleRefresh: () => void store.loadInitialState(),
    handleOpenAssetLocation: () => void store.openSelectedAssetLocation(),
    handleExportJob: () => void store.exportCurrentJob(),
    handleExportSelectedAsset: () => void store.exportSelectedAsset(),
    handleCopyMetaPrompt: () => void store.copySelectedMetaPrompt(),
    handleRegenerateSelectedAsset: () => void store.regenerateSelectedAsset(),
    handlePrepareSelectedAssetQualityFix: () => store.prepareSelectedAssetQualityFix(),
    handleModelConfigChange,
  };
}
