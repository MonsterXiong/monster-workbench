import { callTauri } from "./tauri";
import {
  nativeEventService,
  type TauriUnlistenFn,
} from "./native-event.service";
import { isTauriRuntime } from "./runtime";

export interface SidecarStatusSnapshot {
  status: string;
  port: number | null;
  pid: number | null;
  lastError: string | null;
  startedAt: string | null;
  checkedAt: string | null;
  recoveryFailureCount: number;
  lastRecoveryFailureAt: string | null;
  recoveryBackoffRemainingMs: number | null;
}

export interface SidecarStatusEventPayload extends SidecarStatusSnapshot {
  eventType: string;
  message: string | null;
  createdAt: string;
}

export interface SidecarRuntimeEvent {
  id: number;
  runtimeInstanceId: string | null;
  runtimeStartedAt: string | null;
  taskId: number | null;
  workflowType: string | null;
  eventType: string;
  message: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface SidecarRuntimeEventsResponse {
  ok: boolean;
  runtimeInstanceId: string | null;
  runtimeStartedAt: string | null;
  nextCursor: number;
  events: SidecarRuntimeEvent[];
}

function listenBrowserEvent<T>(
  eventName: string,
  callback: (payload: T) => void
): TauriUnlistenFn {
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<T>;
    callback(customEvent.detail);
  };
  window.addEventListener(eventName, listener as EventListener);
  return async () => {
    window.removeEventListener(eventName, listener as EventListener);
  };
}

async function listenSidecarStatusChanged(
  callback: (payload: SidecarStatusEventPayload) => void
): Promise<TauriUnlistenFn | null> {
  const eventName = "creative-sidecar-status-changed";
  if (!isTauriRuntime()) {
    return listenBrowserEvent<SidecarStatusEventPayload>(eventName, callback);
  }

  return nativeEventService.listenEvent<SidecarStatusEventPayload>(
    eventName,
    (event) => callback(event.payload)
  );
}

export const sidecarService = {
  getStatus: () => callTauri<SidecarStatusSnapshot>("get_sidecar_status"),
  startDevHealthServer: () =>
    callTauri<SidecarStatusSnapshot>("start_sidecar_dev_health_server"),
  checkHealth: () => callTauri<SidecarStatusSnapshot>("check_sidecar_health"),
  stopDevHealthServer: () =>
    callTauri<SidecarStatusSnapshot>("stop_sidecar_dev_health_server"),
  pollRuntimeEvents: (after = 0, limit = 100) =>
    callTauri<SidecarRuntimeEventsResponse>("poll_sidecar_runtime_events", {
      after,
      limit,
    }),
  listenStatusChanged: listenSidecarStatusChanged,
};
