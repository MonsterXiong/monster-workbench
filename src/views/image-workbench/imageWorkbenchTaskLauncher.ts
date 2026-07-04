import { markRaw, type Component } from "vue";
import { BookTemplate, Eraser, ImagePlus, Images, Sparkles, Star } from "lucide-vue-next";

export type ImageWorkbenchTaskEntryKey = "create" | "reference" | "edit" | "upscale" | "person" | "style";

export type ImageWorkbenchTaskPresetGroupKey =
  | "business"
  | "food"
  | "reference"
  | "repair"
  | "person"
  | "style";

export type ImageWorkbenchTaskPresetKey =
  | "socialPoster"
  | "foodCloseup"
  | "menuDish"
  | "deliveryHero"
  | "restaurantMood"
  | "productHero"
  | "referenceFusion"
  | "referenceProductFusion"
  | "referencePortraitFusion"
  | "referenceMoodFusion"
  | "sameComposition"
  | "styleVariant"
  | "fixHands"
  | "fixFace"
  | "fixProp"
  | "changeBackground"
  | "removeFlaw"
  | "characterTurnaround"
  | "expressionCloseup"
  | "expressionGrid"
  | "characterShotSet"
  | "outfitVariation"
  | "personReferenceFusion"
  | "animeStyle"
  | "styleFoodCloseup"
  | "commercialPoster"
  | "comicAvatar"
  | "ipSticker"
  | "upscalePortrait"
  | "upscaleProduct"
  | "upscaleArtwork";

export interface ImageWorkbenchTaskEntry {
  key: ImageWorkbenchTaskEntryKey;
  icon: Component;
  title: string;
  description: string;
}

export interface ImageWorkbenchTaskPreset {
  key: ImageWorkbenchTaskPresetKey;
  entryKey: ImageWorkbenchTaskEntryKey;
  label: string;
  groupKey: ImageWorkbenchTaskPresetGroupKey;
  groupLabel: string;
  promptKey: string;
}

export interface ImageWorkbenchTaskPresetConfig {
  key: ImageWorkbenchTaskPresetKey;
  entryKey: ImageWorkbenchTaskEntryKey;
  groupKey: ImageWorkbenchTaskPresetGroupKey;
  labelKey: string;
  promptKey: string;
}

export interface ImageWorkbenchTaskGuidanceContext {
  activeKey: ImageWorkbenchTaskEntryKey;
  hasSelectedAsset: boolean;
  selectedAssetUnavailableReason: string;
  hasReferenceImage: boolean;
  canUseSelectedAssetAsReference: boolean;
  canRunInpaint: boolean;
  hasInpaintMask: boolean;
  canRunUpscale2x: boolean;
  canRunUpscale4x: boolean;
  t: (key: string) => string;
}

const taskEntryIcons: Record<ImageWorkbenchTaskEntryKey, Component> = {
  create: markRaw(ImagePlus),
  reference: markRaw(Images),
  edit: markRaw(Eraser),
  upscale: markRaw(Star),
  person: markRaw(Sparkles),
  style: markRaw(BookTemplate),
};

