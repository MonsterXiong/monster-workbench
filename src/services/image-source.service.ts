import { convertFileSrc } from "./tauri";

export function resolveDisplayImageSrc(path: string | null): string {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return convertFileSrc(path);
}
