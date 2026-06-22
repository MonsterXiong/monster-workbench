export type ImageWorkbenchMode =
  | "txt2img"
  | "img2img"
  | "inpaint"
  | "person_consistency"
  | "upscale_2x"
  | "upscale_4x";
export type ImageWorkbenchJobStatus =
  | "draft"
  | "queued"
  | "running"
  | "validating"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "partial_succeeded";
export type ImageWorkbenchTaskStatus =
  | "queued"
  | "running"
  | "validating"
  | "retrying"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface ImageWorkbenchJob {
  id: string;
  mode: ImageWorkbenchMode;
  status: ImageWorkbenchJobStatus;
  prompt: string;
  negativePrompt?: string | null;
  quantity: number;
  providerConfigId?: string | null;
  model?: string | null;
  size?: string | null;
  referenceAssetIdsJson?: string | null;
  sourceAssetId?: string | null;
  sourceImagePath?: string | null;
  maskPath?: string | null;
  personContextJson?: string | null;
  upscaleScale?: number | null;
  fallbackPolicy?: string | null;
  createdAtMs: number;
  updatedAtMs: number;
  queuedAtMs?: number | null;
  startedAtMs?: number | null;
  finishedAtMs?: number | null;
  error?: string | null;
}

export interface ImageWorkbenchTask {
  id: string;
  jobId: string;
  queueIndex: number;
  status: ImageWorkbenchTaskStatus;
  retryCount: number;
  maxRetries: number;
  claimToken?: string | null;
  leasedUntilMs?: number | null;
  prompt?: string | null;
  createdAtMs: number;
  updatedAtMs: number;
  startedAtMs?: number | null;
  finishedAtMs?: number | null;
  error?: string | null;
  groupId?: string | null;
  variantIndex?: number | null;
  failureType?: string | null;
  failureHint?: string | null;
}

export interface ImageWorkbenchAsset {
  id: string;
  jobId: string;
  taskId: string;
  filePath: string;
  thumbnailPath?: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  favorite: boolean;
  createdAtMs: number;
  groupId?: string | null;
  rating?: number | null;
  parentAssetId?: string | null;
  rootAssetId?: string | null;
  versionIndex?: number | null;
}

export interface ImageWorkbenchMetadata {
  id: string;
  assetId: string;
  taskId: string;
  originalPrompt?: string | null;
  expandedPrompt?: string | null;
  negativePrompt?: string | null;
  seed?: string | null;
  model?: string | null;
  mode?: string | null;
  provider?: string | null;
  referenceAssetIdsJson?: string | null;
  maskPath?: string | null;
  personContextJson?: string | null;
  createdAtMs: number;
}

export interface ImageWorkbenchModelRun {
  id: string;
  jobId: string;
  taskId?: string | null;
  provider?: string | null;
  model?: string | null;
  capability?: string | null;
  status: string;
  latencyMs?: number | null;
  requestJson?: string | null;
  responsePreview?: string | null;
  error?: string | null;
  createdAtMs: number;
  finishedAtMs?: number | null;
}

export interface ImageWorkbenchTemplate {
  id: string;
  name: string;
  prompt: string;
  negativePrompt?: string | null;
  mode: ImageWorkbenchMode;
  isSystem: boolean;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface ImageWorkbenchSnapshot {
  job: ImageWorkbenchJob;
  tasks: ImageWorkbenchTask[];
  assets: ImageWorkbenchAsset[];
  metadata: ImageWorkbenchMetadata[];
  modelRuns: ImageWorkbenchModelRun[];
}

export interface ImageWorkbenchContractSummary {
  tables: string[];
  jobStatuses: ImageWorkbenchJobStatus[];
  taskStatuses: ImageWorkbenchTaskStatus[];
  supportedModes: ImageWorkbenchMode[];
  deferredModes: ImageWorkbenchMode[];
  maxQuantity: number;
}

export interface CreateImageWorkbenchJobRequest {
  mode: ImageWorkbenchMode;
  prompt: string;
  negativePrompt?: string | null;
  quantity: number;
  providerConfigId?: string | null;
  model?: string | null;
  size?: string | null;
  referenceAssetIds?: string[];
  referenceAssetIdsJson?: string | null;
  sourceAssetId?: string | null;
  sourceImagePath?: string | null;
  maskPath?: string | null;
  personContextJson?: string | null;
  upscaleScale?: number | null;
  fallbackPolicy?: string | null;
}

export interface ImportImageWorkbenchReferenceRequest {
  sourcePath: string;
}

export interface ImportImageWorkbenchReferenceResult {
  filePath: string;
  originalPath: string;
  mimeType?: string | null;
  sizeBytes: number;
  createdAtMs: number;
}

export interface ImageWorkbenchMaskPoint {
  x: number;
  y: number;
}

export interface ImageWorkbenchMaskStroke {
  tool: "paint" | "erase";
  brushSize: number;
  points: ImageWorkbenchMaskPoint[];
}

export interface SaveImageWorkbenchMaskRequest {
  assetId: string;
  width: number;
  height: number;
  strokes: ImageWorkbenchMaskStroke[];
}

export interface SaveImageWorkbenchMaskResult {
  assetId: string;
  maskPath: string;
  width: number;
  height: number;
  strokeCount: number;
  pointCount: number;
  createdAtMs: number;
}

export interface UpdateImageWorkbenchTaskStatusRequest {
  taskId: string;
  status: ImageWorkbenchTaskStatus;
  error?: string | null;
  modelRun?: RecordImageWorkbenchModelRunInput | null;
}

export interface RecordImageWorkbenchMetadataInput {
  originalPrompt?: string | null;
  expandedPrompt?: string | null;
  negativePrompt?: string | null;
  seed?: string | null;
  model?: string | null;
  mode?: string | null;
  provider?: string | null;
  referenceAssetIdsJson?: string | null;
  maskPath?: string | null;
  personContextJson?: string | null;
}

export interface RecordImageWorkbenchModelRunInput {
  provider?: string | null;
  model?: string | null;
  capability?: string | null;
  status?: string | null;
  latencyMs?: number | null;
  requestJson?: string | null;
  responsePreview?: string | null;
  error?: string | null;
}

export interface RecordImageWorkbenchAssetRequest {
  taskId: string;
  filePath: string;
  thumbnailPath?: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  metadata?: RecordImageWorkbenchMetadataInput | null;
  modelRun?: RecordImageWorkbenchModelRunInput | null;
}

export interface SaveImageWorkbenchTemplateRequest {
  id?: string | null;
  name: string;
  prompt: string;
  negativePrompt?: string | null;
  mode: ImageWorkbenchMode;
}

export interface SetImageWorkbenchAssetFavoriteRequest {
  assetId: string;
  favorite: boolean;
}
