export type ImageWorkbenchMode =
  | "txt2img"
  | "img2img"
  | "inpaint"
  | "person_consistency"
  | "upscale_2x"
  | "upscale_4x";
export type ImageWorkbenchReferenceRole = "person" | "prop" | "scene" | "style";
export type ImageWorkbenchQualityIssue = "hands" | "identity" | "prop" | "scene";
export type ImageWorkbenchGenerationQuality = "auto" | "low" | "medium" | "high";
export type ImageWorkbenchOutputFormat = "png" | "jpeg" | "webp";
export type ImageWorkbenchBackground = "auto" | "opaque";
export type ImageWorkbenchModeration = "auto" | "low";
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
export type ImageWorkbenchFailureType =
  | "auth"
  | "model"
  | "size"
  | "rate_limit"
  | "provider_unavailable"
  | "upstream"
  | "timeout"
  | "connection"
  | "save"
  | "cancelled"
  | "unknown";

export type ImageWorkbenchDeliveryStatus = "ready";
export type ImageWorkbenchAssetIntegrityStatus = "ok" | "missing" | "corrupt";

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
  generationOptionsJson?: string | null;
  createdAtMs: number;
  updatedAtMs: number;
  queuedAtMs?: number | null;
  startedAtMs?: number | null;
  finishedAtMs?: number | null;
  error?: string | null;
  archivedAtMs?: number | null;
  deletedAtMs?: number | null;
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
  failureType?: ImageWorkbenchFailureType | null;
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
  deliveryStatus?: ImageWorkbenchDeliveryStatus | null;
  qualityIssues?: ImageWorkbenchQualityIssue[];
  integrityStatus?: ImageWorkbenchAssetIntegrityStatus | null;
  integrityError?: string | null;
  integrityCheckedAtMs?: number | null;
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

export interface ImageWorkbenchGroup {
  id: string;
  jobId: string;
  sourceId?: string | null;
  name?: string | null;
  type?: string | null;
  agentPreset?: string | null;
  agentIdsJson?: string | null;
  basePrompt?: string | null;
  count: number;
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
  maxQuantity?: number | null;
}

export interface CreateImageWorkbenchJobRequest {
  mode: ImageWorkbenchMode;
  prompt: string;
  negativePrompt?: string | null;
  taskPrompts?: string[];
  quantity: number;
  providerConfigId?: string | null;
  model?: string | null;
  size?: string | null;
  referenceAssetIds?: string[];
  referenceAssetIdsJson?: string | null;
  referenceImagePaths?: string[];
  sourceAssetId?: string | null;
  sourceImagePath?: string | null;
  maskPath?: string | null;
  personContextJson?: string | null;
  upscaleScale?: number | null;
  fallbackPolicy?: string | null;
  generationOptionsJson?: string | null;
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

export interface ImportImageWorkbenchGeneratedAssetsRequest {
  directoryPath: string;
  limit?: number | null;
  offset?: number | null;
}

export interface ImportImageWorkbenchGeneratedAssetItem {
  stem: string;
  jsonPath?: string | null;
  imagePath?: string | null;
  status: "pending" | "imported" | "duplicate" | "failed";
  assetId?: string | null;
  jobId?: string | null;
  fingerprint?: string | null;
  integrityStatus: ImageWorkbenchAssetIntegrityStatus;
  integrityError?: string | null;
}

export interface ImportImageWorkbenchGeneratedAssetsResult {
  jobId?: string | null;
  scanned: number;
  imported: number;
  duplicates: number;
  missing: number;
  corrupt: number;
  failed: number;
  items: ImportImageWorkbenchGeneratedAssetItem[];
}

export interface CleanupImageWorkbenchDeletedAssetsResult {
  scannedAssets: number;
  removedFiles: number;
  removedDirs: number;
  missingFiles: number;
  skippedFiles: number;
  removedBytes: number;
  warnings: string[];
}

export interface CleanupImageWorkbenchInvalidAssetsResult {
  scannedAssets: number;
  removedAssets: number;
  missingAssets: number;
  corruptAssets: number;
}

export type ImageWorkbenchAssetSort =
  | "favorite_then_recent"
  | "favoriteThenRecent"
  | "recent_first"
  | "recentFirst"
  | "rating_desc"
  | "ratingDesc";

export interface QueryImageWorkbenchAssetsRequest {
  limit?: number;
  offset?: number;
  groupId?: string | null;
  minRating?: number | null;
  sort?: ImageWorkbenchAssetSort | null;
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
  failureType?: ImageWorkbenchFailureType | null;
  failureHint?: string | null;
  modelRun?: RecordImageWorkbenchModelRunInput | null;
}

export interface ReplanImageWorkbenchStoryboardGroupRequest {
  groupId: string;
  variantsPerScene?: number | null;
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

export interface SetImageWorkbenchAssetRatingRequest {
  assetId: string;
  rating?: number | null;
}

export interface SetImageWorkbenchAssetQualityIssuesRequest {
  assetId: string;
  qualityIssues: ImageWorkbenchQualityIssue[];
}

export interface DeleteImageWorkbenchAssetsRequest {
  assetIds: string[];
  deleteFiles?: boolean;
}

export interface DeleteImageWorkbenchAssetsResult {
  deletedAssets: number;
  deletedFiles: number;
  skippedFiles: number;
}

export interface DeleteImageWorkbenchJobResult {
  removedJob: boolean;
  deletedAssets: number;
  deletedFiles: number;
  skippedFiles: number;
}

export interface TagImageWorkbenchAssetsGroupRequest {
  assetIds: string[];
  groupId?: string | null;
  groupName?: string | null;
}

export interface TagImageWorkbenchAssetsGroupResult {
  taggedAssets: number;
  groups: ImageWorkbenchGroup[];
}

export interface ExportImageWorkbenchGroupRequest {
  groupId?: string | null;
  groupName?: string | null;
}
