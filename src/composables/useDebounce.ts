import { createDebouncedFunction } from "../utils";

export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
) {
  return createDebouncedFunction(fn, delay);
}
