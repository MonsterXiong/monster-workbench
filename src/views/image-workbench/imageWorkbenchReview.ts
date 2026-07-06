import type {
  ImageWorkbenchAsset,
  ImageWorkbenchGroup,
  ImageWorkbenchJob,
  ImageWorkbenchMetadata,
  ImageWorkbenchModelRun,
} from "../../types/image-workbench";
import { parseGenerationOptionsJson } from "../../stores/image-workbench-draft";
import { toAssetCard } from "../../stores/image-workbench-helpers";
import { formatTemplate } from "../../utils";

export type ImageWorkbenchAssetCard = ReturnType<typeof toAssetCard>;
export type ImageWorkbenchDeliveryUseKey = "original" | "avatar" | "cover" | "shortVideo" | "product" | "poster";

export type ImageWorkbenchGallerySection = {
  key: string;
  title: string;
  description: string;
  prompt?: string;
  selected?: boolean;
  expectedCount?: number;
  highlights?: Array<{
    key: string;
    label: string;
  }>;
  items: ImageWorkbenchAssetCard[];
  historyItems?: ImageWorkbenchAssetCard[];
};

export type ImageWorkbenchLibraryFilter = "recent" | "featured" | "favorite";
export type ImageWorkbenchAssetShelfView = "recent" | "library";

