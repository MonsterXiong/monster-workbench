import { clampNumber } from "../number";
import { HEX_COLOR_REGEXP, HEX_COLOR_WITH_ALPHA_REGEXP } from "./constants";
import type { HslColor, RgbColor, RgbaColor } from "./types";

export function normalizeHue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return ((value % 360) + 360) % 360;
}

export function normalizeColorAlpha(value: unknown, fallback = 1): number {
  return clampNumber(value, 0, 1, fallback, 3);
}

/** 标准化十六进制颜色，去除非法字符并补全缩写。 */
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

export function normalizeHexColorWithAlpha(value: string, fallback = "#000000"): string {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(HEX_COLOR_WITH_ALPHA_REGEXP);

  if (!match) {
    return fallback;
  }

  const hex = match[1];
  const normalizedHex = hex.length <= 4
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
