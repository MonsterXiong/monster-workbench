import { computed, ref, type Ref } from "vue";
import { buildImageWorkbenchStoryboardBatch } from "../../stores/image-workbench-storyboard";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import type { ImageWorkbenchStoryboardDraftScene } from "./ImageWorkbenchStoryboardDraftPanel.vue";

interface UseImageWorkbenchStoryboardDraftOptions {
  commandSettingsOpen: Ref<boolean>;
  confirmGeneration: () => Promise<boolean>;
  isStoryboardTask: Ref<boolean>;
  sceneGuideOpen: Ref<boolean>;
  store: ReturnType<typeof useImageWorkbenchStore>;
}

export function useImageWorkbenchStoryboardDraft(options: UseImageWorkbenchStoryboardDraftOptions) {
  const storyboardDraftScenes = ref<ImageWorkbenchStoryboardDraftScene[]>([]);
  const storyboardDraftPrefix = ref("");
  const storyboardDraftNegativePrompt = ref("");
  const storyboardAiAction = ref<"recognize" | "generate" | "">("");

  const storyboardDraftBatch = computed(() =>
    buildImageWorkbenchStoryboardBatch({
      prefix: storyboardDraftPrefix.value,
      negativePrompt: storyboardDraftNegativePrompt.value,
      scenes: storyboardDraftScenes.value,
    })
  );
  const storyboardDraftTaskCount = computed(() => storyboardDraftBatch.value.taskPrompts.length);
  const hasStoryboardBatchPrompt = computed(() =>
    options.isStoryboardTask.value && storyboardDraftTaskCount.value > 0
  );
  const hasStoryboardRawPrompt = computed(() => Boolean(options.store.prompt.trim()));
  const effectiveGenerationCount = computed(() =>
    options.isStoryboardTask.value
      ? storyboardDraftTaskCount.value
      : options.store.generationQuantity
  );
  const canSubmitStoryboardBatch = computed(() =>
    storyboardDraftTaskCount.value > 0 &&
    options.store.canRunPersonConsistency &&
    !options.store.imageSizeError &&
    !options.store.storyboardRecognitionLoading
  );
  const canSmartRecognizeStoryboard = computed(() =>
    options.isStoryboardTask.value &&
    hasStoryboardRawPrompt.value &&
    !options.store.loading &&
    !options.store.storyboardRecognitionLoading
  );

  function syncStoryboardDraftFromPrompt() {
    const batch = options.store.storyboardBatchPreview;
    storyboardDraftPrefix.value = batch.prefix;
    storyboardDraftNegativePrompt.value = batch.negativePrompt;
    storyboardDraftScenes.value = batch.scenes.map((scene, index) => ({
      key: `storyboard-${index}-${scene.index}-${scene.title}`,
      index: index + 1,
      title: scene.title,
      picturePrompt: scene.picturePrompt,
      cameraPrompt: scene.cameraPrompt,
      emotionKeywords: scene.emotionKeywords,
      referencePrompt: scene.referencePrompt,
    }));
  }

  function applyStoryboardDraftFromAiResult(
    result: Awaited<
      ReturnType<
        typeof options.store.recognizeStoryboardPromptWithAi |
        typeof options.store.generateStoryboardPromptWithAi
      >
    >
  ) {
    const fallbackBatch = options.store.storyboardBatchPreview;
    storyboardDraftPrefix.value = result.prefix || fallbackBatch.prefix;
    storyboardDraftNegativePrompt.value = result.negativePrompt || fallbackBatch.negativePrompt;
    storyboardDraftScenes.value = result.scenes.map((scene, index) => ({
      key: `storyboard-ai-${index}-${scene.index}-${scene.title}`,
      index: index + 1,
      title: scene.title,
      picturePrompt: scene.picturePrompt,
      cameraPrompt: scene.cameraPrompt,
      emotionKeywords: scene.emotionKeywords,
      referencePrompt: scene.referencePrompt,
    }));
  }

  function updateStoryboardDraftScene(index: number, patch: Partial<ImageWorkbenchStoryboardDraftScene>) {
    storyboardDraftScenes.value = storyboardDraftScenes.value.map((scene, sceneIndex) =>
      sceneIndex === index ? { ...scene, ...patch } : scene
    );
  }

  function removeStoryboardDraftScene(index: number) {
    storyboardDraftScenes.value = storyboardDraftScenes.value
      .filter((_, sceneIndex) => sceneIndex !== index)
      .map((scene, sceneIndex) => ({
        ...scene,
        index: sceneIndex + 1,
      }));
  }

  async function handleStoryboardBatchGenerate() {
    if (!(await options.confirmGeneration())) {
      return;
    }
    const batch = storyboardDraftBatch.value;
    options.sceneGuideOpen.value = false;
    options.commandSettingsOpen.value = false;
    await options.store.runStoryboardPromptBatch({
      jobPrompt: batch.jobPrompt,
      negativePrompt: batch.negativePrompt,
      taskPrompts: batch.taskPrompts,
      sceneCount: batch.scenes.length,
      variantsPerScene: batch.variantsPerScene,
      generationOptions: batch.generationOptions,
    });
  }

  async function handleStoryboardSmartRecognize() {
    const sourcePrompt = options.store.prompt.trim();
    options.sceneGuideOpen.value = true;
    storyboardAiAction.value = "recognize";
    try {
      const result = await options.store.recognizeStoryboardPromptWithAi(sourcePrompt);
      if (sourcePrompt !== options.store.prompt.trim()) {
        return;
      }
      applyStoryboardDraftFromAiResult(result);
    } catch {
      // Store error is already surfaced in the workbench error bar.
    } finally {
      if (storyboardAiAction.value === "recognize") {
        storyboardAiAction.value = "";
      }
    }
  }

  async function handleStoryboardGenerateStory() {
    const sourcePrompt = options.store.prompt.trim();
    options.sceneGuideOpen.value = true;
    storyboardAiAction.value = "generate";
    try {
      const result = await options.store.generateStoryboardPromptWithAi(sourcePrompt);
      if (sourcePrompt !== options.store.prompt.trim()) {
        return;
      }
      applyStoryboardDraftFromAiResult(result);
    } catch {
      // Store error is already surfaced in the workbench error bar.
    } finally {
      if (storyboardAiAction.value === "generate") {
        storyboardAiAction.value = "";
      }
    }
  }

  return {
    canSmartRecognizeStoryboard,
    canSubmitStoryboardBatch,
    effectiveGenerationCount,
    handleStoryboardBatchGenerate,
    handleStoryboardGenerateStory,
    handleStoryboardSmartRecognize,
    hasStoryboardBatchPrompt,
    hasStoryboardRawPrompt,
    removeStoryboardDraftScene,
    storyboardAiAction,
    storyboardDraftBatch,
    storyboardDraftNegativePrompt,
    storyboardDraftPrefix,
    storyboardDraftScenes,
    storyboardDraftTaskCount,
    syncStoryboardDraftFromPrompt,
    updateStoryboardDraftScene,
  };
}
