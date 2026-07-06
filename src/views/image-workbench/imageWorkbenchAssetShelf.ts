import type { ImageWorkbenchGroup, ImageWorkbenchJob } from "../../types/image-workbench";
import type { ImageWorkbenchAssetCard, ImageWorkbenchLibraryFilter } from "./imageWorkbenchReview";

export const imageWorkbenchLibraryFilterKeys: ImageWorkbenchLibraryFilter[] = [
  "recent",
  "favorite",
  "needsFix",
  "person",
  "style",
  "delivery",
];

export function sortImageWorkbenchAssetCardsByCreated(items: ImageWorkbenchAssetCard[]) {
  return [...items].sort((left, right) => right.createdAtMs - left.createdAtMs);
}

export function buildImageWorkbenchSourceSelectionAssets(options: {
  libraryAssets: ImageWorkbenchAssetCard[];
  currentAssets: ImageWorkbenchAssetCard[];
}) {
  const map = new Map<string, ImageWorkbenchAssetCard>();
  options.libraryAssets.concat(options.currentAssets).forEach((asset) => map.set(asset.id, asset));
  return sortImageWorkbenchAssetCardsByCreated([...map.values()]);
}

export function matchesImageWorkbenchLibraryFilter(
  asset: ImageWorkbenchAssetCard,
  filter: ImageWorkbenchLibraryFilter,
  jobById: Map<string, ImageWorkbenchJob>
) {
  if (filter === "recent") {
    return true;
  }
  if (filter === "favorite") {
    return asset.favorite;
  }
  if (filter === "needsFix") {
    return Boolean(asset.qualityIssues?.length);
  }
  if (filter === "delivery") {
    return asset.deliveryStatus === "ready";
  }
  const jobMode = jobById.get(asset.jobId)?.mode;
  if (filter === "person") {
    return jobMode === "person_consistency";
  }
  return jobMode === "img2img";
}

export function formatImageWorkbenchAssetSize(
  asset: ImageWorkbenchAssetCard,
  t: (key: string) => string
) {
  return asset.width && asset.height ? `${asset.width}x${asset.height}` : t("imageWorkbench.review.emptyValue");
}

export function getImageWorkbenchAssetGroupLabel(
  asset: ImageWorkbenchAssetCard,
  groupById: Map<string, ImageWorkbenchGroup>,
  t: (key: string) => string
) {
  if (!asset.groupId) {
    return "";
  }
  return groupById.get(asset.groupId)?.name || t("imageWorkbench.assetGroup.tagged");
}

export function canUseImageWorkbenchAssetAsReference(asset: ImageWorkbenchAssetCard) {
  return !asset.integrityStatus || asset.integrityStatus === "ok";
}

export function canPrepareImageWorkbenchQualityFix(asset: ImageWorkbenchAssetCard) {
  return canUseImageWorkbenchAssetAsReference(asset) && Boolean(asset.qualityIssues?.length);
}
