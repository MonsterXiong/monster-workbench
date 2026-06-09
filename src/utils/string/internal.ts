import type { IncludesAnyTextOptions } from "./types";

export function normalizeTextListMatchValue(value: string, ignoreCase: boolean): string {
  return ignoreCase ? value.toLowerCase() : value;
}

export function normalizeTextListMatchNeedle(value: string, options: Required<IncludesAnyTextOptions>): string {
  const normalizedValue = options.trimKeyword ? value.trim() : value;
  return options.ignoreCase ? normalizedValue.toLowerCase() : normalizedValue;
}

export function getTextListMatchOptions(options: IncludesAnyTextOptions): Required<IncludesAnyTextOptions> {
  return {
    ignoreCase: options.ignoreCase ?? false,
    trimKeyword: options.trimKeyword ?? true,
  };
}
