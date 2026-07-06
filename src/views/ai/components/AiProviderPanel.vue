<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { CheckCircle2, Gauge, KeyRound, Link, ListChecks, Plus, Save, TestTube2, Trash2 } from "lucide-vue-next";
import {
  AI_PROVIDER_CAPABILITIES,
  DEFAULT_AI_MAX_CONCURRENCY,
  MAX_AI_MODEL_CONCURRENCY,
} from "../../../stores/ai-provider";
import { useAiStore } from "../../../stores/ai";
import { useI18n } from "../../../composables/useI18n";
import type { AiProviderCapability, AiProviderQueueMode, AiProviderTestAction } from "../../../types/ai";
import {
  clampNumber,
  clearIntervalHandle,
  createInterval,
  formatTemplate,
  getErrorMessage,
  millisecondsToSeconds,
  roundTo,
  secondsToMilliseconds,
  type IntervalHandle,
} from "../../../utils";

const aiStore = useAiStore();
const { t } = useI18n();
let queuePollTimer: IntervalHandle | null = null;

const config = computed(() => aiStore.config);
const queueModeOptions = computed(() => [
  { label: t("settings.aiProvider.queueModeSerial"), value: "serial" },
  { label: t("settings.aiProvider.queueModeConcurrent"), value: "concurrent" },
]);
const capabilityLabelKeys: Record<AiProviderCapability, string> = {
  models: "settings.aiProvider.capabilityModels",
  chat: "settings.aiProvider.capabilityChat",
  image: "settings.aiProvider.capabilityImage",
  txt2img: "settings.aiProvider.capabilityTxt2img",
  img2img: "settings.aiProvider.capabilityImg2img",
  inpaint: "settings.aiProvider.capabilityInpaint",
  upscale_2x: "settings.aiProvider.capabilityUpscale2x",
  upscale_4x: "settings.aiProvider.capabilityUpscale4x",
  person_consistency: "settings.aiProvider.capabilityPersonConsistency",
  audio: "settings.aiProvider.capabilityAudio",
  video: "settings.aiProvider.capabilityVideo",
};
const capabilityOptions = computed(() =>
  AI_PROVIDER_CAPABILITIES.map((capability) => ({
    key: capability,
    label: getCapabilityLabel(capability),
    checked: aiStore.selectedConfigCapabilities.includes(capability),
  }))
);
const activeCapabilityLabels = computed(() =>
  capabilityOptions.value.filter((item) => item.checked).map((item) => item.label)
);
const capabilitySummary = computed(() =>
  activeCapabilityLabels.value.length
    ? activeCapabilityLabels.value.join(" / ")
    : t("settings.aiProvider.capabilityLabel")
);

const emit = defineEmits<{
  (e: "saved"): void;
  (e: "tested", ok: boolean, message: string): void;
  (e: "failed", message: string): void;
}>();

onMounted(() => {
  if (!aiStore.isLoaded) {
    void aiStore.loadConfig();
  }
  void aiStore.refreshBackendQueueStatus();
  queuePollTimer = createInterval(() => {
    void aiStore.refreshBackendQueueStatus();
  }, 1500);
});

onUnmounted(() => {
  clearIntervalHandle(queuePollTimer);
  queuePollTimer = null;
});

function actionBusy(action: AiProviderTestAction) {
  return aiStore.isActionBusy(action, actionConfigId(action));
}

function actionConfigId(_action: AiProviderTestAction) {
  return aiStore.selectedConfigId;
}

function actionSupported(action: AiProviderTestAction) {
  return aiStore.modelConfigSupportsCapability(actionConfigId(action), action);
}

function getCapabilityLabel(capability: AiProviderCapability) {
  return t(capabilityLabelKeys[capability]);
}

function handleCapabilityToggle(capability: AiProviderCapability, checked: boolean) {
  const current = aiStore.selectedConfigCapabilities;
  const next = checked
    ? [...current, capability]
    : current.filter((item) => item !== capability);
  aiStore.patchConfig({ capabilities: next });
}

function actionUnavailableTitle(action: AiProviderTestAction) {
  if (actionSupported(action)) {
    return undefined;
  }
  const label = getCapabilityLabel(action);
  return formatTemplate(t("settings.aiProvider.capabilityUnsupported"), { capability: label });
}

