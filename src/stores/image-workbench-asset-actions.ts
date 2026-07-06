import type { ComputedRef, Ref } from "vue";
import { imageWorkbenchService } from "../services/image-workbench.service";
import { formatTemplate } from "../utils";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchJob,
  ImageWorkbenchMode,
  ImageWorkbenchQualityIssue,
  ImageWorkbenchSnapshot,
  ImageWorkbenchTemplate,
} from "../types/image-workbench";

interface CreateImageWorkbenchAssetActionsOptions {
  currentJob: ComputedRef<ImageWorkbenchJob | null>;
  currentSnapshot: Ref<ImageWorkbenchSnapshot | null>;
  inpaintEditorActive: Ref<boolean>;
  mode: Ref<ImageWorkbenchMode>;
  negativePrompt: Ref<string>;
  notice: Ref<string>;
  prompt: Ref<string>;
  selectedAssetId: Ref<string>;
  selectedJobId: Ref<string>;
  templateDraftName: Ref<string>;
  templates: Ref<ImageWorkbenchTemplate[]>;
  t: (key: string) => string;
  exportGroup: (options: { groupId?: string | null; groupName?: string | null }) => Promise<unknown>;
  refreshWorkbenchLists: () => Promise<void>;
  runWithLoading: <T>(runner: () => Promise<T>) => Promise<T>;
  syncCurrentGroups: (jobId: string) => Promise<unknown>;
  syncSelectedAssetFromSnapshot: (preferredAssetId?: string) => void;
}

export function createImageWorkbenchAssetActions(options: CreateImageWorkbenchAssetActionsOptions) {
  async function refreshCurrentSnapshot() {
    if (!options.currentJob.value) {
      return;
    }
    options.currentSnapshot.value = await imageWorkbenchService
      .getJobSnapshot(options.currentJob.value.id)
      .catch(() => options.currentSnapshot.value);
    if (options.currentSnapshot.value) {
      await options.syncCurrentGroups(options.currentSnapshot.value.job.id);
    }
    options.syncSelectedAssetFromSnapshot();
  }

  async function deleteAssetsByIds(assetIds: string[], deleteFiles = true) {
    const ids = Array.from(new Set(assetIds.map((item) => item.trim()).filter(Boolean)));
    if (!ids.length) {
      return null;
    }
    const result = await options.runWithLoading(() =>
      imageWorkbenchService.deleteAssets({ assetIds: ids, deleteFiles })
    );
    await refreshCurrentSnapshot();
    await options.refreshWorkbenchLists();
    options.notice.value = formatTemplate(options.t("imageWorkbench.assetGroup.deleteAssetsNotice"), {
      assets: result.deletedAssets,
      files: result.deletedFiles,
    });
    return result;
  }

  async function tagAssetsGroup(assetIds: string[], groupOptions: { groupId?: string | null; groupName?: string | null }) {
    const ids = Array.from(new Set(assetIds.map((item) => item.trim()).filter(Boolean)));
    if (!ids.length) {
      return null;
    }
    const result = await options.runWithLoading(() =>
      imageWorkbenchService.tagAssetsGroup({
        assetIds: ids,
        groupId: groupOptions.groupId || null,
        groupName: groupOptions.groupName || null,
      })
    );
    if (options.currentJob.value) {
      await options.syncCurrentGroups(options.currentJob.value.id);
    }
    await options.refreshWorkbenchLists();
    options.notice.value = formatTemplate(options.t("imageWorkbench.assetGroup.tagNotice"), {
      count: result.taggedAssets,
    });
    return result;
  }

  async function exportAssetGroup(groupOptions: { groupId?: string | null; groupName?: string | null }) {
    return options.exportGroup({
      groupId: groupOptions.groupId || null,
      groupName: groupOptions.groupName || null,
    });
  }

  async function toggleAssetFavorite(asset: ImageWorkbenchAsset) {
    options.currentSnapshot.value = await options.runWithLoading(() =>
      imageWorkbenchService.setAssetFavorite({ assetId: asset.id, favorite: !asset.favorite })
    );
    options.selectedAssetId.value = asset.id;
    options.selectedJobId.value = options.currentSnapshot.value.job.id;
    await options.syncCurrentGroups(options.selectedJobId.value);
    await options.refreshWorkbenchLists();
    return options.currentSnapshot.value;
  }

  async function setAssetRating(asset: ImageWorkbenchAsset, rating: number | null) {
    options.currentSnapshot.value = await options.runWithLoading(() =>
      imageWorkbenchService.setAssetRating({ assetId: asset.id, rating })
    );
    options.selectedAssetId.value = asset.id;
    options.selectedJobId.value = options.currentSnapshot.value.job.id;
    await options.syncCurrentGroups(options.selectedJobId.value);
    await options.refreshWorkbenchLists();
    return options.currentSnapshot.value;
  }

  async function persistAssetQualityIssues(assetId: string, qualityIssues: ImageWorkbenchQualityIssue[]) {
    options.currentSnapshot.value = await options.runWithLoading(() =>
      imageWorkbenchService.setAssetQualityIssues({ assetId, qualityIssues })
    );
    options.selectedAssetId.value = assetId;
    options.selectedJobId.value = options.currentSnapshot.value.job.id;
    await options.syncCurrentGroups(options.selectedJobId.value);
    await options.refreshWorkbenchLists();
  }

  async function saveCurrentTemplate() {
    const request = {
      name: options.templateDraftName.value.trim() ||
        options.prompt.value.trim().slice(0, 32) ||
        options.t("imageWorkbench.template.untitled"),
      prompt: options.prompt.value,
      negativePrompt: options.negativePrompt.value,
      mode: options.mode.value,
    };
    await options.runWithLoading(async () => {
      await imageWorkbenchService.saveTemplate(request);
      options.templateDraftName.value = "";
      options.templates.value = await imageWorkbenchService.listTemplates();
    });
  }

  async function deleteTemplate(templateId: string) {
    await options.runWithLoading(async () => {
      await imageWorkbenchService.deleteTemplate(templateId);
      options.templates.value = await imageWorkbenchService.listTemplates();
    });
  }

  function applyTemplate(template: ImageWorkbenchTemplate) {
    options.inpaintEditorActive.value = false;
    options.mode.value = template.mode;
    options.prompt.value = template.prompt;
    options.negativePrompt.value = template.negativePrompt || "";
  }

  return {
    applyTemplate,
    deleteAssetsByIds,
    deleteTemplate,
    exportAssetGroup,
    persistAssetQualityIssues,
    saveCurrentTemplate,
    setAssetRating,
    tagAssetsGroup,
    toggleAssetFavorite,
  };
}
