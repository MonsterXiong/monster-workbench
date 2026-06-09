import {
  camelCase,
  cleanDisplayText,
  createTextPreview,
  formatTextPreview,
  kebabCase,
  maskText,
  splitBySeparators,
  summarizeText,
  summarizeTextKeywords,
  summarizeTextMatch,
  truncateMiddleText,
} from "../string";
import {
  createDataUrl,
  safeDecodeBase64Utf8,
  summarizeDataUrl,
  summarizeEncodedText,
} from "../encoding";
import {
  createStableHashId,
  ensureUniqueDomId,
  normalizeDomId,
  summarizeUniqueIds,
} from "../id";
import {
  formatKeyboardShortcut,
  parseKeyboardShortcut,
  summarizeKeyboardShortcuts,
  toAriaKeyShortcuts,
} from "../keyboard";

const longText = "  Monster Workbench\n工具函数 playground / docs / examples  ";
const dataUrl = createDataUrl("hello", "text/plain", "text");

export const textUtilityExamples = {
  textSummary: summarizeText(longText),
  textPreview: createTextPreview(longText, { maxLength: 24 }),
  formattedPreview: formatTextPreview(longText, { maxLength: 24 }),
  keywordSummary: summarizeTextKeywords("alpha beta beta gamma", ["beta", "delta"]),
  textMatch: summarizeTextMatch("alpha beta beta gamma", "beta"),
  cleaned: cleanDisplayText(["  alpha  ", "", null, "beta"].join("\n")),
  middleTruncated: truncateMiddleText("workspace/components/utils/very-long-resource-name.ts", 28),
  masked: maskText("sk-test-1234567890", 3, 4),
  cases: {
    kebab: kebabCase("Monster Workbench Utils"),
    camel: camelCase("monster-workbench-utils"),
  },
  splitValues: splitBySeparators("alpha,beta，gamma\ndelta"),
  encodedText: summarizeEncodedText("5Lit5paH"),
  decodedBase64: safeDecodeBase64Utf8("5Lit5paH", { fallback: "invalid" }),
  dataUrl: summarizeDataUrl(dataUrl),
  stableId: createStableHashId("中文路径/工具函数", "utils"),
  normalizedDomId: normalizeDomId("工具 函数/Playground", "utils"),
  uniqueDomId: ensureUniqueDomId("panel", ["panel", "panel-1"]),
  uniqueIds: summarizeUniqueIds(["panel", "panel", "panel-1"]),
  keyboard: {
    parsed: parseKeyboardShortcut("Ctrl+Shift+P"),
    label: formatKeyboardShortcut("Ctrl+Shift+P"),
    aria: toAriaKeyShortcuts("Ctrl+Shift+P"),
    summary: summarizeKeyboardShortcuts(["Ctrl+S", "Ctrl+S", "Escape"]),
  },
};

export const textUtilityBoundaryCases = [
  {
    key: "blank-text",
    title: "blank text summary",
    input: "summarizeText('   ')",
    expected: String(summarizeText("   ").empty),
  },
  {
    key: "unicode-id",
    title: "unicode stable id",
    input: "createStableHashId('中文路径/工具函数')",
    expected: textUtilityExamples.stableId,
  },
  {
    key: "invalid-base64",
    title: "safe base64 decode",
    input: "safeDecodeBase64Utf8('@@@', { fallback: 'invalid' })",
    expected: safeDecodeBase64Utf8("@@@", { fallback: "invalid" }),
  },
  {
    key: "duplicate-shortcut",
    title: "keyboard duplicate shortcuts",
    input: "summarizeKeyboardShortcuts(['Ctrl+S', 'Ctrl+S'])",
    expected: textUtilityExamples.keyboard.summary.labels.join(", ") || "-",
  },
];
