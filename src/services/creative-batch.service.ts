import { callTauri } from "./tauri";
import {
  nativeEventService,
  type TauriUnlistenFn,
} from "./native-event.service";
import { isTauriRuntime } from "./runtime";
import type {
  CreateBatchImageJobInput,
  CreativeBatchJob,
  CreativeBatchJobEventPayload,
  CreativeBatchJobSnapshot,
  CreativeTask,
  ListCreativeBatchJobsFilter,
} from "./task.service";

export type {
  CreateBatchImageJobInput,
  CreativeBatchJob,
  CreativeBatchJobEventPayload,
  CreativeBatchJobSnapshot,
  CreativeTask,
  ListCreativeBatchJobsFilter,
} from "./task.service";

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

async function listenCreativeBatchEvent(
  eventName: string,
  callback: (payload: CreativeBatchJobEventPayload) => void
): Promise<TauriUnlistenFn | null> {
  if (!isTauriRuntime()) {
    return listenBrowserEvent<CreativeBatchJobEventPayload>(eventName, callback);
  }

  return nativeEventService.listenEvent<CreativeBatchJobEventPayload>(
    eventName,
    (event) => callback(event.payload)
  );
}

export const creativeBatchService = {
  listenBatchJobCreated: (callback: (payload: CreativeBatchJobEventPayload) => void) =>
    listenCreativeBatchEvent("batch-job-created", callback),
  listenBatchJobStatusChanged: (
    callback: (payload: CreativeBatchJobEventPayload) => void
  ) => listenCreativeBatchEvent("batch-job-status-changed", callback),
  listenBatchJobProgress: (callback: (payload: CreativeBatchJobEventPayload) => void) =>
    listenCreativeBatchEvent("batch-job-progress", callback),
  createBatchImageJob: (input: CreateBatchImageJobInput) =>
    callTauri<CreativeBatchJobSnapshot>("create_batch_image_job", { input }),
  listBatchJobs: (filter: ListCreativeBatchJobsFilter = {}) =>
    callTauri<CreativeBatchJob[]>("list_batch_jobs", { filter }),
  getBatchJob: (batchJobId: number) =>
    callTauri<CreativeBatchJobSnapshot>("get_batch_job", { batchJobId }),
  startBatchJob: (batchJobId: number) =>
    callTauri<CreativeBatchJobSnapshot>("start_batch_job", { batchJobId }),
  pauseBatchJob: (batchJobId: number) =>
    callTauri<CreativeBatchJobSnapshot>("pause_batch_job", { batchJobId }),
  resumeBatchJob: (batchJobId: number) =>
    callTauri<CreativeBatchJobSnapshot>("resume_batch_job", { batchJobId }),
  cancelBatchJob: (batchJobId: number) =>
    callTauri<CreativeBatchJobSnapshot>("cancel_batch_job", { batchJobId }),
  listBatchJobTasks: (
    batchJobId: number,
    limit?: number | null,
    offset?: number | null
  ) => callTauri<CreativeTask[]>("list_batch_job_tasks", { batchJobId, limit, offset }),
};
