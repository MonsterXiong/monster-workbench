import {
  createStableHashId,
  getCurrentIsoString,
  isNonNullable,
  objectKeys,
  parseLogLine,
  getStorageJsonObject,
  removeStorageItem,
  setStorageJson,
  splitOnce,
  toReversedArray,
} from "../utils";

export type ErrorReviewStatus = "pending" | "needs_review" | "resolved";

export interface ErrorMonitorEntry {
  id: string;
  fingerprint: string;
  time: string;
  level: "ERROR";
  errorCode: string;
  errorType: string;
  message: string;
  details: string;
  rawLine: string;
  status: ErrorReviewStatus;
  statusUpdatedAt: string | null;
}

interface ErrorReviewRecord {
  status: ErrorReviewStatus;
  updatedAt: string;
}

const STORAGE_KEY = "monster-workbench-error-monitor-review";
const DETAIL_SEPARATOR = " | Details: ";

function getNowIsoString(): string {
  return getCurrentIsoString();
}

function readReviewMap(): Record<string, ErrorReviewRecord> {
  return getStorageJsonObject<Record<string, ErrorReviewRecord>>(STORAGE_KEY, {});
}

function writeReviewMap(reviewMap: Record<string, ErrorReviewRecord>) {
  setStorageJson(STORAGE_KEY, reviewMap, "{}");
}

function splitSummaryAndDetails(payload: string) {
  const result = splitOnce(payload, DETAIL_SEPARATOR);
  if (!result.found) {
    return {
      summary: payload.trim(),
      details: "",
    };
  }

  return {
    summary: result.before.trim(),
    details: result.after.trim(),
  };
}

function parseSummary(summary: string) {
  let errorCode = "ERR_UNKNOWN";
  let errorType = "RUNTIME";
  let message = summary;

  const codeMatch = message.match(/^\[([A-Z0-9_]+)\]\s*(.*)$/);
  if (codeMatch) {
    errorCode = codeMatch[1];
    message = codeMatch[2].trim();
  }

  const typeMatch = message.match(/\[([A-Z0-9_]+)\]\s*(?:错误|警告|提示)?[:：]\s*(.*)$/);
  if (typeMatch) {
    errorType = typeMatch[1];
    message = typeMatch[2].trim();
  } else {
    const looseTypeMatch = message.match(/\[([A-Z0-9_]+)\]/);
    if (looseTypeMatch) {
      errorType = looseTypeMatch[1];
      message = message.replace(looseTypeMatch[0], "").trim();
    }
  }

  return {
    errorCode,
    errorType,
    message: message || summary,
  };
}

function parseErrorLine(line: string): ErrorMonitorEntry | null {
  const parsedLine = parseLogLine(line);

  if (parsedLine.level !== "ERROR") {
    return null;
  }

  const time = parsedLine.time;
  const payload = parsedLine.message;
  const { summary, details } = splitSummaryAndDetails(payload);
  const { errorCode, errorType, message } = parseSummary(summary);
  const fingerprint = createStableHashId(line, "err");

  return {
    id: fingerprint,
    fingerprint,
    time,
    level: "ERROR",
    errorCode,
    errorType,
    message,
    details,
    rawLine: line,
    status: "pending",
    statusUpdatedAt: null,
  };
}

function attachReviewState(entries: ErrorMonitorEntry[]) {
  const currentReviewMap = readReviewMap();
  const nextReviewMap: Record<string, ErrorReviewRecord> = {};

  const hydratedEntries = entries.map((entry) => {
    const review = currentReviewMap[entry.fingerprint];
    if (review) {
      nextReviewMap[entry.fingerprint] = review;
      return {
        ...entry,
        status: review.status,
        statusUpdatedAt: review.updatedAt,
      };
    }

    return entry;
  });

  if (objectKeys(currentReviewMap).length !== objectKeys(nextReviewMap).length) {
    writeReviewMap(nextReviewMap);
  }

  return hydratedEntries;
}

export const errorMonitorService = {
  buildEntries(logLines: string[]) {
    const entries = toReversedArray(
      logLines
        .map((line) => parseErrorLine(line))
        .filter(isNonNullable)
    );

    return attachReviewState(entries);
  },

  updateReviewStatus(fingerprint: string, status: ErrorReviewStatus) {
    const reviewMap = readReviewMap();
    const updatedAt = getNowIsoString();
    reviewMap[fingerprint] = {
      status,
      updatedAt,
    };
    writeReviewMap(reviewMap);
    return updatedAt;
  },

  clearReviewState() {
    removeStorageItem(STORAGE_KEY);
  },
};
