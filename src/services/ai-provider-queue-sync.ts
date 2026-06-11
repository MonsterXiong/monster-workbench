import { aiService } from "./ai.service";
import { toReversedArray } from "../utils";
import type {
  AiProviderBackendQueueStatus,
  AiProviderTestTask,
} from "../types/ai";

export interface AiProviderQueueSyncAdapter {
  setBackendQueueStatus: (status: AiProviderBackendQueueStatus) => void;
  syncLocalQueueWithBackendStatus: () => void;
  applyBackendTask: (task: AiProviderTestTask) => void;
  updateTestingState: () => void;
}

export async function syncAiProviderBackendQueue(
  adapter: AiProviderQueueSyncAdapter,
  options: {
    afterSync?: () => void | Promise<void>;
  } = {}
) {
  adapter.setBackendQueueStatus(await aiService.getProviderQueueStatus());
  adapter.syncLocalQueueWithBackendStatus();

  const recentTasks = await aiService.listProviderTestTasks();
  for (const task of toReversedArray(recentTasks)) {
    adapter.applyBackendTask(task);
  }

  adapter.updateTestingState();
  await options.afterSync?.();
}
