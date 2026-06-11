import { callTauri } from "./tauri";
import {
  nativeEventService,
  type TauriUnlistenFn,
} from "./native-event.service";
import { isTauriRuntime } from "./runtime";
import type {
  CreateCreativeTaskInput,
  CreateTaskEventInput,
  CreativeTask,
  CreativeTaskEventPayload,
  GenerateImagePromptWorkflowInput,
  GenerateImagePromptWorkflowResult,
  ListCreativeTasksFilter,
  ReviewAssetQualityStubInput,
  ReviewAssetQualityStubResult,
  UpdateCreativeTaskStatusInput,
  TaskEvent,
} from "./creative-types";

export type {
  CreateCreativeTaskInput,
  CreateTaskEventInput,
  CreativeTask,
  CreativeTaskEventPayload,
  GenerateImagePromptWorkflowInput,
  GenerateImagePromptWorkflowResult,
  ListCreativeTasksFilter,
  ReviewAssetQualityStubInput,
  ReviewAssetQualityStubResult,
  TaskEvent,
  UpdateCreativeTaskStatusInput,
} from "./creative-types";

function listenBrowserEvent<T>(
  eventName: string,
  callback: (payload: T) => void
): TauriUnlistenFn {
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<T>;
    callback(customEvent.detail);
  };
  window.addEventListener(eventName, listener as EventListener);
  return async () => {
    window.removeEventListener(eventName, listener as EventListener);
  };
}

async function listenCreativeTaskEvent(
  eventName: string,
  callback: (payload: CreativeTaskEventPayload) => void
): Promise<TauriUnlistenFn | null> {
  if (!isTauriRuntime()) {
    return listenBrowserEvent<CreativeTaskEventPayload>(eventName, callback);
  }

  return nativeEventService.listenEvent<CreativeTaskEventPayload>(
    eventName,
    (event) => callback(event.payload)
  );
}

export const creativeTaskService = {
  listenCreativeTaskCreated: (callback: (payload: CreativeTaskEventPayload) => void) =>
    listenCreativeTaskEvent("creative-task-created", callback),
  listenCreativeTaskStatusChanged: (
    callback: (payload: CreativeTaskEventPayload) => void
  ) => listenCreativeTaskEvent("creative-task-status-changed", callback),
  listenCreativeTaskEvent: (callback: (payload: CreativeTaskEventPayload) => void) =>
    listenCreativeTaskEvent("creative-task-event", callback),
  createCreativeTask: (input: CreateCreativeTaskInput) =>
    callTauri<CreativeTask>("create_creative_task", { input }),
  getCreativeTask: (id: number) =>
    callTauri<CreativeTask | null>("get_creative_task", { id }),
  listCreativeTasks: (filter: ListCreativeTasksFilter = {}) =>
    callTauri<CreativeTask[]>("list_creative_tasks", { filter }),
  updateCreativeTaskStatus: (input: UpdateCreativeTaskStatusInput) =>
    callTauri<CreativeTask>("update_creative_task_status", { input }),
  appendTaskEvent: (input: CreateTaskEventInput) =>
    callTauri<TaskEvent>("append_task_event", { input }),
  runGenerateImagePromptWorkflow: (input: GenerateImagePromptWorkflowInput) =>
    callTauri<GenerateImagePromptWorkflowResult>(
      "run_generate_image_prompt_workflow",
      { input }
    ),
  runReviewAssetQualityStub: (input: ReviewAssetQualityStubInput) =>
    callTauri<ReviewAssetQualityStubResult>("run_review_asset_quality_stub", {
      input,
    }),
};
