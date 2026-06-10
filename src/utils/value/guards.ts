import type { EmptyValue, Primitive } from "./types";

export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export function isPrimitive(value: unknown): value is Primitive {
  return value === null || (typeof value !== "object" && typeof value !== "function");
}

export function isPropertyKey(value: unknown): value is PropertyKey {
  return typeof value === "string" || typeof value === "number" || typeof value === "symbol";
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isObjectLike(value: unknown): value is object {
  return (typeof value === "object" || typeof value === "function") && value !== null;
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function isFunction<T extends (...args: any[]) => unknown = (...args: any[]) => unknown>(value: unknown): value is T {
  return typeof value === "function";
}

export function isPromiseLike<T = unknown>(value: unknown): value is PromiseLike<T> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

export function isDateObject(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

export function isMap<K = unknown, V = unknown>(value: unknown): value is Map<K, V> {
  return value instanceof Map;
}

export function isSet<T = unknown>(value: unknown): value is Set<T> {
  return value instanceof Set;
}

export function isIterable<T = unknown>(value: unknown): value is Iterable<T> {
  return value !== null && value !== undefined && typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function";
}

export function isAsyncIterable<T = unknown>(value: unknown): value is AsyncIterable<T> {
  return value !== null && value !== undefined && typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function";
}

export function isArrayLike<T = unknown>(value: unknown): value is ArrayLike<T> {
  if (value === null || value === undefined || typeof value === "function") {
    return false;
  }

  const length = (value as { length?: unknown }).length;
  return typeof length === "number" && Number.isInteger(length) && length >= 0 && length <= Number.MAX_SAFE_INTEGER;
}

export function isTruthy<T>(value: T): value is Exclude<T, false | 0 | "" | null | undefined> {
  return value !== false && value !== 0 && value !== "" && value !== null && value !== undefined;
}

export function isFalsy(value: unknown): value is false | 0 | "" | null | undefined {
  return value === false || value === 0 || value === "" || value === null || value === undefined;
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
