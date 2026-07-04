export type AiProviderType =
  | "openai"
  | "deepseek"
  | "siliconflow"
  | "kimi"
  | "minimax"
  | "glm"
  | "ollama"
  | "custom";
export type AiProviderAdapterId = "openai-compatible" | "anthropic-messages";
export type AiProviderCapability =
  | "models"
  | "chat"
  | "image"
  | "txt2img"
  | "img2img"
  | "inpaint"
  | "upscale_2x"
  | "upscale_4x"
  | "person_consistency"
  | "audio"
  | "video";
export type AiProviderTestAction = "models" | "chat" | "image";
export type AiGenerationCapability =
  | "chat"
  | "image"
  | "txt2img"
  | "img2img"
  | "inpaint"
  | "upscale_2x"
  | "upscale_4x"
  | "person_consistency"
  | "audio"
  | "video";
export type AiActiveConfigIdKey = Exclude<AiProviderCapability, "models">;
export type AiProviderRuntimeAction = AiProviderTestAction | AiGenerationCapability;
export type AiProviderQueueMode = "serial" | "concurrent";
export type AiProviderTestQueueStatus = "queued" | "running" | "success" | "failed" | "canceled";
export type AiGenerationTaskStatus = "queued" | "running" | "success" | "failed" | "canceled";
export type AiPromptType = "chat" | "image";
export type AiSessionType = AiPromptType;
export type AiSessionMessageRole = "user" | "assistant" | "error";
export type AiSessionMessageStatus = "success" | "failed" | "pending" | "canceled";
export type AiChatExportFormat = "markdown" | "txt" | "json";
export type AiImageFailureKind =
  | "unsupported_size"
  | "timeout"
  | "connection"
  | "rate_limited"
  | "auth"
  | "provider_unavailable"
  | "provider_http"
  | "provider_error"
  | "canceled";

export interface AiProviderConfig {
  provider: AiProviderType;
  adapterId: AiProviderAdapterId;
  displayName: string;
  baseUrl: string;
  apiKey: string;
  rememberApiKey: boolean;
  model: string;
  testPrompt: string;
  imageModel: string;
  imagePrompt: string;
  imageSize: string;
  imageCount: number;
  timeoutMs: number;
  queueMode: AiProviderQueueMode;
  maxConcurrency: number;
  capabilities?: AiProviderCapability[];
  queueKey?: string;
}

