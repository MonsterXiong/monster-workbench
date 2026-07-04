import {
  formatReducedAspectRatio,
  getDimensionsMaxSide,
  getDimensionsRatio,
  joinBy,
  parseDimensionsText,
  IMAGE_GENERATION_AUTO_SIZE,
  VERIFIED_IMAGE_GENERATION_SIZE_VALUES,
  isExperimentalGptImage2Size,
} from "../../../../utils";

type ImageTranslate = (key: string) => string;

const EXPERIMENTAL_IMAGE_SIZE_VALUES = new Set<string>();

const IMAGE_SIZE_TIER_LABELS = new Map<string, string>([
  ["2048x2048", "2K"],
  ["1152x2048", "2K"],
  ["2048x1152", "2K"],
  ["1536x2048", "2K"],
  ["2048x1536", "2K"],
  ["2048x1024", "2K"],
  ["1024x2048", "2K"],
  ["2880x2880", "4K"],
  ["2160x3840", "4K"],
  ["3840x2160", "4K"],
  ["2160x2880", "4K"],
  ["2880x2160", "4K"],
  ["2304x3456", "4K"],
  ["3456x2304", "4K"],
  ["2880x2304", "4K"],
  ["2304x2880", "4K"],
  ["3600x2160", "4K"],
  ["2160x3600", "4K"],
  ["3840x1920", "4K"],
  ["1920x3840", "4K"],
  ["3840x1280", "4K"],
  ["1280x3840", "4K"],
]);

export function isExperimentalImageSize(size: string) {
  return EXPERIMENTAL_IMAGE_SIZE_VALUES.has(size) || isExperimentalGptImage2Size(size);
}

export function getImageSizeTierLabel(size: string) {
  const mappedTier = IMAGE_SIZE_TIER_LABELS.get(size);
  if (mappedTier) {
    return mappedTier;
  }
  const dimensions = parseDimensionsText(size);
  if (!dimensions) {
    return "";
  }
  const maxSide = getDimensionsMaxSide(dimensions);
  if (maxSide >= 7680) {
    return "8K";
  }
  if (maxSide >= 3840) {
    return "4K";
  }
  if (maxSide >= 2048) {
    return "2K";
  }
  return "";
}

export function getImageSizeKindLabel(size: string, t: ImageTranslate) {
  const dimensions = parseDimensionsText(size);
  if (!dimensions) {
    return t("aiPage.image.sizeKindCustom");
  }
  const ratio = getDimensionsRatio(dimensions);
  if (ratio === 1) {
    return t("aiPage.image.sizeKindSquare");
  }
  if (ratio >= 3) {
    return t("aiPage.image.sizeKindPanorama");
  }
  if (ratio <= 1 / 3) {
    return t("aiPage.image.sizeKindVerticalPanorama");
  }
  return ratio > 1 ? t("aiPage.image.sizeKindLandscape") : t("aiPage.image.sizeKindPortrait");
}

export function buildImageSizeOption(size: string, t: ImageTranslate) {
  if (size === IMAGE_GENERATION_AUTO_SIZE) {
    const label = t("aiPage.image.sizeAuto");
    return {
      label,
      selectedLabel: label,
      description: label,
      filterText: `${label} ${size}`,
      meta: "",
      value: size,
    };
  }
  const dimensions = parseDimensionsText(size);
  const ratio = dimensions ? formatReducedAspectRatio(dimensions, ":") : size;
  const tier = getImageSizeTierLabel(size);
  const kind = getImageSizeKindLabel(size, t);
  const selectedLabel = ratio;
  const description = joinBy([kind, size], (item) => item, " · ");
  return {
    label: ratio,
    selectedLabel,
    description,
    filterText: joinBy([tier, kind, ratio, size], (item) => item, " "),
    meta: tier,
    value: size,
  };
}

export function buildImageSizeOptions(t: ImageTranslate) {
  return [IMAGE_GENERATION_AUTO_SIZE, ...VERIFIED_IMAGE_GENERATION_SIZE_VALUES].map((size) =>
    buildImageSizeOption(size, t)
  );
}
