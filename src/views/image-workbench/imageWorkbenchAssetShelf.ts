import type { ImageWorkbenchGroup, ImageWorkbenchJob } from "../../types/image-workbench";
import type { ImageWorkbenchAssetCard, ImageWorkbenchLibraryFilter } from "./imageWorkbenchReview";

export const imageWorkbenchLibraryFilterKeys: ImageWorkbenchLibraryFilter[] = [
  "recent",
  "featured",
  "favorite",
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
  _jobById: Map<string, ImageWorkbenchJob>
) {
  if (filter === "recent") {
    return true;
  }
  if (filter === "featured") {
    return Number(asset.rating || 0) > 0;
  }
  if (filter === "favorite") {
    return asset.favorite;
  }
  return false;
}

export function getImageWorkbenchAssetGroupLabel(
  asset: ImageWorkbenchAssetCard,
  groupById: Map<string, ImageWorkbenchGroup>
) {
  if (!asset.groupId) {
    return "";
  }
  const group = groupById.get(asset.groupId);
  return isManualImageWorkbenchGroup(group) ? group?.name || "" : "";
}

export function isManualImageWorkbenchGroup(
  group: ImageWorkbenchGroup | null | undefined
): group is ImageWorkbenchGroup {
  return group?.type === "manual";
}

export function canUseImageWorkbenchAssetAsReference(asset: ImageWorkbenchAssetCard) {
  return !asset.integrityStatus || asset.integrityStatus === "ok";
}

export function canPrepareImageWorkbenchQualityFix(asset: ImageWorkbenchAssetCard) {
  return canUseImageWorkbenchAssetAsReference(asset) && Boolean(asset.qualityIssues?.length);
}
