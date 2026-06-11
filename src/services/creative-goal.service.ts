import { callTauri } from "./tauri";
import type {
  CreateCreativeGoalInput,
  CreateGoalMultiAgentStubInput,
  CreativeGoal,
  CreativeGoalStatusSnapshot,
  GoalMultiAgentStubResult,
  ListCreativeGoalsFilter,
} from "./task.service";

export type {
  CreateCreativeGoalInput,
  CreateGoalMultiAgentStubInput,
  CreativeGoal,
  CreativeGoalRole,
  CreativeGoalStatusSnapshot,
  GoalMultiAgentStubResult,
  ListCreativeGoalsFilter,
} from "./task.service";

export const creativeGoalService = {
  createCreativeGoal: (input: CreateCreativeGoalInput) =>
    callTauri<CreativeGoal>("create_creative_goal", { input }),
  listCreativeGoals: (filter: ListCreativeGoalsFilter = {}) =>
    callTauri<CreativeGoal[]>("list_creative_goals", { filter }),
  createGoalMultiAgentStub: (input: CreateGoalMultiAgentStubInput) =>
    callTauri<GoalMultiAgentStubResult>("create_goal_multi_agent_stub", { input }),
  getGoalStatus: (goalId: number) =>
    callTauri<CreativeGoalStatusSnapshot>("get_goal_status", { goalId }),
  stopCreativeGoal: (goalId: number) =>
    callTauri<CreativeGoalStatusSnapshot>("stop_creative_goal", { goalId }),
};
