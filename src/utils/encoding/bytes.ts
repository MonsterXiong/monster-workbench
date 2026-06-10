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
