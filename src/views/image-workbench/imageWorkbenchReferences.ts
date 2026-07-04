import type { ImageWorkbenchJob, ImageWorkbenchReferenceRole } from "../../types/image-workbench";
import type { ImageWorkbenchAssetCard } from "./imageWorkbenchReview";

export interface ImageWorkbenchJobReferenceView {
  key: string;
  label: string;
  sourcePath: string;
  displayUrl: string;
  asset: ImageWorkbenchAssetCard | null;
}

interface BuildJobReferenceViewsOptions {
  job: ImageWorkbenchJob | null;
  currentAssets: ImageWorkbenchAssetCard[];
  libraryAssets: ImageWorkbenchAssetCard[];
  referenceRoleLabel: (role: ImageWorkbenchReferenceRole | undefined, index?: number) => string;
  resolveDisplayUrl?: (sourcePath: string) => string;
}

export function buildImageWorkbenchJobReferenceViews({
  job,
  currentAssets,
  libraryAssets,
  referenceRoleLabel,
  resolveDisplayUrl,
}: BuildJobReferenceViewsOptions): ImageWorkbenchJobReferenceView[] {
  if (!job) {
    return [];
  }
  const assetCards = currentAssets.concat(libraryAssets);
  const assetsById = new Map(assetCards.map((asset) => [asset.id, asset]));
  const assetsByPath = new Map(assetCards.map((asset) => [asset.filePath, asset]));
  const seen = new Set<string>();
  const views: ImageWorkbenchJobReferenceView[] = [];
  const pushReference = (options: {
    assetId?: string | null;
    imagePath?: string | null;
    role?: ImageWorkbenchReferenceRole;
    index?: number;
  }) => {
    let asset: ImageWorkbenchAssetCard | null = null;
    if (options.assetId) {
      asset = assetsById.get(options.assetId) || null;
    }
    if (!asset && options.imagePath) {
      asset = assetsByPath.get(options.imagePath) || null;
    }
    const sourcePath = asset?.filePath || options.imagePath || "";
    const key = asset?.id || sourcePath || options.assetId || "";
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    const index = Math.max((options.index || views.length + 1) - 1, 0);
    views.push({
      key,
      label: referenceRoleLabel(options.role, index),
      sourcePath,
      displayUrl: asset?.displayUrl || (sourcePath ? resolveDisplayUrl?.(sourcePath) || "" : ""),
      asset,
    });
  };

  parseJobReferenceRoles(job.personContextJson).forEach((reference, fallbackIndex) => {
    pushReference({
      assetId: reference.assetId,
      imagePath: reference.imagePath,
      role: reference.role,
      index: reference.index || fallbackIndex + 1,
    });
  });
  parseReferenceAssetIds(job.referenceAssetIdsJson).forEach((assetId, index) => {
    pushReference({
      assetId,
      role: defaultReferenceRoleForMode(job.mode),
      index: index + 1,
    });
  });
  pushReference({
    assetId: job.sourceAssetId,
    imagePath: job.sourceImagePath,
    role: defaultReferenceRoleForMode(job.mode),
    index: views.length + 1,
  });
  return views.slice(0, 6);
}

function parseJobReferenceRoles(rawContext: string | null | undefined): Array<{
  index: number;
  role: ImageWorkbenchReferenceRole;
  assetId: string;
  imagePath: string;
}> {
  if (!rawContext) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawContext) as { referenceRoles?: unknown };
    if (!Array.isArray(parsed.referenceRoles)) {
      return [];
    }
    return parsed.referenceRoles
      .map((item, fallbackIndex) => {
        const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          index: Number(record.index) || fallbackIndex + 1,
          role: normalizeReferenceRole(String(record.role || ""), fallbackIndex),
          assetId: String(record.assetId || ""),
          imagePath: String(record.imagePath || ""),
        };
      })
      .filter((item) => Boolean(item.assetId || item.imagePath));
  } catch {
    return [];
  }
}

function parseReferenceAssetIds(rawValue: string | null | undefined) {
  if (!rawValue) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item || "")).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function normalizeReferenceRole(role: string, index: number): ImageWorkbenchReferenceRole {
  return isReferenceRole(role) ? role : referenceRoleByIndex(index);
}

function isReferenceRole(role: string): role is ImageWorkbenchReferenceRole {
  return ["person", "prop", "scene", "style"].includes(role);
}

function referenceRoleByIndex(index: number): ImageWorkbenchReferenceRole {
  return (["person", "prop", "scene", "style"] as const)[index] || "style";
}

function defaultReferenceRoleForMode(mode: ImageWorkbenchJob["mode"]): ImageWorkbenchReferenceRole {
  if (mode === "person_consistency") {
    return "person";
  }
  if (mode === "img2img") {
    return "scene";
  }
  return "style";
}
