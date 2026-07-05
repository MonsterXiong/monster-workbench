<script setup lang="ts">
import { Clapperboard, LoaderCircle, Play, Sparkles, Trash2 } from "lucide-vue-next";
import { formatTemplate } from "../../utils";
import { useI18n } from "../../composables/useI18n";

export interface ImageWorkbenchStoryboardDraftScene {
  key: string;
  index: number;
  title: string;
  picturePrompt: string;
  cameraPrompt: string;
  emotionKeywords: string;
  referencePrompt: string;
}

defineProps<{
  prefix: string;
  negativePrompt: string;
  scenes: ImageWorkbenchStoryboardDraftScene[];
  taskCount: number;
  variantsPerScene: number;
  canGenerate: boolean;
  hasRawPrompt: boolean;
  canSmartRecognize: boolean;
  smartRecognizing: boolean;
  aiAction: "recognize" | "generate" | "";
}>();

const emit = defineEmits<{
  (event: "update-prefix", value: string): void;
  (event: "update-negative-prompt", value: string): void;
  (event: "update-scene", index: number, patch: Partial<ImageWorkbenchStoryboardDraftScene>): void;
  (event: "remove-scene", index: number): void;
  (event: "focus-prompt"): void;
  (event: "smart-recognize"): void;
  (event: "generate-storyboard"): void;
  (event: "generate"): void;
}>();

const { t } = useI18n();

function sceneLabel(scene: ImageWorkbenchStoryboardDraftScene, index: number) {
  return formatTemplate(t("imageWorkbench.storyboardDraft.sceneLabel"), {
    index: String(scene.index || index + 1).padStart(2, "0"),
  });
}

function eventValue(event: Event) {
  return (event.target as HTMLInputElement | HTMLTextAreaElement | null)?.value || "";
}

function updateScene(index: number, patch: Partial<ImageWorkbenchStoryboardDraftScene>) {
  emit("update-scene", index, patch);
}
</script>

