import { computed, ref, type ComputedRef } from "vue";
import { imageWorkbenchService } from "../services/image-workbench.service";
import type { ImageWorkbenchAsset, ImageWorkbenchGroup } from "../types/image-workbench";

export function createImageWorkbenchGroupState(options: {
  selectedAsset: ComputedRef<ImageWorkbenchAsset | null>;
}) {
  const currentGroups = ref<ImageWorkbenchGroup[]>([]);
  const libraryGroups = ref<ImageWorkbenchGroup[]>([]);
  const loadedLibraryGroupJobIds = ref<string[]>([]);
  const libraryGroupById = computed(() => {
    const map = new Map(libraryGroups.value.map((group) => [group.id, group]));
    currentGroups.value.forEach((group) => {
      map.set(group.id, group);
    });
    return map;
  });
  const selectedAssetGroup = computed(() =>
    options.selectedAsset.value?.groupId
      ? libraryGroupById.value.get(options.selectedAsset.value.groupId) ?? null
      : null
  );
  const currentJobPrimaryGroup = computed(() => currentGroups.value[0] ?? null);

  function mergeLibraryGroups(groups: ImageWorkbenchGroup[]) {
    const map = new Map(libraryGroups.value.map((group) => [group.id, group]));
    groups.forEach((group) => {
      map.set(group.id, group);
    });
    libraryGroups.value = [...map.values()];
  }

  async function syncCurrentGroups(jobId: string) {
    if (!jobId) {
      currentGroups.value = [];
      return [];
    }
    currentGroups.value = await imageWorkbenchService.listGroups(jobId);
    loadedLibraryGroupJobIds.value = Array.from(new Set(loadedLibraryGroupJobIds.value.concat(jobId)));
    mergeLibraryGroups(currentGroups.value);
    return currentGroups.value;
  }

  async function syncLibraryGroupsForJobIds(jobIds: string[], force = false) {
    const loaded = new Set(loadedLibraryGroupJobIds.value);
    const pendingJobIds = Array.from(new Set(jobIds.map((item) => item.trim()).filter(Boolean)))
      .filter((jobId) => force || !loaded.has(jobId));
    if (!pendingJobIds.length) {
      return libraryGroups.value;
    }

    const results = await Promise.allSettled(
      pendingJobIds.map(async (jobId) => ({
        jobId,
        groups: await imageWorkbenchService.listGroups(jobId),
      }))
    );
    const nextGroups: ImageWorkbenchGroup[] = [];
    const loadedJobIds = [...loadedLibraryGroupJobIds.value];
    results.forEach((result) => {
      if (result.status !== "fulfilled") {
        return;
      }
      loadedJobIds.push(result.value.jobId);
      nextGroups.push(...result.value.groups);
    });
    loadedLibraryGroupJobIds.value = Array.from(new Set(loadedJobIds));
    mergeLibraryGroups(nextGroups);
    return libraryGroups.value;
  }

  function clearCurrentGroups() {
    currentGroups.value = [];
  }

  return {
    currentGroups,
    libraryGroups,
    libraryGroupById,
    selectedAssetGroup,
    currentJobPrimaryGroup,
    syncCurrentGroups,
    syncLibraryGroupsForJobIds,
    clearCurrentGroups,
  };
}