export const imageWorkbenchTaskPresetConfigs: ImageWorkbenchTaskPresetConfig[] = [
  {
    key: "socialPoster",
    entryKey: "create",
    groupKey: "business",
    labelKey: "imageWorkbench.tasks.presets.socialPoster",
    promptKey: "imageWorkbench.tasks.presetPrompts.socialPoster",
  },
  {
    key: "foodCloseup",
    entryKey: "create",
    groupKey: "food",
    labelKey: "imageWorkbench.tasks.presets.foodCloseup",
    promptKey: "imageWorkbench.tasks.presetPrompts.foodCloseup",
  },
  {
    key: "menuDish",
    entryKey: "create",
    groupKey: "food",
    labelKey: "imageWorkbench.tasks.presets.menuDish",
    promptKey: "imageWorkbench.tasks.presetPrompts.menuDish",
  },
  {
    key: "deliveryHero",
    entryKey: "create",
    groupKey: "food",
    labelKey: "imageWorkbench.tasks.presets.deliveryHero",
    promptKey: "imageWorkbench.tasks.presetPrompts.deliveryHero",
  },
  {
    key: "restaurantMood",
    entryKey: "create",
    groupKey: "food",
    labelKey: "imageWorkbench.tasks.presets.restaurantMood",
    promptKey: "imageWorkbench.tasks.presetPrompts.restaurantMood",
  },
  {
    key: "productHero",
    entryKey: "create",
    groupKey: "business",
    labelKey: "imageWorkbench.tasks.presets.productHero",
    promptKey: "imageWorkbench.tasks.presetPrompts.productHero",
  },
  {
    key: "referenceFusion",
    entryKey: "reference",
    groupKey: "reference",
    labelKey: "imageWorkbench.tasks.presets.referenceFusion",
    promptKey: "imageWorkbench.tasks.presetPrompts.referenceFusion",
  },
  {
    key: "referenceProductFusion",
    entryKey: "reference",
    groupKey: "business",
    labelKey: "imageWorkbench.tasks.presets.referenceProductFusion",
    promptKey: "imageWorkbench.tasks.presetPrompts.referenceProductFusion",
  },
  {
    key: "referencePortraitFusion",
    entryKey: "reference",
    groupKey: "person",
    labelKey: "imageWorkbench.tasks.presets.referencePortraitFusion",
    promptKey: "imageWorkbench.tasks.presetPrompts.referencePortraitFusion",
  },
  {
    key: "referenceMoodFusion",
    entryKey: "reference",
    groupKey: "style",
    labelKey: "imageWorkbench.tasks.presets.referenceMoodFusion",
    promptKey: "imageWorkbench.tasks.presetPrompts.referenceMoodFusion",
  },
  {
    key: "sameComposition",
    entryKey: "reference",
    groupKey: "reference",
    labelKey: "imageWorkbench.tasks.presets.sameComposition",
    promptKey: "imageWorkbench.tasks.presetPrompts.sameComposition",
  },
  {
    key: "styleVariant",
    entryKey: "reference",
    groupKey: "style",
    labelKey: "imageWorkbench.tasks.presets.styleVariant",
    promptKey: "imageWorkbench.tasks.presetPrompts.styleVariant",
  },
  {
    key: "fixHands",
    entryKey: "edit",
    groupKey: "repair",
    labelKey: "imageWorkbench.tasks.presets.fixHands",
    promptKey: "imageWorkbench.tasks.presetPrompts.fixHands",
  },
  {
    key: "fixFace",
    entryKey: "edit",
    groupKey: "repair",
    labelKey: "imageWorkbench.tasks.presets.fixFace",
    promptKey: "imageWorkbench.tasks.presetPrompts.fixFace",
  },
  {
    key: "fixProp",
    entryKey: "edit",
    groupKey: "repair",
    labelKey: "imageWorkbench.tasks.presets.fixProp",
    promptKey: "imageWorkbench.tasks.presetPrompts.fixProp",
  },
  {
    key: "changeBackground",
    entryKey: "edit",
    groupKey: "repair",
    labelKey: "imageWorkbench.tasks.presets.changeBackground",
    promptKey: "imageWorkbench.tasks.presetPrompts.changeBackground",
  },
  {
    key: "removeFlaw",
    entryKey: "edit",
    groupKey: "repair",
    labelKey: "imageWorkbench.tasks.presets.removeFlaw",
    promptKey: "imageWorkbench.tasks.presetPrompts.removeFlaw",
  },
  {
    key: "characterTurnaround",
    entryKey: "person",
    groupKey: "person",
    labelKey: "imageWorkbench.tasks.presets.characterTurnaround",
    promptKey: "imageWorkbench.tasks.presetPrompts.characterTurnaround",
  },
  {
    key: "expressionCloseup",
    entryKey: "person",
    groupKey: "person",
    labelKey: "imageWorkbench.tasks.presets.expressionCloseup",
    promptKey: "imageWorkbench.tasks.presetPrompts.expressionCloseup",
  },
  {
    key: "expressionGrid",
    entryKey: "person",
    groupKey: "person",
    labelKey: "imageWorkbench.tasks.presets.expressionGrid",
    promptKey: "imageWorkbench.tasks.presetPrompts.expressionGrid",
  },
  {
    key: "characterShotSet",
    entryKey: "person",
    groupKey: "person",
    labelKey: "imageWorkbench.tasks.presets.characterShotSet",
    promptKey: "imageWorkbench.tasks.presetPrompts.characterShotSet",
  },
  {
    key: "outfitVariation",
    entryKey: "person",
    groupKey: "person",
    labelKey: "imageWorkbench.tasks.presets.outfitVariation",
    promptKey: "imageWorkbench.tasks.presetPrompts.outfitVariation",
  },
  {
    key: "personReferenceFusion",
    entryKey: "person",
    groupKey: "person",
    labelKey: "imageWorkbench.tasks.presets.personReferenceFusion",
    promptKey: "imageWorkbench.tasks.presetPrompts.personReferenceFusion",
  },
  {
    key: "animeStyle",
    entryKey: "style",
    groupKey: "style",
    labelKey: "imageWorkbench.tasks.presets.animeStyle",
    promptKey: "imageWorkbench.tasks.presetPrompts.animeStyle",
  },
  {
    key: "styleFoodCloseup",
    entryKey: "style",
    groupKey: "food",
    labelKey: "imageWorkbench.tasks.presets.styleFoodCloseup",
    promptKey: "imageWorkbench.tasks.presetPrompts.styleFoodCloseup",
  },
  {
    key: "commercialPoster",
    entryKey: "style",
    groupKey: "business",
    labelKey: "imageWorkbench.tasks.presets.commercialPoster",
    promptKey: "imageWorkbench.tasks.presetPrompts.commercialPoster",
  },
  {
    key: "comicAvatar",
    entryKey: "style",
    groupKey: "style",
    labelKey: "imageWorkbench.tasks.presets.comicAvatar",
    promptKey: "imageWorkbench.tasks.presetPrompts.comicAvatar",
  },
  {
    key: "ipSticker",
    entryKey: "style",
    groupKey: "style",
    labelKey: "imageWorkbench.tasks.presets.ipSticker",
    promptKey: "imageWorkbench.tasks.presetPrompts.ipSticker",
  },
  {
    key: "upscalePortrait",
    entryKey: "upscale",
    groupKey: "person",
    labelKey: "imageWorkbench.tasks.presets.upscalePortrait",
    promptKey: "imageWorkbench.tasks.presetPrompts.upscalePortrait",
  },
  {
    key: "upscaleProduct",
    entryKey: "upscale",
    groupKey: "business",
    labelKey: "imageWorkbench.tasks.presets.upscaleProduct",
    promptKey: "imageWorkbench.tasks.presetPrompts.upscaleProduct",
  },
  {
    key: "upscaleArtwork",
    entryKey: "upscale",
    groupKey: "style",
    labelKey: "imageWorkbench.tasks.presets.upscaleArtwork",
    promptKey: "imageWorkbench.tasks.presetPrompts.upscaleArtwork",
  },
];

