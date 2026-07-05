import {
  getCurrentTimestampMs,
  mapValuesToArray,
  sortByMany,
} from "../../utils";

type ImageWorkbenchAssetMockContext = {
  jobs: Map<string, any>;
  assets: Map<string, any>;
  groups: Map<string, any>;
  getSnapshot: (jobId: string) => any;
};

const QUALITY_ISSUES = ["hands", "identity", "prop", "scene"];

export function listMockImageWorkbenchAssets(
  context: ImageWorkbenchAssetMockContext,
  args: Record<string, unknown>
) {
  const limit = Math.max(1, Math.min(Number(args.limit || 100), 200));
  return sortByMany(filterActiveMockAssets(context), [
    { getValue: (asset) => (asset.favorite ? 0 : 1) },
    { getValue: (asset) => -Number(asset.createdAtMs || 0) },
  ]).slice(0, limit);
}

export function queryMockImageWorkbenchAssets(
  context: ImageWorkbenchAssetMockContext,
  args: Record<string, unknown>
) {
  const request = args.request as any;
  const limit = Math.max(1, Math.min(Number(request?.limit || 100), 200));
  const offset = Math.max(0, Math.min(Number(request?.offset || 0), 10000));
  const groupId = String(request?.groupId || "").trim();
  const minRating = request?.minRating == null ? null : Number(request.minRating);
  if (minRating != null && (!Number.isInteger(minRating) || minRating < 0 || minRating > 5)) {
    throw new Error("[ERR_IPC_BROWSER] 图片工作台资产评分筛选必须在 0 到 5 之间");
  }

  let assets = filterActiveMockAssets(context);
  if (groupId) {
    assets = assets.filter((asset) => asset.groupId === groupId);
  }
  if (minRating != null) {
    assets = assets.filter((asset) => asset.rating != null && Number(asset.rating) >= minRating);
  }

  return sortMockAssets(assets, String(request?.sort || "favorite_then_recent")).slice(
    offset,
    offset + limit
  );
}

export function listMockImageWorkbenchGroups(
  context: ImageWorkbenchAssetMockContext,
  args: Record<string, unknown>
) {
  const jobId = String(args.jobId || "").trim();
  if (!context.jobs.has(jobId)) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台作业");
  }
  return sortByMany(
    mapValuesToArray(context.groups).filter((group) => group.jobId === jobId),
    [{ getValue: (group) => Number(group.createdAtMs || 0) }]
  );
}

export function setMockImageWorkbenchAssetFavorite(
  context: ImageWorkbenchAssetMockContext,
  args: Record<string, unknown>
) {
  const request = args.request as any;
  const asset = context.assets.get(String(request?.assetId || ""));
  if (!asset) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台资产");
  }
  context.assets.set(asset.id, {
    ...asset,
    favorite: Boolean(request.favorite),
  });
  refreshMockImageWorkbenchAssetDeliveryStatus(context, asset.id);
  touchMockImageWorkbenchJob(context.jobs, asset.jobId);
  return context.getSnapshot(asset.jobId);
}

export function setMockImageWorkbenchAssetRating(
  context: ImageWorkbenchAssetMockContext,
  args: Record<string, unknown>
) {
  const request = args.request as any;
  const asset = context.assets.get(String(request?.assetId || ""));
  if (!asset) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台资产");
  }
  const rating = request.rating == null ? null : Number(request.rating);
  if (rating != null && (!Number.isInteger(rating) || rating < 0 || rating > 5)) {
    throw new Error("[ERR_IPC_BROWSER] 图片工作台资产评分必须在 0 到 5 之间");
  }
  context.assets.set(asset.id, {
    ...asset,
    rating,
  });
  touchMockImageWorkbenchJob(context.jobs, asset.jobId);
  return context.getSnapshot(asset.jobId);
}

export function setMockImageWorkbenchAssetQualityIssues(
  context: ImageWorkbenchAssetMockContext,
  args: Record<string, unknown>
) {
  const request = args.request as any;
  const asset = context.assets.get(String(request?.assetId || ""));
  if (!asset) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台资产");
  }
  const qualityIssues = normalizeMockQualityIssues(request?.qualityIssues);
  context.assets.set(asset.id, {
    ...asset,
    qualityIssues,
  });
  touchMockImageWorkbenchJob(context.jobs, asset.jobId);
  return context.getSnapshot(asset.jobId);
}

export function deleteMockImageWorkbenchAssets(
  context: ImageWorkbenchAssetMockContext,
  args: Record<string, unknown>
) {
  const request = args.request as any;
  const ids: string[] = Array.from(new Set<string>(
    (Array.isArray(request?.assetIds) ? request.assetIds : [])
      .map((item: unknown) => String(item || "").trim())
      .filter(Boolean)
  ));
  let deletedAssets = 0;
  const touchedJobIds = new Set<string>();
  ids.forEach((assetId) => {
    const asset = context.assets.get(assetId);
    if (!asset) {
      return;
    }
    context.assets.delete(assetId);
    deletedAssets += 1;
    touchedJobIds.add(asset.jobId);
  });
  touchedJobIds.forEach((jobId) => touchMockImageWorkbenchJob(context.jobs, jobId));
  return {
    deletedAssets,
    deletedFiles: request?.deleteFiles === false ? 0 : deletedAssets,
    skippedFiles: 0,
  };
}

