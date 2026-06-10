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

export interface ReadableColorChoice {
  color: string;
  ratio: number;
  readable: boolean;
  level: ContrastReadabilityResult["level"];
}

export interface ColorValueSummary {
  input: string;
  valid: boolean;
  hex: string;
  css: string;
  rgb: RgbColor | null;
  hsl: HslColor | null;
  alpha: number;
  light: boolean;
  dark: boolean;
}

export interface ColorContrastSummary {
  foreground: string;
  background: string;
  ratio: number;
  readable: boolean;
  level: ContrastReadabilityResult["level"];
  foregroundValid: boolean;
  backgroundValid: boolean;
}

export interface ColorPaletteSummary {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  hexColors: string[];
  lightCount: number;
  darkCount: number;
  averageRgb: RgbColor;
  averageHex: string;
}
