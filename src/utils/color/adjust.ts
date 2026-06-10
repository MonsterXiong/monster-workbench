import { clampNumber } from "../number";
import { colorToHex, colorToRgb, colorToRgba, hexToCssRgb, rgbToHex, rgbToHsl, rgbaToCss, hslToRgb } from "./convert";
import { normalizeRgbaColor } from "./normalize";
import type { RgbColor, RgbaColor } from "./types";

export { colorToHex, hexToCssRgb };

export function withColorAlpha(value: string | RgbColor | RgbaColor, alpha: number): RgbaColor | null {
  const rgba = colorToRgba(value);
  return rgba ? normalizeRgbaColor({ ...rgba, a: alpha }) : null;
}

export function colorToCssWithAlpha(value: string | RgbColor | RgbaColor, alpha: number, fallback = "rgba(0, 0, 0, 1)"): string {
  const rgba = withColorAlpha(value, alpha);
  return rgba ? rgbaToCss(rgba) : fallback;
}

export function adjustRgbLightness(color: RgbColor, amountPercent: number): RgbColor {
  const hsl = rgbToHsl(color);
  return hslToRgb({
    ...hsl,
    l: clampNumber(hsl.l + amountPercent, 0, 100, hsl.l, 2),
  });
}

export function lightenColor(value: string | RgbColor, amountPercent = 10): RgbColor | null {
  const rgb = colorToRgb(value);
  return rgb ? adjustRgbLightness(rgb, Math.abs(amountPercent)) : null;
}

export function darkenColor(value: string | RgbColor, amountPercent = 10): RgbColor | null {
  const rgb = colorToRgb(value);
  return rgb ? adjustRgbLightness(rgb, -Math.abs(amountPercent)) : null;
}

export function mixRgbColors(left: RgbColor, right: RgbColor, weight = 0.5): RgbColor {
  const normalizedLeft = colorToRgb(left) ?? { r: 0, g: 0, b: 0 };
  const normalizedRight = colorToRgb(right) ?? { r: 0, g: 0, b: 0 };
  const normalizedWeight = clampNumber(weight, 0, 1, 0.5, 4);
  const inverseWeight = 1 - normalizedWeight;

  return {
    r: clampNumber(normalizedLeft.r * inverseWeight + normalizedRight.r * normalizedWeight, 0, 255, 0, 0),
    g: clampNumber(normalizedLeft.g * inverseWeight + normalizedRight.g * normalizedWeight, 0, 255, 0, 0),
    b: clampNumber(normalizedLeft.b * inverseWeight + normalizedRight.b * normalizedWeight, 0, 255, 0, 0),
  };
}

export function mixHexColors(left: string, right: string, weight = 0.5, fallback = "#000000"): string {
  const leftRgb = colorToRgb(left);
  const rightRgb = colorToRgb(right);
  return leftRgb && rightRgb ? rgbToHex(mixRgbColors(leftRgb, rightRgb, weight)) : fallback;
}
