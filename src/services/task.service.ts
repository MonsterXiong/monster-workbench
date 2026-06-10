import { callTauri } from "./tauri";
import {
  nativeEventService,
  type TauriUnlistenFn,
} from "./native-event.service";
import { isTauriRuntime } from "./runtime";

export interface TaskProgressPayload {
  task_id: string;
  task_name: string;
  progress: number;
  status: string;
  message: string;
}

export interface CreativeTask {
  id: number;
  projectId: string | null;
  goalId: number | null;
  batchJobId: number | null;
  taskType: string;
  status: string;
  priority: number;
  payloadJson: string | null;
  resultJson: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  parentTaskId: number | null;
  assetId: number | null;
  sequenceNo: number | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface CreateCreativeTaskInput {
  projectId?: string | null;
  goalId?: number | null;
  batchJobId?: number | null;
  taskType: string;
  status?: string | null;
  priority?: number | null;
  payloadJson?: string | null;
  maxRetries?: number | null;
  parentTaskId?: number | null;
  assetId?: number | null;
  sequenceNo?: number | null;
}

export interface ListCreativeTasksFilter {
  projectId?: string | null;
  status?: string | null;
  taskType?: string | null;
  goalId?: number | null;
  batchJobId?: number | null;
  limit?: number | null;
  offset?: number | null;
}

export interface UpdateCreativeTaskStatusInput {
  id: number;
  status: string;
  resultJson?: string | null;
  errorMessage?: string | null;
  assetId?: number | null;
  retryCountIncrement?: number | null;
}

export interface TaskEvent {
  id: number;
  taskId: number;
  eventType: string;
  message: string | null;
  payloadJson: string | null;
  createdAt: string;
}

export interface CreateTaskEventInput {
  taskId: number;
  eventType: string;
  message?: string | null;
  payloadJson?: string | null;
}

export interface CreativeAsset {
  id: number;
  projectId: string | null;
  assetType: string;
  title: string | null;
  content: string | null;
  filePath: string | null;
  thumbnailPath: string | null;
  metadataJson: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCreativeAssetInput {
  projectId?: string | null;
  assetType: string;
  title?: string | null;
  content?: string | null;
  filePath?: string | null;
  thumbnailPath?: string | null;
  metadataJson?: string | null;
  status?: string | null;
}

export interface ListCreativeAssetsFilter {
  projectId?: string | null;
  assetType?: string | null;
  status?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface CreativeAssetLink {
  id: number;
  sourceAssetId: number;
  targetAssetId: number;
  linkType: string;
  createdAt: string;
}

export interface CreateCreativeAssetLinkInput {
  sourceAssetId: number;
  targetAssetId: number;
  linkType: string;
}

export interface ListCreativeAssetLinksFilter {
  sourceAssetId?: number | null;
  targetAssetId?: number | null;
  linkType?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface CreativeGoal {
  id: number;
  projectId: string | null;
  title: string;
  description: string | null;
  status: string;
  budgetJson: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  stoppedAt: string | null;
}

export interface CreateCreativeGoalInput {
  projectId?: string | null;
  title: string;
  description?: string | null;
  status?: string | null;
  budgetJson?: string | null;
}

export interface ListCreativeGoalsFilter {
  projectId?: string | null;
  status?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface CreativeGoalRole {
  id: number;
  goalId: number;
  roleKey: string;
  taskType: string;
  description: string | null;
  taskCount: number;
  budgetJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalAgentRoleSpecInput {
  roleKey: string;
  taskType: string;
  description?: string | null;
  taskCount?: number | null;
  budgetJson?: string | null;
}

export interface CreateGoalMultiAgentStubInput {
  projectId?: string | null;
  title: string;
  description?: string | null;
  budgetJson?: string | null;
  roleSpecs: GoalAgentRoleSpecInput[];
  mergeTaskType?: string | null;
}

export interface GoalMultiAgentStubResult {
  goal: CreativeGoal;
  roles: CreativeGoalRole[];
  tasks: CreativeTask[];
  mergeTask: CreativeTask | null;
}

export interface CreativeGoalStatusSnapshot {
  goal: CreativeGoal;
  roles: CreativeGoalRole[];
  tasks: CreativeTask[];
  totalTasks: number;
  queuedTasks: number;
  runningTasks: number;
  succeededTasks: number;
  failedTasks: number;
  cancelledTasks: number;
}

export interface CreativeBatchJob {
  id: number;
  projectId: string | null;
  name: string;
  batchType: string;
  status: string;
  totalCount: number;
  concurrency: number;
  maxRetries: number;
  promptTemplate: string | null;
  providerId: string | null;
  model: string | null;
  imageSize: string | null;
  budgetJson: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface CreativeBatchJobStats {
  totalTasks: number;
  draftTasks: number;
  queuedTasks: number;
  runningTasks: number;
  succeededTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  cancellingTasks: number;
  paused: boolean;
  completionRatio: number;
}

export interface CreativeBatchJobSnapshot {
  job: CreativeBatchJob;
  stats: CreativeBatchJobStats;
}

export interface CreateBatchImageJobInput {
  projectId?: string | null;
  name: string;
  batchType?: string | null;
  totalCount?: number | null;
  concurrency?: number | null;
  maxRetries?: number | null;
  promptTemplate?: string | null;
  providerId?: string | null;
  model?: string | null;
  imageSize?: string | null;
  budgetJson?: string | null;
}

export interface ListCreativeBatchJobsFilter {
  projectId?: string | null;
  status?: string | null;
  batchType?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface CreativeBatchJobEventPayload {
  batchJobId: number;
  projectId: string | null;
  batchType: string;
  status: string;
  totalTasks: number;
  queuedTasks: number;
  runningTasks: number;
  succeededTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  createdAt: string;
  message: string | null;
}

export interface CreativeTaskEventPayload {
  taskId: number;
  projectId: string | null;
  status: string;
  message: string | null;
  createdAt: string;
}

export interface GenerateImagePromptWorkflowInput {
  projectId?: string | null;
  brief: string;
  style?: string | null;
  mood?: string | null;
  aspectRatio?: string | null;
}

export interface GenerateImagePromptWorkflowResult {
  task: CreativeTask;
  asset: CreativeAsset;
  events: TaskEvent[];
}

export interface ReviewAssetQualityStubInput {
  projectId?: string | null;
  sourceAssetId: number;
  sourceTaskId?: number | null;
  reviewKind?: string | null;
  contentHint?: string | null;
}

export interface ReviewResultPayload {
  pass: boolean;
  qualityScore: number;
  problems: string[];
  revisionInstruction: string;
  manualApprovalStatus: string;
  reviewKind: string;
  sourceAssetId: number;
  sourceTaskId: number | null;
}

export interface ReviewAssetQualityStubResult {
  task: CreativeTask;
  reviewAsset: CreativeAsset;
  reviseTask: CreativeTask | null;
  events: TaskEvent[];
}

function listenBrowserEvent(
  eventName: string,
  callback: (payload: CreativeTaskEventPayload) => void
): TauriUnlistenFn {
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<CreativeTaskEventPayload>;
    callback(customEvent.detail);
  };
  window.addEventListener(eventName, listener as EventListener);
  return async () => {
    window.removeEventListener(eventName, listener as EventListener);
  };
}

async function listenTaskProgress(
  callback: (payload: TaskProgressPayload) => void
): Promise<TauriUnlistenFn | null> {
  return nativeEventService.listenEvent<TaskProgressPayload>(
    "task-progress",
    (event) => callback(event.payload)
  );
}

async function listenCreativeTaskEvent(
  eventName: string,
  callback: (payload: CreativeTaskEventPayload) => void
): Promise<TauriUnlistenFn | null> {
  if (!isTauriRuntime()) {
    return listenBrowserEvent(eventName, callback);
  }

  return nativeEventService.listenEvent<CreativeTaskEventPayload>(
    eventName,
    (event) => callback(event.payload)
  );
}

async function listenCreativeBatchEvent(
  eventName: string,
  callback: (payload: CreativeBatchJobEventPayload) => void
): Promise<TauriUnlistenFn | null> {
  if (!isTauriRuntime()) {
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<CreativeBatchJobEventPayload>;
      callback(customEvent.detail);
    };
    window.addEventListener(eventName, listener as EventListener);
    return async () => {
      window.removeEventListener(eventName, listener as EventListener);
    };
  }

  return nativeEventService.listenEvent<CreativeBatchJobEventPayload>(
    eventName,
    (event) => callback(event.payload)
  );
}

export const taskService = {
  listenTaskProgress,
  listenCreativeTaskCreated: (callback: (payload: CreativeTaskEventPayload) => void) =>
    listenCreativeTaskEvent("creative-task-created", callback),
  listenCreativeTaskStatusChanged: (
    callback: (payload: CreativeTaskEventPayload) => void
  ) => listenCreativeTaskEvent("creative-task-status-changed", callback),
  listenCreativeTaskEvent: (callback: (payload: CreativeTaskEventPayload) => void) =>
    listenCreativeTaskEvent("creative-task-event", callback),
  listenBatchJobCreated: (callback: (payload: CreativeBatchJobEventPayload) => void) =>
    listenCreativeBatchEvent("batch-job-created", callback),
  listenBatchJobStatusChanged: (
    callback: (payload: CreativeBatchJobEventPayload) => void
  ) => listenCreativeBatchEvent("batch-job-status-changed", callback),
  listenBatchJobProgress: (callback: (payload: CreativeBatchJobEventPayload) => void) =>
    listenCreativeBatchEvent("batch-job-progress", callback),
  createBatchImageJob: (input: CreateBatchImageJobInput) =>
    callTauri<CreativeBatchJobSnapshot>("create_batch_image_job", { input }),
  listBatchJobs: (filter: ListCreativeBatchJobsFilter = {}) =>
    callTauri<CreativeBatchJob[]>("list_batch_jobs", { filter }),
  getBatchJob: (batchJobId: number) =>
    callTauri<CreativeBatchJobSnapshot>("get_batch_job", { batchJobId }),
  startBatchJob: (batchJobId: number) =>
    callTauri<CreativeBatchJobSnapshot>("start_batch_job", { batchJobId }),
  pauseBatchJob: (batchJobId: number) =>
    callTauri<CreativeBatchJobSnapshot>("pause_batch_job", { batchJobId }),
  resumeBatchJob: (batchJobId: number) =>
    callTauri<CreativeBatchJobSnapshot>("resume_batch_job", { batchJobId }),
  cancelBatchJob: (batchJobId: number) =>
    callTauri<CreativeBatchJobSnapshot>("cancel_batch_job", { batchJobId }),
  listBatchJobTasks: (
    batchJobId: number,
    limit?: number | null,
    offset?: number | null
  ) => callTauri<CreativeTask[]>("list_batch_job_tasks", { batchJobId, limit, offset }),
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
