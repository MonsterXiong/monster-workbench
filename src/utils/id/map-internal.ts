import { createRandomDomId } from "./create-internal";
import { joinDomIdParts } from "./normalize";

export function createDomIdFromParts(parts: readonly unknown[], separator = "-"): string {
  return joinDomIdParts(parts, separator) || createRandomDomId("id", 7, separator);
}
