import {
  createArrayListViewReport,
  diffArraysByIndex,
  diffArraysByKeyChanges,
  groupByEntries,
  paginateArrayWithSummary,
  summarizeArrayIndexDiff,
  summarizeArrayKeyedChanges,
  uniqueBy,
} from "../array";

interface DemoTask {
  id: string;
  status: "todo" | "doing" | "done";
  owner: string;
  priority: number;
}

export const arrayUtilityTasksBefore: DemoTask[] = [
  { id: "a", status: "todo", owner: "li", priority: 2 },
  { id: "b", status: "doing", owner: "wang", priority: 1 },
  { id: "c", status: "done", owner: "li", priority: 3 },
];

export const arrayUtilityTasksAfter: DemoTask[] = [
  { id: "b", status: "done", owner: "wang", priority: 1 },
  { id: "a", status: "todo", owner: "li", priority: 2 },
  { id: "d", status: "doing", owner: "chen", priority: 2 },
];

const statusOrder = ["doing", "todo", "done"] as const;

export const arrayUtilityExamples = {
  uniqueOwners: uniqueBy(arrayUtilityTasksBefore, (item) => item.owner),
  groupedByStatus: groupByEntries(arrayUtilityTasksBefore, (item) => item.status),
  keyedDiff: diffArraysByKeyChanges(
    arrayUtilityTasksBefore,
    arrayUtilityTasksAfter,
    (item) => item.id,
    {
      isEqual: (before, after) => before.status === after.status && before.priority === after.priority,
    }
  ),
  indexedDiff: diffArraysByIndex(["alpha", "beta"], ["alpha", "gamma", "delta"]),
  paged: paginateArrayWithSummary(arrayUtilityTasksAfter, 9, 2),
  listView: createArrayListViewReport(arrayUtilityTasksAfter, {
    filters: [
      { value: "doing", getValue: (item) => item.status },
    ],
    sortRules: [
      { getValue: (item) => statusOrder.indexOf(item.status), direction: "asc" },
      { getValue: (item) => item.priority, direction: "desc" },
    ],
    page: 1,
    pageSize: 5,
  }),
};

export const arrayUtilityBoundaryCases = [
  {
    key: "empty-pagination",
    title: "empty array pagination",
    input: "paginateArrayWithSummary([], 9, 2)",
    expected: "totalPages keeps a minimum of 1 and page normalizes to 1.",
  },
  {
    key: "keyed-diff",
    title: "keyed array diff",
    input: "diffArraysByKeyChanges(before, after, item => item.id)",
    expected: summarizeArrayKeyedChanges(arrayUtilityExamples.keyedDiff).changedKeys.join(", "),
  },
  {
    key: "index-diff",
    title: "index array diff",
    input: "diffArraysByIndex(['alpha', 'beta'], ['alpha', 'gamma', 'delta'])",
    expected: summarizeArrayIndexDiff(arrayUtilityExamples.indexedDiff).changedOrMovedIndexes.join(", "),
  },
  {
    key: "optional-filter",
    title: "optional value filter",
    input: "createArrayListViewReport(items, { filters })",
    expected: `${arrayUtilityExamples.listView.summary.filteredCount}/${arrayUtilityExamples.listView.summary.sourceCount}`,
  },
];
