import { convertFileSrc } from "./tauri";
import { resolveDevBridgeAssetSrc } from "./tauri.dev-bridge";
import { isTauriRuntime } from "./runtime";
import { createImagePlaceholderSrc } from "../utils/image-placeholder";

export function resolveDisplayImageSrc(path: string | null): string {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const localPath = normalizeLocalFilePathForAssetProtocol(path);
  if (!isTauriRuntime()) {
    return resolveDevBridgeAssetSrc(localPath) || createImagePlaceholderSrc(localPath);
  }
  return convertFileSrc(localPath);
}

function normalizeLocalFilePathForAssetProtocol(path: string): string {
  const extendedUncPrefix = "\\\\?\\UNC\\";
  const extendedPathPrefix = "\\\\?\\";
  const upperPath = path.toUpperCase();

  if (upperPath.startsWith(extendedUncPrefix.toUpperCase())) {
    return `\\\\${path.slice(extendedUncPrefix.length)}`;
  }
  if (upperPath.startsWith(extendedPathPrefix.toUpperCase())) {
    return path.slice(extendedPathPrefix.length);
  }
  return path;
}
