<script setup lang="ts">
import { computed } from "vue";
import { AlertCircle, BadgeCheck, BrainCircuit, ImagePlus, Loader2, Music2, Play, Sparkles, Video, XCircle } from "lucide-vue-next";
import { useAiStore } from "../../../stores/ai";
import { useI18n } from "../../../composables/useI18n";
import { useToast } from "../../../composables/useToast";
import { formatBytes, formatDuration, getErrorMessage } from "../../../utils";
import type { AiGenerationArtifact, AiGenerationCapability } from "../../../types/ai";

const aiStore = useAiStore();
const { t } = useI18n();
const { triggerToast } = useToast();

const capabilityCards = [
  { key: "chat", icon: BrainCircuit, titleKey: "aiPage.features.chatTitle", descKey: "aiPage.features.chatDesc" },
  { key: "image", icon: ImagePlus, titleKey: "aiPage.features.imageTitle", descKey: "aiPage.features.imageDesc" },
  { key: "audio", icon: Music2, titleKey: "aiPage.features.audioTitle", descKey: "aiPage.features.audioDesc" },
  { key: "video", icon: Video, titleKey: "aiPage.features.videoTitle", descKey: "aiPage.features.videoDesc" },
] as const;

const lastResult = computed(() => aiStore.lastGenerationResult);

const unavailableReasonLabelKeys: Record<string, string> = {
  unsupported: "aiPage.features.unsupportedReason",
  missingBaseUrl: "aiPage.features.missingBaseUrl",
  missingApiKey: "aiPage.features.missingApiKey",
  missingModel: "aiPage.features.missingModel",
};

function isRunning(capability: AiGenerationCapability) {
  return aiStore.isGeneratingAtomicContent && aiStore.activeGenerationCapability === capability;
}

function getResultFor(capability: AiGenerationCapability) {
  return lastResult.value?.capability === capability ? lastResult.value : null;
}

function getCapabilityStatusLabel(capability: AiGenerationCapability) {
  const reason = aiStore.getGenerationCapabilityUnavailableReason(capability);
  if (!reason) {
    return t("aiPage.features.supported");
  }
  return reason === "unsupported"
    ? t("aiPage.features.unsupported")
    : t("aiPage.features.needsConfig");
}

function getCapabilityStatusClass(capability: AiGenerationCapability) {
  const reason = aiStore.getGenerationCapabilityUnavailableReason(capability);
  if (!reason) {
    return "status-pill--ok";
  }
  return reason === "unsupported" ? "status-pill--muted" : "status-pill--warning";
}

function getCapabilityUnavailableText(capability: AiGenerationCapability) {
  const reason = aiStore.getGenerationCapabilityUnavailableReason(capability);
  return reason ? t(unavailableReasonLabelKeys[reason] || "aiPage.features.runUnavailable") : "";
}

function getCapabilityModelConfigOptions(capability: AiGenerationCapability) {
  return aiStore.modelConfigs.map((item) => {
    const supported = aiStore.generationModelConfigSupportsCapability(item.id, capability);
    return {
      label: item.name || item.displayName || item.model,
      selectedLabel: item.name || item.displayName || item.model,
      value: item.id,
      description: capability === "image" ? item.imageModel || item.model : item.model,
      meta: supported ? t("aiPage.features.supported") : t("common.disabled"),
      disabled: !supported,
    };
  });
}

function handleModelConfigChange(capability: AiGenerationCapability, value: unknown) {
  const selected = aiStore.selectGenerationModelConfig(capability, String(value));
  if (!selected) {
    triggerToast(getCapabilityUnavailableText(capability) || t("aiPage.features.unsupportedReason"), "warning");
  }
}

