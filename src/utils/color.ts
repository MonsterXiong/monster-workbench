import { clampNumber } from "./number";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface RgbaColor extends RgbColor {
  a: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export interface ContrastReadabilityResult {
  ratio: number;
  readable: boolean;
  level: "fail" | "aa-large" | "aa" | "aaa";
}

const HEX_COLOR_REGEXP = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const HEX_COLOR_WITH_ALPHA_REGEXP = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR_REGEXP = /^rgba?\(([^)]+)\)$/i;

export function normalizeHue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return ((value % 360) + 360) % 360;
}

export function normalizeColorAlpha(value: unknown, fallback = 1): number {
  return clampNumber(value, 0, 1, fallback, 3);
}

export function normalizeHexColor(value: string, fallback = "#000000"): string {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(HEX_COLOR_REGEXP);

  if (!match) {
    return fallback;
  }

  const hex = match[1];
  const normalizedHex = hex.length === 3
    ? hex.split("").map((item) => `${item}${item}`).join("")
    : hex;

  return `#${normalizedHex.toLowerCase()}`;
}

export function isHexColor(value: string): boolean {
  return HEX_COLOR_REGEXP.test(value.trim());
}

export function isHexColorWithAlpha(value: string): boolean {
  return HEX_COLOR_WITH_ALPHA_REGEXP.test(value.trim());
}

export function hexToRgb(value: string): RgbColor | null {
  if (!isHexColor(value)) {
    return null;
  }

  const hex = normalizeHexColor(value).slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

export function hexToRgba(value: string): RgbaColor | null {
  const match = value.trim().match(HEX_COLOR_WITH_ALPHA_REGEXP);

  if (!match) {
    return null;
  }

  const rawHex = match[1];
  const hex = rawHex.length <= 4
    ? rawHex.split("").map((item) => `${item}${item}`).join("")
    : rawHex;
  const alphaHex = hex.slice(6, 8);

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: alphaHex ? normalizeColorAlpha(Number.parseInt(alphaHex, 16) / 255) : 1,
  };
}

export function normalizeRgbColor(color: RgbColor): RgbColor {
  return {
    r: clampNumber(color.r, 0, 255, 0, 0),
    g: clampNumber(color.g, 0, 255, 0, 0),
    b: clampNumber(color.b, 0, 255, 0, 0),
  };
}

export function normalizeRgbaColor(color: RgbaColor): RgbaColor {
  const rgb = normalizeRgbColor(color);
  return {
    ...rgb,
    a: normalizeColorAlpha(color.a),
  };
}

export function normalizeHslColor(color: HslColor): HslColor {
  return {
    h: normalizeHue(color.h),
    s: clampNumber(color.s, 0, 100, 0, 2),
    l: clampNumber(color.l, 0, 100, 0, 2),
  };
}

export function parseRgbColorText(value: string): RgbColor | null {
  const trimmedValue = value.trim();
  const rgbBody = trimmedValue.match(RGB_COLOR_REGEXP)?.[1] ?? trimmedValue;
  const parts = rgbBody
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (parts.length !== 3) {
    return null;
  }

  const [r, g, b] = parts.map(Number);

  if (![r, g, b].every(Number.isFinite)) {
    return null;
  }

  return normalizeRgbColor({ r, g, b });
}

function parseColorAlpha(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmedValue = value.trim();
  const alpha = trimmedValue.endsWith("%")
    ? Number.parseFloat(trimmedValue.slice(0, -1)) / 100
    : Number.parseFloat(trimmedValue);

  return Number.isFinite(alpha) ? normalizeColorAlpha(alpha) : undefined;
}

export function parseRgbaColorText(value: string): RgbaColor | null {
  const trimmedValue = value.trim();
  const rgbBody = trimmedValue.match(RGB_COLOR_REGEXP)?.[1] ?? trimmedValue;
  const parts = rgbBody
    .replace(/\//g, " ")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (parts.length < 3) {
    return null;
  }

  const [r, g, b] = parts.slice(0, 3).map(Number);
  const a = parseColorAlpha(parts[3]) ?? 1;

  if (![r, g, b].every(Number.isFinite)) {
    return null;
  }

  return normalizeRgbaColor({ r, g, b, a });
}

export function colorToRgb(value: string | RgbColor): RgbColor | null {
  return typeof value === "string" ? hexToRgb(value) ?? parseRgbColorText(value) : normalizeRgbColor(value);
}

export function colorToRgba(value: string | RgbColor | RgbaColor): RgbaColor | null {
  if (typeof value !== "string") {
    const color = value as Partial<RgbaColor>;
    return normalizeRgbaColor({
      ...normalizeRgbColor(value),
      a: typeof color.a === "number" ? color.a : 1,
    });
  }

  return hexToRgba(value) ?? parseRgbaColorText(value);
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

export function withColorAlpha(value: string | RgbColor | RgbaColor, alpha: number): RgbaColor | null {
  const rgba = colorToRgba(value);
  return rgba ? normalizeRgbaColor({ ...rgba, a: alpha }) : null;
}

export function colorToCssWithAlpha(value: string | RgbColor | RgbaColor, alpha: number, fallback = "rgba(0, 0, 0, 1)"): string {
  const rgba = withColorAlpha(value, alpha);
  return rgba ? rgbaToCss(rgba) : fallback;
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

function hslHueToRgb(p: number, q: number, t: number): number {
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
  const normalizedLeft = normalizeRgbColor(left);
  const normalizedRight = normalizeRgbColor(right);
  const normalizedWeight = clampNumber(weight, 0, 1, 0.5, 4);
  const inverseWeight = 1 - normalizedWeight;

  return normalizeRgbColor({
    r: normalizedLeft.r * inverseWeight + normalizedRight.r * normalizedWeight,
    g: normalizedLeft.g * inverseWeight + normalizedRight.g * normalizedWeight,
    b: normalizedLeft.b * inverseWeight + normalizedRight.b * normalizedWeight,
  });
}

export function mixHexColors(left: string, right: string, weight = 0.5, fallback = "#000000"): string {
  const leftRgb = hexToRgb(left);
  const rightRgb = hexToRgb(right);
  return leftRgb && rightRgb ? rgbToHex(mixRgbColors(leftRgb, rightRgb, weight)) : fallback;
}

export function getPerceivedLuminance(color: RgbColor): number {
  const rgb = normalizeRgbColor(color);
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

function getLinearRgbChannel(value: number): number {
  const channel = clampNumber(value, 0, 255, 0, 0) / 255;
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
  const leftRgb = hexToRgb(left);
  const rightRgb = hexToRgb(right);
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

export function isLightColor(value: string | RgbColor, threshold = 0.55): boolean {
  const rgb = colorToRgb(value);
  return rgb ? getPerceivedLuminance(rgb) > threshold : false;
}

export function getContrastTextColor(value: string, light = "#ffffff", dark = "#111827"): string {
  const rgb = hexToRgb(value);

  if (!rgb) {
    return dark;
  }

  return isLightColor(rgb) ? dark : light;
}
