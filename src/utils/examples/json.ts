import {
  getJsonStringifyErrorMessage,
  isJsonSerializable,
  safeJsonStringify,
  tryJsonStringify,
} from "../json";

interface CircularJsonDemo {
  id: string;
  self?: CircularJsonDemo;
}

export const circularJsonDemoValue: CircularJsonDemo = { id: "root" };
circularJsonDemoValue.self = circularJsonDemoValue;

const circularResult = tryJsonStringify(circularJsonDemoValue);

export const jsonUtilityExamples = {
  circularResult,
  circularFallback: safeJsonStringify(circularJsonDemoValue, "{\"error\":\"circular\"}"),
  serializable: isJsonSerializable({ id: "ok", items: [1, 2, 3] }),
  circularSerializable: isJsonSerializable(circularJsonDemoValue),
};

export const jsonUtilityBoundaryCases = [
  {
    key: "circular-json",
    title: "circular JSON",
    input: "tryJsonStringify(circularObject)",
    expected: getJsonStringifyErrorMessage(circularResult, "failed"),
  },
  {
    key: "safe-stringify",
    title: "safe stringify fallback",
    input: "safeJsonStringify(circularObject, fallback)",
    expected: jsonUtilityExamples.circularFallback,
  },
];
