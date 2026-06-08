import {
  nativeEventService,
  type TauriUnlistenFn,
} from "./native-event.service";

export interface TaskProgressPayload {
  task_id: string;
  task_name: string;
  progress: number;
  status: string;
  message: string;
}

async function listenTaskProgress(
  callback: (payload: TaskProgressPayload) => void
): Promise<TauriUnlistenFn | null> {
  return nativeEventService.listenEvent<TaskProgressPayload>(
    "task-progress",
    (event) => callback(event.payload)
  );
}

export const taskService = {
  listenTaskProgress,
};