export function buildImageWorkbenchTaskEntries(t: (key: string) => string): ImageWorkbenchTaskEntry[] {
  return ([
    "create",
    "reference",
    "edit",
    "upscale",
    "person",
    "style",
  ] satisfies ImageWorkbenchTaskEntryKey[]).map((key) => ({
    key,
    icon: taskEntryIcons[key],
    title: t(`imageWorkbench.tasks.${key}`),
    description: t(`imageWorkbench.tasks.${key}Desc`),
  }));
}

export function buildImageWorkbenchTaskPresets(
  activeKey: ImageWorkbenchTaskEntryKey,
  t: (key: string) => string
): ImageWorkbenchTaskPreset[] {
  return imageWorkbenchTaskPresetConfigs
    .filter((preset) => preset.entryKey === activeKey)
    .map((preset) => ({
      key: preset.key,
      entryKey: preset.entryKey,
      label: t(preset.labelKey),
      groupKey: preset.groupKey,
      groupLabel: t(`imageWorkbench.tasks.presetGroups.${preset.groupKey}`),
      promptKey: preset.promptKey,
    }));
}

export function getImageWorkbenchTaskPresetConfig(
  key: ImageWorkbenchTaskPresetKey
): ImageWorkbenchTaskPresetConfig | undefined {
  return imageWorkbenchTaskPresetConfigs.find((preset) => preset.key === key);
}

export function buildImageWorkbenchTaskGuidance(context: ImageWorkbenchTaskGuidanceContext) {
  const { activeKey, hasSelectedAsset, selectedAssetUnavailableReason, hasReferenceImage, canUseSelectedAssetAsReference, hasInpaintMask, t } = context;
  if (activeKey === "edit") {
    if (!hasSelectedAsset) return t("imageWorkbench.input.guidance.editNeedImage");
    if (selectedAssetUnavailableReason) return selectedAssetUnavailableReason;
    return hasInpaintMask
      ? t("imageWorkbench.input.guidance.editMaskReady")
      : t("imageWorkbench.input.guidance.editReady");
  }
  if (activeKey === "upscale") {
    if (selectedAssetUnavailableReason) return selectedAssetUnavailableReason;
    return hasSelectedAsset
      ? t("imageWorkbench.input.guidance.upscaleReady")
      : t("imageWorkbench.input.guidance.upscaleNeedImage");
  }
  if (activeKey === "reference" && !hasReferenceImage) {
    return selectedAssetUnavailableReason || t("imageWorkbench.input.guidance.referenceNeedImage");
  }
  if (activeKey === "person" && !hasReferenceImage && !canUseSelectedAssetAsReference) {
    return selectedAssetUnavailableReason || t("imageWorkbench.input.guidance.personNeedReference");
  }
  if (activeKey === "style" && !hasReferenceImage && !canUseSelectedAssetAsReference) {
    return selectedAssetUnavailableReason || t("imageWorkbench.input.guidance.styleNeedReference");
  }
  return "";
}

export function isImageWorkbenchTaskGuidanceReady(context: ImageWorkbenchTaskGuidanceContext) {
  if (context.activeKey === "edit") {
    return context.canRunInpaint && context.hasInpaintMask;
  }
  if (context.activeKey === "upscale") {
    return context.canRunUpscale2x || context.canRunUpscale4x;
  }
  if (context.activeKey === "reference") {
    return context.hasReferenceImage;
  }
  if (context.activeKey === "person" || context.activeKey === "style") {
    return context.hasReferenceImage || context.canUseSelectedAssetAsReference;
  }
  return false;
}

export function usesImageWorkbenchReferenceEntry(key: ImageWorkbenchTaskEntryKey) {
  return key === "reference" || key === "person" || key === "style";
}
