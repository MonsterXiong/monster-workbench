import { callTauri } from "./tauri";
import type {
  CreateCreativeAssetInput,
  CreateCreativeAssetLinkInput,
  CreativeAsset,
  CreativeAssetLink,
  ListCreativeAssetLinksFilter,
  ListCreativeAssetsFilter,
} from "./creative-types";

export type {
  CreateCreativeAssetInput,
  CreateCreativeAssetLinkInput,
  CreativeAsset,
  CreativeAssetLink,
  ListCreativeAssetLinksFilter,
  ListCreativeAssetsFilter,
} from "./creative-types";

export const creativeAssetService = {
  createCreativeAsset: (input: CreateCreativeAssetInput) =>
    callTauri<CreativeAsset>("create_creative_asset", { input }),
  listCreativeAssets: (filter: ListCreativeAssetsFilter = {}) =>
    callTauri<CreativeAsset[]>("list_creative_assets", { filter }),
  createCreativeAssetLink: (input: CreateCreativeAssetLinkInput) =>
    callTauri<CreativeAssetLink>("create_asset_link", { input }),
  listCreativeAssetLinks: (filter: ListCreativeAssetLinksFilter = {}) =>
    callTauri<CreativeAssetLink[]>("list_asset_links", { filter }),
};
