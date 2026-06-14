import { isTauriRuntime } from "./runtime";
import { callTauri, convertFileSrc } from "./tauri";
import { includesAllText, sleep, stringifyErrorMessage, toError, tryJsonParseObject } from "../utils";
import type {
  AiBusinessGenerationRequest,
  AiGenerationArtifact,
  AiGenerationRequest,
  AiGenerationResult,
  AiGenerationTask,
  AiProviderBackendQueueStatus,
  AiProviderConfig,
  AiProviderTestAction,
  AiProviderTestResult,
  AiProviderTestTask,
} from "../types/ai";

const AI_PROVIDER_TEST_FAILED = "\u0041\u0049 \u6a21\u578b\u6d4b\u8bd5\u5931\u8d25";
const AI_BUSINESS_GENERATION_POLL_INTERVAL_MS = 600;
const AI_BUSINESS_GENERATION_POLL_TIMEOUT_MS = 30 * 60_000;

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

function normalizeAiArtifact(artifact: AiGenerationArtifact): AiGenerationArtifact {
  if (artifact.path && !artifact.url) {
    return {
      ...artifact,
      url: convertFileSrc(artifact.path),
    };
  }
  return artifact;
}

function normalizeAiGenerationResult(result: AiGenerationResult): AiGenerationResult {
  return {
    ...result,
    artifacts: (result.artifacts || []).map(normalizeAiArtifact),
  };
}

function normalizeAiGenerationTask(task: AiGenerationTask): AiGenerationTask {
  if (!task.result) {
    return task;
  }

  return {
    ...task,
    result: normalizeAiGenerationResult(task.result),
  };
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

function isGenerationTaskTerminal(task: AiGenerationTask) {
  return task.status === "success" || task.status === "failed" || task.status === "canceled";
}

function generationTaskToResultOrError(task: AiGenerationTask): AiGenerationResult {
  if (task.result) {
    return normalizeAiGenerationResult(task.result);
  }

  if (task.status === "canceled") {
    throw new Error(task.error || "AI generation task canceled");
  }

  throw new Error(task.error || "AI generation task finished without result");
}

function canCallRuntimeCommand() {
  return isTauriRuntime() || import.meta.env.DEV;
}

export const aiService = {
  async generateDirectContent(request: AiGenerationRequest): Promise<AiGenerationResult> {
    try {
      const result = await callTauri<AiGenerationResult>("generate_ai_content", { request });
      return normalizeAiGenerationResult(result);
    } catch (err) {
      const message = stringifyErrorMessage(err);
      if (includesAllText(message, ["generate_ai_content", "not found"])) {
        throw new Error("[ERR_AI_COMMAND_MISSING] AI 原子能力命令未注册，请重启 Tauri 开发进程后重试");
      }
      throw normalizeAiError(err);
    }
  },

  async generateBusinessContent(request: AiBusinessGenerationRequest): Promise<AiGenerationResult> {
    try {
      const result = await callTauri<AiGenerationResult>("generate_ai_business_content", { request });
      return normalizeAiGenerationResult(result);
    } catch (err) {
      const message = stringifyErrorMessage(err);
      if (includesAllText(message, ["generate_ai_business_content", "not found"])) {
        throw new Error("[ERR_AI_COMMAND_MISSING] AI 业务生成命令未注册，请重启 Tauri 开发进程后重试");
      }
      throw normalizeAiError(err);
    }
  },

  async enqueueBusinessGeneration(request: AiBusinessGenerationRequest): Promise<AiGenerationTask> {
    try {
      const task = await callTauri<AiGenerationTask>("enqueue_ai_business_generation", { request });
      return normalizeAiGenerationTask(task);
    } catch (err) {
      const message = stringifyErrorMessage(err);
      if (includesAllText(message, ["enqueue_ai_business_generation", "not found"])) {
        throw new Error("[ERR_AI_COMMAND_MISSING] AI 业务生成任务命令未注册，请重启 Tauri 开发进程后重试");
      }
      throw normalizeAiError(err);
    }
  },

  async getGenerationTask(requestId: string): Promise<AiGenerationTask> {
    return normalizeAiGenerationTask(await callTauri<AiGenerationTask>("get_ai_generation_task", { requestId }));
  },

  async runBusinessGenerationTask(
    request: AiBusinessGenerationRequest,
    options: {
      pollIntervalMs?: number;
      pollTimeoutMs?: number;
      onTask?: (task: AiGenerationTask) => unknown | Promise<unknown>;
    } = {}
  ): Promise<AiGenerationResult> {
    const task = await this.enqueueBusinessGeneration(request);
    await options.onTask?.(task);
    if (isGenerationTaskTerminal(task)) {
      return generationTaskToResultOrError(task);
    }

    const startedAt = Date.now();
    const pollIntervalMs = options.pollIntervalMs ?? AI_BUSINESS_GENERATION_POLL_INTERVAL_MS;
    const pollTimeoutMs = options.pollTimeoutMs ?? AI_BUSINESS_GENERATION_POLL_TIMEOUT_MS;

    for (;;) {
      if (Date.now() - startedAt > pollTimeoutMs) {
        await this.cancelGeneration(task.requestId).catch(() => undefined);
        throw new Error("AI generation task polling timed out");
      }

      await sleep(pollIntervalMs);
      const nextTask = await this.getGenerationTask(task.requestId);
      await options.onTask?.(nextTask);
      if (isGenerationTaskTerminal(nextTask)) {
        return generationTaskToResultOrError(nextTask);
      }
    }
  },

  async listGenerationTasks(): Promise<AiGenerationTask[]> {
    if (!canCallRuntimeCommand()) {
      return [];
    }

    const tasks = await callTauri<AiGenerationTask[]>("list_ai_generation_tasks");
    return tasks.map((task) => normalizeAiGenerationTask(task));
  },

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
    if (!canCallRuntimeCommand()) {
      return [];
    }

    const tasks = await callTauri<AiProviderTestTask[]>("list_ai_provider_test_tasks");
    return tasks.map((task) => normalizeAiTask(task));
  },

  async getProviderQueueStatus(): Promise<AiProviderBackendQueueStatus> {
    if (!canCallRuntimeCommand()) {
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

  async cancelGeneration(requestId: string): Promise<boolean> {
    return await callTauri<boolean>("cancel_ai_generation_task", { requestId });
  },
};
