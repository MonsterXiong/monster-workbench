import { defineStore } from "pinia";
import { ref } from "vue";
import {
  creativeGoalService,
  type CreateCreativeGoalInput,
  type CreateGoalMultiAgentStubInput,
  type CreativeGoal,
  type CreativeGoalRole,
  type CreativeGoalStatusSnapshot,
} from "../services/creative-goal.service";
import type { CreativeTask } from "../services/creative-types";

export type {
  CreativeGoal,
  CreativeGoalRole as CreativeRoleSpec,
} from "../services/creative-goal.service";

export const useCreativeGoalStore = defineStore("creative-goal", () => {
  const goalResult = ref<CreativeGoal | null>(null);
  const goalRoleResults = ref<CreativeGoalRole[]>([]);
  const goalTaskResults = ref<CreativeTask[]>([]);
  const goalStatusSnapshot = ref<CreativeGoalStatusSnapshot | null>(null);
  const goalError = ref<string | null>(null);
  const goalRunning = ref(false);

  const createCreativeGoal = async (input: CreateCreativeGoalInput) => {
    return creativeGoalService.createCreativeGoal(input);
  };

  const runGoalMultiAgentStub = async (input: CreateGoalMultiAgentStubInput) => {
    goalError.value = null;
    goalRunning.value = true;

    try {
      const result = await creativeGoalService.createGoalMultiAgentStub(input);
      goalResult.value = result.goal;
      goalRoleResults.value = result.roles;
      goalTaskResults.value = [
        ...result.tasks,
        ...(result.mergeTask ? [result.mergeTask] : []),
      ];
      goalStatusSnapshot.value = await creativeGoalService.getGoalStatus(result.goal.id);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "goal multi-agent stub failed";
      goalError.value = message;
      throw error;
    } finally {
      goalRunning.value = false;
    }
  };

  const refreshGoalStatus = async (goalId: number) => {
    goalStatusSnapshot.value = await creativeGoalService.getGoalStatus(goalId);
    return goalStatusSnapshot.value;
  };

  const stopCreativeGoal = async (goalId: number) => {
    goalStatusSnapshot.value = await creativeGoalService.stopCreativeGoal(goalId);
    goalResult.value = goalStatusSnapshot.value.goal;
    return goalStatusSnapshot.value;
  };

  return {
    goalResult,
    goalRoleResults,
    goalTaskResults,
    goalStatusSnapshot,
    goalError,
    goalRunning,
    createCreativeGoal,
    runGoalMultiAgentStub,
    refreshGoalStatus,
    stopCreativeGoal,
  };
});
