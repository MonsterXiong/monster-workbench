<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { Bot, CheckCircle2, Gauge, KeyRound, Link, ListChecks, Plus, Save, TestTube2, Trash2 } from "lucide-vue-next";
import { useAiStore } from "../../../stores/ai";
import { useI18n } from "../../../composables/useI18n";
import type { AiProviderQueueMode, AiProviderTestAction } from "../../../types/ai";
import { clampNumber, clearIntervalHandle, createInterval, getErrorMessage, takeRightReversed, type IntervalHandle } from "../../../utils";

const aiStore = useAiStore();
const { t } = useI18n();
let queuePollTimer: IntervalHandle | null = null;

const config = computed(() => aiStore.config);
const selectedConfig = computed(() => aiStore.selectedModelConfig);
const queueItems = computed(() => takeRightReversed(aiStore.testQueue, 6));
const queueModeOptions = computed(() => [
  { label: t("settings.aiProvider.queueModeSerial"), value: "serial" },
  { label: t("settings.aiProvider.queueModeConcurrent"), value: "concurrent" },
]);

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
  const configId = action === "image" ? aiStore.activeModelConfigIds.image : aiStore.selectedConfigId;
  return aiStore.isActionBusy(action, configId);
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
    const result = await aiStore.testProvider("image", {
      configId: aiStore.activeModelConfigIds.image,
      imageSize: aiStore.imageDraftSize,
    });
    emit("tested", result.ok, result.message);
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.testFailed")));
  }
}

async function handleDeleteConfig() {
  try {
    await aiStore.deleteModelConfig(aiStore.selectedConfigId);
    emit("tested", true, "模型配置已删除");
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
      <header class="provider-header">
        <div class="provider-header__icon">
          <Bot class="h-4.5 w-4.5" />
        </div>
        <div class="min-w-0">
          <h3>{{ t("settings.aiProvider.title") }}</h3>
          <p>{{ selectedConfig?.name || selectedConfig?.displayName }}</p>
        </div>
      </header>

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

        <label class="field-block">
          <span class="field-label">{{ t("settings.aiProvider.timeoutLabel") }}</span>
          <BaseInput
            :model-value="Math.round(config.timeoutMs / 1000)"
            type="number"
            min="3"
            max="43200"
            :placeholder="t('settings.aiProvider.timeoutPlaceholder')"
            @update:model-value="aiStore.patchConfig({ timeoutMs: clampNumber($event, 3, 43200, 43200, 0) * 1000 })"
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
            max="6"
            :disabled="config.queueMode !== 'concurrent'"
            :placeholder="t('settings.aiProvider.maxConcurrencyPlaceholder')"
            @update:model-value="aiStore.patchConfig({ maxConcurrency: clampNumber($event, 1, 6, 3, 0) })"
          />
        </label>

        <div class="remember-row">
          <div class="min-w-0">
            <div class="field-label">{{ t("settings.aiProvider.rememberKeyLabel") }}</div>
            <div class="field-desc">{{ t("settings.aiProvider.rememberKeyDesc") }}</div>
          </div>
          <button
            type="button"
            class="switch-btn"
            :class="{ 'switch-btn--active': config.rememberApiKey }"
            @click="aiStore.patchConfig({ rememberApiKey: !config.rememberApiKey })"
          >
            <span />
          </button>
        </div>

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
          <BaseButton type="neutral" outline size="sm" :disabled="actionBusy('models')" @click="handleTest('models')">
            <template #icon><ListChecks class="h-3.5 w-3.5" /></template>
            {{ actionButtonLabel("models", t("settings.aiProvider.modelsBtn")) }}
          </BaseButton>
          <BaseButton type="primary" size="sm" :disabled="actionBusy('chat')" @click="handleTest('chat')">
            <template #icon><TestTube2 class="h-3.5 w-3.5" /></template>
            {{ actionButtonLabel("chat", t("settings.aiProvider.testBtn")) }}
          </BaseButton>
          <BaseButton type="success" size="sm" :disabled="actionBusy('image')" @click="handleImageTest">
            <template #icon><TestTube2 class="h-3.5 w-3.5" /></template>
            {{ actionButtonLabel("image", t("settings.aiProvider.imageBtn")) }}
          </BaseButton>
        </div>
      </div>

      <div v-if="queueItems.length" class="queue-list">
        <div v-for="item in queueItems" :key="item.id" class="queue-item">
          <span class="queue-item__title">{{ t(`settings.aiProvider.queueStatus.${item.status}`) }}</span>
          <span class="queue-item__meta">{{ item.result?.message || item.error || item.action }}</span>
        </div>
      </div>

      <div v-if="aiStore.testResult?.models?.length" class="model-list">
        <button
          v-for="modelName in aiStore.testResult.models"
          :key="modelName"
          type="button"
          class="model-chip"
          @click="aiStore.patchConfig({ model: modelName })"
        >
          {{ modelName }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.provider-panel {
  @apply grid min-h-full grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)];
}
.provider-list {
  @apply flex min-h-0 flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30;
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
  @apply flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30;
}
.provider-header {
  @apply flex items-center gap-3;
}
.provider-header__icon {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary;
}
.provider-header h3 {
  @apply text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200;
}
.provider-header p {
  @apply mt-0.5 truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400;
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
.field-desc {
  @apply mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400;
}
.remember-row {
  @apply flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900;
}
.switch-btn {
  @apply relative inline-flex h-5 w-9 shrink-0 rounded-full bg-slate-200 transition-colors dark:bg-slate-700;
}
.switch-btn span {
  @apply inline-block h-5 w-5 rounded-full bg-white shadow transition-transform;
}
.switch-btn--active {
  @apply bg-primary;
}
.switch-btn--active span {
  @apply translate-x-4;
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
.queue-list {
  @apply grid grid-cols-1 gap-2 lg:grid-cols-2;
}
.queue-item {
  @apply flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}
.queue-item__title {
  @apply shrink-0 text-[11px] font-black text-slate-700 dark:text-slate-300;
}
.queue-item__meta {
  @apply min-w-0 truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400;
}
.model-list {
  @apply flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950;
}
.model-chip {
  @apply rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300;
}
</style>
