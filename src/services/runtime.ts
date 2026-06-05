export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}

export function ensureBrowserMessage(feature: string): string {
  return `当前为浏览器预览，${feature}仅在桌面客户端可用`;
}
