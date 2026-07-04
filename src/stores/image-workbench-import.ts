import type { Ref } from "vue";
import { imageWorkbenchService } from "../services/image-workbench.service";
import { formatTemplate } from "../utils";
import type { ImportImageWorkbenchGeneratedAssetsResult } from "../types/image-workbench";
import { useSystemStore } from "./system";

interface ImageWorkbenchImportActionsContext {
  notice: Ref<string>;
  refreshWorkbenchLists: () => Promise<void>;
  runWithLoading: <T>(runner: () => Promise<T>) => Promise<T>;
  selectJob: (jobId: string) => Promise<unknown>;
  t: (key: string) => string;
}

export function createImageWorkbenchImportActions({
  notice,
  refreshWorkbenchLists,
  runWithLoading,
  selectJob,
  t,
}: ImageWorkbenchImportActionsContext) {
  const systemStore = useSystemStore();

  async function importGeneratedAssetsFromFolder() {
    return runWithLoading(async () => {
      const directoryPath = await systemStore.selectPath("folder");
      if (!directoryPath) {
        return null;
      }
      const result = await imageWorkbenchService.importGeneratedAssets({ directoryPath });
      await refreshWorkbenchLists();
      if (result.jobId) {
        await selectJob(result.jobId);
      }
      notice.value = buildGeneratedAssetsImportNotice(result, t);
      return result;
    });
  }

  return { importGeneratedAssetsFromFolder };
}

function buildGeneratedAssetsImportNotice(
  result: ImportImageWorkbenchGeneratedAssetsResult,
  t: (key: string) => string
) {
  if (!result.scanned) {
    return t("imageWorkbench.assetImport.summaryEmpty");
  }
  return formatTemplate(t("imageWorkbench.assetImport.summary"), {
    scanned: result.scanned,
    imported: result.imported,
    duplicates: result.duplicates,
    missing: result.missing,
    corrupt: result.corrupt,
    failed: result.failed,
  });
}
