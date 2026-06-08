import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  errorMonitorService,
  type ErrorMonitorEntry,
  type ErrorReviewStatus,
} from "../services/error-monitor.service";
import { countBy, countWhere, filterByValue, findByValue } from "../utils";

export type { ErrorMonitorEntry, ErrorReviewStatus };

export const useErrorMonitorStore = defineStore("error-monitor", () => {
  const entries = ref<ErrorMonitorEntry[]>([]);
  const statusFilter = ref<"all" | ErrorReviewStatus>("all");

  const statusCounts = computed(() => countBy(entries.value, (entry) => entry.status));
  const pendingCount = computed(() => statusCounts.value.pending ?? 0);
  const needsReviewCount = computed(() => statusCounts.value.needs_review ?? 0);
  const resolvedCount = computed(() => statusCounts.value.resolved ?? 0);
  const actionableCount = computed(() => countWhere(entries.value, (entry) => entry.status !== "resolved"));

  const filteredEntries = computed(() => {
    if (statusFilter.value === "all") {
      return entries.value;
    }

    return filterByValue(entries.value, (entry) => entry.status, statusFilter.value);
  });

  const syncFromLogLines = (logLines: string[]) => {
    entries.value = errorMonitorService.buildEntries(logLines);
  };

  const setStatusFilter = (filter: "all" | ErrorReviewStatus) => {
    statusFilter.value = filter;
  };

  const updateEntryStatus = (fingerprint: string, status: ErrorReviewStatus) => {
    const statusUpdatedAt = errorMonitorService.updateReviewStatus(fingerprint, status);
    const target = findByValue(entries.value, (entry) => entry.fingerprint, fingerprint);
    if (target) {
      target.status = status;
      target.statusUpdatedAt = statusUpdatedAt;
    }
  };

  const resetReviewState = () => {
    errorMonitorService.clearReviewState();
    entries.value = entries.value.map((entry) => ({
      ...entry,
      status: "pending",
      statusUpdatedAt: null,
    }));
  };

  return {
    entries,
    statusFilter,
    pendingCount,
    needsReviewCount,
    resolvedCount,
    actionableCount,
    filteredEntries,
    syncFromLogLines,
    setStatusFilter,
    updateEntryStatus,
    resetReviewState,
  };
});
