import { formatBytes, formatDateTime, formatTemplate } from "../../utils";
import type { ImageWorkbenchAsset, ImageWorkbenchReferenceRole } from "../../types/image-workbench";
import type { ImageWorkbenchTaskEntryKey } from "./imageWorkbenchTaskLauncher";

const referenceRoleFallbacks = ["person", "prop", "scene", "style"] as const;

export function formatImageWorkbenchAssetUpdatedAt(ms?: number | null) {
  return ms ? formatDateTime(new Date(ms)) : "-";
}

export function formatImageWorkbenchAssetFileSize(asset: ImageWorkbenchAsset | null) {
  return asset?.sizeBytes ? formatBytes(asset.sizeBytes, { decimals: 1 }) : "-";
}

export function formatImageWorkbenchImageDimensions(asset: ImageWorkbenchAsset | null) {
  return asset?.width && asset.height ? `${asset.width}x${asset.height}` : "-";
}

export function normalizeImageWorkbenchImageSize(value: string) {
  return value.trim().toLowerCase().replace("脳", "x");
}

export function isKnownImageWorkbenchSize(value: string) {
  return Boolean(value && value !== "-");
}

export function formatImageWorkbenchReferenceRoleLabel(
  role: ImageWorkbenchReferenceRole | undefined,
  index: number,
  t: (key: string) => string
) {
  const normalized = role && referenceRoleFallbacks.includes(role)
    ? role
    : referenceRoleFallbacks[index] || "style";
  return t(`imageWorkbench.reference.roles.${normalized}`);
}

export function formatImageWorkbenchRatingButtonLabel(
  rating: number,
  t: (key: string) => string
) {
  return rating === 0
    ? t("imageWorkbench.asset.clearRating")
    : formatTemplate(t("imageWorkbench.asset.setRating"), { rating });
}

export function resolveImageWorkbenchBranchTaskEntry(actionKey: string): ImageWorkbenchTaskEntryKey | "" {
  if (actionKey === "continue-style") {
    return "style";
  }
  if (actionKey === "inpaint") {
    return "edit";
  }
  if (actionKey === "person") {
    return "person";
  }
  if (actionKey === "upscale") {
    return "upscale";
  }
  return "";
}
