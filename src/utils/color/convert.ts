import { clampNumber } from "../number";
import { hexToRgb, hexToRgba, parseHslColorText, parseRgbColorText, parseRgbaColorText } from "./parse";
import { normalizeColorAlpha, normalizeHslColor, normalizeHue, normalizeRgbColor, normalizeRgbaColor } from "./normalize";
import type { HslColor, RgbColor, RgbaColor } from "./types";

export function colorToRgb(value: string | RgbColor): RgbColor | null {
  if (typeof value !== "string") {
    return normalizeRgbColor(value);
  }

  const hsl = parseHslColorText(value);
  return hexToRgb(value) ?? parseRgbColorText(value) ?? (hsl ? hslToRgb(hsl) : null);
}

export function colorToRgba(value: string | RgbColor | RgbaColor): RgbaColor | null {
  if (typeof value !== "string") {
    const color = value as Partial<RgbaColor>;
    return normalizeRgbaColor({
      ...normalizeRgbColor(value),
      a: typeof color.a === "number" ? color.a : 1,
    });
  }

  const hsl = parseHslColorText(value);
  const rgb = hsl ? hslToRgb(hsl) : null;
  return hexToRgba(value) ?? parseRgbaColorText(value) ?? (rgb ? { ...rgb, a: 1 } : null);
}

export function rgbToHex(color: RgbColor): string {
  const rgb = normalizeRgbColor(color);
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function rgbaToHex(color: RgbaColor, includeAlpha = true): string {
  const rgba = normalizeRgbaColor(color);
  const alphaHex = includeAlpha ? clampNumber(rgba.a * 255, 0, 255, 255, 0).toString(16).padStart(2, "0") : "";
  return `${rgbToHex(rgba)}${alphaHex}`;
}

export function colorToHex(value: string | RgbColor | RgbaColor, includeAlpha = false, fallback = "#000000"): string {
  const rgba = colorToRgba(value);

  if (!rgba) {
    return fallback;
  }

  return includeAlpha ? rgbaToHex(rgba, true) : rgbToHex(rgba);
}

export function rgbToCss(color: RgbColor, alpha?: number): string {
  const rgb = normalizeRgbColor(color);

  if (typeof alpha === "number") {
    const normalizedAlpha = clampNumber(alpha, 0, 1, 1);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${normalizedAlpha})`;
  }

  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function rgbaToCss(color: RgbaColor): string {
  const rgba = normalizeRgbaColor(color);
  return rgbToCss(rgba, rgba.a);
}

export function rgbToCssChannels(color: RgbColor): string {
  const rgb = normalizeRgbColor(color);
  return `${rgb.r} ${rgb.g} ${rgb.b}`;
}

export function hexToCssRgb(value: string, fallback = "0 0 0"): string {
  const rgb = hexToRgb(value);
  return rgb ? rgbToCssChannels(rgb) : fallback;
}

export function rgbToHsl(color: RgbColor): HslColor {
  const rgb = normalizeRgbColor(color);
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return {
      h: 0,
      s: 0,
      l: clampNumber(lightness * 100, 0, 100, 0, 2),
    };
  }

  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  if (max === r) {
    hue = (g - b) / delta + (g < b ? 6 : 0);
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  return {
    h: clampNumber(normalizeHue(hue * 60), 0, 360, 0, 2),
    s: clampNumber(saturation * 100, 0, 100, 0, 2),
    l: clampNumber(lightness * 100, 0, 100, 0, 2),
  };
}

export function hslHueToRgb(p: number, q: number, t: number): number {
  let normalizedT = t;

  if (normalizedT < 0) normalizedT += 1;
  if (normalizedT > 1) normalizedT -= 1;
  if (normalizedT < 1 / 6) return p + (q - p) * 6 * normalizedT;
  if (normalizedT < 1 / 2) return q;
  if (normalizedT < 2 / 3) return p + (q - p) * (2 / 3 - normalizedT) * 6;

  return p;
}

export function hslToRgb(color: HslColor): RgbColor {
  const hsl = normalizeHslColor(color);
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  if (s === 0) {
    const channel = clampNumber(l * 255, 0, 255, 0, 0);
    return { r: channel, g: channel, b: channel };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return normalizeRgbColor({
    r: hslHueToRgb(p, q, h + 1 / 3) * 255,
    g: hslHueToRgb(p, q, h) * 255,
    b: hslHueToRgb(p, q, h - 1 / 3) * 255,
  });
}

export function hslToCss(color: HslColor, alpha?: number): string {
  const hsl = normalizeHslColor(color);

  if (typeof alpha === "number") {
    return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${normalizeColorAlpha(alpha)})`;
  }

  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

export function colorToHsl(value: string | RgbColor | HslColor): HslColor | null {
  if (typeof value !== "string" && "h" in value) {
    return normalizeHslColor(value);
  }

  if (typeof value === "string") {
    const parsedHsl = parseHslColorText(value);
    if (parsedHsl) {
      return parsedHsl;
    }
  }

  const rgb = colorToRgb(value as string | RgbColor);
  return rgb ? rgbToHsl(rgb) : null;
}

export function colorToCss(value: string | RgbColor | RgbaColor | HslColor, fallback = "rgb(0, 0, 0)"): string {
  if (typeof value !== "string" && "h" in value) {
    return hslToCss(value);
  }

  const rgba = colorToRgba(value as string | RgbColor | RgbaColor);
  return rgba ? (rgba.a < 1 ? rgbaToCss(rgba) : rgbToCss(rgba)) : fallback;
}
