import { defineStore } from "pinia";
import { ref } from "vue";
import {
  creativeProjectService,
  type CreativeProject,
  type ListCreativeProjectsFilter,
  type UpsertCreativeProjectInput,
} from "../services/creative-project.service";
import {
  creativeTaskService,
  type CreativeTask,
} from "../services/creative-task.service";
import {
  creativeAssetService,
  type CreativeAsset,
} from "../services/creative-asset.service";
import {
  creativeGoalService,
  type CreativeGoal,
} from "../services/creative-goal.service";
import {
  creativeBatchService,
  type CreativeBatchJob,
} from "../services/creative-batch.service";

export const useCreativeProjectStore = defineStore("creative-project", () => {
  const creativeProjects = ref<CreativeProject[]>([]);
  const creativeProjectIndexTasks = ref<CreativeTask[]>([]);
  const creativeProjectIndexAssets = ref<CreativeAsset[]>([]);
  const creativeProjectIndexGoals = ref<CreativeGoal[]>([]);
  const creativeProjectIndexBatchJobs = ref<CreativeBatchJob[]>([]);
  const creativeProjectHistoryTasks = ref<CreativeTask[]>([]);
  const creativeProjectHistoryAssets = ref<CreativeAsset[]>([]);
  const creativeProjectHistoryGoals = ref<CreativeGoal[]>([]);
  const creativeProjectHistoryBatchJobs = ref<CreativeBatchJob[]>([]);
  const creativeProjectHistoryLoading = ref(false);
  const creativeProjectHistoryError = ref<string | null>(null);

  const loadCreativeProjects = async (filter: ListCreativeProjectsFilter = {}) => {
    creativeProjects.value = await creativeProjectService.listProjects({
      limit: 200,
      ...filter,
    });
    return creativeProjects.value;
  };

  const upsertCreativeProject = async (input: UpsertCreativeProjectInput) => {
    return creativeProjectService.upsertProject(input);
  };

  const ensureCreativeProjectSeeds = async (
    seeds: Array<{
      projectId: string;
      title: string;
      description?: string | null;
      status?: string | null;
      settingsJson?: string | null;
      budgetJson?: string | null;
    }>
  ) => {
    const existingProjects = await Promise.all(
      seeds.map((seed) => creativeProjectService.getProject(seed.projectId))
    );
    const missingSeeds = seeds.filter((_, index) => !existingProjects[index]);

    if (missingSeeds.length > 0) {
      await Promise.all(
        missingSeeds.map((seed) =>
          creativeProjectService.upsertProject({
            id: seed.projectId,
            title: seed.title,
            description: seed.description ?? null,
            status: seed.status ?? "active",
            settingsJson: seed.settingsJson ?? null,
            budgetJson: seed.budgetJson ?? null,
          })
        )
      );
    }

    return loadCreativeProjects();
  };

  const loadCreativeProjectIndex = async () => {
    const [indexTasks, indexAssets, indexGoals, indexBatchJobs] = await Promise.all([
      creativeTaskService.listCreativeTasks({ limit: 200 }),
      creativeAssetService.listCreativeAssets({ limit: 200 }),
      creativeGoalService.listCreativeGoals({ limit: 100 }),
      creativeBatchService.listBatchJobs({ limit: 100 }),
    ]);

    creativeProjectIndexTasks.value = indexTasks;
    creativeProjectIndexAssets.value = indexAssets;
    creativeProjectIndexGoals.value = indexGoals;
    creativeProjectIndexBatchJobs.value = indexBatchJobs;

    return {
      tasks: indexTasks,
      assets: indexAssets,
      goals: indexGoals,
      batchJobs: indexBatchJobs,
    };
  };

  const loadCreativeProjectHistory = async (projectId: string | null) => {
    creativeProjectHistoryLoading.value = true;
    creativeProjectHistoryError.value = null;

    try {
      const filter = projectId ? { projectId } : {};
      const [historyTasks, historyAssets, historyGoals, historyBatchJobs] = await Promise.all([
        creativeTaskService.listCreativeTasks({ ...filter, limit: 80 }),
        creativeAssetService.listCreativeAssets({ ...filter, limit: 80 }),
        creativeGoalService.listCreativeGoals({ ...filter, limit: 40 }),
        creativeBatchService.listBatchJobs({ ...filter, limit: 40 }),
      ]);

      creativeProjectHistoryTasks.value = historyTasks;
      creativeProjectHistoryAssets.value = historyAssets;
      creativeProjectHistoryGoals.value = historyGoals;
      creativeProjectHistoryBatchJobs.value = historyBatchJobs;
      return {
        tasks: historyTasks,
        assets: historyAssets,
        goals: historyGoals,
        batchJobs: historyBatchJobs,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "load creative project history failed";
      creativeProjectHistoryError.value = message;
      throw error;
    } finally {
      creativeProjectHistoryLoading.value = false;
    }
  };

  return {
    creativeProjects,
    creativeProjectIndexTasks,
    creativeProjectIndexAssets,
    creativeProjectIndexGoals,
    creativeProjectIndexBatchJobs,
    creativeProjectHistoryTasks,
    creativeProjectHistoryAssets,
    creativeProjectHistoryGoals,
    creativeProjectHistoryBatchJobs,
    creativeProjectHistoryLoading,
    creativeProjectHistoryError,
    loadCreativeProjects,
    upsertCreativeProject,
    ensureCreativeProjectSeeds,
    loadCreativeProjectIndex,
    loadCreativeProjectHistory,
  };
});
