import { callTauri } from "./tauri";
import {
  nativeEventService,
  type TauriUnlistenFn,
} from "./native-event.service";
import { isTauriRuntime } from "./runtime";
import type {
  CreateCreativeAssetInput,
  CreateCreativeAssetLinkInput,
  CreateCreativeGoalInput,
  CreateCreativeTaskInput,
  CreateGoalMultiAgentStubInput,
  CreateTaskEventInput,
  CreativeAsset,
  CreativeAssetLink,
  CreativeGoal,
  CreativeGoalStatusSnapshot,
  CreativeTask,
  CreativeTaskEventPayload,
  GenerateImagePromptWorkflowInput,
  GenerateImagePromptWorkflowResult,
  GoalMultiAgentStubResult,
  ListCreativeAssetLinksFilter,
  ListCreativeAssetsFilter,
  ListCreativeGoalsFilter,
  ListCreativeTasksFilter,
  ReviewAssetQualityStubInput,
  ReviewAssetQualityStubResult,
  TaskEvent,
  UpdateCreativeTaskStatusInput,
} from "./task.service";

export type {
  CreateCreativeAssetInput,
  CreateCreativeAssetLinkInput,
  CreateCreativeGoalInput,
  CreateCreativeTaskInput,
  CreateGoalMultiAgentStubInput,
  CreateTaskEventInput,
  CreativeAsset,
  CreativeAssetLink,
  CreativeGoal,
  CreativeGoalStatusSnapshot,
  CreativeTask,
  CreativeTaskEventPayload,
  GenerateImagePromptWorkflowInput,
  GenerateImagePromptWorkflowResult,
  GoalMultiAgentStubResult,
  ListCreativeAssetLinksFilter,
  ListCreativeAssetsFilter,
  ListCreativeGoalsFilter,
  ListCreativeTasksFilter,
  ReviewAssetQualityStubInput,
  ReviewAssetQualityStubResult,
  ReviewResultPayload,
  TaskEvent,
  UpdateCreativeTaskStatusInput,
  CreativeGoalRole,
} from "./task.service";

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
  createCreativeAsset: (input: CreateCreativeAssetInput) =>
    callTauri<CreativeAsset>("create_creative_asset", { input }),
  listCreativeAssets: (filter: ListCreativeAssetsFilter = {}) =>
    callTauri<CreativeAsset[]>("list_creative_assets", { filter }),
  createCreativeAssetLink: (input: CreateCreativeAssetLinkInput) =>
    callTauri<CreativeAssetLink>("create_asset_link", { input }),
  listCreativeAssetLinks: (filter: ListCreativeAssetLinksFilter = {}) =>
    callTauri<CreativeAssetLink[]>("list_asset_links", { filter }),
  createCreativeGoal: (input: CreateCreativeGoalInput) =>
    callTauri<CreativeGoal>("create_creative_goal", { input }),
  listCreativeGoals: (filter: ListCreativeGoalsFilter = {}) =>
    callTauri<CreativeGoal[]>("list_creative_goals", { filter }),
  createGoalMultiAgentStub: (input: CreateGoalMultiAgentStubInput) =>
    callTauri<GoalMultiAgentStubResult>("create_goal_multi_agent_stub", { input }),
  getGoalStatus: (goalId: number) =>
    callTauri<CreativeGoalStatusSnapshot>("get_goal_status", { goalId }),
  stopCreativeGoal: (goalId: number) =>
    callTauri<CreativeGoalStatusSnapshot>("stop_creative_goal", { goalId }),
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
