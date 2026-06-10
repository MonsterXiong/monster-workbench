import { colorToCss, colorToHex, colorToHsl, colorToRgb, colorToRgba, hslToRgb, rgbToHex } from "./convert";
import { isDarkColor, isLightColor, summarizeColorContrast } from "./contrast";
import { normalizeHslColor, normalizeRgbColor } from "./normalize";
import type { ColorPaletteSummary, ColorValueSummary, HslColor, RgbColor, RgbaColor } from "./types";

export { summarizeColorContrast };

export function summarizeColorValue(value: string | RgbColor | RgbaColor | HslColor, fallback = "#000000"): ColorValueSummary {
  const input = typeof value === "string" ? value : colorToCss(value);
  const rgba = colorToRgba(value as string | RgbColor | RgbaColor);
  const rgb = typeof value !== "string" && "h" in value ? hslToRgb(value) : rgba ? normalizeRgbColor(rgba) : null;
  const hsl = typeof value !== "string" && "h" in value ? normalizeHslColor(value) : rgb ? colorToHsl(rgb) : null;

  return {
    input,
    valid: Boolean(rgb),
    hex: rgb ? rgbToHex(rgb) : fallback,
    css: rgb ? colorToCss(value) : fallback,
    rgb,
    hsl,
    alpha: rgba?.a ?? 1,
    light: rgb ? isLightColor(rgb) : false,
    dark: rgb ? isDarkColor(rgb) : false,
  };
}

export function summarizeColorPalette(values: readonly (string | RgbColor | RgbaColor)[]): ColorPaletteSummary {
  const colors = values.map(colorToRgb).filter((color): color is RgbColor => Boolean(color));
  const total = colors.reduce(
    (result, color) => ({
      r: result.r + color.r,
      g: result.g + color.g,
      b: result.b + color.b,
    }),
    { r: 0, g: 0, b: 0 }
  );
  const averageRgb = colors.length > 0
    ? normalizeRgbColor({
        r: total.r / colors.length,
        g: total.g / colors.length,
        b: total.b / colors.length,
      })
    : { r: 0, g: 0, b: 0 };

  return {
    totalCount: values.length,
    validCount: colors.length,
    invalidCount: values.length - colors.length,
    hexColors: colors.map(rgbToHex),
    lightCount: colors.filter((color) => isLightColor(color)).length,
    darkCount: colors.filter((color) => isDarkColor(color)).length,
    averageRgb,
    averageHex: colorToHex(averageRgb),
  };
}
