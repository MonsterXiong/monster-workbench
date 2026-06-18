import type { ImageWorkbenchJob, ImageWorkbenchMetadata, ImageWorkbenchModelRun, ImageWorkbenchTask } from "../../types/image-workbench";
import { toAssetCard } from "../../stores/image-workbench-helpers";

export type ImageWorkbenchAssetCard = ReturnType<typeof toAssetCard>;

export type ImageWorkbenchGallerySection = {
  key: string;
  title: string;
  description: string;
  highlights?: Array<{
    key: string;
    label: string;
  }>;
  items: ImageWorkbenchAssetCard[];
};

export type ImageWorkbenchAssetBadge = {
  key: string;
  label: string;
  tone: "primary" | "warning" | "neutral" | "source" | "success";
};

export type ImageWorkbenchRelatedAssetGroup = {
  key: string;
  title: string;
  description: string;
  items: ImageWorkbenchAssetCard[];
};

export type ImageWorkbenchVersionChainItem = {
  key: string;
  label: string;
  description: string;
  asset: ImageWorkbenchAssetCard;
  tone: "source" | "selected" | "branch";
};

export type ImageWorkbenchCompareItem = {
  asset: ImageWorkbenchAssetCard;
  role: "selected" | "candidate";
};

export type ImageWorkbenchBranchAction = {
  key: string;
  title: string;
  description: string;
  actionLabel: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function buildTaskStatusSummary(tasks: ImageWorkbenchTask[]) {
  const total = tasks.length;
  const finished = tasks.filter((task) => task.status === "succeeded").length;
  const running = tasks.filter((task) => ["queued", "running", "validating", "retrying"].includes(task.status)).length;
  const failed = tasks.filter((task) => task.status === "failed").length;
  return { total, finished, running, failed };
}

export function buildGallerySections(options: {
  galleryTab: "current" | "library";
  jobs: ImageWorkbenchJob[];
  currentAssets: ImageWorkbenchAssetCard[];
  libraryAssets: ImageWorkbenchAssetCard[];
  currentJob: ImageWorkbenchJob | null;
  selectedAssetId: string;
  t: (key: string) => string;
}) {
  const { galleryTab, jobs, currentAssets, libraryAssets, currentJob, selectedAssetId, t } = options;

  if (galleryTab === "current") {
    const orderedCurrentAssets = sortAssetsForReview(currentAssets, selectedAssetId);
    return currentAssets.length
      ? [
          {
            key: "current-batch",
            title: t("imageWorkbench.gallerySections.currentTitle"),
            description: currentJob
              ? `${t(`imageWorkbench.jobStatuses.${currentJob.status}`)} · ${currentAssets.length}`
              : t("imageWorkbench.gallerySections.currentDesc"),
            items: orderedCurrentAssets,
          },
        ]
      : [];
  }

  const favorites = libraryAssets.filter((asset) => asset.favorite);
  const recent = libraryAssets.filter((asset) => !asset.favorite);
  const sections: ImageWorkbenchGallerySection[] = [];
  const deliveryAssetIds = new Set(
    libraryAssets
      .filter((asset) =>
        resolveDeliveryCandidate({
          asset,
          jobs,
          currentAssets,
          libraryAssets,
        })
      )
      .map((asset) => asset.id)
  );
  const chainAssetIds = new Set(
    buildLineageFamilyAssets({
      selectedAssetId,
      jobs,
      currentAssets,
      libraryAssets,
    }).map((asset) => asset.id)
  );

  if (deliveryAssetIds.size) {
    const deliveryItems = sortAssetsForReview(
      libraryAssets.filter((asset) => deliveryAssetIds.has(asset.id)),
      selectedAssetId
    );
    sections.push({
      key: "delivery",
      title: t("imageWorkbench.gallerySections.deliveryTitle"),
      description: t("imageWorkbench.gallerySections.deliveryDesc"),
      highlights: [
        {
          key: "delivery",
          label: `${t("imageWorkbench.gallerySections.badges.delivery")} ${deliveryItems.length}`,
        },
      ],
      items: deliveryItems,
    });
  }

  if (chainAssetIds.size > 1) {
    const chainItems = sortAssetsForReview(
      libraryAssets.filter((asset) => chainAssetIds.has(asset.id) && !deliveryAssetIds.has(asset.id)),
      selectedAssetId
    );
    sections.push({
      key: "current-chain",
      title: t("imageWorkbench.gallerySections.currentChainTitle"),
      description: t("imageWorkbench.gallerySections.currentChainDesc"),
      highlights: buildGallerySectionHighlights({
        items: chainItems,
        selectedAssetId,
        jobs,
        currentAssets,
        libraryAssets,
        t,
      }),
      items: chainItems,
    });
  }

  if (favorites.length) {
    sections.push({
      key: "favorites",
      title: t("imageWorkbench.gallerySections.favoriteTitle"),
      description: t("imageWorkbench.gallerySections.favoriteDesc"),
      items: favorites.filter((asset) => !chainAssetIds.has(asset.id) && !deliveryAssetIds.has(asset.id)),
    });
  }

  if (recent.length) {
    sections.push({
      key: "recent",
      title: t("imageWorkbench.gallerySections.libraryTitle"),
      description: t("imageWorkbench.gallerySections.libraryDesc"),
      items: recent.filter((asset) => !chainAssetIds.has(asset.id) && !deliveryAssetIds.has(asset.id)),
    });
  }

  return sections.filter((section) => section.items.length);
}

export function buildSelectionContextItems(options: {
  selectedMetadata: ImageWorkbenchMetadata | null;
  selectedModelRun: ImageWorkbenchModelRun | null;
  t: (key: string) => string;
}) {
  const { selectedMetadata, selectedModelRun, t } = options;
  const items = [
    {
      key: "mode",
      label: t("imageWorkbench.review.contextMode"),
      value: selectedMetadata?.mode ? t(`imageWorkbench.modes.${selectedMetadata.mode}`) : "",
    },
    {
      key: "provider",
      label: t("imageWorkbench.review.contextProvider"),
      value: selectedMetadata?.provider || selectedModelRun?.provider || "",
    },
    {
      key: "model",
      label: t("imageWorkbench.review.contextModel"),
      value: selectedMetadata?.model || selectedModelRun?.model || "",
    },
  ];

  return items.filter((item) => Boolean(item.value));
}

export function buildRelatedAssetGroups(options: {
  selectedAssetId: string;
  selectedJobId: string;
  currentAssets: ImageWorkbenchAssetCard[];
  libraryAssets: ImageWorkbenchAssetCard[];
  t: (key: string) => string;
}) {
  const { selectedAssetId, selectedJobId, currentAssets, libraryAssets, t } = options;
  if (!selectedAssetId || !selectedJobId) {
    return [] as ImageWorkbenchRelatedAssetGroup[];
  }

  const sameSeries = currentAssets
    .concat(libraryAssets)
    .filter((asset) => asset.jobId === selectedJobId && asset.id !== selectedAssetId);

  if (!sameSeries.length) {
    return [] as ImageWorkbenchRelatedAssetGroup[];
  }

  const favorited = sameSeries.filter((asset) => asset.favorite);
  const variations = sameSeries.filter((asset) => !asset.favorite);
  const groups: ImageWorkbenchRelatedAssetGroup[] = [];

  if (variations.length) {
    groups.push({
      key: "variations",
      title: t("imageWorkbench.review.relatedVariationsTitle"),
      description: t("imageWorkbench.review.relatedVariationsDesc"),
      items: variations.slice(0, 6),
    });
  }

  if (favorited.length) {
    groups.push({
      key: "favorites",
      title: t("imageWorkbench.review.relatedFavoritesTitle"),
      description: t("imageWorkbench.review.relatedFavoritesDesc"),
      items: favorited.slice(0, 6),
    });
  }

  return groups;
}

export function buildVersionChain(options: {
  selectedAssetId: string;
  selectedJobId: string;
  currentJob: ImageWorkbenchJob | null;
  jobs: ImageWorkbenchJob[];
  currentAssets: ImageWorkbenchAssetCard[];
  libraryAssets: ImageWorkbenchAssetCard[];
  t: (key: string) => string;
}) {
  const { selectedAssetId, selectedJobId, currentJob, jobs, currentAssets, libraryAssets, t } = options;
  if (!selectedAssetId || !selectedJobId) {
    return [] as ImageWorkbenchVersionChainItem[];
  }

  const allAssets = dedupeAssets(currentAssets.concat(libraryAssets));
  const selectedAsset = allAssets.find((asset) => asset.id === selectedAssetId);
  if (!selectedAsset) {
    return [] as ImageWorkbenchVersionChainItem[];
  }

  const selectedJob = (currentJob?.id === selectedJobId ? currentJob : jobs.find((job) => job.id === selectedJobId)) || null;
  const sourceAsset = selectedJob?.sourceAssetId
    ? allAssets.find((asset) => asset.id === selectedJob.sourceAssetId) || null
    : null;

  const branchAssets = jobs
    .filter((job) => job.sourceAssetId === selectedAssetId)
    .sort((left, right) => right.updatedAtMs - left.updatedAtMs)
    .map((job) => {
      const jobAssets = allAssets
        .filter((asset) => asset.jobId === job.id)
        .sort((left, right) => right.createdAtMs - left.createdAtMs);
      return jobAssets[0] || null;
    })
    .filter((asset): asset is ImageWorkbenchAssetCard => Boolean(asset))
    .slice(0, 3);

  const items: ImageWorkbenchVersionChainItem[] = [];

  if (sourceAsset) {
    items.push({
      key: `source-${sourceAsset.id}`,
      label: t("imageWorkbench.review.versionSource"),
      description: t("imageWorkbench.review.versionSourceDesc"),
      asset: sourceAsset,
      tone: "source",
    });
  }

  items.push({
    key: `selected-${selectedAsset.id}`,
    label: t("imageWorkbench.review.versionSelected"),
    description: t("imageWorkbench.review.versionSelectedDesc"),
    asset: selectedAsset,
    tone: "selected",
  });

  branchAssets.forEach((asset, index) => {
    items.push({
      key: `branch-${asset.id}`,
      label: t("imageWorkbench.review.versionBranch"),
      description:
        index === 0
          ? t("imageWorkbench.review.versionBranchDescPrimary")
          : t("imageWorkbench.review.versionBranchDescSecondary"),
      asset,
      tone: "branch",
    });
  });

  return items.length > 1 ? items : [];
}

export function sortAssetsForReview(items: ImageWorkbenchAssetCard[], selectedAssetId: string) {
  return [...items].sort((left, right) => {
    const leftSelected = left.id === selectedAssetId ? 1 : 0;
    const rightSelected = right.id === selectedAssetId ? 1 : 0;
    if (leftSelected !== rightSelected) {
      return rightSelected - leftSelected;
    }
    const leftFavorite = left.favorite ? 1 : 0;
    const rightFavorite = right.favorite ? 1 : 0;
    if (leftFavorite !== rightFavorite) {
      return rightFavorite - leftFavorite;
    }
    return right.createdAtMs - left.createdAtMs;
  });
}

export function buildAssetBadges(options: {
  asset: ImageWorkbenchAssetCard;
  selectedAssetId: string;
  jobs?: ImageWorkbenchJob[];
  currentAssets?: ImageWorkbenchAssetCard[];
  libraryAssets?: ImageWorkbenchAssetCard[];
  t: (key: string) => string;
}) {
  const { asset, selectedAssetId, jobs = [], currentAssets = [], libraryAssets = [], t } = options;
  const badges: ImageWorkbenchAssetBadge[] = [];
  const lineageRole = resolveLineageRole({
    assetId: asset.id,
    selectedAssetId,
    jobs,
    currentAssets,
    libraryAssets,
  });
  const deliveryCandidate = resolveDeliveryCandidate({
    asset,
    jobs,
    currentAssets,
    libraryAssets,
  });

  if (deliveryCandidate) {
    badges.push({
      key: "delivery",
      label: t("imageWorkbench.gallerySections.badges.delivery"),
      tone: "success",
    });
  }

  if (lineageRole === "source") {
    badges.push({
      key: "source",
      label: t("imageWorkbench.gallerySections.badges.source"),
      tone: "source",
    });
  }

  if (lineageRole === "branch") {
    badges.push({
      key: "branch",
      label: t("imageWorkbench.gallerySections.badges.branch"),
      tone: "warning",
    });
  }

  if (asset.id === selectedAssetId) {
    badges.push({
      key: "selected",
      label: t("imageWorkbench.gallerySections.badges.selected"),
      tone: "primary",
    });
  }

  if (asset.favorite) {
    badges.push({
      key: "favorite",
      label: t("imageWorkbench.gallerySections.badges.favorite"),
      tone: "warning",
    });
  }

  if (!badges.length) {
    badges.push({
      key: "latest",
      label: t("imageWorkbench.gallerySections.badges.latest"),
      tone: "neutral",
    });
  }

  return badges;
}

export function buildCompareStrip(options: {
  currentAssets: ImageWorkbenchAssetCard[];
  selectedAssetId: string;
}) {
  const { currentAssets, selectedAssetId } = options;
  if (!currentAssets.length) {
    return [] as ImageWorkbenchCompareItem[];
  }

  const sorted = sortAssetsForReview(currentAssets, selectedAssetId);
  const selected = sorted.find((asset) => asset.id === selectedAssetId) || sorted[0];
  const candidates = sorted.filter((asset) => asset.id !== selected.id).slice(0, 3);

  return [
    {
      asset: selected,
      role: "selected",
    },
    ...candidates.map((asset) => ({
      asset,
      role: "candidate" as const,
    })),
  ];
}

function dedupeAssets(items: ImageWorkbenchAssetCard[]) {
  const map = new Map<string, ImageWorkbenchAssetCard>();
  items.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return [...map.values()];
}

function buildLineageFamilyAssets(options: {
  selectedAssetId: string;
  jobs: ImageWorkbenchJob[];
  currentAssets: ImageWorkbenchAssetCard[];
  libraryAssets: ImageWorkbenchAssetCard[];
}) {
  const { selectedAssetId, jobs, currentAssets, libraryAssets } = options;
  if (!selectedAssetId) {
    return [] as ImageWorkbenchAssetCard[];
  }

  const allAssets = dedupeAssets(currentAssets.concat(libraryAssets));
  const assetById = new Map(allAssets.map((asset) => [asset.id, asset]));
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const rootAssetId = resolveRootAssetId(selectedAssetId, assetById, jobById);

  return allAssets.filter((asset) => resolveRootAssetId(asset.id, assetById, jobById) === rootAssetId);
}

function buildGallerySectionHighlights(options: {
  items: ImageWorkbenchAssetCard[];
  selectedAssetId: string;
  jobs: ImageWorkbenchJob[];
  currentAssets: ImageWorkbenchAssetCard[];
  libraryAssets: ImageWorkbenchAssetCard[];
  t: (key: string) => string;
}) {
  const { items, selectedAssetId, jobs, currentAssets, libraryAssets, t } = options;
  const counts = {
    source: 0,
    branch: 0,
    delivery: 0,
  };

  items.forEach((asset) => {
    const role = resolveLineageRole({
      assetId: asset.id,
      selectedAssetId,
      jobs,
      currentAssets,
      libraryAssets,
    });
    if (role === "source") {
      counts.source += 1;
    }
    if (role === "branch") {
      counts.branch += 1;
    }
    if (
      resolveDeliveryCandidate({
        asset,
        jobs,
        currentAssets,
        libraryAssets,
      })
    ) {
      counts.delivery += 1;
    }
  });

  return [
    counts.source
      ? {
          key: "source",
          label: `${t("imageWorkbench.gallerySections.badges.source")} ${counts.source}`,
        }
      : null,
    counts.branch
      ? {
          key: "branch",
          label: `${t("imageWorkbench.gallerySections.badges.branch")} ${counts.branch}`,
        }
      : null,
    counts.delivery
      ? {
          key: "delivery",
          label: `${t("imageWorkbench.gallerySections.badges.delivery")} ${counts.delivery}`,
        }
      : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));
}

