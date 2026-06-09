import {
  getRelativePath,
  resolveSafeChildPath,
  sanitizeFileNameWithFallback,
  summarizePathRelation,
  summarizePathSafety,
} from "../path";

export const pathUtilityInputs = {
  windowsBase: "C:\\Users\\li\\Desktop\\项目",
  windowsTarget: "C:\\Users\\li\\Desktop\\项目\\报告\\明细.csv",
  chineseFileName: "  报告:2026/06?.csv  ",
  traversal: "..\\secret\\token.txt",
};

export const pathUtilityExamples = {
  relation: summarizePathRelation(pathUtilityInputs.windowsBase, pathUtilityInputs.windowsTarget, { ignoreCase: true }),
  safeChild: resolveSafeChildPath(pathUtilityInputs.windowsBase, "报告\\明细.csv", { ignoreCase: true }),
  unsafeChild: resolveSafeChildPath(pathUtilityInputs.windowsBase, pathUtilityInputs.traversal, { ignoreCase: true }),
  sanitizedFileName: sanitizeFileNameWithFallback(pathUtilityInputs.chineseFileName, "untitled"),
  traversalSafety: summarizePathSafety(pathUtilityInputs.traversal),
};

export const pathUtilityBoundaryCases = [
  {
    key: "windows-relative",
    title: "Windows relative path",
    input: "getRelativePath(base, target, { ignoreCase: true })",
    expected: getRelativePath(pathUtilityInputs.windowsBase, pathUtilityInputs.windowsTarget, { ignoreCase: true }),
  },
  {
    key: "safe-child",
    title: "safe child path",
    input: "resolveSafeChildPath(base, '报告\\\\明细.csv')",
    expected: pathUtilityExamples.safeChild ?? "null",
  },
  {
    key: "path-traversal",
    title: "path traversal blocked",
    input: "resolveSafeChildPath(base, '..\\\\secret\\\\token.txt')",
    expected: pathUtilityExamples.unsafeChild ?? "null",
  },
  {
    key: "chinese-file-name",
    title: "Chinese file name sanitize",
    input: pathUtilityInputs.chineseFileName,
    expected: pathUtilityExamples.sanitizedFileName,
  },
];
