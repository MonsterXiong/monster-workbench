import type { ComputedRef, Ref } from "vue";
import { imageWorkbenchService } from "../services/image-workbench.service";
import { formatTemplate } from "../utils";
import type {
  DeleteImageWorkbenchJobResult,
  ImageWorkbenchJob,
  ImageWorkbenchSnapshot,
} from "../types/image-workbench";

interface CreateImageWorkbenchJobDeleteActionsOptions {
  currentJob: ComputedRef<ImageWorkbenchJob | null>;
  currentSnapshot: Ref<ImageWorkbenchSnapshot | null>;
  inpaintEditorActive: Ref<boolean>;
  jobs: Ref<ImageWorkbenchJob[]>;
  notice: Ref<string>;
  selectedAssetId: Ref<string>;
  selectedJobId: Ref<string>;
  clearCurrentGroups: () => void;
  refreshWorkbenchLists: () => Promise<void>;
  runWithLoading: <T>(runner: () => Promise<T>) => Promise<T>;
  selectJob: (jobId: string, preferredAssetId?: string) => Promise<ImageWorkbenchSnapshot | null>;
  stopJobSnapshotPolling: (jobId: string) => void;
  t: (key: string) => string;
}

export function createImageWorkbenchJobDeleteActions(
  options: CreateImageWorkbenchJobDeleteActionsOptions
) {
  async function deleteJobById(jobId: string, deleteAssets = false) {
    if (!jobId) {
      return;
    }
    await options.runWithLoading(async () => {
      const result = await imageWorkbenchService.deleteJob(jobId, deleteAssets);
      options.stopJobSnapshotPolling(jobId);
      if (options.selectedJobId.value === jobId) {
        options.inpaintEditorActive.value = false;
        options.currentSnapshot.value = null;
        options.clearCurrentGroups();
        options.selectedJobId.value = "";
        options.selectedAssetId.value = "";
      }
      await options.refreshWorkbenchLists();
      if (!options.selectedJobId.value && options.jobs.value[0]) {
        await options.selectJob(options.jobs.value[0].id);
      }
      options.notice.value = formatDeleteNotice(result, deleteAssets, options.t);
    });
  }

  async function deleteCurrentJob(deleteAssets = false) {
    if (!options.currentJob.value) {
      return;
    }
    await deleteJobById(options.currentJob.value.id, deleteAssets);
  }

  return {
    deleteCurrentJob,
    deleteJobById,
  };
}

function formatDeleteNotice(
  result: DeleteImageWorkbenchJobResult,
  deleteAssets: boolean,
  t: (key: string) => string
) {
  return deleteAssets
    ? formatTemplate(t("imageWorkbench.assetGroup.deleteJobWithAssetsNotice"), {
        assets: result.deletedAssets,
        files: result.deletedFiles,
      })
    : t("imageWorkbench.assetGroup.deleteJobOnlyNotice");
}
