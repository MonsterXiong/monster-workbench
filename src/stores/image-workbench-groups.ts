import { computed, ref, type ComputedRef } from "vue";
import { imageWorkbenchService } from "../services/image-workbench.service";
import type { ImageWorkbenchAsset, ImageWorkbenchGroup } from "../types/image-workbench";

export function createImageWorkbenchGroupState(options: {
  selectedAsset: ComputedRef<ImageWorkbenchAsset | null>;
}) {
  const currentGroups = ref<ImageWorkbenchGroup[]>([]);
  const selectedAssetGroup = computed(() =>
    options.selectedAsset.value?.groupId
      ? currentGroups.value.find((group) => group.id === options.selectedAsset.value?.groupId) ?? null
      : null
  );
  const currentJobPrimaryGroup = computed(() => currentGroups.value[0] ?? null);

  async function syncCurrentGroups(jobId: string) {
    if (!jobId) {
      currentGroups.value = [];
      return [];
    }
    currentGroups.value = await imageWorkbenchService.listGroups(jobId);
    return currentGroups.value;
  }

  function clearCurrentGroups() {
    currentGroups.value = [];
  }

  return {
    currentGroups,
    selectedAssetGroup,
    currentJobPrimaryGroup,
    syncCurrentGroups,
    clearCurrentGroups,
  };
}
