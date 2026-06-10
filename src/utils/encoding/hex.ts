import { textToUtf8Bytes, utf8BytesToText } from "./bytes";

const HEX_TEXT_REGEXP = /^[0-9a-fA-F]*$/;

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
