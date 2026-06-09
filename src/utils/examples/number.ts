import {
  createNumberRangeBuckets,
  normalizePageSizeOptions,
  summarizeNumberDistribution,
  summarizeNumberList,
  summarizeNumberRange,
  summarizePagination,
  summarizeProgressRatio,
  summarizeSteppedNumber,
} from "../number";

export const numberUtilityInputs = [
  12,
  "18",
  "",
  null,
  undefined,
  "非法数字",
  -4,
  0,
  33.6,
  "88.2",
] as const;

export const numberUtilityBuckets = createNumberRangeBuckets([0, 10, 20, 50, 100], {
  prefix: "score",
  includeOuterBuckets: true,
});

export const numberUtilityExamples = {
  listSummary: summarizeNumberList(numberUtilityInputs),
  distribution: summarizeNumberDistribution(numberUtilityInputs, numberUtilityBuckets, 1),
  range: summarizeNumberRange("128", 0, 100, 0),
  progress: summarizeProgressRatio(128, 100, 0),
  stepped: summarizeSteppedNumber("37.8", { min: 0, max: 100, step: 5 }),
  pagination: summarizePagination(99, 20, 45, { maxVisiblePages: 5, showEdges: true }),
  pageSizes: normalizePageSizeOptions("20", [10, 20, "50", "非法", 0]),
};

export const numberUtilityBoundaryCases = [
  {
    key: "empty-values",
    title: "空值与非法输入",
    input: "[12, '18', '', null, undefined, '非法数字']",
    expected: "finiteCount 为 5，invalidCount 为 5；空字符串会按 Number('') 解析为 0。",
  },
  {
    key: "range-clamp",
    title: "范围归一化",
    input: "summarizeNumberRange('128', 0, 100)",
    expected: "value 保留 128，clampedValue 为 100，aboveMax 为 true。",
  },
  {
    key: "distribution-boundary",
    title: "连续分桶边界",
    input: "createNumberRangeBuckets([0, 10, 20, 50, 100])",
    expected: "默认左闭右开，最后一个内部 bucket 右闭，避免边界重复计数。",
  },
  {
    key: "pagination-overflow",
    title: "超出页码",
    input: "summarizePagination(99, 20, 45)",
    expected: "page 归一化到 3，startItemNumber 为 41，lastPage 为 true。",
  },
];
