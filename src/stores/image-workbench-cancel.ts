import type { ComputedRef, Ref } from "vue";
import { imageWorkbenchService } from "../services/image-workbench.service";
import { isJobTerminal } from "./image-workbench-helpers";
import type { ImageWorkbenchJob, ImageWorkbenchSnapshot } from "../types/image-workbench";

interface ImageWorkbenchCancelActionsContext {
  activeJobId: ComputedRef<string>;
  cancelRequested: Ref<boolean>;
  currentJob: ComputedRef<ImageWorkbenchJob | null>;
  currentSnapshot: Ref<ImageWorkbenchSnapshot | null>;
  error: Ref<string>;
  loading: Ref<boolean>;
  selectedJobId: Ref<string>;
  refreshWorkbenchLists: () => Promise<void>;
  stopJobSnapshotPolling: (jobId: string) => void;
  syncCurrentGroups: (jobId: string) => Promise<unknown>;
  syncSelectedAssetFromSnapshot: () => void;
}

export function createImageWorkbenchCancelActions(options: ImageWorkbenchCancelActionsContext) {
  async function cancelJob(jobId: string) {
    options.cancelRequested.value = true;
    if (!jobId) {
      options.cancelRequested.value = false;
      return null;
    }
    try {
      const snapshot = await imageWorkbenchService.cancelJob(jobId);
      options.stopJobSnapshotPolling(jobId);
      if (options.selectedJobId.value === jobId) {
        options.currentSnapshot.value = snapshot;
        await options.syncCurrentGroups(jobId);
        options.syncSelectedAssetFromSnapshot();
      }
      options.loading.value = false;
      await options.refreshWorkbenchLists();
      return snapshot;
    } finally {
      options.cancelRequested.value = false;
    }
  }

  async function cancelTask(taskId: string) {
    if (!taskId) return null;
    options.error.value = "";
    const snapshot = await imageWorkbenchService.cancelTask(taskId);
    if (isJobTerminal(snapshot.job.status)) {
      options.stopJobSnapshotPolling(snapshot.job.id);
    }
    if (options.selectedJobId.value === snapshot.job.id) {
      options.currentSnapshot.value = snapshot;
      await options.syncCurrentGroups(snapshot.job.id);
      options.syncSelectedAssetFromSnapshot();
    }
    await options.refreshWorkbenchLists();
    return snapshot;
  }

  function cancelCurrentJob() {
    return cancelJob(options.currentJob.value?.id || options.activeJobId.value || "");
  }

  return { cancelJob, cancelTask, cancelCurrentJob };
}
