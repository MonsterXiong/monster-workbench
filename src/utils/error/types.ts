export interface NormalizedError {
  message: string;
  name?: string;
  code?: string;
  stack?: string;
}

export interface ErrorSummary {
  errors: NormalizedError[];
  messages: string[];
  codes: string[];
  names: string[];
  codeCounts: Record<string, number>;
  count: number;
  firstMessage: string;
  hasErrors: boolean;
}

export interface ErrorWithCode extends Error {
  code?: string;
}

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

export const LOG_LEVELS: readonly LogLevel[] = ["ERROR", "WARN", "INFO", "DEBUG"];
export const LOG_LEVEL_WEIGHTS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export interface ParsedLogLine {
  rawLine: string;
  time: string;
  level: LogLevel | null;
  message: string;
}

export interface LogLinesSummary {
  lines: ParsedLogLine[];
  totalCount: number;
  levelCounts: Record<LogLevel, number>;
  unknownLevelCount: number;
  minLevel: LogLevel | null;
  maxLevel: LogLevel | null;
  hasErrors: boolean;
  hasWarnings: boolean;
  messages: string[];
}

export interface FormatLogLinesSummaryOptions {
  emptyText?: string;
  separator?: string;
  includeUnknown?: boolean;
}

export interface ErrorDisplayReportOptions {
  fallbackMessage?: string;
  includeCode?: boolean;
  includeName?: boolean;
  includeStack?: boolean;
  separator?: string;
}

export interface ErrorDisplayReport {
  error: NormalizedError;
  message: string;
  code: string;
  name: string;
  stack: string;
  title: string;
  displayText: string;
  searchableText: string;
  abort: boolean;
}

export interface ErrorDisplayReportSummary {
  reports: ErrorDisplayReport[];
  totalCount: number;
  abortCount: number;
  uniqueMessages: string[];
  uniqueCodes: string[];
  uniqueNames: string[];
  firstDisplayText: string;
  hasErrors: boolean;
}
