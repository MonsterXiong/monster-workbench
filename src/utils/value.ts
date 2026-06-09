export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export type EmptyValue = null | undefined | "";

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isFunction<T extends (...args: any[]) => unknown = (...args: any[]) => unknown>(value: unknown): value is T {
  return typeof value === "function";
}

export function isTruthy<T>(value: T): value is Exclude<T, false | 0 | "" | null | undefined> {
  return Boolean(value);
}

export function isFalsy(value: unknown): value is false | 0 | "" | null | undefined {
  return !value;
}

export function isEmptyValue(value: unknown): value is EmptyValue {
  return value === null || value === undefined || value === "";
}

export function isNonEmptyValue<T>(value: T): value is Exclude<T, EmptyValue> {
  return !isEmptyValue(value);
}

export function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

export function isUrlSearchParams(value: unknown): value is URLSearchParams {
  return typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams;
}

export function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer;
}

export function isArrayBufferView(value: unknown): value is ArrayBufferView {
  return typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value);
}

export function isReadableStream(value: unknown): value is ReadableStream {
  return typeof ReadableStream !== "undefined" && value instanceof ReadableStream;
}

export function isNativeRequestBody(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    isFormData(value) ||
    isUrlSearchParams(value) ||
    isBlob(value) ||
    isArrayBuffer(value) ||
    isArrayBufferView(value) ||
    isReadableStream(value)
  );
}

export function withDefault<T>(value: T | null | undefined, fallback: T): T {
  return isNil(value) ? fallback : value;
}

export function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (["true", "1", "yes", "y", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no", "n", "off"].includes(normalizedValue)) {
    return false;
  }

  return fallback;
}

export function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (["true", "1", "yes", "y", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no", "n", "off"].includes(normalizedValue)) {
    return false;
  }

  return undefined;
}

export function booleanToString(value: boolean, trueValue = "true", falseValue = "false"): string {
  return value ? trueValue : falseValue;
}

export function parseEnum<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function parseOptionalEnum<T extends string>(value: unknown, options: readonly T[]): T | undefined {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function parseEnumList<T extends string>(values: unknown, options: readonly T[]): T[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((value): value is T => isOneOf(value, options));
}

export function createEnumParser<T extends string>(options: readonly T[], fallback: T): (value: unknown) => T {
  return (value) => parseEnum(value, options, fallback);
}

export function isOneOf<T extends string | number>(value: unknown, options: readonly T[]): value is T {
  return options.includes(value as T);
}

export function coerceEmptyToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

export function coerceEmptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}
