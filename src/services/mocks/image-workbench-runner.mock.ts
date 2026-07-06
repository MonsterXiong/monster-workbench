import { handleAiProviderMock } from "./ai-provider.mock";
import { parseMockReferenceAssetIds } from "./image-workbench-prompt.mock";

type MockTaskMap = Map<string, any>;
type MockJobMap = Map<string, any>;

interface MockImageWorkbenchRunnerContext {
  jobId: string;
  jobs: MockJobMap;
  tasks: MockTaskMap;
  getSnapshot: (jobId: string) => any;
  isActiveJob: (job: any) => boolean;
  updateTaskStatus: (args: Record<string, unknown>) => unknown;
  recordTaskAsset: (args: Record<string, unknown>) => unknown;
}

const MOCK_IMAGE_WORKBENCH_JOB_WORKER_LIMIT = 4;

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function callMockAiProvider<T>(command: string, args: Record<string, unknown>) {
  const result = handleAiProviderMock(command, args);
  if (!result.handled) {
    throw new Error(`[ERR_IPC_BROWSER] Unsupported mock AI provider command: ${command}`);
  }
  return (await result.value) as T;
}

export function cancelMockAiGenerationTask(requestId: string) {
  handleAiProviderMock("cancel_ai_generation_task", { requestId });
}

function isMockGenerationTaskTerminal(task: any) {
  return ["success", "failed", "canceled"].includes(String(task?.status || ""));
}

async function waitMockAiGenerationTask(
  requestId: string,
  imageTaskId: string,
  tasks: MockTaskMap
) {
  for (;;) {
    const current = tasks.get(imageTaskId);
    if (!current || current.status === "cancelled") {
      cancelMockAiGenerationTask(requestId);
      return {
        requestId,
        status: "canceled",
        error: "用户取消",
        result: null,
      };
    }

    const task = await callMockAiProvider<any>("get_ai_generation_task", { requestId });
    if (isMockGenerationTaskTerminal(task)) {
      return task;
    }
    await delay(200);
  }
}

