export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const HEX_COLOR_REGEXP = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

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

export function rgbToHex(color: RgbColor): string {
  const toHex = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function rgbToCss(color: RgbColor, alpha?: number): string {
  if (typeof alpha === "number") {
    const normalizedAlpha = Math.max(0, Math.min(1, alpha));
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${normalizedAlpha})`;
  }

  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function hexToCssRgb(value: string, fallback = "0 0 0"): string {
  const rgb = hexToRgb(value);
  return rgb ? `${rgb.r} ${rgb.g} ${rgb.b}` : fallback;
}

export function getContrastTextColor(value: string, light = "#ffffff", dark = "#111827"): string {
  const rgb = hexToRgb(value);

  if (!rgb) {
    return dark;
  }

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? dark : light;
}
