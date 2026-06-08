import { defineStore } from "pinia";
import { ref } from "vue";
import { taskService } from "../services/task.service";
import type { TauriUnlistenFn } from "../services/native-event.service";

export interface TaskItem {
  id: string;
  name: string;
  progress: number;
  status: "running" | "success" | "failed";
  message: string;
}

export const useTaskStore = defineStore("task", () => {
  const tasks = ref<TaskItem[]>([]);
  let unlistenTaskProgress: TauriUnlistenFn | null = null;

  const addTask = (id: string, name: string) => {
    if (tasks.value.some((t) => t.id === id)) return;
    tasks.value.push({
      id,
      name,
      progress: 0,
      status: "running",
      message: "等待中...",
    });
  };

  const updateTask = (
    id: string,
    progress: number,
    status: "running" | "success" | "failed",
    message: string
  ) => {
    const task = tasks.value.find((t) => t.id === id);
    if (task) {
      task.progress = progress;
      task.status = status;
      task.message = message;
    }
  };

  const removeTask = (id: string) => {
    tasks.value = tasks.value.filter((t) => t.id !== id);
  };

  // 初始化监听底座主动广播的任务变化
  const initTaskListener = async () => {
    if (unlistenTaskProgress) return;

    try {
      unlistenTaskProgress = await taskService.listenTaskProgress((payload) => {
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
      console.error("[ERR_TASK_LISTENER] 初始化后台任务进度监听失败:", err);
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
