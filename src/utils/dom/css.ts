import { parseFiniteFloat, roundTo } from "../number";
import { CSS_PROPERTY_UPPER_REGEXP, CSS_SIZE_ALIAS_MAP } from "./constants";

export function normalizeCssPropertyName(property: string): string {
  return property.replace(CSS_PROPERTY_UPPER_REGEXP, (match) => `-${match.toLowerCase()}`);
}

export function parseCssPixelValue(value: unknown, fallback = 0): number {
  return parseFiniteFloat(value, fallback);
}

export function getComputedCssValue(element: Element | null | undefined, property: string, fallback = ""): string {
  if (!element || typeof window === "undefined") return fallback;
  const styles = window.getComputedStyle(element);
  return styles.getPropertyValue(normalizeCssPropertyName(property)) || fallback;
}

export function getComputedCssPixelValue(element: Element | null | undefined, property: string, fallback = 0): number {
  return parseCssPixelValue(getComputedCssValue(element, property), fallback);
}

export function formatCssPixelValue(value: unknown, fallback = 0): string {
  return `${parseCssPixelValue(value, fallback)}px`;
}

export function formatRoundedCssPixelValue(value: unknown, fallback = 0): string {
  return formatCssPixelValue(roundTo(parseCssPixelValue(value, fallback)));
}

export function formatCssPercentValue(value: unknown, fallback = 0): string {
  return `${parseCssPixelValue(value, fallback)}%`;
}

export function formatCssLengthValue(value: unknown, fallback: string | number = 0): string {
  if (typeof value === "number") {
    return formatCssPixelValue(value);
  }

  if (typeof value === "string") {
    const text = value.trim();

    if (!text) {
      return formatCssLengthValue(fallback);
    }

    return /^-?\d+(?:\.\d+)?$/.test(text) ? formatCssPixelValue(text) : text;
  }

  return typeof fallback === "string" ? fallback : formatCssPixelValue(fallback);
}

export function resolveCssSizeAlias(value: string, aliases: Record<string, string> = CSS_SIZE_ALIAS_MAP): string {
  const text = value.trim();
  return aliases[text] ?? text;
}

export function resolveCssLengthValue(value: unknown, fallback: string | number = 0, aliases: Record<string, string> = CSS_SIZE_ALIAS_MAP): string {
  return resolveCssSizeAlias(formatCssLengthValue(value, fallback), aliases);
}

export function setElementStyle(element: HTMLElement | null | undefined, styles: Record<string, string | number | null | undefined>): void {
  if (!element) {
    return;
  }

  Object.entries(styles).forEach(([property, value]) => {
    element.style.setProperty(normalizeCssPropertyName(property), value === undefined || value === null ? "" : String(value));
  });
}

export function setElementCssVariables(element: HTMLElement | null | undefined, variables: Record<string, string | number | null | undefined>): void {
  if (!element) {
    return;
  }

  Object.entries(variables).forEach(([name, value]) => {
    const property = name.startsWith("--") ? name : `--${normalizeCssPropertyName(name)}`;
    element.style.setProperty(property, value === undefined || value === null ? "" : String(value));
  });
}