function artifactMeta(artifact: AiGenerationArtifact) {
  const parts = [
    artifact.mimeType,
    artifact.sizeBytes ? formatBytes(artifact.sizeBytes) : "",
    artifact.dimensions,
    artifact.durationSeconds ? formatDuration(artifact.durationSeconds * 1000) : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

async function handleGenerate(capability: AiGenerationCapability) {
  try {
    const result = await aiStore.generateAtomicContent(capability);
    triggerToast(result.message, result.ok ? "success" : "error");
  } catch (error) {
    const message = getErrorMessage(error, t("aiPage.features.runFailed"));
    if (/取消|中止|cancel/i.test(message)) {
      triggerToast(t("aiPage.features.cancelled"), "warning");
      return;
    }
    triggerToast(message, "error");
  }
}

async function handleCancel() {
  try {
    const cancelled = await aiStore.cancelAtomicContent();
    triggerToast(
      cancelled ? t("aiPage.features.cancelRequested") : t("aiPage.features.cancelUnavailable"),
      cancelled ? "success" : "warning"
    );
  } catch (error) {
    triggerToast(getErrorMessage(error, t("aiPage.features.cancelFailed")), "error");
  }
}
</script>

<template>
  <section class="ai-feature-panel">
    <header class="feature-header">
      <div class="feature-header__icon">
        <Sparkles class="h-4.5 w-4.5" />
      </div>
      <div class="min-w-0">
        <h3>{{ t("aiPage.features.title") }}</h3>
        <p>{{ t("aiPage.features.desc") }}</p>
      </div>
    </header>

    <div class="atomic-grid">
      <article v-for="item in capabilityCards" :key="item.key" class="atomic-card">
        <header class="atomic-card__head">
          <div class="atomic-card__icon">
            <component :is="item.icon" class="h-4 w-4" />
          </div>
          <div class="min-w-0">
            <h4>{{ t(item.titleKey) }}</h4>
            <p>{{ t(item.descKey) }}</p>
          </div>
          <span
            class="status-pill"
            :class="getCapabilityStatusClass(item.key)"
            :title="getCapabilityUnavailableText(item.key)"
          >
            <BadgeCheck v-if="aiStore.isGenerationCapabilityReady(item.key)" class="h-3.5 w-3.5" />
            <AlertCircle v-else class="h-3.5 w-3.5" />
            {{ getCapabilityStatusLabel(item.key) }}
          </span>
        </header>

        <p v-if="!aiStore.isGenerationCapabilityReady(item.key)" class="config-warning">
          {{ getCapabilityUnavailableText(item.key) }}
        </p>

        <div class="atomic-form">
          <label class="field-block">
            <span class="field-label">{{ t("aiPage.config.listTitle") }}</span>
            <BaseSelect
              :model-value="aiStore.getGenerationModelConfigId(item.key)"
              :options="getCapabilityModelConfigOptions(item.key)"
              @update:model-value="handleModelConfigChange(item.key, $event)"
            />
          </label>

          <label class="field-block">
            <span class="field-label">{{ t("settings.aiProvider.modelLabel") }}</span>
            <BaseInput
              :model-value="aiStore.generationModelOverrides[item.key] || aiStore.getGenerationModel(item.key)"
              :placeholder="aiStore.getGenerationModel(item.key)"
              @update:model-value="aiStore.patchGenerationModelOverride(item.key, String($event))"
            />
          </label>

          <label class="field-block">
            <span class="field-label">{{ t("aiPage.features.promptLabel") }}</span>
            <el-input
              :model-value="aiStore.generationPrompts[item.key]"
              type="textarea"
              :rows="3"
              resize="vertical"
              :placeholder="t('aiPage.features.promptPlaceholder')"
              @update:model-value="aiStore.patchGenerationPrompt(item.key, String($event))"
            />
          </label>

          <div v-if="item.key === 'image'" class="option-row">
            <label class="field-block">
              <span class="field-label">{{ t("aiPage.features.imageSize") }}</span>
              <BaseInput v-model="aiStore.generationImageSize" />
            </label>
            <label class="field-block">
              <span class="field-label">{{ t("aiPage.features.imageCount") }}</span>
              <BaseInput v-model="aiStore.generationImageCount" type="number" min="1" />
            </label>
          </div>

          <div v-else-if="item.key === 'audio'" class="option-row">
            <label class="field-block">
              <span class="field-label">{{ t("aiPage.features.audioVoice") }}</span>
              <BaseInput v-model="aiStore.generationAudioVoice" />
            </label>
            <label class="field-block">
              <span class="field-label">{{ t("aiPage.features.audioFormat") }}</span>
              <BaseInput v-model="aiStore.generationAudioFormat" />
            </label>
          </div>

          <div v-else-if="item.key === 'video'" class="option-row">
            <label class="field-block">
              <span class="field-label">{{ t("aiPage.features.videoSize") }}</span>
              <BaseInput v-model="aiStore.generationVideoSize" />
            </label>
            <label class="field-block">
              <span class="field-label">{{ t("aiPage.features.videoDuration") }}</span>
              <BaseInput v-model="aiStore.generationVideoDurationSeconds" type="number" min="1" max="60" />
            </label>
          </div>
        </div>

        <div class="atomic-card__actions">
          <BaseButton
            v-if="isRunning(item.key)"
            type="danger"
            size="sm"
            outline
            :loading="aiStore.isCancellingAtomicContent"
            :disabled="!aiStore.activeGenerationRequestId"
            @click="handleCancel"
          >
            <template #icon>
              <XCircle class="h-3.5 w-3.5" />
            </template>
            {{ aiStore.isCancellingAtomicContent ? t("aiPage.features.cancelling") : t("aiPage.features.cancel") }}
          </BaseButton>
          <BaseButton
            type="primary"
            size="sm"
            :disabled="!aiStore.isGenerationCapabilityReady(item.key) || aiStore.isGeneratingAtomicContent"
            :title="getCapabilityUnavailableText(item.key)"
            @click="handleGenerate(item.key)"
          >
            <template #icon>
              <Loader2 v-if="isRunning(item.key)" class="h-3.5 w-3.5 animate-spin" />
              <Play v-else class="h-3.5 w-3.5" />
            </template>
            {{ isRunning(item.key) ? t("aiPage.features.running") : t("aiPage.features.run") }}
          </BaseButton>
        </div>

        <div v-if="getResultFor(item.key)" class="result-box" :class="getResultFor(item.key)?.ok ? 'result-box--ok' : 'result-box--fail'">
          <div class="result-box__message">{{ getResultFor(item.key)?.message }}</div>
          <p v-if="getResultFor(item.key)?.text" class="result-box__text">{{ getResultFor(item.key)?.text }}</p>

          <div v-if="getResultFor(item.key)?.artifacts.length" class="artifact-list">
            <div v-for="artifact in getResultFor(item.key)?.artifacts" :key="artifact.path || artifact.url || artifact.kind" class="artifact-item">
              <img v-if="artifact.kind === 'image' && artifact.url" :src="artifact.url" :alt="t('aiPage.features.artifactPreview')" />
              <audio v-else-if="artifact.kind === 'audio' && artifact.url" :src="artifact.url" controls />
              <video v-else-if="artifact.kind === 'video' && artifact.url" :src="artifact.url" controls />
              <div class="artifact-item__meta">
                <span>{{ artifact.kind }}</span>
                <small>{{ artifactMeta(artifact) || artifact.path || artifact.url }}</small>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.ai-feature-panel {
  @apply flex h-full min-h-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30;
}
.feature-header {
  @apply flex shrink-0 items-center gap-3;
}
.feature-header__icon {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300;
}
.feature-header h3 {
  @apply text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200;
}
.feature-header p {
  @apply mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400;
}
.atomic-grid {
  @apply grid grid-cols-1 gap-3 xl:grid-cols-2;
}
.atomic-card {
  @apply flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950;
}
.atomic-card__head {
  @apply flex min-w-0 items-start gap-3;
}
.atomic-card__icon {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300;
}
.atomic-card h4 {
  @apply text-xs font-black text-slate-800 dark:text-slate-200;
}
.atomic-card p {
  @apply mt-1 text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400;
}
.status-pill {
  @apply ml-auto inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[10px] font-black;
}
.status-pill--ok {
  @apply border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300;
}
.status-pill--muted {
  @apply border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400;
}
.status-pill--warning {
  @apply border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300;
}
.config-warning {
  @apply rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300;
}
.atomic-form {
  @apply flex flex-col gap-3;
}
.field-block {
  @apply flex min-w-0 flex-col gap-1.5;
}
.field-label {
  @apply text-[11px] font-black text-slate-700 dark:text-slate-300;
}
.option-row {
  @apply grid grid-cols-1 gap-3 sm:grid-cols-2;
}
.atomic-card__actions {
  @apply flex justify-end gap-2;
}
.result-box {
  @apply rounded-xl border px-3 py-2 text-[11px] font-bold leading-relaxed;
}
.result-box--ok {
  @apply border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300;
}
.result-box--fail {
  @apply border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300;
}
.result-box__message {
  @apply break-words;
}
.result-box__text {
  @apply mt-2 whitespace-pre-wrap rounded-lg bg-white/70 p-2 text-slate-700 dark:bg-slate-950/60 dark:text-slate-200;
}
.artifact-list {
  @apply mt-3 grid grid-cols-1 gap-2;
}
.artifact-item {
  @apply min-w-0 overflow-hidden rounded-xl border border-white/70 bg-white/80 p-2 dark:border-slate-800 dark:bg-slate-950/70;
}
.artifact-item img,
.artifact-item video {
  @apply max-h-56 w-full rounded-lg object-contain;
}
.artifact-item audio {
  @apply w-full;
}
.artifact-item__meta {
  @apply mt-2 flex min-w-0 items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400;
}
.artifact-item__meta span {
  @apply shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300;
}
.artifact-item__meta small {
  @apply min-w-0 truncate;
}
</style>
