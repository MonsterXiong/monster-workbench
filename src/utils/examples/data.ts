import {
  createFileDeduplicationReport,
  createFileDisplaySummary,
  createFileSelectionIntakeReport,
  getFileKind,
  getMimeTypeByPath,
  summarizeFileAccept,
  summarizeFileSizes,
} from "../file";
import {
  createStorageKey,
  createStorageTtlEnvelope,
  formatStorageEntriesSummary,
  parseStorageKey,
  previewAndSummarizeStorageMutations,
  summarizeStorageEntries,
  summarizeStorageTtlEntries,
  type StorageEntry,
  type StorageTtlEntry,
} from "../storage";
import {
  appendQuery,
  createQueryKey,
  diffSearchParams,
  filterUrlQueryParams,
  normalizeUrlQuery,
  summarizeSearchParams,
  summarizeUrl,
  summarizeUrls,
} from "../url";

const demoFiles = [
  { name: "报告.csv", size: 1280, type: "text/csv", lastModified: 1 },
  { name: "报告.csv", size: 1280, type: "text/csv", lastModified: 1 },
  { name: "cover.png", size: 4096, type: "image/png", lastModified: 2 },
  { name: "archive.zip", size: 8192, type: "application/zip", lastModified: 3 },
];

const storageEntries: StorageEntry[] = [
  { key: "user:theme", value: "dark", index: 0 },
  { key: "user:pageSize", value: "20", index: 1 },
  { key: "cache:last-open", value: "", index: 2 },
];

const ttlEntries: Array<StorageTtlEntry<string>> = [
  {
    key: "cache:active",
    value: JSON.stringify(createStorageTtlEnvelope("ok", 1000, 1000)),
    index: 0,
    envelope: createStorageTtlEnvelope("ok", 1000, 1000),
    expired: false,
    expiresAt: 2000,
    remainingMs: 1000,
  },
  {
    key: "cache:expired",
    value: JSON.stringify(createStorageTtlEnvelope("old", 100, 1000)),
    index: 1,
    envelope: createStorageTtlEnvelope("old", 100, 1000),
    expired: true,
    expiresAt: 1100,
    remainingMs: 0,
  },
];

export const dataUtilityExamples = {
  fileDisplay: createFileDisplaySummary(demoFiles),
  fileSizes: summarizeFileSizes(demoFiles),
  fileAccept: summarizeFileAccept([".csv", "image/*"]),
  fileIntake: createFileSelectionIntakeReport(demoFiles, {
    accept: [".csv", "image/*"],
    maxFiles: 3,
    maxSize: 5000,
  }),
  fileDeduplication: createFileDeduplicationReport(demoFiles, { mode: "name-size-type" }),
  fileKinds: demoFiles.map((file) => ({ name: file.name, kind: getFileKind(file.name), mime: getMimeTypeByPath(file.name) })),
  storageKey: createStorageKey(["user", "settings", "theme"]),
  parsedStorageKey: parseStorageKey("user:settings:theme"),
  storageSummary: summarizeStorageEntries(storageEntries),
  storageSummaryText: formatStorageEntriesSummary(summarizeStorageEntries(storageEntries)),
  storageMutation: previewAndSummarizeStorageMutations({
    "user:theme": "dark",
    "user:layout": "dense",
  }),
  ttlSummary: summarizeStorageTtlEntries(ttlEntries),
  url: summarizeUrl("https://example.com/tools/report.csv?tag=ai&tag=utils&page=2#preview"),
  urlList: summarizeUrls(["https://example.com/a.csv", "notaurl", "/relative/path?x=1"], { baseUrl: "https://example.com" }),
  querySummary: summarizeSearchParams(new URLSearchParams("tag=ai&tag=utils&page=2&empty=")),
  queryDiff: diffSearchParams(new URLSearchParams("page=1&tag=ai"), new URLSearchParams("page=2&tag=ai&tag=utils")),
  queryKey: createQueryKey({ tag: ["utils", "ai"], page: 2 }),
  appendedUrl: appendQuery("/tools", { tag: ["ai", "utils"], page: 2 }),
  normalizedUrl: normalizeUrlQuery("/tools?b=2&a=1&a=0", { baseUrl: "https://example.com" }),
  filteredUrl: filterUrlQueryParams("/tools?debug=1&page=2&tag=ai", {
    baseUrl: "https://example.com",
    predicate: (key) => key !== "debug",
  }),
};

export const dataUtilityBoundaryCases = [
  {
    key: "duplicate-file",
    title: "duplicate file report",
    input: "createFileDeduplicationReport(files, { mode: 'name-size-type' })",
    expected: String(dataUtilityExamples.fileDeduplication.summary.duplicateCount),
  },
  {
    key: "storage-empty",
    title: "storage empty values",
    input: "summarizeStorageEntries(entries)",
    expected: String(dataUtilityExamples.storageSummary.emptyValueCount),
  },
  {
    key: "ttl-expired",
    title: "TTL expired entries",
    input: "summarizeStorageTtlEntries(entries)",
    expected: String(dataUtilityExamples.ttlSummary.expiredCount),
  },
  {
    key: "invalid-url",
    title: "URL list invalid count",
    input: "summarizeUrls(['https://ok', 'notaurl'])",
    expected: String(dataUtilityExamples.urlList.invalidCount),
  },
];
