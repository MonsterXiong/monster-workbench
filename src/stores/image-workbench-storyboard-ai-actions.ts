import type { Ref } from "vue";
import type { useAiProviderStore } from "./ai-provider";
import { imageWorkbenchStoryboardAiService } from "../services/image-workbench-storyboard-ai.service";
import { formatTemplate } from "../utils";

interface CreateImageWorkbenchStoryboardAiActionsOptions {
  aiProviderStore: ReturnType<typeof useAiProviderStore>;
  error: Ref<string>;
  notice: Ref<string>;
  prompt: Ref<string>;
  storyboardRecognitionLoading: Ref<boolean>;
  t: (key: string) => string;
}

export function createImageWorkbenchStoryboardAiActions(
  options: CreateImageWorkbenchStoryboardAiActionsOptions
) {
  async function resolveChatModelConfig() {
    await options.aiProviderStore.loadConfig();
    const configId = options.aiProviderStore.getActiveModelConfigIdForCapability("chat");
    const modelConfig = options.aiProviderStore.getModelConfig(configId);
    if (!options.aiProviderStore.modelConfigSupportsCapability(configId, "chat")) {
      throw new Error(options.t("imageWorkbench.errors.storyboardSmartProviderRequired"));
    }
    return modelConfig;
  }

  async function recognizeStoryboardPromptWithAi(rawText = options.prompt.value) {
    options.error.value = "";
    options.notice.value = "";
    try {
      const cleanPrompt = rawText.trim();
      if (!cleanPrompt) {
        throw new Error(options.t("imageWorkbench.errors.storyboardSmartPromptRequired"));
      }

      const modelConfig = await resolveChatModelConfig();
      options.storyboardRecognitionLoading.value = true;
      options.notice.value = options.t("imageWorkbench.storyboardDraft.smartRecognizing");
      const result = await imageWorkbenchStoryboardAiService.recognizeStoryboard({
        rawText: cleanPrompt,
        providerConfigId: modelConfig.id,
        model: modelConfig.model,
      });
      if (!result.scenes.length) {
        throw new Error(options.t("imageWorkbench.errors.storyboardSmartNoScenes"));
      }
      options.notice.value = formatTemplate(options.t("imageWorkbench.storyboardDraft.smartSuccess"), {
        count: result.scenes.length,
      });
      return result;
    } catch (err) {
      options.error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      options.storyboardRecognitionLoading.value = false;
    }
  }

  async function generateStoryboardPromptWithAi(directionText = options.prompt.value) {
    options.error.value = "";
    options.notice.value = "";
    try {
      const cleanDirection = directionText.trim();
      if (!cleanDirection) {
        throw new Error(options.t("imageWorkbench.errors.storyboardGenerateDirectionRequired"));
      }

      const modelConfig = await resolveChatModelConfig();
      options.storyboardRecognitionLoading.value = true;
      options.notice.value = options.t("imageWorkbench.storyboardDraft.generatingStory");
      const result = await imageWorkbenchStoryboardAiService.generateStoryboard({
        direction: cleanDirection,
        providerConfigId: modelConfig.id,
        model: modelConfig.model,
      });
      if (!result.scenes.length) {
        throw new Error(options.t("imageWorkbench.errors.storyboardSmartNoScenes"));
      }
      options.notice.value = formatTemplate(options.t("imageWorkbench.storyboardDraft.generateStorySuccess"), {
        count: result.scenes.length,
      });
      return result;
    } catch (err) {
      options.error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      options.storyboardRecognitionLoading.value = false;
    }
  }

  return {
    generateStoryboardPromptWithAi,
    recognizeStoryboardPromptWithAi,
  };
}
