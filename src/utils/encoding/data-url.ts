import { safeDecodeBase64Utf8, tryBase64ToBytes } from "./base64";
import { bytesToBase64, encodeBase64Utf8 } from "./base64";
import { textToUtf8Bytes } from "./bytes";
import type { DataUrlInfo, DataUrlListSummary, DataUrlSummary } from "./types";

export function createDataUrl(data: string, mimeType = "text/plain", encoding: "base64" | "text" = "base64"): string {
  const normalizedMimeType = mimeType.trim() || "text/plain";
  return encoding === "base64"
    ? `data:${normalizedMimeType};base64,${data}`
    : `data:${normalizedMimeType},${encodeURIComponent(data)}`;
}

export function textToDataUrl(value: string, mimeType = "text/plain;charset=utf-8"): string {
  return createDataUrl(encodeBase64Utf8(value), mimeType, "base64");
}

export function svgToDataUrl(value: string, base64 = false): string {
  return base64
    ? createDataUrl(encodeBase64Utf8(value), "image/svg+xml;charset=utf-8", "base64")
    : createDataUrl(value, "image/svg+xml;charset=utf-8", "text");
}

export function bytesToDataUrl(bytes: Uint8Array, mimeType = "application/octet-stream"): string {
  return createDataUrl(bytesToBase64(bytes), mimeType, "base64");
}

export function parseDataUrl(value: string): DataUrlInfo | null {
  const match = value.match(/^data:([^,]*?),(.*)$/s);

  if (!match) {
    return null;
  }

  const meta = match[1] || "text/plain";
  const data = match[2] ?? "";
  const isBase64 = /(?:^|;)base64(?:;|$)/i.test(meta);
  const mimeType = meta.replace(/(?:^|;)base64(?:;|$)/i, "").replace(/;+$/g, "") || "text/plain";

  return {
    mimeType,
    encoding: isBase64 ? "base64" : "text",
    data,
  };
}

export function dataUrlToText(value: string, fallback = ""): string {
  const parsed = parseDataUrl(value);

  if (!parsed) {
    return fallback;
  }

  return parsed.encoding === "base64"
    ? safeDecodeBase64Utf8(parsed.data, { fallback })
    : decodeURIComponent(parsed.data);
}

export function tryDataUrlToText(value: string): string | null {
  try {
    const parsed = parseDataUrl(value);
    return parsed ? dataUrlToText(value) : null;
  } catch {
    return null;
  }
}

export function safeDataUrlToText(value: string, fallback = ""): string {
  return tryDataUrlToText(value) ?? fallback;
}

export function dataUrlToBytes(value: string): Uint8Array | null {
  const parsed = parseDataUrl(value);

  if (!parsed) {
    return null;
  }

  try {
    return parsed.encoding === "base64"
      ? tryBase64ToBytes(parsed.data)
      : textToUtf8Bytes(decodeURIComponent(parsed.data));
  } catch {
    return null;
  }
}

export function tryDataUrlToBytes(value: string): Uint8Array | null {
  return dataUrlToBytes(value);
}

export function safeDataUrlToBytes(value: string, fallback = new Uint8Array()): Uint8Array {
  return tryDataUrlToBytes(value) ?? fallback;
}

export function summarizeDataUrl(value: string): DataUrlSummary {
  const parsed = parseDataUrl(value);

  if (!parsed) {
    return {
      valid: false,
      mimeType: "",
      encoding: "text",
      data: "",
      dataLength: 0,
      byteLength: 0,
      textLength: 0,
    };
  }

  const bytes = dataUrlToBytes(value);
  const text = tryDataUrlToText(value) ?? "";

  return {
    ...parsed,
    valid: true,
    dataLength: parsed.data.length,
    byteLength: bytes?.length ?? 0,
    textLength: text.length,
  };
}

export function summarizeDataUrls(values: readonly string[]): DataUrlListSummary {
  const summaries = values.map(summarizeDataUrl);
  const validSummaries = summaries.filter((summary) => summary.valid);

  return {
    totalCount: summaries.length,
    validCount: validSummaries.length,
    invalidCount: summaries.length - validSummaries.length,
    base64Count: validSummaries.filter((summary) => summary.encoding === "base64").length,
    textCount: validSummaries.filter((summary) => summary.encoding === "text").length,
    byteLength: validSummaries.reduce((total, summary) => total + summary.byteLength, 0),
    textLength: validSummaries.reduce((total, summary) => total + summary.textLength, 0),
    mimeTypes: Array.from(new Set(validSummaries.map((summary) => summary.mimeType).filter(Boolean))),
    allValid: summaries.length > 0 && validSummaries.length === summaries.length,
    hasInvalid: validSummaries.length < summaries.length,
    empty: summaries.length === 0,
  };
}

export function isDataUrl(value: string): boolean {
  return parseDataUrl(value) !== null;
}

export function getDataUrlMimeType(value: string, fallback = ""): string {
  return parseDataUrl(value)?.mimeType ?? fallback;
}

export function getDataUrlEncoding(value: string): DataUrlInfo["encoding"] | undefined {
  return parseDataUrl(value)?.encoding;
}

export function isDataUrlEncoding(value: string, encoding: DataUrlInfo["encoding"]): boolean {
  return getDataUrlEncoding(value) === encoding;
}

export function isBase64DataUrl(value: string): boolean {
  return isDataUrlEncoding(value, "base64");
}

export function isTextDataUrl(value: string): boolean {
  return isDataUrlEncoding(value, "text");
}
