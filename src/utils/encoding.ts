export interface SafeDecodeBase64Options {
  fallback?: string;
}

const BASE64URL_TEXT_REGEXP = /^[A-Za-z0-9_-]*={0,2}$/;
const BASE64_TEXT_REGEXP = /^[A-Za-z0-9+/]*={0,2}$/;

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
  return window.btoa(bytesToBinaryString(textToUtf8Bytes(value)));
}

export function decodeBase64Utf8(value: string): string {
  return utf8BytesToText(binaryStringToBytes(window.atob(normalizeBase64Padding(value))));
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
