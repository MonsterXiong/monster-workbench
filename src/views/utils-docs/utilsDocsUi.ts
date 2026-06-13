import type {
  UtilityDocQualityReport,
  UtilityFunctionDoc,
} from "./utilsDocsContent";

export function getQualityLabel(report: UtilityDocQualityReport): string {
  if (report.level === "excellent") return "优秀";
  if (report.level === "good") return "良好";
  return "需完善";
}

export function getQualityClasses(report: UtilityDocQualityReport): string {
  if (report.level === "excellent") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (report.level === "good") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
}

export function formatSourceFiles(files: readonly string[]): string {
  return files.join("\n");
}

export function formatFunctionSignature(fn: UtilityFunctionDoc): string {
  const params = fn.params?.map((param) => `${param.name}${param.required ? "" : "?"}: ${param.type}`).join(", ") ?? "";
  return `${fn.name}(${params})${fn.returns?.type ? `: ${fn.returns.type}` : ""}`;
}

export function stringifyExample(value: unknown): string {
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
