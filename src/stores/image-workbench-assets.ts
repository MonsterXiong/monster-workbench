import { ref, type Ref } from "vue";
import { imageWorkbenchService } from "../services/image-workbench.service";
import { DEFAULT_IMAGE_WORKBENCH_ASSET_LIMIT } from "./image-workbench-helpers";
import type { ImageWorkbenchAsset } from "../types/image-workbench";

type ImageWorkbenchAssetLibraryStateContext = {
  error: Ref<string>;
};

export function createImageWorkbenchAssetLibraryState({
  error,
}: ImageWorkbenchAssetLibraryStateContext) {
  const assetLibrary = ref<ImageWorkbenchAsset[]>([]);
  const assetLibraryHasMore = ref(false);
  const assetLibraryLoadingMore = ref(false);

  function mergeAssetLibraryItems(items: ImageWorkbenchAsset[]) {
    const map = new Map<string, ImageWorkbenchAsset>();
    items.forEach((item) => {
      map.set(item.id, item);
    });
    return [...map.values()];
  }

  function queryAssetLibraryPage(offset: number, limit = DEFAULT_IMAGE_WORKBENCH_ASSET_LIMIT) {
    return imageWorkbenchService.queryAssets({
      limit: limit + 1,
      offset,
      sort: "favorite_then_recent",
    });
  }

  function resolveAssetLibraryPage(page: ImageWorkbenchAsset[], limit = DEFAULT_IMAGE_WORKBENCH_ASSET_LIMIT) {
    return {
      items: page.slice(0, limit),
      hasMore: page.length > limit,
    };
  }

  async function refreshAssetLibrary(preserveLoaded = false) {
    const targetCount = preserveLoaded
      ? Math.max(DEFAULT_IMAGE_WORKBENCH_ASSET_LIMIT, assetLibrary.value.length)
      : DEFAULT_IMAGE_WORKBENCH_ASSET_LIMIT;
    const nextAssets: ImageWorkbenchAsset[] = [];
    let offset = 0;
    let hasMore = false;

    while (nextAssets.length < targetCount) {
      const limit = Math.min(DEFAULT_IMAGE_WORKBENCH_ASSET_LIMIT, targetCount - nextAssets.length);
      const resolvedPage = resolveAssetLibraryPage(await queryAssetLibraryPage(offset, limit), limit);
      nextAssets.push(...resolvedPage.items);
      offset += resolvedPage.items.length;
      hasMore = resolvedPage.hasMore;
      if (!resolvedPage.hasMore || !resolvedPage.items.length) {
        break;
      }
    }

    assetLibrary.value = mergeAssetLibraryItems(nextAssets);
    assetLibraryHasMore.value = hasMore;
    return assetLibrary.value;
  }

  async function loadMoreAssetLibrary() {
    if (assetLibraryLoadingMore.value || !assetLibraryHasMore.value) {
      return assetLibrary.value;
    }
    assetLibraryLoadingMore.value = true;
    error.value = "";
    try {
      const beforeCount = assetLibrary.value.length;
      const resolvedPage = resolveAssetLibraryPage(await queryAssetLibraryPage(beforeCount));
      const nextAssets = mergeAssetLibraryItems(assetLibrary.value.concat(resolvedPage.items));
      assetLibrary.value = nextAssets;
      assetLibraryHasMore.value = resolvedPage.hasMore && nextAssets.length > beforeCount;
      return assetLibrary.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      assetLibraryLoadingMore.value = false;
    }
  }

  return {
    assetLibrary,
    assetLibraryHasMore,
    assetLibraryLoadingMore,
    refreshAssetLibrary,
    loadMoreAssetLibrary,
  };
}