<template>
  <section class="image-workbench-storyboard-draft" :class="{ 'is-recognizing': smartRecognizing }">
    <div class="image-workbench-storyboard-draft__head">
      <div>
        <span>
          <Clapperboard class="h-4 w-4" />
          <strong>{{ t("imageWorkbench.storyboardDraft.title") }}</strong>
        </span>
        <small>{{ t("imageWorkbench.storyboardDraft.desc") }}</small>
      </div>
      <div class="image-workbench-storyboard-draft__side">
        <div class="image-workbench-storyboard-draft__meta">
          <span>{{ formatTemplate(t("imageWorkbench.storyboardDraft.sceneCount"), { count: scenes.length }) }}</span>
          <span>{{ formatTemplate(t("imageWorkbench.storyboardDraft.taskCount"), { count: taskCount }) }}</span>
        </div>
        <button
          v-if="hasRawPrompt || smartRecognizing"
          type="button"
          class="image-workbench-storyboard-draft__smart is-creative"
          :disabled="!canSmartRecognize"
          @click="emit('generate-storyboard')"
        >
          <LoaderCircle v-if="smartRecognizing && aiAction === 'generate'" class="h-3.5 w-3.5 animate-spin" />
          <Sparkles v-else class="h-3.5 w-3.5" />
          {{ smartRecognizing && aiAction === "generate" ? t("imageWorkbench.storyboardDraft.generatingStory") : t("imageWorkbench.storyboardDraft.generateStory") }}
        </button>
        <button
          v-if="hasRawPrompt || smartRecognizing"
          type="button"
          class="image-workbench-storyboard-draft__smart"
          :disabled="!canSmartRecognize"
          @click="emit('smart-recognize')"
        >
          <LoaderCircle v-if="smartRecognizing && aiAction === 'recognize'" class="h-3.5 w-3.5 animate-spin" />
          <Sparkles v-else class="h-3.5 w-3.5" />
          {{ smartRecognizing && aiAction === "recognize" ? t("imageWorkbench.storyboardDraft.smartRecognizing") : t("imageWorkbench.storyboardDraft.smartRecognize") }}
        </button>
      </div>
    </div>

    <div v-if="scenes.length" class="image-workbench-storyboard-global">
      <label class="image-workbench-storyboard-field">
        <span>{{ t("imageWorkbench.storyboardDraft.fields.prefix") }}</span>
        <textarea
          :value="prefix"
          rows="2"
          @input="emit('update-prefix', eventValue($event))"
        />
      </label>
      <label class="image-workbench-storyboard-field">
        <span>{{ t("imageWorkbench.storyboardDraft.fields.negative") }}</span>
        <textarea
          :value="negativePrompt"
          rows="2"
          @input="emit('update-negative-prompt', eventValue($event))"
        />
      </label>
    </div>

    <div v-if="scenes.length" class="image-workbench-storyboard-draft__list">
      <article
        v-for="(scene, index) in scenes"
        :key="scene.key"
        class="image-workbench-storyboard-scene"
      >
        <div class="image-workbench-storyboard-scene__head">
          <span>{{ sceneLabel(scene, index) }}</span>
          <button
            type="button"
            :title="t('imageWorkbench.storyboardDraft.remove')"
            :aria-label="t('imageWorkbench.storyboardDraft.remove')"
            @click="emit('remove-scene', index)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
        <label class="image-workbench-storyboard-field image-workbench-storyboard-field--title">
          <span>{{ t("imageWorkbench.storyboardDraft.fields.title") }}</span>
          <input
            :value="scene.title"
            @input="updateScene(index, { title: eventValue($event) })"
          />
        </label>
        <label class="image-workbench-storyboard-field">
          <span>{{ t("imageWorkbench.storyboardDraft.fields.picture") }}</span>
          <textarea
            :value="scene.picturePrompt"
            rows="3"
            @input="updateScene(index, { picturePrompt: eventValue($event) })"
          />
        </label>
        <div class="image-workbench-storyboard-scene__grid">
          <label class="image-workbench-storyboard-field">
            <span>{{ t("imageWorkbench.storyboardDraft.fields.camera") }}</span>
            <textarea
              :value="scene.cameraPrompt"
              rows="2"
              @input="updateScene(index, { cameraPrompt: eventValue($event) })"
            />
          </label>
          <label class="image-workbench-storyboard-field">
            <span>{{ t("imageWorkbench.storyboardDraft.fields.emotion") }}</span>
            <textarea
              :value="scene.emotionKeywords"
              rows="2"
              @input="updateScene(index, { emotionKeywords: eventValue($event) })"
            />
          </label>
        </div>
        <label class="image-workbench-storyboard-field">
          <span>{{ t("imageWorkbench.storyboardDraft.fields.reference") }}</span>
          <textarea
            :value="scene.referencePrompt"
            rows="2"
            @input="updateScene(index, { referencePrompt: eventValue($event) })"
          />
        </label>
      </article>
    </div>

    <div v-else class="image-workbench-storyboard-empty">
      <Clapperboard class="h-10 w-10" />
      <strong>{{ t("imageWorkbench.storyboardDraft.emptyTitle") }}</strong>
      <span>{{ hasRawPrompt ? t("imageWorkbench.storyboardDraft.emptyInvalid") : t("imageWorkbench.storyboardDraft.emptyDesc") }}</span>
      <button
        v-if="hasRawPrompt"
        type="button"
        class="image-workbench-action"
        :disabled="!canSmartRecognize"
        @click="emit('generate-storyboard')"
      >
        <LoaderCircle v-if="smartRecognizing && aiAction === 'generate'" class="h-3.5 w-3.5 animate-spin" />
        <Sparkles v-else class="h-3.5 w-3.5" />
        {{ smartRecognizing && aiAction === "generate" ? t("imageWorkbench.storyboardDraft.generatingStory") : t("imageWorkbench.storyboardDraft.generateStory") }}
      </button>
      <button
        v-if="hasRawPrompt"
        type="button"
        class="image-workbench-secondary"
        :disabled="!canSmartRecognize"
        @click="emit('smart-recognize')"
      >
        <LoaderCircle v-if="smartRecognizing && aiAction === 'recognize'" class="h-3.5 w-3.5 animate-spin" />
        <Sparkles v-else class="h-3.5 w-3.5" />
        {{ smartRecognizing && aiAction === "recognize" ? t("imageWorkbench.storyboardDraft.smartRecognizing") : t("imageWorkbench.storyboardDraft.smartRecognize") }}
      </button>
      <button v-else type="button" class="image-workbench-secondary" @click="emit('focus-prompt')">
        {{ t("imageWorkbench.storyboardDraft.focusPrompt") }}
      </button>
    </div>

    <div v-if="scenes.length" class="image-workbench-storyboard-draft__footer">
      <span>
        {{
          formatTemplate(t("imageWorkbench.storyboardDraft.footer"), {
            scenes: scenes.length,
            variants: variantsPerScene,
            count: taskCount,
          })
        }}
      </span>
      <button
        type="button"
        class="image-workbench-action"
        :disabled="!canGenerate"
        @click="emit('generate')"
      >
        <Play class="h-3.5 w-3.5" />
        {{ formatTemplate(t("imageWorkbench.storyboardDraft.generate"), { count: taskCount }) }}
      </button>
    </div>

    <div v-if="smartRecognizing" class="image-workbench-storyboard-recognizing" role="status" aria-live="polite">
      <LoaderCircle class="h-5 w-5 animate-spin" />
      <strong>
        {{ t(aiAction === "generate" ? "imageWorkbench.storyboardDraft.generatingStory" : "imageWorkbench.storyboardDraft.smartRecognizing") }}
      </strong>
      <span>
        {{ t(aiAction === "generate" ? "imageWorkbench.storyboardDraft.generatingStoryDesc" : "imageWorkbench.storyboardDraft.smartRecognizingDesc") }}
      </span>
    </div>
  </section>
</template>