function actionButtonLabel(action: AiProviderTestAction, fallback: string) {
  if (!actionBusy(action)) {
    return fallback;
  }
  const status = aiStore.getActionQueueStatus(action);
  if (status === "running") {
    return t("settings.aiProvider.queueRunning");
  }
  if (status === "queued") {
    return t("settings.aiProvider.queueQueued");
  }
  return fallback;
}

async function handleSave() {
  try {
    await aiStore.saveConfig();
    emit("saved");
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.saveFailed")));
  }
}

async function handleTest(action: AiProviderTestAction) {
  try {
    if (!actionSupported(action)) {
      emit("failed", actionUnavailableTitle(action) || t("settings.aiProvider.testFailed"));
      return;
    }
    const result = await aiStore.testProvider(action, {
      configId: aiStore.selectedConfigId,
    });
    emit("tested", result.ok, result.message);
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.testFailed")));
  }
}

function handleQueueModeChange(value: unknown) {
  const queueMode: AiProviderQueueMode = value === "concurrent" ? "concurrent" : "serial";
  aiStore.patchConfig({ queueMode });
}

async function handleImageTest() {
  try {
    if (!actionSupported("image")) {
      emit("failed", actionUnavailableTitle("image") || t("settings.aiProvider.testFailed"));
      return;
    }
    const result = await aiStore.testProvider("image", {
      configId: aiStore.selectedConfigId,
      imageSize: config.value.imageSize,
      imageCount: config.value.imageCount,
    });
    emit("tested", result.ok, result.message);
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.testFailed")));
  }
}

async function handleDeleteConfig() {
  try {
    await aiStore.deleteModelConfig(aiStore.selectedConfigId);
    emit("tested", true, t("aiPage.config.deleteSuccess"));
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.saveFailed")));
  }
}
</script>

