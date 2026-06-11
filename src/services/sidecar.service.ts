import { callTauri } from "./tauri";

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

export const sidecarService = {
  getStatus: () => callTauri<SidecarStatusSnapshot>("get_sidecar_status"),
  startDevHealthServer: () =>
    callTauri<SidecarStatusSnapshot>("start_sidecar_dev_health_server"),
  checkHealth: () => callTauri<SidecarStatusSnapshot>("check_sidecar_health"),
  stopDevHealthServer: () =>
    callTauri<SidecarStatusSnapshot>("stop_sidecar_dev_health_server"),
};
