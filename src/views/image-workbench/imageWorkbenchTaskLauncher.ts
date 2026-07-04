import { markRaw, type Component } from "vue";
import { BookTemplate, Eraser, ImagePlus, Images, Sparkles, Star } from "lucide-vue-next";

export type ImageWorkbenchTaskEntryKey = "create" | "reference" | "edit" | "upscale" | "person" | "style";

export type ImageWorkbenchTaskPresetKey =
  | "socialPoster"
  | "foodCloseup"
  | "productHero"
  | "referenceFusion"
  | "sameComposition"
  | "styleVariant"
  | "fixHands"
  | "changeBackground"
  | "removeFlaw"
  | "finalHd"
  | "ecommerceHd"
  | "textureDetail"
  | "characterTurnaround"
  | "expressionCloseup"
  | "personReferenceFusion"
  | "animeStyle"
  | "comicAvatar"
  | "ipSticker";

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
  promptKey: string;
}

export interface ImageWorkbenchTaskPresetConfig {
  key: ImageWorkbenchTaskPresetKey;
  entryKey: ImageWorkbenchTaskEntryKey;
  labelKey: string;
  promptKey: string;
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
    labelKey: "imageWorkbench.tasks.presets.socialPoster",
    promptKey: "imageWorkbench.tasks.presetPrompts.socialPoster",
  },
  {
    key: "foodCloseup",
    entryKey: "create",
    labelKey: "imageWorkbench.tasks.presets.foodCloseup",
    promptKey: "imageWorkbench.tasks.presetPrompts.foodCloseup",
  },
  {
    key: "productHero",
    entryKey: "create",
    labelKey: "imageWorkbench.tasks.presets.productHero",
    promptKey: "imageWorkbench.tasks.presetPrompts.productHero",
  },
  {
    key: "referenceFusion",
    entryKey: "reference",
    labelKey: "imageWorkbench.tasks.presets.referenceFusion",
    promptKey: "imageWorkbench.tasks.presetPrompts.referenceFusion",
  },
  {
    key: "sameComposition",
    entryKey: "reference",
    labelKey: "imageWorkbench.tasks.presets.sameComposition",
    promptKey: "imageWorkbench.tasks.presetPrompts.sameComposition",
  },
  {
    key: "styleVariant",
    entryKey: "reference",
    labelKey: "imageWorkbench.tasks.presets.styleVariant",
    promptKey: "imageWorkbench.tasks.presetPrompts.styleVariant",
  },
  {
    key: "fixHands",
    entryKey: "edit",
    labelKey: "imageWorkbench.tasks.presets.fixHands",
    promptKey: "imageWorkbench.tasks.presetPrompts.fixHands",
  },
  {
    key: "changeBackground",
    entryKey: "edit",
    labelKey: "imageWorkbench.tasks.presets.changeBackground",
    promptKey: "imageWorkbench.tasks.presetPrompts.changeBackground",
  },
  {
    key: "removeFlaw",
    entryKey: "edit",
    labelKey: "imageWorkbench.tasks.presets.removeFlaw",
    promptKey: "imageWorkbench.tasks.presetPrompts.removeFlaw",
  },
  {
    key: "characterTurnaround",
    entryKey: "person",
    labelKey: "imageWorkbench.tasks.presets.characterTurnaround",
    promptKey: "imageWorkbench.tasks.presetPrompts.characterTurnaround",
  },
  {
    key: "expressionCloseup",
    entryKey: "person",
    labelKey: "imageWorkbench.tasks.presets.expressionCloseup",
    promptKey: "imageWorkbench.tasks.presetPrompts.expressionCloseup",
  },
  {
    key: "personReferenceFusion",
    entryKey: "person",
    labelKey: "imageWorkbench.tasks.presets.personReferenceFusion",
    promptKey: "imageWorkbench.tasks.presetPrompts.personReferenceFusion",
  },
  {
    key: "animeStyle",
    entryKey: "style",
    labelKey: "imageWorkbench.tasks.presets.animeStyle",
    promptKey: "imageWorkbench.tasks.presetPrompts.animeStyle",
  },
  {
    key: "comicAvatar",
    entryKey: "style",
    labelKey: "imageWorkbench.tasks.presets.comicAvatar",
    promptKey: "imageWorkbench.tasks.presetPrompts.comicAvatar",
  },
  {
    key: "ipSticker",
    entryKey: "style",
    labelKey: "imageWorkbench.tasks.presets.ipSticker",
    promptKey: "imageWorkbench.tasks.presetPrompts.ipSticker",
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
      promptKey: preset.promptKey,
    }));
}

export function getImageWorkbenchTaskPresetConfig(
  key: ImageWorkbenchTaskPresetKey
): ImageWorkbenchTaskPresetConfig | undefined {
  return imageWorkbenchTaskPresetConfigs.find((preset) => preset.key === key);
}
