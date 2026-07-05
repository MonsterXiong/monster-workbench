import changeBackgroundExample from "../../assets/image-workbench/examples/change-background.webp";
import characterShotSetExample from "../../assets/image-workbench/examples/character-shot-set.webp";
import comicAvatarExample from "../../assets/image-workbench/examples/comic-avatar.webp";
import commercialPosterExample from "../../assets/image-workbench/examples/commercial-poster.webp";
import deliveryHeroExample from "../../assets/image-workbench/examples/delivery-hero.webp";
import expressionCloseupExample from "../../assets/image-workbench/examples/expression-closeup.webp";
import expressionGridExample from "../../assets/image-workbench/examples/expression-grid.webp";
import fixFaceExample from "../../assets/image-workbench/examples/fix-face.webp";
import fixPropExample from "../../assets/image-workbench/examples/fix-prop.webp";
import foodCloseupExample from "../../assets/image-workbench/examples/food-closeup.webp";
import ipStickerExample from "../../assets/image-workbench/examples/ip-sticker.webp";
import menuDishExample from "../../assets/image-workbench/examples/menu-dish.webp";
import outfitVariationExample from "../../assets/image-workbench/examples/outfit-variation.webp";
import personReferenceFusionExample from "../../assets/image-workbench/examples/person-reference-fusion.webp";
import personTurnaroundExample from "../../assets/image-workbench/examples/person-turnaround.webp";
import productHeroExample from "../../assets/image-workbench/examples/product-hero.webp";
import referenceFusionExample from "../../assets/image-workbench/examples/reference-fusion.webp";
import referenceMoodFusionExample from "../../assets/image-workbench/examples/reference-mood-fusion.webp";
import referencePortraitFusionExample from "../../assets/image-workbench/examples/reference-portrait-fusion.webp";
import referenceProductFusionExample from "../../assets/image-workbench/examples/reference-product-fusion.webp";
import removeFlawExample from "../../assets/image-workbench/examples/remove-flaw.webp";
import restaurantMoodExample from "../../assets/image-workbench/examples/restaurant-mood.webp";
import sameCompositionExample from "../../assets/image-workbench/examples/same-composition.webp";
import styleAnimeExample from "../../assets/image-workbench/examples/style-anime.webp";
import styleFoodCloseupExample from "../../assets/image-workbench/examples/style-food-closeup.webp";
import styleVariantExample from "../../assets/image-workbench/examples/style-variant.webp";
import upscaleArtworkExample from "../../assets/image-workbench/examples/upscale-artwork.webp";
import upscaleDetailExample from "../../assets/image-workbench/examples/upscale-detail.webp";
import upscaleProductExample from "../../assets/image-workbench/examples/upscale-product.webp";
import type {
  ImageWorkbenchTaskEntryKey,
  ImageWorkbenchTaskPresetGroupKey,
  ImageWorkbenchTaskPresetKey,
} from "./imageWorkbenchTaskLauncher";

type ImageWorkbenchExampleAssetKey =
  | "changeBackground"
  | "characterShotSet"
  | "comicAvatar"
  | "commercialPoster"
  | "deliveryHero"
  | "expressionCloseup"
  | "expressionGrid"
  | "fixFace"
  | "fixProp"
  | "foodCloseup"
  | "ipSticker"
  | "menuDish"
  | "outfitVariation"
  | "personReferenceFusion"
  | "personTurnaround"
  | "productHero"
  | "referenceFusion"
  | "referenceMoodFusion"
  | "referencePortraitFusion"
  | "referenceProductFusion"
  | "removeFlaw"
  | "restaurantMood"
  | "sameComposition"
  | "styleAnime"
  | "styleFoodCloseup"
  | "styleVariant"
  | "upscaleArtwork"
  | "upscaleDetail"
  | "upscaleProduct";

export interface ImageWorkbenchExampleAsset {
  key: ImageWorkbenchExampleAssetKey;
  src: string;
}

export interface ImageWorkbenchPresetExampleInput {
  key: ImageWorkbenchTaskPresetKey;
  entryKey: ImageWorkbenchTaskEntryKey;
  groupKey: ImageWorkbenchTaskPresetGroupKey;
}