export function tagMockImageWorkbenchAssetsGroup(
  context: ImageWorkbenchAssetMockContext,
  args: Record<string, unknown>
) {
  const request = args.request as any;
  const ids: string[] = Array.from(new Set<string>(
    (Array.isArray(request?.assetIds) ? request.assetIds : [])
      .map((item: unknown) => String(item || "").trim())
      .filter(Boolean)
  ));
  const assets = ids
    .map((assetId) => context.assets.get(assetId))
    .filter(Boolean);
  if (!assets.length) {
    return { taggedAssets: 0, groups: [] };
  }

  const now = getCurrentTimestampMs();
  const targetGroups = new Map<string, any>();
  const existingGroupId = String(request?.groupId || "").trim();
  if (existingGroupId) {
    const group = context.groups.get(existingGroupId);
    if (!group) {
      throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片群组");
    }
    targetGroups.set(group.jobId, group);
  } else {
    const groupName = String(request?.groupName || "").trim();
    if (!groupName) {
      throw new Error("[ERR_IPC_BROWSER] 图片群组名称不能为空");
    }
    assets.forEach((asset) => {
      if (targetGroups.has(asset.jobId)) {
        return;
      }
      const groupId = `iw-group-${now}-${Math.random().toString(36).slice(2, 8)}`;
      const group = {
        id: groupId,
        jobId: asset.jobId,
        sourceId: null,
        name: groupName,
        type: "manual",
        agentPreset: null,
        agentIdsJson: null,
        basePrompt: groupName,
        count: 0,
        createdAtMs: now,
        updatedAtMs: now,
      };
      context.groups.set(groupId, group);
      targetGroups.set(asset.jobId, group);
    });
  }

  let taggedAssets = 0;
  assets.forEach((asset) => {
    const group = targetGroups.get(asset.jobId);
    if (!group) {
      return;
    }
    context.assets.set(asset.id, {
      ...asset,
      groupId: group.id,
    });
    taggedAssets += 1;
    touchMockImageWorkbenchJob(context.jobs, asset.jobId);
  });

  const groups = Array.from(targetGroups.values()).map((group) => {
    const count = mapValuesToArray(context.assets).filter((asset) => asset.groupId === group.id).length;
    const nextGroup = { ...group, count, updatedAtMs: now };
    context.groups.set(group.id, nextGroup);
    return nextGroup;
  });
  return { taggedAssets, groups };
}

function sortMockAssets(assets: any[], sort: string) {
  if (sort === "recent_first" || sort === "recentFirst") {
    return sortByMany(assets, [{ getValue: (asset) => -Number(asset.createdAtMs || 0) }]);
  }
  if (sort === "rating_desc" || sort === "ratingDesc") {
    return sortByMany(assets, [
      { getValue: (asset) => -Number(asset.rating || 0) },
      { getValue: (asset) => (asset.favorite ? 0 : 1) },
      { getValue: (asset) => -Number(asset.createdAtMs || 0) },
    ]);
  }
  return sortByMany(assets, [
    { getValue: (asset) => (asset.favorite ? 0 : 1) },
    { getValue: (asset) => -Number(asset.createdAtMs || 0) },
  ]);
}

function filterActiveMockAssets(context: ImageWorkbenchAssetMockContext) {
  const activeJobIds = new Set(
    mapValuesToArray(context.jobs)
      .filter((job) => !job.archivedAtMs && !job.deletedAtMs)
      .map((job) => job.id)
  );
  return mapValuesToArray(context.assets).filter((asset) => activeJobIds.has(asset.jobId));
}

export function refreshMockImageWorkbenchAssetDeliveryStatus(
  context: ImageWorkbenchAssetMockContext,
  assetId: string
) {
  const asset = context.assets.get(assetId);
  if (!asset) {
    return;
  }
  const deliveryReady = Boolean(
    asset.favorite &&
      asset.parentAssetId &&
      context.assets.has(asset.parentAssetId) &&
      !mapValuesToArray(context.assets).some((item) => item.parentAssetId === asset.id)
  );
  context.assets.set(asset.id, {
    ...asset,
    deliveryStatus: deliveryReady ? "ready" : null,
  });
}

function touchMockImageWorkbenchJob(jobs: Map<string, any>, jobId: string) {
  const job = jobs.get(jobId);
  if (!job) {
    return;
  }
  jobs.set(jobId, {
    ...job,
    updatedAtMs: getCurrentTimestampMs(),
  });
}

function normalizeMockQualityIssues(value: unknown) {
  const seen = new Set<string>();
  if (!Array.isArray(value)) {
    return [];
  }
  value.forEach((item) => {
    const issue = String(item || "").trim();
    if (!issue) {
      return;
    }
    if (!QUALITY_ISSUES.includes(issue)) {
      throw new Error(`[ERR_IPC_BROWSER] 图片质检标签不支持: ${issue}`);
    }
    seen.add(issue);
  });
  return [...seen];
}