function resolveLineageRole(options: {
  assetId: string;
  selectedAssetId: string;
  jobs: ImageWorkbenchJob[];
  currentAssets: ImageWorkbenchAssetCard[];
  libraryAssets: ImageWorkbenchAssetCard[];
}) {
  const { assetId, selectedAssetId, jobs, currentAssets, libraryAssets } = options;
  if (!assetId || !selectedAssetId) {
    return "";
  }

  if (assetId === selectedAssetId) {
    return "selected";
  }

  const allAssets = dedupeAssets(currentAssets.concat(libraryAssets));
  const assetById = new Map(allAssets.map((asset) => [asset.id, asset]));
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const rootAssetId = resolveRootAssetId(selectedAssetId, assetById, jobById);
  if (assetId === rootAssetId) {
    return "source";
  }

  const asset = assetById.get(assetId);
  const assetJob = asset ? jobById.get(asset.jobId) : null;
  if (assetJob?.sourceAssetId === selectedAssetId) {
    return "branch";
  }

  return "";
}

function resolveRootAssetId(
  assetId: string,
  assetById: Map<string, ImageWorkbenchAssetCard>,
  jobById: Map<string, ImageWorkbenchJob>
) {
  let currentAssetId = assetId;
  const visited = new Set<string>();

  while (currentAssetId && !visited.has(currentAssetId)) {
    visited.add(currentAssetId);
    const asset = assetById.get(currentAssetId);
    const job = asset ? jobById.get(asset.jobId) : null;
    const parentAssetId = job?.sourceAssetId || "";
    if (!parentAssetId || !assetById.has(parentAssetId)) {
      return currentAssetId;
    }
    currentAssetId = parentAssetId;
  }

  return assetId;
}