const imageWorkbenchExampleAssets: Record<ImageWorkbenchExampleAssetKey, ImageWorkbenchExampleAsset> = {
  changeBackground: {
    key: "changeBackground",
    src: changeBackgroundExample,
  },
  characterShotSet: {
    key: "characterShotSet",
    src: characterShotSetExample,
  },
  comicAvatar: {
    key: "comicAvatar",
    src: comicAvatarExample,
  },
  commercialPoster: {
    key: "commercialPoster",
    src: commercialPosterExample,
  },
  deliveryHero: {
    key: "deliveryHero",
    src: deliveryHeroExample,
  },
  expressionCloseup: {
    key: "expressionCloseup",
    src: expressionCloseupExample,
  },
  expressionGrid: {
    key: "expressionGrid",
    src: expressionGridExample,
  },
  fixFace: {
    key: "fixFace",
    src: fixFaceExample,
  },
  fixProp: {
    key: "fixProp",
    src: fixPropExample,
  },
  foodCloseup: {
    key: "foodCloseup",
    src: foodCloseupExample,
  },
  ipSticker: {
    key: "ipSticker",
    src: ipStickerExample,
  },
  menuDish: {
    key: "menuDish",
    src: menuDishExample,
  },
  outfitVariation: {
    key: "outfitVariation",
    src: outfitVariationExample,
  },
  personReferenceFusion: {
    key: "personReferenceFusion",
    src: personReferenceFusionExample,
  },
  personTurnaround: {
    key: "personTurnaround",
    src: personTurnaroundExample,
  },
  productHero: {
    key: "productHero",
    src: productHeroExample,
  },
  referenceFusion: {
    key: "referenceFusion",
    src: referenceFusionExample,
  },
  referenceMoodFusion: {
    key: "referenceMoodFusion",
    src: referenceMoodFusionExample,
  },
  referencePortraitFusion: {
    key: "referencePortraitFusion",
    src: referencePortraitFusionExample,
  },
  referenceProductFusion: {
    key: "referenceProductFusion",
    src: referenceProductFusionExample,
  },
  removeFlaw: {
    key: "removeFlaw",
    src: removeFlawExample,
  },
  restaurantMood: {
    key: "restaurantMood",
    src: restaurantMoodExample,
  },
  sameComposition: {
    key: "sameComposition",
    src: sameCompositionExample,
  },
  styleAnime: {
    key: "styleAnime",
    src: styleAnimeExample,
  },
  styleFoodCloseup: {
    key: "styleFoodCloseup",
    src: styleFoodCloseupExample,
  },
  styleVariant: {
    key: "styleVariant",
    src: styleVariantExample,
  },
  upscaleArtwork: {
    key: "upscaleArtwork",
    src: upscaleArtworkExample,
  },
  upscaleDetail: {
    key: "upscaleDetail",
    src: upscaleDetailExample,
  },
  upscaleProduct: {
    key: "upscaleProduct",
    src: upscaleProductExample,
  },
};

const presetExampleKeys: Partial<Record<ImageWorkbenchTaskPresetKey, ImageWorkbenchExampleAssetKey>> = {
  socialPoster: "commercialPoster",
  foodCloseup: "foodCloseup",
  menuDish: "menuDish",
  deliveryHero: "deliveryHero",
  restaurantMood: "restaurantMood",
  productHero: "productHero",
  referenceFusion: "referenceFusion",
  referenceProductFusion: "referenceProductFusion",
  referencePortraitFusion: "referencePortraitFusion",
  referenceMoodFusion: "referenceMoodFusion",
  sameComposition: "sameComposition",
  styleVariant: "styleVariant",
  fixHands: "fixFace",
  fixFace: "fixFace",
  fixProp: "fixProp",
  changeBackground: "changeBackground",
  removeFlaw: "removeFlaw",
  characterTurnaround: "personTurnaround",
  expressionCloseup: "expressionCloseup",
  expressionGrid: "expressionGrid",
  characterShotSet: "characterShotSet",
  outfitVariation: "outfitVariation",
  personReferenceFusion: "personReferenceFusion",
  animeStyle: "styleAnime",
  styleFoodCloseup: "styleFoodCloseup",
  commercialPoster: "commercialPoster",
  comicAvatar: "comicAvatar",
  ipSticker: "ipSticker",
  upscalePortrait: "upscaleDetail",
  upscaleProduct: "upscaleProduct",
  upscaleArtwork: "upscaleArtwork",
};

export function resolveImageWorkbenchPresetExample(
  preset: ImageWorkbenchPresetExampleInput
): ImageWorkbenchExampleAsset | null {
  const key = presetExampleKeys[preset.key];
  return key ? imageWorkbenchExampleAssets[key] : null;
}
