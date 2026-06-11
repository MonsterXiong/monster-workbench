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
  providerConfig?: BatchPromptProviderConfigInput | null;
}

export interface BatchPromptProviderConfigInput {
  provider: string;
  displayName: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number | null;
  queueMode?: string | null;
  maxConcurrency?: number | null;
  queueKey?: string | null;
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
