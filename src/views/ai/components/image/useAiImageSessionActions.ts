import { computed, ref } from "vue";
import type { ActionMenuItem } from "../../../../components/common/BaseActionMenu.vue";
import type { AiConversationSession } from "../../../../types/ai";

type ImageTranslate = (key: string) => string;

type AiImageSessionActionsOptions = {
  t: ImageTranslate;
  deleteSession: (sessionId: string) => Promise<unknown>;
  createSession: () => unknown;
  hasActiveSession: () => boolean;
  renameSession: (sessionId: string, title: string) => Promise<unknown>;
  duplicateSession: (sessionId: string) => Promise<unknown>;
  onError: (error: unknown) => void;
};

export function useAiImageSessionActions(options: AiImageSessionActionsOptions) {
  const renameDialogVisible = ref(false);
  const renameDraft = ref("");
  const renamingSessionId = ref("");

  const sessionActions = computed<ActionMenuItem[]>(() => [
    { key: "rename", label: options.t("aiPage.sessions.rename"), icon: "Pencil" },
    { key: "duplicate", label: options.t("aiPage.sessions.duplicate"), icon: "Copy" },
    { key: "delete", label: options.t("common.delete"), icon: "Trash2", type: "danger", divided: true },
  ]);

  async function handleDeleteSession(sessionId: string) {
    try {
      await options.deleteSession(sessionId);
      if (!options.hasActiveSession()) {
        options.createSession();
      }
    } catch (error) {
      options.onError(error);
    }
  }

  function openRenameSession(target: AiConversationSession) {
    renamingSessionId.value = target.id;
    renameDraft.value = target.title;
    renameDialogVisible.value = true;
  }

  async function saveSessionName() {
    try {
      await options.renameSession(renamingSessionId.value, renameDraft.value);
      renameDialogVisible.value = false;
    } catch (error) {
      options.onError(error);
    }
  }

  async function handleSessionAction(action: ActionMenuItem, target: AiConversationSession) {
    try {
      if (action.key === "rename") {
        openRenameSession(target);
        return;
      }
      if (action.key === "duplicate") {
        await options.duplicateSession(target.id);
        return;
      }
      if (action.key === "delete") {
        await handleDeleteSession(target.id);
      }
    } catch (error) {
      options.onError(error);
    }
  }

  return {
    renameDialogVisible,
    renameDraft,
    renamingSessionId,
    sessionActions,
    openRenameSession,
    saveSessionName,
    handleDeleteSession,
    handleSessionAction,
  };
}