export async function runMockImageWorkbenchJob(context: MockImageWorkbenchRunnerContext) {
  const snapshot = context.getSnapshot(context.jobId);
  const tasks = snapshot.tasks.filter((task: any) => ["queued", "retrying"].includes(task.status));
  let nextTaskIndex = 0;
  const workerCount = Math.min(MOCK_IMAGE_WORKBENCH_JOB_WORKER_LIMIT, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    for (;;) {
      const task = tasks[nextTaskIndex++];
      if (!task) {
        break;
      }
      if (!context.isActiveJob(context.jobs.get(context.jobId))) {
        break;
      }
      const current = context.tasks.get(task.id);
      if (!current || !["queued", "retrying"].includes(current.status)) {
        continue;
      }
      context.updateTaskStatus({
        request: {
          taskId: task.id,
          status: "running",
        },
      });

      try {
        const job = context.jobs.get(context.jobId);
        const size = job?.size || "1024x1024";
        await callMockAiProvider("enqueue_ai_business_generation", {
          request: {
            capability: job?.mode || "txt2img",
            providerConfigId: job?.providerConfigId || null,
            prompt: task.prompt || job?.prompt || "",
            model: job?.model || "mock-image-1",
            requestId: task.id,
            options: {
              size,
              count: 1,
              referenceAssetIds: parseMockReferenceAssetIds(job?.referenceAssetIdsJson),
              referenceImagePath: job?.sourceImagePath || null,
              sourceAssetId: job?.sourceAssetId || null,
              sourceImagePath: job?.sourceImagePath || null,
              maskPath: job?.maskPath || null,
              personContextJson: job?.personContextJson || null,
              scale: job?.upscaleScale || null,
              fallbackMode: job?.fallbackPolicy || null,
            },
          },
        });
        const generationTask = await waitMockAiGenerationTask(task.id, task.id, context.tasks);
        const generationResult = generationTask.result;
        const latestTask = context.tasks.get(task.id);
        if (!latestTask || latestTask.status === "cancelled") {
          cancelMockAiGenerationTask(task.id);
          continue;
        }
        if (generationTask.status === "canceled") {
          if (latestTask.status !== "cancelled") {
            context.updateTaskStatus({
              request: {
                taskId: task.id,
                status: "cancelled",
                error: generationTask.error || "用户取消",
                modelRun: {
                  provider: generationResult?.provider || "custom",
                  model: generationResult?.model || job?.model || "mock-image-1",
                  capability: job?.mode || "txt2img",
                  status: "cancelled",
                  error: generationTask.error || "用户取消",
                },
              },
            });
          }
          continue;
        }
        if (generationTask.status !== "success" || !generationResult?.ok) {
          context.updateTaskStatus({
            request: {
              taskId: task.id,
              status: "failed",
              error: generationTask.error || generationResult?.message || "AI generation failed",
              modelRun: {
                provider: generationResult?.provider || "custom",
                model: generationResult?.model || job?.model || "mock-image-1",
                capability: job?.mode || "txt2img",
                status: "failed",
                latencyMs: generationResult?.latencyMs || null,
                requestJson: JSON.stringify({ mode: job?.mode || "txt2img", size, count: 1 }),
                responsePreview: generationResult?.rawPreview || null,
                error: generationTask.error || generationResult?.message || "AI generation failed",
              },
            },
          });
          continue;
        }
        const artifact = (generationResult.artifacts || []).find((item: any) => item.kind === "image" && item.path);
        if (!artifact?.path) {
          context.updateTaskStatus({
            request: {
              taskId: task.id,
              status: "failed",
              error: "AI generation returned no local image artifact",
              modelRun: {
                provider: generationResult.provider || "custom",
                model: generationResult.model || job?.model || "mock-image-1",
                capability: job?.mode || "txt2img",
                status: "failed",
                latencyMs: generationResult.latencyMs || null,
                requestJson: JSON.stringify({ mode: job?.mode || "txt2img", size, count: 1 }),
                responsePreview: generationResult.rawPreview || null,
                error: "AI generation returned no local image artifact",
              },
            },
          });
          continue;
        }
        const [widthText, heightText] = String(artifact.dimensions || size).split("x");
        context.recordTaskAsset({
          request: {
            taskId: task.id,
            filePath: artifact.path,
            thumbnailPath: null,
            width: Number(widthText) || 1024,
            height: Number(heightText) || 1024,
            mimeType: artifact.mimeType || "image/png",
            sizeBytes: artifact.sizeBytes || 0,
            metadata: {
              originalPrompt: job?.prompt || task.prompt || "",
              expandedPrompt: task.prompt || job?.prompt || "",
              negativePrompt: job?.negativePrompt || null,
              model: generationResult.model || job?.model || "mock-image-1",
              mode: job?.mode || "txt2img",
              referenceAssetIdsJson: job?.referenceAssetIdsJson || null,
              maskPath: job?.maskPath || null,
              personContextJson: job?.personContextJson || null,
              provider: generationResult.provider || "custom",
            },
            modelRun: {
              provider: generationResult.provider || "custom",
              model: generationResult.model || job?.model || "mock-image-1",
              capability: job?.mode || "txt2img",
              status: "succeeded",
              latencyMs: generationResult.latencyMs || null,
              requestJson: JSON.stringify({ mode: job?.mode || "txt2img", size, count: 1 }),
              responsePreview: generationResult.rawPreview || null,
            },
          },
        });
        context.updateTaskStatus({
          request: {
            taskId: task.id,
            status: "succeeded",
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const currentTask = context.tasks.get(task.id);
        if (currentTask && !["succeeded", "failed", "cancelled"].includes(currentTask.status)) {
          context.updateTaskStatus({
            request: {
              taskId: task.id,
              status: "failed",
              error: message,
              modelRun: {
                provider: "custom",
                model: snapshot.job.model || "mock-image-1",
                capability: snapshot.job.mode || "txt2img",
                status: "failed",
                error: message,
              },
            },
          });
        }
      }
    }
  }));
}
