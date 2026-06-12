import * as monsterUtils from "@/utils";
import {
  createSandboxExpressionContext,
  evaluateSandboxExpression,
  stringifySandboxResult,
} from "./sandboxPolicy";

interface SandboxRequest {
  id: number;
  fnName: string;
  argsStrings: string[];
}

const expressionContext = createSandboxExpressionContext();

self.onmessage = async (event: MessageEvent<SandboxRequest>) => {
  const { id, fnName, argsStrings } = event.data;

  try {
    const targetFn = (monsterUtils as Record<string, unknown>)[fnName];
    if (typeof targetFn !== "function") {
      throw new Error(`无法找到目标函数 ${fnName}。`);
    }

    const args = argsStrings.map((value) => evaluateSandboxExpression(value, expressionContext));
    const result = await targetFn(...args);
    self.postMessage({ id, success: true, result: stringifySandboxResult(result) });
  } catch (error) {
    self.postMessage({ id, success: false, error: error instanceof Error ? error.message : String(error) });
  }
};