function resolveDeliveryCandidate(options: {
  asset: ImageWorkbenchAssetCard;
  jobs: ImageWorkbenchJob[];
  currentAssets: ImageWorkbenchAssetCard[];
  libraryAssets: ImageWorkbenchAssetCard[];
}) {
  const { asset, jobs, currentAssets, libraryAssets } = options;
  if (!asset.favorite) {
    return false;
  }

  const allAssets = dedupeAssets(currentAssets.concat(libraryAssets));
  const assetIds = new Set(allAssets.map((item) => item.id));
  const hasChildBranch = jobs.some((job) => job.sourceAssetId === asset.id && allAssets.some((item) => item.jobId === job.id));
  if (hasChildBranch) {
    return false;
  }

  const parentJob = jobs.find((job) => job.id === asset.jobId);
  const hasLineage =
    Boolean(parentJob?.sourceAssetId && assetIds.has(parentJob.sourceAssetId)) ||
    jobs.some((job) => job.sourceAssetId === asset.id);

  return hasLineage;
}

export function buildBranchActions(options: {
  canInpaint: boolean;
  canPersonConsistency: boolean;
  canUpscale2x: boolean;
  canUpscale4x: boolean;
  t: (key: string) => string;
}) {
  const { canInpaint, canPersonConsistency, canUpscale2x, canUpscale4x, t } = options;
  return [
    {
      key: "continue-style",
      title: t("imageWorkbench.branches.continueStyleTitle"),
      description: t("imageWorkbench.branches.continueStyleDesc"),
      actionLabel: t("imageWorkbench.asset.continueStyle"),
    },
    {
      key: "inpaint",
      title: t("imageWorkbench.branches.inpaintTitle"),
      description: t("imageWorkbench.branches.inpaintDesc"),
      actionLabel: t("imageWorkbench.asset.inpaint"),
      disabled: !canInpaint,
      disabledReason: !canInpaint ? t("imageWorkbench.errors.maskRequired") : "",
    },
    {
      key: "person",
      title: t("imageWorkbench.branches.personTitle"),
      description: t("imageWorkbench.branches.personDesc"),
      actionLabel: t("imageWorkbench.asset.personContinue"),
      disabled: !canPersonConsistency,
      disabledReason: !canPersonConsistency ? t("imageWorkbench.errors.personDeferred") : "",
    },
    {
      key: "upscale",
      title: t("imageWorkbench.branches.upscaleTitle"),
      description: canUpscale4x
        ? t("imageWorkbench.branches.upscaleDesc4x")
        : t("imageWorkbench.branches.upscaleDesc2x"),
      actionLabel: canUpscale4x ? t("imageWorkbench.asset.upscale4x") : t("imageWorkbench.asset.upscale2x"),
      disabled: !canUpscale2x && !canUpscale4x,
      disabledReason: !canUpscale2x && !canUpscale4x ? t("imageWorkbench.errors.upscaleDeferred") : "",
    },
  ];
}
