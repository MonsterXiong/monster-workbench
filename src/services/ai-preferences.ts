import { configService } from "./config.service";
import { safeJsonParseObject, safeJsonStringify } from "../utils";

export type AiPreferenceState = Record<string, unknown>;

let preferenceWriteChain: Promise<void> = Promise.resolve();

export async function readAiPreferenceState(): Promise<AiPreferenceState> {
  const raw = await configService.getPreferenceConfig();
  return raw ? safeJsonParseObject<AiPreferenceState>(raw, {}) : {};
}

export function writeAiPreferenceState(mutator: (state: AiPreferenceState) => void | Promise<void>): Promise<void> {
  const nextWrite = preferenceWriteChain.then(async () => {
    const state = await readAiPreferenceState();
    await mutator(state);
    await configService.savePreferenceConfig(safeJsonStringify(state, "{}"));
  });

  preferenceWriteChain = nextWrite.catch(() => {});
  return nextWrite;
}

export function patchAiPreferenceState(
  patch: Partial<AiPreferenceState> | ((state: AiPreferenceState) => void | Promise<void>)
): Promise<void> {
  if (typeof patch === "function") {
    return writeAiPreferenceState(patch);
  }

  return writeAiPreferenceState((state) => {
    Object.assign(state, patch);
  });
}
