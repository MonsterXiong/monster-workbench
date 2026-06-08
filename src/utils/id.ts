export function createRandomId(prefix = "id", length = 7): string {
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 2 + Math.max(1, length));
  return prefix ? `${prefix}-${randomPart}` : randomPart;
}

export function createTimestampId(prefix = "id", length = 6): string {
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 2 + Math.max(1, length));
  return prefix ? `${prefix}-${Date.now()}-${randomPart}` : `${Date.now()}-${randomPart}`;
}

export function createStableHashId(value: string, prefix = "id"): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const hashText = (hash >>> 0).toString(36);
  return prefix ? `${prefix}_${hashText}` : hashText;
}
