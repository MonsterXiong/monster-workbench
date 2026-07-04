import {
  patchAiPreferenceState,
} from "./ai-preferences";
import {
  clampNumber,
  createTimestampId,
  getCurrentTimestampMs,
  hasTimeElapsed,
  normalizeTimestampMs,
  parseOptionalEnum,
  toTrimmedString,
} from "../utils";
import type {
  AiConversationSession,
  AiImageFailureKind,
  AiProviderSavedFile,
} from "../types/ai";

type AiSessionMessage = AiConversationSession["messages"][number];

export const AI_SESSIONS_KEY = "aiConversationSessions";
const DEFAULT_AI_IMAGE_SIZE = "1008x1792";

const IMAGE_QUEUE_POLL_TIMEOUT_MS = 24 * 60 * 60_000;
const AI_IMAGE_FAILURE_KINDS: AiImageFailureKind[] = [
  "unsupported_size",
  "timeout",
  "connection",
  "rate_limited",
  "auth",
  "provider_unavailable",
  "provider_http",
  "provider_error",
  "canceled",
];
const SUPPORTED_IMAGE_SIZES = new Set([
  "1008x1792",
  "1008x1344",
  "1536x864",
  "1344x1008",
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "2048x2048",
  "1152x2048",
  "2048x1152",
  "1536x2048",
  "2048x1536",
  "1344x2016",
  "2016x1344",
  "2000x1600",
  "1600x2000",
  "2000x1200",
  "1200x2000",
  "2048x1024",
  "1024x2048",
  "2880x2880",
  "2160x3840",
  "3840x2160",
  "2160x2880",
  "2880x2160",
  "2304x3456",
  "3456x2304",
  "2880x2304",
  "2304x2880",
  "3600x2160",
  "2160x3600",
  "3840x1920",
  "1920x3840",
  "3840x1280",
  "1280x3840",
]);

const currentTime = () => getCurrentTimestampMs();
const createId = (prefix: string) => createTimestampId(prefix);

function normalizeImageSize(value: unknown) {
  const size = toTrimmedString(value);
  return SUPPORTED_IMAGE_SIZES.has(size)
    ? size
    : DEFAULT_AI_IMAGE_SIZE;
}

function normalizeImageFailureKind(value: unknown): AiImageFailureKind | undefined {
  return parseOptionalEnum(value, AI_IMAGE_FAILURE_KINDS);
}

function normalizeMessageStatus(
  message: Record<string, unknown>,
  type: AiConversationSession["type"] = "chat"
) {
  const createdAt = normalizeTimestampMs(message.createdAt, currentTime());
  if (
    type !== "image" &&
    message.status === "pending" &&
    hasTimeElapsed(createdAt, IMAGE_QUEUE_POLL_TIMEOUT_MS)
  ) {
    return "failed";
  }
  return message.status === "canceled"
    ? "canceled"
    : message.status === "failed"
    ? "failed"
    : message.status === "pending"
      ? "pending"
      : "success";
}

function normalizeMessageContent(
  message: Record<string, unknown>,
  type: AiConversationSession["type"] = "chat"
) {
  const status = normalizeMessageStatus(message, type);
  const content = String(message.content || "");
  if (status === "failed" && !content && message.role !== "user") {
    return "上次请求未完成，已自动标记为失败，可以重试。";
  }
  return content;
}

export function normalizeAiSessions(
  raw: unknown,
  configIds: Set<string>,
  fallbackConfigId: string
): AiConversationSession[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((rawSession) => {
      const session = rawSession as Record<string, unknown>;
      const type: AiConversationSession["type"] =
        session.type === "image" ? "image" : "chat";
      const modelConfigId = configIds.has(String(session.modelConfigId))
        ? String(session.modelConfigId)
        : fallbackConfigId;
      const timestamp = normalizeTimestampMs(session.createdAt, currentTime());
      const rawMessages = Array.isArray(session.messages) ? session.messages : [];

      const messages = rawMessages.map((rawMessage) => {
        const message = rawMessage as Record<string, unknown>;
        return {
          id: String(message.id || createId("ai-message")),
          role:
            message.role === "assistant" || message.role === "error"
              ? message.role
              : "user",
          status: normalizeMessageStatus(message, type),
          content: normalizeMessageContent(message, type),
          requestId: message.requestId ? String(message.requestId) : undefined,
          modelConfigId: configIds.has(String(message.modelConfigId))
            ? String(message.modelConfigId)
            : modelConfigId,
          model: String(message.model || ""),
          error: message.error ? String(message.error) : undefined,
          latencyMs: message.latencyMs
            ? clampNumber(message.latencyMs, 0, IMAGE_QUEUE_POLL_TIMEOUT_MS, 0, 0)
            : undefined,
          queueWaitMs: message.queueWaitMs
            ? clampNumber(message.queueWaitMs, 0, IMAGE_QUEUE_POLL_TIMEOUT_MS, 0, 0)
            : undefined,
          totalLatencyMs: message.totalLatencyMs
            ? clampNumber(message.totalLatencyMs, 0, IMAGE_QUEUE_POLL_TIMEOUT_MS, 0, 0)
            : undefined,
          imageSize: message.imageSize ? normalizeImageSize(message.imageSize) : undefined,
          apiImageSize: message.apiImageSize
            ? normalizeImageSize(message.apiImageSize)
            : undefined,
          requestedImageSize: message.requestedImageSize
            ? normalizeImageSize(message.requestedImageSize)
            : undefined,
          actualImageSize: message.actualImageSize
            ? normalizeImageSize(message.actualImageSize)
            : undefined,
          fallbackImageSize: message.fallbackImageSize
            ? normalizeImageSize(message.fallbackImageSize)
            : undefined,
          imageAttempts: message.imageAttempts
            ? clampNumber(message.imageAttempts, 1, 10, 1, 0)
            : undefined,
          imageCount: message.imageCount
            ? clampNumber(message.imageCount, 1, Number.MAX_SAFE_INTEGER, 1, 0)
            : undefined,
          failureKind: normalizeImageFailureKind(message.failureKind),
          imageUrls: Array.isArray(message.imageUrls)
            ? message.imageUrls.map(String)
            : undefined,
          imagePaths: Array.isArray(message.imagePaths)
            ? message.imagePaths.map(String)
            : undefined,
          savedFiles: Array.isArray(message.savedFiles)
            ? (message.savedFiles as AiProviderSavedFile[])
            : undefined,
          createdAt: normalizeTimestampMs(message.createdAt, timestamp),
        } satisfies AiSessionMessage;
      });

      return {
        id: String(session.id || createId("ai-session")),
        type,
        title: String(
          session.title || (type === "image" ? "生图会话" : "对话会话")
        ),
        modelConfigId,
        imageSize: session.imageSize ? normalizeImageSize(session.imageSize) : undefined,
        createdAt: timestamp,
        updatedAt: normalizeTimestampMs(session.updatedAt, timestamp),
        messages,
      } satisfies AiConversationSession;
    })
    .filter((session) => Boolean(session.id && session.title));
}

export async function persistAiSessions(sessions: AiConversationSession[]) {
  await patchAiPreferenceState({
    [AI_SESSIONS_KEY]: sessions,
  });
}
