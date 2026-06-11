import * as monsterUtils from "@/utils";

function stringifyExample(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    value,
    (_key, currentValue) => {
      if (currentValue instanceof Error) return { name: currentValue.name, message: currentValue.message };
      if (typeof currentValue === "bigint") return currentValue.toString();
      if (typeof currentValue === "function") return `[Function ${currentValue.name || "anonymous"}]`;
      if (currentValue && typeof currentValue === "object") {
        if (seen.has(currentValue)) return "[Circular]";
        seen.add(currentValue);
      }
      return currentValue;
    },
    2
  ) ?? String(value);
}

self.onmessage = async (e: MessageEvent) => {
  const { id, fnName, argsStrings } = e.data;
  try {
    const targetFn = (monsterUtils as any)[fnName];
    if (typeof targetFn !== 'function') {
      throw new Error(`无法找到目标函数 ${fnName} 或其不是一个合法函数。`);
    }

    const args = argsStrings.map((valStr: string) => {
      const trimmed = valStr.trim();
      if (!trimmed) return undefined;
      try {
        const fn = new Function('return ' + trimmed);
        return fn();
      } catch (e) {
        return trimmed;
      }
    });

    const res = await targetFn(...args);
    // 在 worker 中执行序列化，防止不可克隆对象（如 function/DOM节点）导致的 DataCloneError
    const stringified = stringifyExample(res !== undefined ? res : "undefined");
    self.postMessage({ id, success: true, result: stringified });
  } catch (err: any) {
    self.postMessage({ id, success: false, error: err?.message || String(err) });
  }
};
