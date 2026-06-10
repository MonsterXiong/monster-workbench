import { HSL_COLOR_REGEXP, HEX_COLOR_WITH_ALPHA_REGEXP, RGB_COLOR_REGEXP } from "./constants";
import { isHexColor, normalizeColorAlpha, normalizeHexColor, normalizeHslColor, normalizeRgbColor, normalizeRgbaColor } from "./normalize";
import type { HslColor, RgbColor, RgbaColor } from "./types";

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

export function parseColorAlpha(value: string | undefined): number | undefined {
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

export function parsePercentPart(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const text = value.trim();
  const numericValue = text.endsWith("%")
    ? Number.parseFloat(text.slice(0, -1))
    : Number.parseFloat(text);

  return Number.isFinite(numericValue) ? numericValue : null;
}

export function parseHslColorText(value: string): HslColor | null {
  const trimmedValue = value.trim();
  const hslBody = trimmedValue.match(HSL_COLOR_REGEXP)?.[1] ?? trimmedValue;
  const parts = hslBody
    .replace(/\//g, " ")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (parts.length !== 3) {
    return null;
  }

  const h = Number.parseFloat(parts[0]);
  const s = parsePercentPart(parts[1]);
  const l = parsePercentPart(parts[2]);

  if (!Number.isFinite(h) || s === null || l === null) {
    return null;
  }

  return normalizeHslColor({ h, s, l });
}