export type ImageWorkbenchAssetBadge = {
  key: string;
  label: string;
  tone: "primary" | "warning" | "neutral" | "source" | "success" | "danger";
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

export type ImageWorkbenchLineageSummaryItem = {
  key: string;
  label: string;
  value: string;
  tone: "primary" | "success" | "neutral" | "warning";
};

export function buildSelectedAssetActionDisabledReason(options: {
  selectedAsset: ImageWorkbenchAsset | null;
  canRun: boolean;
  unavailableKey: string;
  t: (key: string) => string;
}) {
  const { selectedAsset, canRun, unavailableKey, t } = options;
  if (!selectedAsset) {
    return t("imageWorkbench.errors.noSelectedAsset");
  }
  if (selectedAsset.integrityStatus && selectedAsset.integrityStatus !== "ok") {
    return t("imageWorkbench.errors.invalidSelectedAsset");
  }
  return canRun ? "" : t(unavailableKey);
}

export function buildDeliveryUseKeys(asset: ImageWorkbenchAsset | null): ImageWorkbenchDeliveryUseKey[] {
  if (!asset) return [];
  const width = asset.width || 0;
  const height = asset.height || 0;
  if (!width || !height) return ["original"];
  const ratio = width / height;
  const keys: ImageWorkbenchDeliveryUseKey[] = ["original"];
  if (ratio >= 0.86 && ratio <= 1.16) {
    keys.push("avatar", "product");
  } else if (ratio < 0.86) {
    keys.push("shortVideo", "poster");
  } else {
    keys.push("cover", "poster");
  }
  return keys.slice(0, 3);
}

export function buildSelectedGenerationDetails(options: {
  asset: ImageWorkbenchAsset | null;
  job: ImageWorkbenchJob | null;
  t: (key: string) => string;
}) {
  const generationOptions = parseGenerationOptionsJson(options.job?.generationOptionsJson);
  const hasFormatCompression = ["jpeg", "webp"].includes(generationOptions.outputFormat);
  return {
    requestedFormat: generationOptions.hasOptions ? options.t(`imageWorkbench.output.format.${generationOptions.outputFormat}`) : "-",
    actualFormat: formatMimeTypeAsImageFormat(options.asset?.mimeType),
    outputQuality: generationOptions.hasOptions ? options.t(`imageWorkbench.output.quality.${generationOptions.quality}`) : "-",
    outputCompression: generationOptions.hasOptions && hasFormatCompression ? `${generationOptions.outputCompression}%` : "-",
    outputBackground: generationOptions.hasOptions ? options.t(`imageWorkbench.output.background.${generationOptions.background}`) : "-",
    outputModeration: generationOptions.hasOptions ? options.t(`imageWorkbench.output.moderation.${generationOptions.moderation}`) : "-",
  };
}

export type ImageWorkbenchAssetRelationContext = {
  selectedAsset: ImageWorkbenchAssetCard | null;
  directSourceAsset: ImageWorkbenchAssetCard | null;
  rootAsset: ImageWorkbenchAssetCard | null;
  compareSourceAsset: ImageWorkbenchAssetCard | null;
  groupAssets: ImageWorkbenchAssetCard[];
  chainAssets: ImageWorkbenchAssetCard[];
  branchAssets: ImageWorkbenchAssetCard[];
  deliveryReady: boolean;
  groupCount: number;
  chainCount: number;
  branchCount: number;
};

export type ImageWorkbenchCompareItem = {
  asset: ImageWorkbenchAssetCard;
  role: "source" | "selected" | "candidate";
};

export type ImageWorkbenchBranchAction = {
  key: string;
  title: string;
  description: string;
  actionLabel: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function buildGallerySections(options: {
  galleryTab: "current" | "library";
  libraryFilter?: ImageWorkbenchLibraryFilter;
  currentAssets: ImageWorkbenchAssetCard[];
  libraryAssets: ImageWorkbenchAssetCard[];
  currentGroups?: ImageWorkbenchGroup[];
  currentJob: ImageWorkbenchJob | null;
  selectedAssetId: string;
  t: (key: string) => string;
}): ImageWorkbenchGallerySection[] {
  const { galleryTab, libraryFilter = "recent", currentAssets, libraryAssets, currentGroups = [], currentJob, selectedAssetId, t } = options;

  if (galleryTab === "current") {
    return buildCurrentGroupSections({ currentAssets, currentGroups, currentJob, selectedAssetId, t });
  }

  if (libraryFilter !== "recent") {
    const filteredSection: ImageWorkbenchGallerySection = {
      key: `library-${libraryFilter}`,
      title: t(`imageWorkbench.workspace.libraryFilters.${libraryFilter}`),
      description: t(`imageWorkbench.workspace.libraryFilterDescs.${libraryFilter}`),
      selected: libraryAssets.some((asset) => asset.id === selectedAssetId),
      items: sortAssetsForReview(libraryAssets, selectedAssetId),
    };
    return filteredSection.items.length ? [filteredSection] : [];
  }

  const focusedIds = new Set<string>();
  const selectedLibraryAsset = libraryAssets.find((asset) => asset.id === selectedAssetId);
  const favorites = libraryAssets.filter((asset) => asset.favorite);
  const recent = libraryAssets.filter((asset) => !asset.favorite);
  const sections: ImageWorkbenchGallerySection[] = [];

  if (selectedLibraryAsset) {
    const focusedItems = sortAssetsForReview(
      dedupeAssets([
        selectedLibraryAsset,
        ...buildSameGroupAssets(libraryAssets, selectedAssetId, selectedLibraryAsset.jobId),
      ]),
      selectedAssetId
    ).slice(0, 6);
    focusedItems.forEach((asset) => focusedIds.add(asset.id));
    sections.push({
      key: "selected-library-context",
      title: t("imageWorkbench.gallerySections.selectedTitle"),
      description: t("imageWorkbench.gallerySections.selectedDesc"),
      selected: true,
      highlights: [
        {
          key: "selected",
          label: t("imageWorkbench.gallerySections.currentGroup"),
        },
      ],
      items: focusedItems,
    });
  }

  const deliveryAssetIds = new Set(
    libraryAssets.filter((asset) => isDeliveryReady(asset) && !focusedIds.has(asset.id)).map((asset) => asset.id)
  );

  if (deliveryAssetIds.size) {
    const deliveryItems = libraryAssets.filter((asset) => deliveryAssetIds.has(asset.id));
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

  if (favorites.length) {
    const favoriteItems = favorites.filter((asset) => !deliveryAssetIds.has(asset.id) && !focusedIds.has(asset.id));
    sections.push({
      key: "favorites",
      title: t("imageWorkbench.gallerySections.favoriteTitle"),
      description: t("imageWorkbench.gallerySections.favoriteDesc"),
      items: favoriteItems,
    });
  }

  if (recent.length) {
    const recentItems = recent.filter((asset) => !deliveryAssetIds.has(asset.id) && !focusedIds.has(asset.id));
    sections.push({
      key: "recent",
      title: t("imageWorkbench.gallerySections.libraryTitle"),
      description: t("imageWorkbench.gallerySections.libraryDesc"),
      items: recentItems,
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
  const referenceRoleSummary = buildReferenceRoleSummary(selectedMetadata?.personContextJson, t);
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
    {
      key: "reference-roles",
      label: t("imageWorkbench.review.contextReferenceRoles"),
      value: referenceRoleSummary,
    },
  ];

  return items.filter((item) => Boolean(item.value));
}

function buildReferenceRoleSummary(rawContext: string | null | undefined, t: (key: string) => string) {
  const roles = parseReferenceRoles(rawContext);
  if (!roles.length) {
    return "";
  }
  return roles
    .map((item) => `${item.index} ${t(`imageWorkbench.reference.roles.${item.role}`)}`)
    .join(" · ");
}

function parseReferenceRoles(rawContext: string | null | undefined): Array<{ index: number; role: string }> {
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
        const role = String(record.role || "").trim();
        if (!["person", "prop", "scene", "style"].includes(role)) {
          return null;
        }
        const index = Number(record.index);
        return {
          index: Number.isFinite(index) && index > 0 ? Math.round(index) : fallbackIndex + 1,
          role,
        };
      })
      .filter((item): item is { index: number; role: string } => Boolean(item));
  } catch {
    return [];
  }
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

  const sameSeries = sortAssetsForReview(
    buildSameGroupAssets(dedupeAssets(currentAssets.concat(libraryAssets)), selectedAssetId, selectedJobId),
    selectedAssetId
  ).slice(0, 4);

  if (!sameSeries.length) {
    return [] as ImageWorkbenchRelatedAssetGroup[];
  }

  return [
    {
      key: "variations",
      title: t("imageWorkbench.review.relatedVariationsTitle"),
      description: t("imageWorkbench.review.relatedVariationsDesc"),
      items: sameSeries,
    },
  ];
}

export function buildAssetRelationContext(options: {
  selectedAssetId: string;
  currentAssets: ImageWorkbenchAssetCard[];
  libraryAssets: ImageWorkbenchAssetCard[];
}): ImageWorkbenchAssetRelationContext {
  const { selectedAssetId, currentAssets, libraryAssets } = options;
  const allAssets = dedupeAssets(currentAssets.concat(libraryAssets));
  const selectedAsset = allAssets.find((asset) => asset.id === selectedAssetId) || null;
  if (!selectedAsset) {
    return {
      selectedAsset: null,
      directSourceAsset: null,
      rootAsset: null,
      compareSourceAsset: null,
      groupAssets: [],
      chainAssets: [],
      branchAssets: [],
      deliveryReady: false,
      groupCount: 0,
      chainCount: 0,
      branchCount: 0,
    };
  }

  const groupAssets = selectedAsset.groupId
    ? allAssets.filter((asset) => asset.groupId === selectedAsset.groupId)
    : [];
  const chainRootId = selectedAsset.rootAssetId || selectedAsset.id;
  const chainAssets = allAssets.filter((asset) =>
    asset.id === chainRootId || asset.rootAssetId === chainRootId
  );
  const directSourceAsset = selectedAsset.parentAssetId
    ? allAssets.find((asset) => asset.id === selectedAsset.parentAssetId) || null
    : null;
  const rootAsset = chainRootId && chainRootId !== selectedAsset.id
    ? allAssets.find((asset) => asset.id === chainRootId) || null
    : null;
  const branchAssets = sortAssetsByVersion(
    allAssets.filter((asset) => asset.parentAssetId === selectedAsset.id)
  );

  return {
    selectedAsset,
    directSourceAsset,
    rootAsset,
    compareSourceAsset: directSourceAsset || rootAsset,
    groupAssets,
    chainAssets,
    branchAssets,
    deliveryReady: isDeliveryReady(selectedAsset),
    groupCount: groupAssets.length,
    chainCount: chainAssets.length,
    branchCount: branchAssets.length,
  };
}

export function buildAssetLineageSummary(options: {
  selectedAssetId: string;
  currentAssets: ImageWorkbenchAssetCard[];
  libraryAssets: ImageWorkbenchAssetCard[];
  t: (key: string) => string;
}) {
  const { selectedAssetId, currentAssets, libraryAssets, t } = options;
  if (!selectedAssetId) {
    return [] as ImageWorkbenchLineageSummaryItem[];
  }

  const relation = buildAssetRelationContext({
    selectedAssetId,
    currentAssets,
    libraryAssets,
  });
  if (!relation.selectedAsset) {
    return [] as ImageWorkbenchLineageSummaryItem[];
  }

  return [
    {
      key: "group",
      label: t("imageWorkbench.review.lineageGroup"),
      value: relation.groupCount ? String(relation.groupCount) : t("imageWorkbench.review.lineageNoGroup"),
      tone: relation.groupCount ? "primary" : "neutral",
    },
    {
      key: "chain",
      label: t("imageWorkbench.review.lineageChain"),
      value: relation.chainCount > 1 ? String(relation.chainCount) : t("imageWorkbench.review.lineageNoChain"),
      tone: relation.chainCount > 1 ? "primary" : "neutral",
    },
    {
      key: "branches",
      label: t("imageWorkbench.review.lineageBranches"),
      value: String(relation.branchCount),
      tone: relation.branchCount ? "warning" : "neutral",
    },
    {
      key: "delivery",
      label: t("imageWorkbench.gallerySections.badges.delivery"),
      value: relation.deliveryReady
        ? t("imageWorkbench.review.lineageDeliveryReady")
        : t("imageWorkbench.review.lineageDeliveryDraft"),
      tone: relation.deliveryReady ? "success" : "neutral",
    },
  ] as ImageWorkbenchLineageSummaryItem[];
}

function buildCurrentGroupSections(options: {
  currentAssets: ImageWorkbenchAssetCard[];
  currentGroups: ImageWorkbenchGroup[];
  currentJob: ImageWorkbenchJob | null;
  selectedAssetId: string;
  t: (key: string) => string;
}) {
  const { currentAssets, currentGroups, currentJob, selectedAssetId, t } = options;
  if (!currentAssets.length && !currentGroups.length) {
    return [] as ImageWorkbenchGallerySection[];
  }

  if (!currentGroups.length) {
    return [
      {
        key: "current-batch",
        title: t("imageWorkbench.gallerySections.currentTitle"),
        description: currentJob
          ? `${t(`imageWorkbench.jobStatuses.${currentJob.status}`)} · ${currentAssets.length}`
          : t("imageWorkbench.gallerySections.currentDesc"),
        prompt: currentJob?.prompt || "",
        items: currentAssets,
      },
    ];
  }

  const storyboardGroups = currentGroups.filter(isStoryboardDisplayGroup);
  if (!storyboardGroups.length) {
    return [
      {
        key: "current-batch",
        title: t("imageWorkbench.gallerySections.currentTitle"),
        description: currentJob
          ? `${t(`imageWorkbench.jobStatuses.${currentJob.status}`)} · ${currentAssets.length}`
          : t("imageWorkbench.gallerySections.currentDesc"),
        prompt: currentJob?.prompt || "",
        items: currentAssets,
      },
    ].filter((section) => section.items.length);
  }

  const selectedAsset = currentAssets.find((asset) => asset.id === selectedAssetId);
  const selectedGroupId = selectedAsset?.groupId || "";
  const storyboardLayout = buildStoryboardGroupLayout(storyboardGroups, selectedGroupId);
  const orderedRootIds = storyboardLayout.selectedRootId
    ? [...storyboardLayout.rootIds].sort((left, right) =>
        Number(right === storyboardLayout.selectedRootId) - Number(left === storyboardLayout.selectedRootId)
      )
    : storyboardLayout.rootIds;
  const sections: ImageWorkbenchGallerySection[] = orderedRootIds.map((rootId) => {
    const groups = storyboardLayout.groupsByRootId.get(rootId) || [];
    const activeGroup = resolveActiveStoryboardDisplayGroup(groups, storyboardLayout.replanMetaByGroupId);
    const rootGroup = storyboardLayout.groupById.get(rootId) || activeGroup;
    const groupIds = new Set(groups.map((group) => group.id));
    const items = currentAssets.filter((asset) => asset.groupId === activeGroup.id);
    const historyItems = buildStoryboardHistoryItems({
      currentAssets,
      activeGroupId: activeGroup.id,
      groupIds,
      groups,
      replanMetaByGroupId: storyboardLayout.replanMetaByGroupId,
    });
    const selected = groupIds.has(selectedGroupId);
    const hasReplan = activeGroup.id !== rootGroup.id || Boolean(storyboardLayout.replanMetaByGroupId.get(activeGroup.id)?.replanBatchId);
    return {
      key: `group-${rootId}`,
      title: stripStoryboardReplanSuffix(rootGroup.name || activeGroup.name) || t("imageWorkbench.groups.defaultName"),
      description: buildGroupDescription(activeGroup, currentJob, items.length, t),
      prompt: activeGroup.basePrompt || rootGroup.basePrompt || currentJob?.prompt || "",
      selected,
      expectedCount: activeGroup.count,
      highlights: [
        ...(selected
          ? [
              {
                key: "selected",
                label: t("imageWorkbench.gallerySections.currentGroup"),
              },
            ]
          : []),
        ...(hasReplan
          ? [
              {
                key: "replanned",
                label: t("imageWorkbench.gallerySections.replanned"),
              },
            ]
          : []),
        ...(historyItems.length
          ? [
              {
                key: "history",
                label: formatTemplate(t("imageWorkbench.gallerySections.historyCount"), {
                  count: historyItems.length,
                }),
              },
            ]
          : []),
      ],
      items,
      historyItems,
    };
  });

  const groupedIds = new Set(storyboardGroups.map((group) => group.id));
  const ungrouped = currentAssets.filter((asset) => !asset.groupId || !groupedIds.has(asset.groupId));
  if (ungrouped.length) {
    sections.push({
      key: "group-ungrouped",
      title: t("imageWorkbench.groups.ungrouped"),
      description: t("imageWorkbench.gallerySections.currentDesc"),
      prompt: currentJob?.prompt || "",
      items: ungrouped,
    });
  }

  return storyboardGroups.length ? sections : sections.filter((section) => section.items.length);
}

function buildGroupDescription(
  group: ImageWorkbenchGroup,
  currentJob: ImageWorkbenchJob | null,
  itemCount: number,
  t: (key: string) => string
) {
  const type = group.type ? t(`imageWorkbench.groups.types.${group.type}`) : t("imageWorkbench.groups.types.fresh");
  const status = currentJob ? t(`imageWorkbench.jobStatuses.${currentJob.status}`) : "";
  return [type, status, `${itemCount || group.count} ${t("imageWorkbench.groups.images")}`]
    .filter(Boolean)
    .join(" · ");
}

type StoryboardReplanMeta = {
  sourceGroupId: string;
  replanBatchId: string;
  replannedAtMs: number;
};

function buildStoryboardGroupLayout(currentGroups: ImageWorkbenchGroup[], selectedGroupId: string) {
  const groupById = new Map(currentGroups.map((group) => [group.id, group]));
  const replanMetaByGroupId = new Map(
    currentGroups.map((group) => [group.id, parseStoryboardReplanMeta(group.agentIdsJson)] as const)
  );
  const groupsByRootId = new Map<string, ImageWorkbenchGroup[]>();
  const rootIds: string[] = [];
  let selectedRootId = "";

  currentGroups.forEach((group) => {
    const rootId = resolveStoryboardRootGroupId(group, groupById, replanMetaByGroupId);
    if (!groupsByRootId.has(rootId)) {
      groupsByRootId.set(rootId, []);
      rootIds.push(rootId);
    }
    groupsByRootId.get(rootId)?.push(group);
    if (group.id === selectedGroupId) {
      selectedRootId = rootId;
    }
  });

  return {
    groupById,
    groupsByRootId,
    rootIds,
    selectedRootId,
    replanMetaByGroupId,
  };
}

function resolveStoryboardRootGroupId(
  group: ImageWorkbenchGroup,
  groupById: Map<string, ImageWorkbenchGroup>,
  replanMetaByGroupId: Map<string, StoryboardReplanMeta>
) {
  if (!isStoryboardDisplayGroup(group)) {
    return group.id;
  }

  let current = group;
  const seen = new Set([group.id]);
  while (true) {
    const sourceGroupId = replanMetaByGroupId.get(current.id)?.sourceGroupId || "";
    if (!sourceGroupId || seen.has(sourceGroupId)) {
      return current.id;
    }
    const sourceGroup = groupById.get(sourceGroupId);
    if (!sourceGroup || !isStoryboardDisplayGroup(sourceGroup)) {
      return current.id;
    }
    current = sourceGroup;
    seen.add(current.id);
  }
}

function resolveActiveStoryboardDisplayGroup(
  groups: ImageWorkbenchGroup[],
  replanMetaByGroupId: Map<string, StoryboardReplanMeta>
) {
  return [...groups].sort(
    (left, right) =>
      storyboardGroupVersionMs(right, replanMetaByGroupId) -
      storyboardGroupVersionMs(left, replanMetaByGroupId)
  )[0] || groups[0];
}

function buildStoryboardHistoryItems(options: {
  currentAssets: ImageWorkbenchAssetCard[];
  activeGroupId: string;
  groupIds: Set<string>;
  groups: ImageWorkbenchGroup[];
  replanMetaByGroupId: Map<string, StoryboardReplanMeta>;
}) {
  const groupById = new Map(options.groups.map((group) => [group.id, group]));
  return options.currentAssets
    .filter((asset) => asset.groupId && options.groupIds.has(asset.groupId) && asset.groupId !== options.activeGroupId)
    .sort((left, right) => {
      const leftGroup = left.groupId ? groupById.get(left.groupId) : null;
      const rightGroup = right.groupId ? groupById.get(right.groupId) : null;
      const groupPriority =
        storyboardGroupVersionMs(rightGroup, options.replanMetaByGroupId) -
        storyboardGroupVersionMs(leftGroup, options.replanMetaByGroupId);
      return groupPriority || right.createdAtMs - left.createdAtMs;
    });
}

function isStoryboardDisplayGroup(group: ImageWorkbenchGroup) {
  return group.type === "storyboard" || group.agentPreset === "storyboard";
}

function storyboardGroupVersionMs(
  group: ImageWorkbenchGroup | null | undefined,
  replanMetaByGroupId: Map<string, StoryboardReplanMeta>
) {
  if (!group) {
    return 0;
  }
  return replanMetaByGroupId.get(group.id)?.replannedAtMs || group.createdAtMs || group.updatedAtMs || 0;
}

function parseStoryboardReplanMeta(rawJson: string | null | undefined): StoryboardReplanMeta {
  if (!rawJson) {
    return {
      sourceGroupId: "",
      replanBatchId: "",
      replannedAtMs: 0,
    };
  }
  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    const replannedAtMs = Number(parsed.replannedAtMs);
    return {
      sourceGroupId: typeof parsed.sourceGroupId === "string" ? parsed.sourceGroupId : "",
      replanBatchId: typeof parsed.replanBatchId === "string" ? parsed.replanBatchId : "",
      replannedAtMs: Number.isFinite(replannedAtMs) ? replannedAtMs : 0,
    };
  } catch {
    return {
      sourceGroupId: "",
      replanBatchId: "",
      replannedAtMs: 0,
    };
  }
}

function stripStoryboardReplanSuffix(name: string | null | undefined) {
  return (name || "").replace(/\s*(?:·|-|路)\s*(?:重新规划|Replan)\s*$/i, "").trim();
}

function buildSameGroupAssets(
  assets: ImageWorkbenchAssetCard[],
  selectedAssetId: string,
  selectedJobId: string
) {
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);
  const selectedGroupId = selectedAsset?.groupId || "";
  if (selectedGroupId) {
    const groupAssets = assets.filter(
      (asset) => asset.groupId === selectedGroupId && asset.id !== selectedAssetId
    );
    if (groupAssets.length) {
      return groupAssets;
    }
  }

  return assets.filter((asset) => asset.jobId === selectedJobId && asset.id !== selectedAssetId);
}

