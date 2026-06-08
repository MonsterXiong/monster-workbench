<script setup lang="ts">
import { useI18n } from "../../../composables/useI18n";
import { formatDate, formatTemplate, truncateText } from "../../../utils";
import type {
  ErrorMonitorEntry,
  ErrorReviewStatus,
} from "../../../stores/error-monitor";

const { t } = useI18n();

defineProps<{
  errorCards: ErrorMonitorEntry[];
  totalCount: number;
  pendingCount: number;
  needsReviewCount: number;
  resolvedCount: number;
  statusFilter: "all" | ErrorReviewStatus;
}>();

const emit = defineEmits<{
  (e: "trace", err: ErrorMonitorEntry): void;
  (e: "update:statusFilter", filter: "all" | ErrorReviewStatus): void;
  (e: "mark-resolved", fingerprint: string): void;
  (e: "mark-needs-review", fingerprint: string): void;
  (e: "mark-pending", fingerprint: string): void;
}>();

const statusTabs: Array<{ key: "all" | ErrorReviewStatus; labelKey: string }> = [
  { key: "all", labelKey: "system.reviewStatusAll" },
  { key: "pending", labelKey: "system.reviewStatusPending" },
  { key: "needs_review", labelKey: "system.reviewStatusReview" },
  { key: "resolved", labelKey: "system.reviewStatusResolved" },
];

function getStatusBadgeClass(status: ErrorReviewStatus) {
  if (status === "resolved") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
  }

  if (status === "needs_review") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
  }

  return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20";
}

function getStatusLabel(status: ErrorReviewStatus) {
  if (status === "resolved") {
    return t("system.reviewStatusResolved");
  }

  if (status === "needs_review") {
    return t("system.reviewStatusReview");
  }

  return t("system.reviewStatusPending");
}

function formatReviewTime(value: string) {
  return formatDate(value, "YYYY-MM-DD HH:mm:ss", value);
}
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0">
    <div class="shrink-0 space-y-3 pb-4">
      <div class="flex flex-wrap gap-2">
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
          {{ formatTemplate(t('system.totalErrorCount'), { count: totalCount }) }}
        </div>
        <div class="rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50 dark:bg-sky-950/30 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
          {{ formatTemplate(t('system.pendingErrorCount'), { count: pendingCount }) }}
        </div>
        <div class="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          {{ formatTemplate(t('system.reviewErrorCount'), { count: needsReviewCount }) }}
        </div>
        <div class="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          {{ formatTemplate(t('system.resolvedErrorCount'), { count: resolvedCount }) }}
        </div>
      </div>

      <div class="flex flex-wrap gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-1">
        <button
          v-for="tab in statusTabs"
          :key="tab.key"
          class="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
          :class="statusFilter === tab.key ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'"
          @click="emit('update:statusFilter', tab.key)"
        >
          {{ t(tab.labelKey) }}
        </button>
      </div>
    </div>

    <div v-if="totalCount === 0" class="my-auto">
      <BaseEmpty :description="t('system.crashTip')" icon="CheckCircle" />
    </div>
    <div v-else-if="errorCards.length === 0" class="my-auto">
      <BaseEmpty :description="t('system.emptyFilteredErrors')" icon="Filter" />
    </div>
    <div v-else class="flex-1 min-h-0 overflow-y-auto pr-1">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
      <div
        v-for="(err, idx) in errorCards"
        :key="idx"
        class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-red-500/20 dark:border-red-950/40 hover:border-red-500/60 transition duration-200 shadow-sm flex flex-col justify-between hover:shadow"
      >
        <div>
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2 select-none">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2 py-0.5 bg-red-500/10 dark:bg-red-950/40 text-[9.5px] border border-red-500/20 text-red-600 dark:text-red-400 font-bold rounded-full">
                {{ err.errorType }}
              </span>
              <span class="px-2 py-0.5 text-[9.5px] border rounded-full font-bold" :class="getStatusBadgeClass(err.status)">
                {{ getStatusLabel(err.status) }}
              </span>
            </div>
            <span class="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{{ err.time }}</span>
          </div>
          <div class="mb-2 flex flex-wrap items-center gap-1.5">
            <span class="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[9.5px] font-mono text-slate-500 dark:text-slate-300">
              {{ err.errorCode }}
            </span>
          </div>
          <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed break-all">
            {{ err.message }}
          </h4>
        </div>
        <div class="mt-4 border-t border-slate-100 dark:border-slate-800 pt-2 shrink-0 select-none space-y-2">
          <div class="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed break-all">
            {{ t('system.sentinelTrace') }}:
            {{ err.details ? truncateText(err.details, 59) : t('system.noStackDetails') }}
          </div>
          <div v-if="err.statusUpdatedAt" class="text-[10px] text-slate-400 dark:text-slate-500">
            {{ formatTemplate(t('system.reviewUpdatedAt'), { time: formatReviewTime(err.statusUpdatedAt) }) }}
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap gap-2">
              <BaseButton
                v-if="err.status !== 'resolved'"
                size="xs"
                type="success"
                outline
                @click="emit('mark-resolved', err.fingerprint)"
              >
                {{ t('system.markResolved') }}
              </BaseButton>
              <BaseButton
                v-if="err.status !== 'needs_review'"
                size="xs"
                type="warning"
                outline
                @click="emit('mark-needs-review', err.fingerprint)"
              >
                {{ t('system.markNeedsReview') }}
              </BaseButton>
              <BaseButton
                v-if="err.status !== 'pending'"
                size="xs"
                type="ghost"
                @click="emit('mark-pending', err.fingerprint)"
              >
                {{ t('system.markPending') }}
              </BaseButton>
            </div>
            <BaseButton size="xs" type="ghost" @click="emit('trace', err)">
              {{ t('system.traceTitle') }}
            </BaseButton>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>
