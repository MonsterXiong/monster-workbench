import type { Ref } from "vue";
import { imageWorkbenchService } from "../services/image-workbench.service";
import {
  IMAGE_WORKBENCH_JOB_RUNNER_POLL_INTERVAL_MS,
  IMAGE_WORKBENCH_JOB_RUNNER_POLL_LIMIT,
  delay,
  isJobTerminal,
} from "./image-workbench-helpers";
import type { ImageWorkbenchSnapshot } from "../types/image-workbench";

type ImageWorkbenchSnapshotPollingOptions = {
  activeJobIds: Ref<string[]>;
  currentSnapshot: Ref<ImageWorkbenchSnapshot | null>;
  error: Ref<string>;
  selectedJobId: Ref<string>;
  refreshWorkbenchLists: () => Promise<void>;
  syncSelectedAssetFromSnapshot: (preferredAssetId?: string) => void;
  onJobTerminal?: (snapshot: ImageWorkbenchSnapshot) => void;
  getGenerationFailedMessage: () => string;
};

export function createImageWorkbenchSnapshotPolling(options: ImageWorkbenchSnapshotPollingOptions) {
  let tokenSeed = 0;
  const tokens = new Map<string, number>();

  function markJobActive(jobId: string) {
    if (!options.activeJobIds.value.includes(jobId)) {
      options.activeJobIds.value = [...options.activeJobIds.value, jobId];
    }
  }

  function markJobInactive(jobId: string) {
    options.activeJobIds.value = options.activeJobIds.value.filter((item) => item !== jobId);
  }

  function startJobSnapshotPolling(jobId: string) {
    const currentToken = ++tokenSeed;
    tokens.set(jobId, currentToken);
    markJobActive(jobId);
    const isCurrent = () => tokens.get(jobId) === currentToken && options.activeJobIds.value.includes(jobId);
    void (async () => {
      try {
        for (let index = 0; index < IMAGE_WORKBENCH_JOB_RUNNER_POLL_LIMIT; index += 1) {
          if (!isCurrent()) return;
          const snapshot = await imageWorkbenchService.getJobSnapshot(jobId);
          if (!isCurrent()) return;
          if (options.selectedJobId.value === jobId) {
            options.currentSnapshot.value = snapshot;
            options.syncSelectedAssetFromSnapshot();
          }
          if (isJobTerminal(snapshot.job.status)) {
            if (options.selectedJobId.value === jobId) {
              options.onJobTerminal?.(snapshot);
            }
            return;
          }
          await delay(IMAGE_WORKBENCH_JOB_RUNNER_POLL_INTERVAL_MS);
        }
        throw new Error(options.getGenerationFailedMessage());
      } catch (err) {
        if (isCurrent()) {
          options.error.value = err instanceof Error ? err.message : String(err);
        }
      } finally {
        if (!isCurrent()) return;
        tokens.delete(jobId);
        markJobInactive(jobId);
        await options.refreshWorkbenchLists();
      }
    })();
  }

  function stopJobSnapshotPolling(jobId: string) {
    tokens.delete(jobId);
    markJobInactive(jobId);
  }

  return { startJobSnapshotPolling, stopJobSnapshotPolling };
}
