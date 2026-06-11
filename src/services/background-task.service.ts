import { nativeEventService, type TauriUnlistenFn } from "./native-event.service";
import { isTauriRuntime } from "./runtime";

export interface TaskProgressPayload {
  task_id: string;
  task_name: string;
  progress: number;
  status: string;
  message: string;
}

function listenBrowserEvent(
  eventName: string,
  callback: (payload: TaskProgressPayload) => void
): TauriUnlistenFn {
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<TaskProgressPayload>;
    callback(customEvent.detail);
  };
  window.addEventListener(eventName, listener as EventListener);
  return async () => {
    window.removeEventListener(eventName, listener as EventListener);
  };
}

export const backgroundTaskService = {
  listenTaskProgress: async (
    callback: (payload: TaskProgressPayload) => void
  ): Promise<TauriUnlistenFn | null> => {
    if (!isTauriRuntime()) {
      return listenBrowserEvent("task-progress", callback);
    }

    return nativeEventService.listenEvent<TaskProgressPayload>(
      "task-progress",
      (event) => callback(event.payload)
    );
  },
};
