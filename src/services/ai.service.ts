import { isTauriRuntime } from "./runtime";
import { callTauri, convertFileSrc } from "./tauri";
import { includesAllText, stringifyErrorMessage, toError, tryJsonParseObject } from "../utils";
import type {
  AiProviderBackendQueueStatus,
  AiProviderConfig,
  AiProviderTestAction,
  AiProviderTestResult,
  AiProviderTestTask,
} from "../types/ai";

const AI_PROVIDER_TEST_FAILED = "\u0041\u0049 \u6a21\u578b\u6d4b\u8bd5\u5931\u8d25";

function normalizeAiError(err: unknown): Error {
  const message = stringifyErrorMessage(err);
  const parsed = tryJsonParseObject<{ message?: unknown; detail?: unknown }>(message);

  if (parsed.ok && parsed.data) {
    const detail = typeof parsed.data.detail === "string" ? `: ${parsed.data.detail}` : "";
    const summary = typeof parsed.data.message === "string" ? parsed.data.message : AI_PROVIDER_TEST_FAILED;
    return new Error(`[ERR_AI_PROVIDER_TEST] ${summary}${detail}`);
  }

  return toError(err, message);
}

function normalizeAiResultImages(result: AiProviderTestResult): AiProviderTestResult {
  if (result.imagePaths?.length) {
    return {
      ...result,
      imageUrls: result.imagePaths.map((path) => convertFileSrc(path)),
    };
  }
  return result;
}

function normalizeAiTask(task: AiProviderTestTask): AiProviderTestTask {
  if (!task.result) {
    return task;
  }

  return {
    ...task,
    result: normalizeAiResultImages(task.result),
  };
}

export const aiService = {
  async testProvider(config: AiProviderConfig, action: AiProviderTestAction): Promise<AiProviderTestResult> {
    try {
      const result = await callTauri<AiProviderTestResult>("test_ai_provider", { config, action });
      return normalizeAiResultImages(result);
    } catch (err) {
      const message = stringifyErrorMessage(err);
      if (includesAllText(message, ["test_ai_provider", "not found"])) {
        throw new Error("[ERR_AI_COMMAND_MISSING] \u0041\u0049 \u6a21\u578b\u6d4b\u8bd5\u547d\u4ee4\u672a\u6ce8\u518c\uff0c\u8bf7\u91cd\u542f Tauri \u5f00\u53d1\u8fdb\u7a0b\u540e\u91cd\u8bd5");
      }
      throw normalizeAiError(err);
    }
  },

  async enqueueProviderTest(config: AiProviderConfig, action: AiProviderTestAction): Promise<AiProviderTestTask> {
    try {
      const task = await callTauri<AiProviderTestTask>("enqueue_ai_provider_test", { config, action });
      return normalizeAiTask(task);
    } catch (err) {
      const message = stringifyErrorMessage(err);
      if (includesAllText(message, ["enqueue_ai_provider_test", "not found"])) {
        throw new Error("[ERR_AI_COMMAND_MISSING] \u0041\u0049 \u6a21\u578b\u6d4b\u8bd5\u961f\u5217\u547d\u4ee4\u672a\u6ce8\u518c\uff0c\u8bf7\u91cd\u542f Tauri \u5f00\u53d1\u8fdb\u7a0b\u540e\u91cd\u8bd5");
      }
      throw normalizeAiError(err);
    }
  },

  async getProviderTestTask(requestId: string): Promise<AiProviderTestTask> {
    return normalizeAiTask(await callTauri<AiProviderTestTask>("get_ai_provider_test_task", { requestId }));
  },

  async listProviderTestTasks(): Promise<AiProviderTestTask[]> {
    if (!isTauriRuntime()) {
      return [];
    }

    const tasks = await callTauri<AiProviderTestTask[]>("list_ai_provider_test_tasks");
    return tasks.map((task) => normalizeAiTask(task));
  },

  async getProviderQueueStatus(): Promise<AiProviderBackendQueueStatus> {
    if (!isTauriRuntime()) {
      return {
        running: null,
        runningItems: [],
        queued: [],
        pendingCount: 0,
        queueLimit: 16,
        runningCount: 0,
        runningLimit: 6,
        availableRunningSlots: 6,
        availableSlots: 16,
        isSaturated: false,
        waitTimeoutMs: 90000,
      };
    }

    return await callTauri<AiProviderBackendQueueStatus>("get_ai_provider_queue_status");
  },

  async cancelProviderQueuedTests(): Promise<number> {
    return await callTauri<number>("cancel_ai_provider_queued_tests");
  },

  async cancelProviderTestTask(requestId: string): Promise<boolean> {
    return await callTauri<boolean>("cancel_ai_provider_test_task", { requestId });
  },
};
