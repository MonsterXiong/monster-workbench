import { binaryStringToBytes, bytesToBinaryString, textToUtf8Bytes, utf8BytesToText } from "./bytes";
import type { EncodedTextSummary, SafeDecodeBase64Options } from "./types";
import { bytesToHex, isHexText } from "./hex";

const BASE64URL_TEXT_REGEXP = /^[A-Za-z0-9_-]*={0,2}$/;
const BASE64_TEXT_REGEXP = /^[A-Za-z0-9+/]*={0,2}$/;

export function bytesToBase64(bytes: Uint8Array): string {
  return window.btoa(bytesToBinaryString(bytes));
}

export function normalizeBase64Text(value: string): string {
  return value.replace(/\s+/g, "");
}

export function normalizeBase64Padding(value: string): string {
  const normalizedValue = normalizeBase64Text(value);
  const paddingLength = (4 - (normalizedValue.length % 4)) % 4;
  return normalizedValue + "=".repeat(paddingLength);
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

export function base64UrlToBase64(value: string): string {
  return normalizeBase64Padding(normalizeBase64Text(value).replace(/-/g, "+").replace(/_/g, "/"));
}

export function base64ToBase64Url(value: string, padding = false): string {
  const base64Url = normalizeBase64Text(value).replace(/\+/g, "-").replace(/\//g, "_");
  return padding ? base64Url : base64Url.replace(/=+$/g, "");
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

export function isBase64Text(value: string): boolean {
  const normalizedValue = normalizeBase64Text(value);
  return normalizedValue.length > 0 && normalizedValue.length % 4 === 0 && BASE64_TEXT_REGEXP.test(normalizedValue);
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