export function buildVersionChain(options: {
  selectedAssetId: string;
  currentAssets: ImageWorkbenchAssetCard[];
  libraryAssets: ImageWorkbenchAssetCard[];
  t: (key: string) => string;
}) {
  const { selectedAssetId, currentAssets, libraryAssets, t } = options;
  if (!selectedAssetId) {
    return [] as ImageWorkbenchVersionChainItem[];
  }

  const relation = buildAssetRelationContext({
    selectedAssetId,
    currentAssets,
    libraryAssets,
  });
  if (!relation.selectedAsset) {
    return [] as ImageWorkbenchVersionChainItem[];
  }

  const items: ImageWorkbenchVersionChainItem[] = [];

  if (relation.directSourceAsset) {
    items.push({
      key: `source-${relation.directSourceAsset.id}`,
      label: t("imageWorkbench.review.versionSource"),
      description: t("imageWorkbench.review.versionSourceDesc"),
      asset: relation.directSourceAsset,
      tone: "source",
    });
  }

  items.push({
    key: `selected-${relation.selectedAsset.id}`,
    label: t("imageWorkbench.review.versionSelected"),
    description: t("imageWorkbench.review.versionSelectedDesc"),
    asset: relation.selectedAsset,
    tone: "selected",
  });

  relation.branchAssets.slice(0, 3).forEach((asset, index) => {
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

function sortAssetsByVersion(items: ImageWorkbenchAssetCard[]) {
  return [...items].sort((left, right) => {
    const lv = left.versionIndex ?? Number.POSITIVE_INFINITY;
    const rv = right.versionIndex ?? Number.POSITIVE_INFINITY;
    if (lv !== rv) return lv - rv;
    return left.createdAtMs - right.createdAtMs;
  });
}

export function buildAssetBadges(options: {
  asset: ImageWorkbenchAssetCard;
  selectedAssetId: string;
  currentAssets?: ImageWorkbenchAssetCard[];
  libraryAssets?: ImageWorkbenchAssetCard[];
  t: (key: string) => string;
}) {
  const { asset, selectedAssetId, currentAssets = [], libraryAssets = [], t } = options;
  const badges: ImageWorkbenchAssetBadge[] = [];
  const relation = buildAssetRelationContext({
    selectedAssetId,
    currentAssets,
    libraryAssets,
  });
  const lineageRole = resolveLineageRole(asset.id, relation);
  const deliveryCandidate = isDeliveryReady(asset);

  if (asset.integrityStatus && asset.integrityStatus !== "ok") {
    badges.push({
      key: `integrity-${asset.integrityStatus}`,
      label: t(`imageWorkbench.gallerySections.badges.${asset.integrityStatus}`),
      tone: "danger",
    });
  }

  if (deliveryCandidate) {
    badges.push({
      key: "delivery",
      label: t("imageWorkbench.gallerySections.badges.delivery"),
      tone: "success",
    });
  }

  if (asset.qualityIssues?.length) {
    badges.push({
      key: "needs-fix",
      label: t("imageWorkbench.gallerySections.badges.needsFix"),
      tone: "warning",
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
  libraryAssets?: ImageWorkbenchAssetCard[];
  selectedAssetId: string;
}) {
  const { currentAssets, libraryAssets = [], selectedAssetId } = options;
  if (!selectedAssetId) {
    return [] as ImageWorkbenchCompareItem[];
  }

  const allAssets = dedupeAssets(currentAssets.concat(libraryAssets));
  const relation = buildAssetRelationContext({
    selectedAssetId,
    currentAssets,
    libraryAssets,
  });
  if (!relation.selectedAsset) {
    return [] as ImageWorkbenchCompareItem[];
  }
  const selectedAsset = relation.selectedAsset;
  const sourceAsset = relation.compareSourceAsset;
  const candidatePool = currentAssets.length
    ? currentAssets
    : buildSameGroupAssets(allAssets, selectedAssetId, selectedAsset.jobId);
  const candidates = sortAssetsForReview(candidatePool, selectedAssetId)
    .filter((asset) => asset.id !== selectedAsset.id && asset.id !== sourceAsset?.id)
    .slice(0, sourceAsset ? 2 : 3);

  const items: ImageWorkbenchCompareItem[] = [];
  if (sourceAsset) {
    items.push({
      asset: sourceAsset,
      role: "source",
    });
  }
  items.push({
    asset: selectedAsset,
    role: "selected",
  });
  items.push(
    ...candidates.map((asset) => ({
      asset,
      role: "candidate" as const,
    }))
  );

  return items;
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

function resolveLineageRole(assetId: string, relation: ImageWorkbenchAssetRelationContext) {
  if (!assetId || !relation.selectedAsset) {
    return "";
  }

  if (assetId === relation.selectedAsset.id) {
    return "selected";
  }

  if (assetId === relation.compareSourceAsset?.id || assetId === relation.rootAsset?.id) {
    return "source";
  }

  if (relation.branchAssets.some((asset) => asset.id === assetId)) {
    return "branch";
  }

  return "";
}

function isDeliveryReady(asset: ImageWorkbenchAssetCard) {
  return asset.deliveryStatus === "ready";
}

function formatMimeTypeAsImageFormat(mimeType?: string | null) {
  const clean = String(mimeType || "").toLowerCase();
  if (clean.includes("jpeg") || clean.includes("jpg")) return "JPEG";
  if (clean.includes("webp")) return "WebP";
  if (clean.includes("png")) return "PNG";
  return mimeType || "-";
}

export function buildBranchActions(options: {
  continueStyleDisabledReason: string;
  inpaintDisabledReason: string;
  personDisabledReason: string;
  upscaleDisabledReason: string;
  canUpscale4x: boolean;
  t: (key: string) => string;
}) {
  const { continueStyleDisabledReason, inpaintDisabledReason, personDisabledReason, upscaleDisabledReason, canUpscale4x, t } = options;
  return [
    {
      key: "continue-style",
      title: t("imageWorkbench.branches.continueStyleTitle"),
      description: t("imageWorkbench.branches.continueStyleDesc"),
      actionLabel: t("imageWorkbench.asset.continueStyle"),
      disabled: Boolean(continueStyleDisabledReason),
      disabledReason: continueStyleDisabledReason,
    },
    {
      key: "inpaint",
      title: t("imageWorkbench.branches.inpaintTitle"),
      description: t("imageWorkbench.branches.inpaintDesc"),
      actionLabel: t("imageWorkbench.asset.inpaint"),
      disabled: Boolean(inpaintDisabledReason),
      disabledReason: inpaintDisabledReason,
    },
    {
      key: "person",
      title: t("imageWorkbench.branches.personTitle"),
      description: t("imageWorkbench.branches.personDesc"),
      actionLabel: t("imageWorkbench.asset.personContinue"),
      disabled: Boolean(personDisabledReason),
      disabledReason: personDisabledReason,
    },
    {
      key: "upscale",
      title: t("imageWorkbench.branches.upscaleTitle"),
      description: canUpscale4x
        ? t("imageWorkbench.branches.upscaleDesc4x")
        : t("imageWorkbench.branches.upscaleDesc2x"),
      actionLabel: canUpscale4x ? t("imageWorkbench.asset.upscale4x") : t("imageWorkbench.asset.upscale2x"),
      disabled: Boolean(upscaleDisabledReason),
      disabledReason: upscaleDisabledReason,
    },
  ];
}
