import { aiService } from "./ai.service";
import { toReversedArray } from "../utils";
import type {
  AiGenerationTask,
  AiProviderBackendQueueStatus,
  AiProviderTestTask,
} from "../types/ai";

export interface AiProviderQueueSyncAdapter {
  setBackendQueueStatus: (status: AiProviderBackendQueueStatus) => void;
  syncLocalQueueWithBackendStatus: () => void;
  applyBackendTask: (task: AiProviderTestTask) => void;
  applyGenerationTask?: (task: AiGenerationTask) => void;
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

  if (adapter.applyGenerationTask) {
    const recentGenerationTasks = await aiService.listGenerationTasks();
    for (const task of toReversedArray(recentGenerationTasks)) {
      adapter.applyGenerationTask(task);
    }
  }

  adapter.updateTestingState();
  await options.afterSync?.();
}