export interface AiModelConfig extends AiProviderConfig {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface AiProviderTestResult {
  requestId?: string | null;
  ok: boolean;
  action: AiProviderRuntimeAction;
  provider: AiProviderType;
  model: string;
  baseUrl: string;
  latencyMs: number;
  queueWaitMs?: number | null;
  totalLatencyMs?: number | null;
  message: string;
  statusCode?: number | null;
  models?: string[];
  text?: string;
  imageUrls?: string[];
  imagePaths?: string[];
  savedFiles?: AiProviderSavedFile[];
  artifacts?: AiGenerationArtifact[] | null;
  apiImageSize?: string | null;
  requestedImageSize?: string | null;
  actualImageSize?: string | null;
  fallbackImageSize?: string | null;
  imageAttempts?: number | null;
  failureKind?: AiImageFailureKind | null;
  rawPreview?: string;
}

export interface AiProviderSavedFile {
  path: string;
  sizeBytes: number;
  mimeType: string;
  dimensions?: string | null;
}

export interface AiGenerationOptions {
  maxTokens?: number | null;
  temperature?: number | null;
  size?: string | null;
  count?: number;
  format?: string | null;
  voice?: string | null;
  durationSeconds?: number | null;
  referenceAssetIds?: string[];
  referenceImagePaths?: string[];
  referenceImagePath?: string | null;
  sourceAssetId?: string | null;
  sourceImagePath?: string | null;
  maskPath?: string | null;
  personContextJson?: string | null;
  scale?: number | null;
  fallbackMode?: string | null;
}

export interface AiGenerationRequest {
  capability: AiGenerationCapability;
  config: AiProviderConfig;
  prompt: string;
  model?: string | null;
  requestId?: string | null;
  options?: AiGenerationOptions;
}

export interface AiBusinessGenerationRequest {
  capability: AiGenerationCapability;
  providerConfigId?: string | null;
  prompt: string;
  model?: string | null;
  requestId?: string | null;
  options?: AiGenerationOptions;
}

export interface AiGenerationArtifact {
  kind: AiGenerationCapability;
  url?: string | null;
  path?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  dimensions?: string | null;
  durationSeconds?: number | null;
}

export interface AiGenerationResult {
  requestId?: string | null;
  ok: boolean;
  capability: AiGenerationCapability;
  provider: AiProviderType;
  model: string;
  baseUrl: string;
  latencyMs: number;
  queueWaitMs?: number | null;
  totalLatencyMs?: number | null;
  message: string;
  statusCode?: number | null;
  text?: string | null;
  artifacts: AiGenerationArtifact[];
  failureKind?: string | null;
  rawPreview?: string | null;
}

export interface AiGenerationTask {
  requestId: string;
  capability: AiGenerationCapability;
  scope: "direct" | "business" | string;
  status: AiGenerationTaskStatus;
  providerConfigId?: string | null;
  model?: string | null;
  createdAtMs: number;
  startedAtMs?: number | null;
  finishedAtMs?: number | null;
  queueWaitMs?: number | null;
  totalLatencyMs?: number | null;
  result?: AiGenerationResult | null;
  error?: string | null;
}

export interface AiProviderTestQueueItem {
  id: string;
  action: AiProviderRuntimeAction;
  status: AiProviderTestQueueStatus;
  queueKey?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  message?: string;
  result?: AiProviderTestResult;
  error?: string;
}

export interface AiProviderTestTask {
  requestId: string;
  action: AiProviderTestAction;
  status: AiProviderTestQueueStatus;
  createdAtMs: number;
  startedAtMs?: number | null;
  finishedAtMs?: number | null;
  queueWaitMs?: number | null;
  totalLatencyMs?: number | null;
  result?: AiProviderTestResult | null;
  error?: string | null;
}

export interface AiProviderBackendQueueItem {
  id: number;
  requestId: string;
  action: AiProviderRuntimeAction;
  createdAtMs: number;
  startedAtMs?: number | null;
  waitMs: number;
  remainingWaitMs: number;
  waitTimeoutMs: number;
  queueMode?: AiProviderQueueMode;
  concurrencyLimit?: number;
}

export interface AiProviderBackendQueueStatus {
  running?: AiProviderBackendQueueItem | null;
  runningItems?: AiProviderBackendQueueItem[];
  queued: AiProviderBackendQueueItem[];
  pendingCount: number;
  queueLimit: number;
  runningCount?: number;
  runningLimit?: number;
  availableRunningSlots?: number;
  availableSlots: number;
  isSaturated: boolean;
  waitTimeoutMs: number;
}

export interface AiPromptCategory {
  id: string;
  type: AiPromptType;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface AiPromptItem {
  id: string;
  type: AiPromptType;
  categoryId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface AiPromptLibrary {
  categories: AiPromptCategory[];
  prompts: AiPromptItem[];
}

export interface AiPromptInput {
  id?: string;
  type: AiPromptType;
  categoryId?: string;
  categoryName?: string;
  title: string;
  content: string;
}

export interface AiSessionMessage {
  id: string;
  role: AiSessionMessageRole;
  status: AiSessionMessageStatus;
  content: string;
  requestId?: string;
  modelConfigId: string;
  model: string;
  error?: string;
  latencyMs?: number;
  queueWaitMs?: number | null;
  totalLatencyMs?: number | null;
  imageSize?: string;
  apiImageSize?: string;
  requestedImageSize?: string;
  actualImageSize?: string;
  fallbackImageSize?: string;
  imageAttempts?: number;
  imageCount?: number;
  failureKind?: AiImageFailureKind;
  imageUrls?: string[];
  imagePaths?: string[];
  savedFiles?: AiProviderSavedFile[];
  createdAt: number;
}

export interface AiConversationSession {
  id: string;
  type: AiSessionType;
  title: string;
  modelConfigId: string;
  imageSize?: string;
  createdAt: number;
  updatedAt: number;
  messages: AiSessionMessage[];
}

export type AiActiveConfigIds = Record<AiActiveConfigIdKey, string>;
