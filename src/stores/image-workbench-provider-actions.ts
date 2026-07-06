import type { ComputedRef, Ref } from "vue";
import type { useAiProviderStore } from "./ai-provider";
import { formatTemplate } from "../utils";

interface CreateImageWorkbenchProviderActionsOptions {
  aiProviderStore: ReturnType<typeof useAiProviderStore>;
  imageModelConfigId: ComputedRef<string>;
  imageProviderQueueNeedsUpgrade: ComputedRef<boolean>;
  imageProviderQueueTargetConcurrency: ComputedRef<number>;
  notice: Ref<string>;
  t: (key: string) => string;
  runWithLoading: <T>(runner: () => Promise<T>) => Promise<T>;
  syncImageModelConfig: (configId?: string | null | undefined, requireSupported?: boolean) => boolean;
}

export function createImageWorkbenchProviderActions(options: CreateImageWorkbenchProviderActionsOptions) {
  async function ensureImageProviderConcurrency() {
    await options.aiProviderStore.loadConfig();
    options.syncImageModelConfig();
    if (!options.imageProviderQueueNeedsUpgrade.value) {
      return false;
    }
    const configId = options.imageModelConfigId.value;
    const nextConcurrency = options.imageProviderQueueTargetConcurrency.value;
    options.aiProviderStore.patchModelConfig(configId, {
      queueMode: "concurrent",
      maxConcurrency: nextConcurrency,
    });
    await options.aiProviderStore.saveConfig();
    options.syncImageModelConfig(configId, false);
    options.notice.value = formatTemplate(options.t("imageWorkbench.input.concurrencyEnabledNotice"), {
      count: nextConcurrency,
    });
    return true;
  }

  async function enableImageProviderConcurrency() {
    await options.runWithLoading(async () => {
      await ensureImageProviderConcurrency();
    });
  }

  return {
    enableImageProviderConcurrency,
    ensureImageProviderConcurrency,
  };
}