<template>
  <section class="provider-panel">
    <aside class="provider-list">
      <div class="provider-list__head">
        <span>{{ t("aiPage.config.listTitle") }}</span>
        <button type="button" class="icon-btn" @click="aiStore.createModelConfig()">
          <Plus class="h-4 w-4" />
        </button>
      </div>
      <button
        v-for="item in aiStore.modelConfigs"
        :key="item.id"
        type="button"
        class="provider-item"
        :class="{ 'provider-item--active': item.id === aiStore.selectedConfigId }"
        @click="aiStore.selectModelConfig(item.id)"
      >
        <span class="provider-item__name">{{ item.name || item.displayName }}</span>
        <span class="provider-item__meta">{{ item.model }}</span>
      </button>
    </aside>

    <div class="provider-workspace">
      <div class="provider-grid">
        <label class="field-block">
          <span class="field-label">{{ t("settings.aiProvider.providerLabel") }}</span>
          <BaseSelect
            :model-value="config.provider"
            :options="aiStore.providerOptions"
            @update:model-value="aiStore.patchConfig({ provider: $event })"
          />
        </label>

        <label class="field-block">
          <span class="field-label">{{ t("settings.aiProvider.adapterLabel") }}</span>
          <BaseSelect
            :model-value="config.adapterId"
            :options="aiStore.adapterOptions"
            @update:model-value="aiStore.patchConfig({ adapterId: $event })"
          />
        </label>

        <details class="capability-row">
          <summary>
            <span class="field-label">{{ t("settings.aiProvider.capabilityLabel") }}</span>
            <strong :title="capabilitySummary">{{ capabilitySummary }}</strong>
            <small>{{ activeCapabilityLabels.length }}</small>
          </summary>
          <div class="capability-editor">
            <BaseCheckbox
              v-for="item in capabilityOptions"
              :key="item.key"
              :model-value="item.checked"
              :label="item.label"
              compact
              size="xs"
              @update:model-value="handleCapabilityToggle(item.key, $event)"
            />
          </div>
        </details>

        <label class="field-block">
          <span class="field-label">{{ t("settings.aiProvider.displayNameLabel") }}</span>
          <BaseInput
            :model-value="config.displayName"
            :placeholder="t('settings.aiProvider.displayNamePlaceholder')"
            @update:model-value="aiStore.patchConfig({ displayName: String($event) })"
          />
        </label>

        <label class="field-block xl:col-span-2">
          <span class="field-label">
            <Link class="h-3.5 w-3.5" />
            {{ t("settings.aiProvider.baseUrlLabel") }}
          </span>
          <BaseInput
            :model-value="config.baseUrl"
            :placeholder="t('settings.aiProvider.baseUrlPlaceholder')"
            @update:model-value="aiStore.patchConfig({ baseUrl: String($event) })"
          />
        </label>

        <label class="field-block">
          <span class="field-label">
            <KeyRound class="h-3.5 w-3.5" />
            {{ t("settings.aiProvider.apiKeyLabel") }}
          </span>
          <BaseInput
            :model-value="config.apiKey"
            type="password"
            show-password
            :placeholder="t('settings.aiProvider.apiKeyPlaceholder')"
            @update:model-value="aiStore.patchConfig({ apiKey: String($event) })"
          />
        </label>

        <label class="field-block">
          <span class="field-label">{{ t("settings.aiProvider.modelLabel") }}</span>
          <BaseInput
            :model-value="config.model"
            :placeholder="t('settings.aiProvider.modelPlaceholder')"
            @update:model-value="aiStore.patchConfig({ model: String($event) })"
          />
        </label>

        <label v-if="actionSupported('image')" class="field-block">
          <span class="field-label">{{ t("settings.aiProvider.imageModelLabel") }}</span>
          <BaseInput
            :model-value="config.imageModel"
            :placeholder="t('settings.aiProvider.imageModelPlaceholder')"
            @update:model-value="aiStore.patchConfig({ imageModel: String($event) })"
          />
        </label>

        <label class="field-block">
          <span class="field-label">{{ t("settings.aiProvider.timeoutLabel") }}</span>
          <BaseInput
            :model-value="roundTo(millisecondsToSeconds(config.timeoutMs))"
            type="number"
            min="3"
            max="900"
            :placeholder="t('settings.aiProvider.timeoutPlaceholder')"
            @update:model-value="aiStore.patchConfig({ timeoutMs: secondsToMilliseconds(clampNumber($event, 3, 900, 720, 0)) })"
          />
        </label>

        <label class="field-block">
          <span class="field-label">
            <Gauge class="h-3.5 w-3.5" />
            {{ t("settings.aiProvider.queueModeLabel") }}
          </span>
          <BaseSelect
            :model-value="config.queueMode"
            :options="queueModeOptions"
            @update:model-value="handleQueueModeChange"
          />
        </label>

        <label class="field-block">
          <span class="field-label">{{ t("settings.aiProvider.maxConcurrencyLabel") }}</span>
          <BaseInput
            :model-value="config.maxConcurrency"
            type="number"
            min="1"
            :max="MAX_AI_MODEL_CONCURRENCY"
            :disabled="config.queueMode !== 'concurrent'"
            :placeholder="t('settings.aiProvider.maxConcurrencyPlaceholder')"
            @update:model-value="aiStore.patchConfig({ maxConcurrency: clampNumber($event, 1, MAX_AI_MODEL_CONCURRENCY, DEFAULT_AI_MAX_CONCURRENCY, 0) })"
          />
        </label>

        <label class="field-block xl:col-span-2">
          <span class="field-label">{{ t("settings.aiProvider.promptLabel") }}</span>
          <el-input
            :model-value="config.testPrompt"
            type="textarea"
            :rows="3"
            resize="vertical"
            :placeholder="t('settings.aiProvider.promptPlaceholder')"
            @update:model-value="aiStore.patchConfig({ testPrompt: String($event) })"
          />
        </label>
      </div>

      <div class="provider-actions">
        <div
          class="result-box"
          :class="aiStore.testResult ? (aiStore.testResult.ok ? 'result-box--ok' : 'result-box--fail') : 'result-box--idle'"
        >
          <CheckCircle2 class="h-4 w-4 shrink-0" />
          <span>{{ aiStore.testResult ? aiStore.testResult.message : t("settings.aiProvider.resultIdle") }}</span>
        </div>

        <div class="action-group">
          <BaseButton type="danger" outline size="sm" :disabled="aiStore.modelConfigs.length <= 1" @click="handleDeleteConfig">
            <template #icon><Trash2 class="h-3.5 w-3.5" /></template>
            {{ t("common.delete") }}
          </BaseButton>
          <BaseButton type="neutral" outline size="sm" :disabled="aiStore.isTesting" @click="handleSave">
            <template #icon><Save class="h-3.5 w-3.5" /></template>
            {{ t("settings.aiProvider.saveBtn") }}
          </BaseButton>
          <BaseButton type="neutral" outline size="sm" :disabled="!actionSupported('models') || actionBusy('models')" :title="actionUnavailableTitle('models')" @click="handleTest('models')">
            <template #icon><ListChecks class="h-3.5 w-3.5" /></template>
            {{ actionButtonLabel("models", t("settings.aiProvider.modelsBtn")) }}
          </BaseButton>
          <BaseButton type="primary" size="sm" :disabled="!actionSupported('chat') || actionBusy('chat')" :title="actionUnavailableTitle('chat')" @click="handleTest('chat')">
            <template #icon><TestTube2 class="h-3.5 w-3.5" /></template>
            {{ actionButtonLabel("chat", t("settings.aiProvider.testBtn")) }}
          </BaseButton>
          <BaseButton type="success" size="sm" :disabled="!actionSupported('image') || actionBusy('image')" :title="actionUnavailableTitle('image')" @click="handleImageTest">
            <template #icon><TestTube2 class="h-3.5 w-3.5" /></template>
            {{ actionButtonLabel("image", t("settings.aiProvider.imageBtn")) }}
          </BaseButton>
        </div>
      </div>

      <div v-if="aiStore.testResult?.models?.length" class="model-list">
        <div class="model-list__head">
          <span>{{ t("settings.aiProvider.capabilityModels") }}</span>
          <small>{{ aiStore.testResult.models.length }}</small>
        </div>
        <div class="model-list__body" role="list">
          <button
            v-for="modelName in aiStore.testResult.models"
            :key="modelName"
            type="button"
            class="model-chip"
            :class="{ 'is-active': modelName === config.model }"
            :title="modelName"
            role="listitem"
            @click="aiStore.patchConfig({ model: modelName })"
          >
            <span>{{ modelName }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.provider-panel {
  @apply grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[240px_minmax(0,1fr)];
}
.provider-list {
  @apply flex min-h-0 flex-col gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30;
  scrollbar-width: thin;
}
.provider-list__head {
  @apply flex h-8 items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300;
}
.icon-btn {
  @apply flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-primary hover:text-primary dark:border-slate-800 dark:bg-slate-950;
}
.provider-item {
  @apply flex min-h-14 flex-col justify-center gap-1 rounded-xl border border-transparent px-3 py-2 text-left transition-colors hover:border-slate-200 hover:bg-white dark:hover:border-slate-800 dark:hover:bg-slate-950;
}
.provider-item--active {
  @apply border-primary bg-primary/5 text-primary dark:bg-primary/10;
}
.provider-item__name {
  @apply truncate text-xs font-black text-slate-800 dark:text-slate-100;
}
.provider-item__meta {
  @apply truncate text-[10px] font-bold text-slate-500 dark:text-slate-400;
}
.provider-workspace {
  @apply flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30;
  scrollbar-width: thin;
}
.provider-grid {
  @apply grid grid-cols-1 gap-3 xl:grid-cols-2;
}
.field-block {
  @apply flex flex-col gap-1.5;
}
.field-label {
  @apply flex items-center gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300;
}
.capability-row {
  @apply rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900;
}
.capability-row summary {
  @apply flex cursor-pointer select-none items-center gap-2;
}
.capability-row summary::-webkit-details-marker {
  display: none;
}
.capability-row summary strong {
  @apply min-w-0 flex-1 truncate text-[11px] font-bold text-slate-600 dark:text-slate-300;
}
.capability-row summary small {
  @apply inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-black text-primary;
}
.capability-editor {
  @apply mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-3;
}
.provider-actions {
  @apply flex flex-col justify-between gap-3 lg:flex-row lg:items-center;
}
.action-group {
  @apply flex flex-wrap items-center justify-end gap-2;
}
.result-box {
  @apply flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold leading-relaxed;
}
.result-box--idle {
  @apply border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400;
}
.result-box--ok {
  @apply border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300;
}
.result-box--fail {
  @apply border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300;
}
.model-list {
  @apply flex min-h-0 flex-col gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950;
  max-height: min(320px, 34vh);
}
.model-list__head {
  @apply flex h-8 shrink-0 items-center justify-between gap-2 border-b border-slate-100 pb-2 text-[11px] font-black text-slate-700 dark:border-slate-800 dark:text-slate-300;
}
.model-list__head small {
  @apply inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-black text-primary;
}
.model-list__body {
  @apply grid min-h-0 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3;
  scrollbar-width: thin;
}
.model-chip {
  @apply min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-[11px] font-bold text-slate-700 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-primary/10;
}
.model-chip span {
  @apply block truncate;
}
.model-chip.is-active {
  @apply border-primary bg-primary/10 text-primary;
}
</style>
