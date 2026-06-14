import type { Ref } from "vue";
import { persistAiSessions } from "../services/ai-session-storage";
import { findByValue, hasByValue } from "../utils";
import type { AiConversationSession } from "../types/ai";

type AiSessionMessage = AiConversationSession["messages"][number];

type AiImageCancelSyncOptions = {
  sessions: Ref<AiConversationSession[]>;
  cancelProviderTestTask: (requestId: string) => Promise<boolean>;
  markTestQueueItemCanceled: (requestId: string, error: string) => void;
  patchSessionMessage: (messageId: string, patch: Partial<AiSessionMessage>) => void;
  trimLocalTestQueue: () => void;
  updateTestingState: () => void;
  refreshBackendQueueStatus: () => Promise<void>;
  canceledMessage: string;
};

function patchCanceledImageMessage(
  options: AiImageCancelSyncOptions,
  messageId: string,
  messageText: string
) {
  options.patchSessionMessage(messageId, {
    role: "error",
    status: "canceled",
    content: messageText,
    error: messageText,
    failureKind: "canceled",
  });
}

export async function cancelPendingImageMessage(
  options: AiImageCancelSyncOptions,
  messageId: string
) {
  const session = options.sessions.value.find((item) =>
    hasByValue(item.messages, (message) => message.id, messageId)
  );
  const message = session
    ? findByValue(session.messages, (item) => item.id, messageId)
    : null;
  if (!session || !message?.requestId || message.status !== "pending") {
    return false;
  }

  const cancelled = await options.cancelProviderTestTask(message.requestId);
  if (!cancelled) {
    return false;
  }

  const messageText = message.error || message.content || options.canceledMessage;
  options.markTestQueueItemCanceled(message.requestId, messageText);
  patchCanceledImageMessage(options, messageId, messageText);
  options.trimLocalTestQueue();
  options.updateTestingState();
  await options.refreshBackendQueueStatus();
  await persistAiSessions(options.sessions.value);
  return true;
}
