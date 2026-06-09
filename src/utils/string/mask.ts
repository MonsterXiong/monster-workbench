export function maskText(value: string, visibleStart = 3, visibleEnd = 3, mask = "*"): string {
  if (!value) {
    return "";
  }

  const startLength = Math.max(0, visibleStart);
  const endLength = Math.max(0, visibleEnd);

  if (value.length <= startLength + endLength) {
    return mask.repeat(value.length);
  }

  return `${value.slice(0, startLength)}${mask.repeat(value.length - startLength - endLength)}${value.slice(-endLength)}`;
}
