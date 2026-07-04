import { computed, type ComputedRef } from "vue";
import type { ImageWorkbenchAsset, ImageWorkbenchQualityIssue } from "../types/image-workbench";

const QUALITY_ISSUES: ImageWorkbenchQualityIssue[] = ["hands", "identity", "prop", "scene"];

interface ImageWorkbenchQualityStateContext {
  selectedAsset: ComputedRef<ImageWorkbenchAsset | null>;
  findAsset: (assetId: string) => ImageWorkbenchAsset | null;
  persistAssetQualityIssues: (
    assetId: string,
    issues: ImageWorkbenchQualityIssue[]
  ) => Promise<void>;
}

export function createImageWorkbenchQualityState({
  selectedAsset,
  findAsset,
  persistAssetQualityIssues,
}: ImageWorkbenchQualityStateContext) {
  const selectedAssetQualityIssues = computed(() =>
    normalizeIssues(selectedAsset.value?.qualityIssues ?? [])
  );

  function getAssetQualityIssues(assetId: string) {
    return assetId ? normalizeIssues(findAsset(assetId)?.qualityIssues ?? []) : [];
  }

  function hasAssetQualityIssue(assetId: string, issue: ImageWorkbenchQualityIssue) {
    return getAssetQualityIssues(assetId).includes(issue);
  }

  async function toggleSelectedAssetQualityIssue(issue: ImageWorkbenchQualityIssue) {
    return selectedAsset.value
      ? toggleAssetQualityIssue(selectedAsset.value.id, issue)
      : false;
  }

  async function toggleAssetQualityIssue(assetId: string, issue: ImageWorkbenchQualityIssue) {
    if (!assetId || !isQualityIssue(issue)) {
      return false;
    }
    const current = getAssetQualityIssues(assetId);
    const next = current.includes(issue)
      ? current.filter((item) => item !== issue)
      : [...current, issue];
    await setAssetQualityIssues(assetId, next);
    return true;
  }

  async function addSelectedAssetQualityIssue(issue: ImageWorkbenchQualityIssue) {
    return selectedAsset.value
      ? addAssetQualityIssue(selectedAsset.value.id, issue)
      : false;
  }

  async function addAssetQualityIssue(assetId: string, issue: ImageWorkbenchQualityIssue) {
    if (!assetId || !isQualityIssue(issue) || hasAssetQualityIssue(assetId, issue)) {
      return false;
    }
    await setAssetQualityIssues(assetId, [...getAssetQualityIssues(assetId), issue]);
    return true;
  }

  async function clearAssetQualityIssues(assetId: string) {
    if (!assetId || !getAssetQualityIssues(assetId).length) {
      return;
    }
    await setAssetQualityIssues(assetId, []);
  }

  async function setAssetQualityIssues(assetId: string, issues: ImageWorkbenchQualityIssue[]) {
    const cleanIssues = normalizeIssues(issues);
    await persistAssetQualityIssues(assetId, cleanIssues);
  }

  return {
    selectedAssetQualityIssues,
    getAssetQualityIssues,
    hasAssetQualityIssue,
    toggleSelectedAssetQualityIssue,
    toggleAssetQualityIssue,
    addSelectedAssetQualityIssue,
    addAssetQualityIssue,
    clearAssetQualityIssues,
  };
}

function normalizeIssues(issues: unknown[]) {
  const seen = new Set<ImageWorkbenchQualityIssue>();
  issues.forEach((issue) => {
    if (isQualityIssue(issue)) {
      seen.add(issue);
    }
  });
  return [...seen];
}

function isQualityIssue(issue: unknown): issue is ImageWorkbenchQualityIssue {
  return QUALITY_ISSUES.includes(issue as ImageWorkbenchQualityIssue);
}
