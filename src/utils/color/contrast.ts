import { colorToRgb, rgbToHex } from "./convert";
import type { ColorContrastSummary, ContrastReadabilityResult, ReadableColorChoice, RgbColor } from "./types";

export function getPerceivedLuminance(color: RgbColor): number {
  const rgb = colorToRgb(color) ?? { r: 0, g: 0, b: 0 };
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

function getLinearRgbChannel(value: number): number {
  const channel = Math.max(0, Math.min(255, value)) / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function getRelativeLuminance(color: RgbColor): number {
  return 0.2126 * getLinearRgbChannel(color.r) + 0.7152 * getLinearRgbChannel(color.g) + 0.0722 * getLinearRgbChannel(color.b);
}

export function getContrastRatio(left: RgbColor, right: RgbColor): number {
  const leftLuminance = getRelativeLuminance(left);
  const rightLuminance = getRelativeLuminance(right);
  const lighter = Math.max(leftLuminance, rightLuminance);
  const darker = Math.min(leftLuminance, rightLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getHexContrastRatio(left: string, right: string, fallback = 1): number {
  const leftRgb = colorToRgb(left);
  const rightRgb = colorToRgb(right);
  return leftRgb && rightRgb ? getContrastRatio(leftRgb, rightRgb) : fallback;
}

export function getContrastReadability(left: RgbColor, right: RgbColor, minRatio = 4.5): ContrastReadabilityResult {
  const ratio = getContrastRatio(left, right);
  const level = ratio >= 7 ? "aaa" : ratio >= 4.5 ? "aa" : ratio >= 3 ? "aa-large" : "fail";

  return {
    ratio,
    readable: ratio >= minRatio,
    level,
  };
}

export function summarizeColorContrast(
  foreground: string | RgbColor,
  background: string | RgbColor,
  minRatio = 4.5
): ColorContrastSummary {
  const foregroundRgb = colorToRgb(foreground);
  const backgroundRgb = colorToRgb(background);

  if (!foregroundRgb || !backgroundRgb) {
    return {
      foreground: typeof foreground === "string" ? foreground : rgbToHex(foreground),
      background: typeof background === "string" ? background : rgbToHex(background),
      ratio: 1,
      readable: false,
      level: "fail",
      foregroundValid: Boolean(foregroundRgb),
      backgroundValid: Boolean(backgroundRgb),
    };
  }

  const readability = getContrastReadability(foregroundRgb, backgroundRgb, minRatio);

  return {
    foreground: rgbToHex(foregroundRgb),
    background: rgbToHex(backgroundRgb),
    ratio: readability.ratio,
    readable: readability.readable,
    level: readability.level,
    foregroundValid: true,
    backgroundValid: true,
  };
}

export function isReadableContrast(left: RgbColor, right: RgbColor, minRatio = 4.5): boolean {
  return getContrastReadability(left, right, minRatio).readable;
}

export function getReadableTextColor(
  background: string | RgbColor,
  candidates: readonly string[] = ["#ffffff", "#111827"],
  fallback = "#111827"
): string {
  const backgroundRgb = colorToRgb(background);

  if (!backgroundRgb || candidates.length === 0) {
    return fallback;
  }

  return candidates.reduce(
    (best, candidate) => {
      const candidateRgb = colorToRgb(candidate);

      if (!candidateRgb) {
        return best;
      }

      const ratio = getContrastRatio(backgroundRgb, candidateRgb);
      return ratio > best.ratio ? { color: candidate, ratio } : best;
    },
    { color: fallback, ratio: -1 }
  ).color;
}

export function getReadableTextColorChoice(
  background: string | RgbColor,
  candidates: readonly string[] = ["#ffffff", "#111827"],
  fallback = "#111827",
  minRatio = 4.5
): ReadableColorChoice {
  const backgroundRgb = colorToRgb(background);

  if (!backgroundRgb || candidates.length === 0) {
    return {
      color: fallback,
      ratio: 1,
      readable: false,
      level: "fail",
    };
  }

  return candidates.reduce<ReadableColorChoice>(
    (best, candidate) => {
      const candidateRgb = colorToRgb(candidate);

      if (!candidateRgb) {
        return best;
      }

      const readability = getContrastReadability(backgroundRgb, candidateRgb, minRatio);
      return readability.ratio > best.ratio
        ? {
            color: candidate,
            ratio: readability.ratio,
            readable: readability.readable,
            level: readability.level,
          }
        : best;
    },
    {
      color: fallback,
      ratio: 0,
      readable: false,
      level: "fail",
    }
  );
}

export function isLightColor(value: string | RgbColor, threshold = 0.55): boolean {
  const rgb = colorToRgb(value);
  return rgb ? getPerceivedLuminance(rgb) > threshold : false;
}

export function isDarkColor(value: string | RgbColor, threshold = 0.55): boolean {
  const rgb = colorToRgb(value);
  return rgb ? getPerceivedLuminance(rgb) <= threshold : false;
}

export function getContrastTextColor(value: string | RgbColor, light = "#ffffff", dark = "#111827"): string {
  const rgb = colorToRgb(value);

  if (!rgb) {
    return dark;
  }

  return isLightColor(rgb) ? dark : light;
}
