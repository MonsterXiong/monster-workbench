import { throttleLeading } from "../utils";

export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number = 300
) {
  return throttleLeading(fn, limit);
}
