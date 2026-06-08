export type AiProviderType = "openai" | "deepseek" | "siliconflow" | "custom";
export type AiProviderTestAction = "models" | "chat" | "image";
export type AiProviderTestQueueStatus = "queued" | "running" | "success" | "failed";
export type AiPromptType = "chat" | "image";
export type AiSessionType = AiPromptType;
export type AiSessionMessageRole = "user" | "assistant" | "error";
export type AiSessionMessageStatus = "success" | "failed" | "pending";

export interface AiProviderConfig {
  provider: AiProviderType;
  displayName: string;
  baseUrl: string;
  apiKey: string;
  rememberApiKey: boolean;
  model: string;
  testPrompt: string;
  imageModel: string;
  imagePrompt: string;
  imageSize: string;
  timeoutMs: number;
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
  action: AiProviderTestAction;
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
  rawPreview?: string;
}

export interface AiProviderSavedFile {
  path: string;
  sizeBytes: number;
  mimeType: string;
}

export interface AiProviderTestQueueItem {
  id: string;
  action: AiProviderTestAction;
  status: AiProviderTestQueueStatus;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
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
  action: AiProviderTestAction;
  createdAtMs: number;
  startedAtMs?: number | null;
  waitMs: number;
  remainingWaitMs: number;
  waitTimeoutMs: number;
}

export interface AiProviderBackendQueueStatus {
  running?: AiProviderBackendQueueItem | null;
  queued: AiProviderBackendQueueItem[];
  pendingCount: number;
  queueLimit: number;
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
  modelConfigId: string;
  model: string;
  error?: string;
  imageSize?: string;
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

export interface AiActiveConfigIds {
  chat: string;
  image: string;
}
