import { uniqueArray } from "../array";
import { TEMPLATE_TOKEN_REGEXP } from "./constants";
import type { FormatTemplateOptions, TemplateFormatReport, TemplateParamValue, TemplateSummary } from "./types";

function getMissingTemplateValue(key: string, options: FormatTemplateOptions): TemplateParamValue {
  return typeof options.missingValue === "function" ? options.missingValue(key) : options.missingValue;
}

export function getTemplateKeys(template: string): string[] {
  return uniqueArray(Array.from(template.matchAll(TEMPLATE_TOKEN_REGEXP), (match) => match[1]));
}

export function summarizeTemplate(template: string): TemplateSummary {
  const allKeys = Array.from(template.matchAll(TEMPLATE_TOKEN_REGEXP), (match) => match[1]);
  const keys = uniqueArray(allKeys);
  const duplicateKeys = keys.filter((key) => allKeys.filter((item) => item === key).length > 1);

  return {
    template,
    keys,
    keyCount: keys.length,
    hasPlaceholders: keys.length > 0,
    duplicateKeys,
  };
}

export function hasTemplateKey(template: string, key: string): boolean {
  return getTemplateKeys(template).includes(key);
}

export function hasTemplatePlaceholders(template: string): boolean {
  return getTemplateKeys(template).length > 0;
}

export function getMissingTemplateKeys(template: string, params: Record<string, TemplateParamValue>): string[] {
  return getTemplateKeys(template).filter((key) => params[key] === undefined || params[key] === null);
}

export function hasMissingTemplateKeys(template: string, params: Record<string, TemplateParamValue>): boolean {
  return getMissingTemplateKeys(template, params).length > 0;
}

export function formatTemplate(
  template: string,
  params: Record<string, TemplateParamValue>,
  options: FormatTemplateOptions = {}
): string {
  const keepMissing = options.keepMissing ?? true;

  return template.replace(TEMPLATE_TOKEN_REGEXP, (match, key: string) => {
    const value = params[key];

    if (value !== undefined && value !== null) {
      return String(value);
    }

    const missingValue = getMissingTemplateValue(key, options);
    if (missingValue !== undefined && missingValue !== null) {
      return String(missingValue);
    }

    return keepMissing ? match : "";
  });
}

/** 执行格式化逻辑并返回可展示字符串。 */
export function formatTemplateWithReport(
  template: string,
  params: Record<string, TemplateParamValue>,
  options: FormatTemplateOptions = {}
): TemplateFormatReport {
  const output = formatTemplate(template, params, options);
  const keys = getTemplateKeys(template);
  const missingKeys = getMissingTemplateKeys(template, params);

  return {
    template,
    output,
    keys,
    missingKeys,
    hasMissingKeys: missingKeys.length > 0,
    changed: output !== template,
  };
}

export function createTemplateFormatter(
  template: string,
  options: FormatTemplateOptions = {}
): (params: Record<string, TemplateParamValue>) => string {
  return (params) => formatTemplate(template, params, options);
}
