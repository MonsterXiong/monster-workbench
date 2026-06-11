import { backgroundTaskService } from "./background-task.service";

export const taskService = {
  listenTaskProgress: backgroundTaskService.listenTaskProgress,
};
