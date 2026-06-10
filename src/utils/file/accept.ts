import { uniqueArray } from "../array";
import { getFileExtension } from "../path";
import { splitBySeparators } from "../string";
import { isNonEmptyValue } from "../value";
import {
  getFileLikeMimeType,
  getMimeTypeBase,
  getMimeTypeByPath,
  normalizeFileExtension,
  normalizeFileExtensionWithDot,
} from "./mime";
import type { FileAcceptInput, FileAcceptSummary, FileLike } from "./types";

export function normalizeAcceptRule(rule: unknown): string {
  const value = String(rule ?? "").trim().toLowerCase();

  if (!value) {
    return "";
  }

  if (value === "*") {
    return "*/*";
  }

  if (value.startsWith(".")) {
    return normalizeFileExtensionWithDot(value);
  }

  if (value.includes("/")) {
    return getMimeTypeBase(value);
  }

  return normalizeFileExtension(value);
}

export function normalizeAccept(accept: FileAcceptInput): string[] {
  if (!accept) {
    return [];
  }

  const items = Array.isArray(accept)
    ? accept.flatMap((item) => splitBySeparators(String(item ?? ""), [","], true))
    : splitBySeparators(String(accept), [","], true);
  return uniqueArray(items.map(normalizeAcceptRule).filter(isNonEmptyValue));
}

export function isAcceptAll(accept: FileAcceptInput): boolean {
  const rules = normalizeAccept(accept);
  return rules.length === 0 || rules.includes("*/*");
}

export function buildAcceptString(accept: FileAcceptInput): string {
  return normalizeAccept(accept).join(",");
}

export function getNativeAcceptValue(accept: FileAcceptInput): string | undefined {
  return isAcceptAll(accept) ? undefined : buildAcceptString(accept);
}

/** 解析 MIME 和后缀，总结可接收的文件范畴。 */
export function summarizeFileAccept(accept: FileAcceptInput): FileAcceptSummary {
  const rules = normalizeAccept(accept);
  const extensionRules = rules.filter((rule) => rule.startsWith("."));
  const mimeRules = rules.filter((rule) => rule.includes("/") && !rule.endsWith("/*"));
  const wildcardMimeRules = rules.filter((rule) => rule.endsWith("/*") || rule === "*/*");

  return {
    rules,
    acceptAll: isAcceptAll(accept),
    nativeAccept: getNativeAcceptValue(accept),
    extensionRules,
    mimeRules,
    wildcardMimeRules,
    extensionCount: extensionRules.length,
    mimeCount: mimeRules.length,
    wildcardMimeCount: wildcardMimeRules.length,
  };
}

export function getAcceptedExtensions(accept: FileAcceptInput): string[] {
  return normalizeAccept(accept)
    .filter((item) => item.startsWith("."))
    .map(normalizeFileExtension);
}

export function matchesAccept(path: string, accept: FileAcceptInput, mimeType = getMimeTypeByPath(path, "")): boolean {
  const rules = normalizeAccept(accept);

  if (rules.length === 0 || rules.includes("*/*")) {
    return true;
  }

  const extension = getFileExtension(path);
  const normalizedMimeType = getMimeTypeBase(mimeType);

  return rules.some((rule) => {
    if (rule.startsWith(".")) {
      return normalizeFileExtension(rule) === extension;
    }

    if (!rule.includes("/")) {
      return normalizeFileExtension(rule) === extension;
    }

    if (rule.endsWith("/*")) {
      return normalizedMimeType.startsWith(rule.slice(0, -1));
    }

    return normalizedMimeType === rule;
  });
}

/** 校验一个给定的文件是否符合特定的 accept 规则。 */
export function matchesFileAccept(file: FileLike, accept: FileAcceptInput): boolean {
  return matchesAccept(file.name, accept, getFileLikeMimeType(file));
}
