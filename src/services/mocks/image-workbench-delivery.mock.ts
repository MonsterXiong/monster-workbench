import { getCurrentTimestampMs, mapValuesToArray } from "../../utils";

type ImageWorkbenchDeliveryMockContext = {
  jobs: Map<string, any>;
  assets: Map<string, any>;
  groups: Map<string, any>;
  getSnapshot: (jobId: string) => any;
};

export function exportMockImageWorkbenchJob(
  context: ImageWorkbenchDeliveryMockContext,
  args: Record<string, unknown>
) {
  const jobId = String(args.jobId || "");
  const snapshot = context.getSnapshot(jobId);
  if (!snapshot.assets.length) {
    throw new Error("[ERR_IPC_BROWSER] 当前作业暂无可导出的图片资产");
  }
  return `C:\\Users\\MockUser\\.monster-tools\\ai\\image-workbench\\exports\\${jobId}-${getCurrentTimestampMs()}`;
}

export function exportMockImageWorkbenchAsset(
  context: ImageWorkbenchDeliveryMockContext,
  args: Record<string, unknown>
) {
  const assetId = String(args.assetId || "");
  const asset = context.assets.get(assetId);
  if (!asset) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台资产");
  }
  return `C:\\Users\\MockUser\\.monster-tools\\ai\\image-workbench\\exports\\${assetId}-${getCurrentTimestampMs()}`;
}

export function exportMockImageWorkbenchGroup(
  context: ImageWorkbenchDeliveryMockContext,
  args: Record<string, unknown>
) {
  const request = args.request as any;
  const groupId = String(request?.groupId || "").trim();
  const groupName = String(request?.groupName || "").trim();
  if (!groupId && !groupName) {
    throw new Error("[ERR_IPC_BROWSER] 图片群组标记不能为空");
  }
  const groupIds = new Set(
    groupId
      ? [groupId]
      : mapValuesToArray(context.groups)
          .filter((group) => group.name === groupName)
          .map((group) => group.id)
  );
  const assets = mapValuesToArray(context.assets).filter((asset) => groupIds.has(asset.groupId));
  if (!assets.length) {
    throw new Error("[ERR_IPC_BROWSER] 图片群组暂无可导出的图片");
  }
  const marker = groupName || groupId || "group";
  return `C:\\Users\\MockUser\\.monster-tools\\ai\\image-workbench\\exports\\group-${marker}-${getCurrentTimestampMs()}`;
}

export function cleanupMockImageWorkbenchDeletedAssets(
  context: ImageWorkbenchDeliveryMockContext
) {
  const deletedJobIds = new Set(
    mapValuesToArray(context.jobs)
      .filter((job) => job.deletedAtMs)
      .map((job) => job.id)
  );
  const assets = mapValuesToArray(context.assets).filter((asset) =>
    deletedJobIds.has(asset.jobId)
  );
  return {
    scannedAssets: assets.length,
    removedFiles: assets.length,
    removedDirs: 0,
    missingFiles: 0,
    skippedFiles: 0,
    removedBytes: assets.reduce((sum, asset) => sum + Number(asset.sizeBytes || 0), 0),
    warnings: [],
  };
}

export function cleanupMockImageWorkbenchInvalidAssets(
  context: ImageWorkbenchDeliveryMockContext
) {
  const invalidAssets = mapValuesToArray(context.assets).filter((asset) =>
    ["missing", "corrupt"].includes(String(asset.integrityStatus || "ok"))
  );
  invalidAssets.forEach((asset) => {
    context.assets.delete(asset.id);
  });
  return {
    scannedAssets: context.assets.size + invalidAssets.length,
    removedAssets: invalidAssets.length,
    missingAssets: invalidAssets.filter((asset) => asset.integrityStatus === "missing").length,
    corruptAssets: invalidAssets.filter((asset) => asset.integrityStatus === "corrupt").length,
  };
}
