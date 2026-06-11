import { defineStore } from "pinia";
import { ref } from "vue";
import { backgroundTaskService } from "../services/background-task.service";
import type { TauriUnlistenFn } from "../services/native-event.service";
import { findByValue, hasByValue, removeByValue } from "../utils";

export interface TaskItem {
  id: string;
  name: string;
  progress: number;
  status: "running" | "success" | "failed";
  message: string;
}

export const useBackgroundTaskStore = defineStore("background-task", () => {
  const tasks = ref<TaskItem[]>([]);
  let unlistenTaskProgress: TauriUnlistenFn | null = null;

  const addTask = (id: string, name: string) => {
    if (hasByValue(tasks.value, (task) => task.id, id)) return;
    tasks.value.push({
      id,
      name,
      progress: 0,
      status: "running",
      message: "Pending...",
    });
  };

  const updateTask = (
    id: string,
    progress: number,
    status: "running" | "success" | "failed",
    message: string
  ) => {
    const task = findByValue(tasks.value, (item) => item.id, id);
    if (task) {
      task.progress = progress;
      task.status = status;
      task.message = message;
    }
  };

  const removeTask = (id: string) => {
    tasks.value = removeByValue(tasks.value, (task) => task.id, id);
  };

  const initTaskListener = async () => {
    if (unlistenTaskProgress) return;

    try {
      unlistenTaskProgress = await backgroundTaskService.listenTaskProgress((payload) => {
        const statusMap: Record<string, TaskItem["status"]> = {
          running: "running",
          success: "success",
          failed: "failed",
        };
        const resolvedStatus = statusMap[payload.status] || "running";

        addTask(payload.task_id, payload.task_name);
        updateTask(
          payload.task_id,
          payload.progress,
          resolvedStatus,
          payload.message
        );
      });
    } catch (err) {
      console.error("[ERR_TASK_LISTENER] failed to initialize task progress listener", err);
    }
  };

  const stopTaskListener = () => {
    if (!unlistenTaskProgress) return;
    unlistenTaskProgress();
    unlistenTaskProgress = null;
  };

  return {
    tasks,
    addTask,
    updateTask,
    removeTask,
    initTaskListener,
    stopTaskListener,
  };
});
