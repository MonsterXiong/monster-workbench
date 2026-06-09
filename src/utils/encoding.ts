export interface SafeDecodeBase64Options {
  fallback?: string;
}

export interface DataUrlInfo {
  mimeType: string;
  encoding: "base64" | "text";
  data: string;
}

export interface DataUrlSummary extends DataUrlInfo {
  valid: boolean;
  dataLength: number;
  byteLength: number;
  textLength: number;
}

export interface EncodedTextSummary {
  text: string;
  normalizedText: string;
  textLength: number;
  byteLength: number;
  hexLength: number;
  base64Length: number;
  base64UrlLength: number;
  isHex: boolean;
  isBase64: boolean;
  isBase64Url: boolean;
  empty: boolean;
}

export interface DataUrlListSummary {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  base64Count: number;
  textCount: number;
  byteLength: number;
  textLength: number;
  mimeTypes: string[];
  allValid: boolean;
  hasInvalid: boolean;
  empty: boolean;
}

const BASE64URL_TEXT_REGEXP = /^[A-Za-z0-9_-]*={0,2}$/;
const BASE64_TEXT_REGEXP = /^[A-Za-z0-9+/]*={0,2}$/;
const HEX_TEXT_REGEXP = /^[0-9a-fA-F]*$/;

export function textToUtf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function utf8BytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function bytesToBinaryString(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return binary;
}

export function binaryStringToBytes(value: string): Uint8Array {
  return Uint8Array.from(value, (char) => char.charCodeAt(0));
}

export function bytesToBase64(bytes: Uint8Array): string {
  return window.btoa(bytesToBinaryString(bytes));
}

export function base64ToBytes(value: string): Uint8Array {
  return binaryStringToBytes(window.atob(normalizeBase64Padding(value)));
}

export function tryBase64ToBytes(value: string): Uint8Array | null {
  try {
    return base64ToBytes(value);
  } catch {
    return null;
  }
}

export function safeBase64ToBytes(value: string, fallback = new Uint8Array()): Uint8Array {
  return tryBase64ToBytes(value) ?? fallback;
}

export function bytesToBase64Url(bytes: Uint8Array, padding = false): string {
  return base64ToBase64Url(bytesToBase64(bytes), padding);
}

export function base64UrlToBytes(value: string): Uint8Array {
  return base64ToBytes(base64UrlToBase64(value));
}

export function tryBase64UrlToBytes(value: string): Uint8Array | null {
  try {
    return base64UrlToBytes(value);
  } catch {
    return null;
  }
}

export function safeBase64UrlToBytes(value: string, fallback = new Uint8Array()): Uint8Array {
  return tryBase64UrlToBytes(value) ?? fallback;
}

export function bytesToHex(bytes: Uint8Array, separator = ""): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(separator);
}

export function normalizeHexText(value: string): string {
  return value.replace(/[\s:_-]+/g, "").toLowerCase();
}

export function isHexText(value: string): boolean {
  const normalizedValue = normalizeHexText(value);
  return normalizedValue.length > 0 && normalizedValue.length % 2 === 0 && HEX_TEXT_REGEXP.test(normalizedValue);
}

export function hexToBytes(value: string): Uint8Array {
  const normalizedValue = normalizeHexText(value);

  if (!isHexText(normalizedValue)) {
    return new Uint8Array();
  }

  return Uint8Array.from({ length: normalizedValue.length / 2 }, (_, index) =>
    Number.parseInt(normalizedValue.slice(index * 2, index * 2 + 2), 16)
  );
}

export function textToHex(value: string, separator = ""): string {
  return bytesToHex(textToUtf8Bytes(value), separator);
}

export function hexToText(value: string): string {
  return utf8BytesToText(hexToBytes(value));
}

export function tryHexToText(value: string): string | null {
  return isHexText(value) ? hexToText(value) : null;
}

export function safeHexToText(value: string, fallback = ""): string {
  return tryHexToText(value) ?? fallback;
}

export function normalizeBase64Text(value: string): string {
  return value.replace(/\s+/g, "");
}

export function normalizeBase64Padding(value: string): string {
  const normalizedValue = normalizeBase64Text(value);
  const paddingLength = (4 - (normalizedValue.length % 4)) % 4;
  return normalizedValue + "=".repeat(paddingLength);
}

export function isBase64Text(value: string): boolean {
  const normalizedValue = normalizeBase64Text(value);
  return normalizedValue.length > 0 && normalizedValue.length % 4 === 0 && BASE64_TEXT_REGEXP.test(normalizedValue);
}

export function base64UrlToBase64(value: string): string {
  return normalizeBase64Padding(normalizeBase64Text(value).replace(/-/g, "+").replace(/_/g, "/"));
}

export function base64ToBase64Url(value: string, padding = false): string {
  const base64Url = normalizeBase64Text(value).replace(/\+/g, "-").replace(/\//g, "_");
  return padding ? base64Url : base64Url.replace(/=+$/g, "");
}

export function isBase64UrlText(value: string): boolean {
  const normalizedValue = normalizeBase64Text(value);
  return normalizedValue.length > 0 && BASE64URL_TEXT_REGEXP.test(normalizedValue);
}

export function encodeBase64Utf8(value: string): string {
  return bytesToBase64(textToUtf8Bytes(value));
}

export function decodeBase64Utf8(value: string): string {
  return utf8BytesToText(base64ToBytes(value));
}

export function encodeBase64UrlUtf8(value: string, padding = false): string {
  return base64ToBase64Url(encodeBase64Utf8(value), padding);
}

export function decodeBase64UrlUtf8(value: string): string {
  return decodeBase64Utf8(base64UrlToBase64(value));
}

export function tryDecodeBase64Utf8(value: string): string | null {
  try {
    return decodeBase64Utf8(value);
  } catch {
    return null;
  }
}

export function safeDecodeBase64Utf8(value: string, options: SafeDecodeBase64Options = {}): string {
  return tryDecodeBase64Utf8(value) ?? options.fallback ?? "";
}

export function tryDecodeBase64UrlUtf8(value: string): string | null {
  try {
    return decodeBase64UrlUtf8(value);
  } catch {
    return null;
  }
}

export function safeDecodeBase64UrlUtf8(value: string, options: SafeDecodeBase64Options = {}): string {
  return tryDecodeBase64UrlUtf8(value) ?? options.fallback ?? "";
}

export function summarizeEncodedText(value: string): EncodedTextSummary {
  const normalizedText = value.trim();
  const bytes = textToUtf8Bytes(value);

  return {
    text: value,
    normalizedText,
    textLength: value.length,
    byteLength: bytes.length,
    hexLength: bytesToHex(bytes).length,
    base64Length: encodeBase64Utf8(value).length,
    base64UrlLength: encodeBase64UrlUtf8(value).length,
    isHex: isHexText(normalizedText),
    isBase64: isBase64Text(normalizedText),
    isBase64Url: isBase64UrlText(normalizedText),
    empty: value.length === 0,
  };
}

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
