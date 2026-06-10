import { createTimeout } from "../async";
import { getLocation } from "./platform";
import type { LocationSnapshot } from "./types";

export function getLocationSnapshot(loc: Location | null = getLocation()): LocationSnapshot {
  return {
    href: loc?.href ?? "",
    origin: loc?.origin ?? "",
    protocol: loc?.protocol ?? "",
    host: loc?.host ?? "",
    hostname: loc?.hostname ?? "",
    port: loc?.port ?? "",
    pathname: loc?.pathname ?? "",
    search: loc?.search ?? "",
    hash: loc?.hash ?? "",
  };
}

export function reloadPage(loc: Location | null = getLocation()): void {
  loc?.reload();
}

export function reloadPageAfterDelay(delayMs: number, loc: Location | null = getLocation()): void {
  createTimeout(() => reloadPage(loc), delayMs);
}
