import { isRecord } from "./core";
import { objectEntries } from "./record";
import { RedactSensitiveOptions } from "./types";

export const DEFAULT_SENSITIVE_KEYS = ["key", "token", "secret", "password", "authorization", "credential"];

export function isSensitiveObjectKey(key: string, sensitiveKeys: readonly string[] = DEFAULT_SENSITIVE_KEYS): boolean {
  const normalizedKey = key.toLowerCase();
  return sensitiveKeys.some((item) => normalizedKey.includes(item.toLowerCase()));
}

export function redactSensitiveObjectDeep(value: unknown, options: RedactSensitiveOptions = {}): unknown {
  const replacement = options.replacement ?? "[DESENSITIZED]";
  const sensitiveKeys = options.sensitiveKeys ?? DEFAULT_SENSITIVE_KEYS;

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveObjectDeep(item, options));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    objectEntries(value).map(([key, item]) => {
      if (isSensitiveObjectKey(key, sensitiveKeys)) {
        return [key, replacement];
      }

      return [key, redactSensitiveObjectDeep(item, options)];
    })
  );
}
