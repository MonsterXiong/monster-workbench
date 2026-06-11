import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  sidecarService,
  type SidecarRuntimeEvent,
  type SidecarStatusSnapshot,
} from "../services/sidecar.service";
import { getErrorMessage } from "../utils";

const MAX_RUNTIME_EVENTS = 120;

export const useSidecarStore = defineStore("sidecar", () => {
  const status = ref<SidecarStatusSnapshot | null>(null);
  const runtimeInstanceId = ref<string | null>(null);
  const runtimeStartedAt = ref<string | null>(null);
  const runtimeCursor = ref(0);
  const runtimeEvents = ref<SidecarRuntimeEvent[]>([]);
  const runtimeEventLoading = ref(false);
  const runtimeEventError = ref<string | null>(null);

  const recentRuntimeEvents = computed(() =>
    runtimeEvents.value.slice(-10).reverse()
  );

  async function refreshStatus() {
    status.value = await sidecarService.getStatus();
    return status.value;
  }

  async function refreshRuntimeEvents(limit = 50) {
    runtimeEventLoading.value = true;
    runtimeEventError.value = null;
    try {
      const currentStatus = await refreshStatus();
      if (currentStatus.status !== "running") {
        runtimeEventError.value = "sidecar runtime 未运行";
        return;
      }

      let response = await sidecarService.pollRuntimeEvents(
        runtimeCursor.value,
        limit
      );
      const runtimeChanged =
        runtimeInstanceId.value &&
        response.runtimeInstanceId &&
        response.runtimeInstanceId !== runtimeInstanceId.value;
      if (runtimeChanged) {
        runtimeEvents.value = [];
        runtimeCursor.value = 0;
        response = await sidecarService.pollRuntimeEvents(0, limit);
      }

      runtimeInstanceId.value = response.runtimeInstanceId;
      runtimeStartedAt.value = response.runtimeStartedAt;
      runtimeCursor.value = response.nextCursor;
      if (response.events.length > 0) {
        runtimeEvents.value = [...runtimeEvents.value, ...response.events].slice(
          -MAX_RUNTIME_EVENTS
        );
      }
    } catch (error) {
      runtimeEventError.value = getErrorMessage(error, "读取 sidecar runtime events 失败");
    } finally {
      runtimeEventLoading.value = false;
    }
  }

  return {
    status,
    runtimeInstanceId,
    runtimeStartedAt,
    runtimeCursor,
    runtimeEvents,
    runtimeEventLoading,
    runtimeEventError,
    recentRuntimeEvents,
    refreshStatus,
    refreshRuntimeEvents,
  };
});
