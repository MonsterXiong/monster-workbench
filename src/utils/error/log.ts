import { LOG_LEVELS, LOG_LEVEL_WEIGHTS } from "./types";
import type { FormatLogLinesSummaryOptions, LogLinesSummary, LogLevel, ParsedLogLine } from "./types";

const LOG_LEVEL_REGEXP = /\[(ERROR|WARN|INFO|DEBUG)\]/i;
const LOG_TIME_REGEXP = /^\[(.*?)\]/;

export function normalizeLogLevel(level: unknown): LogLevel | null {
  const normalizedLevel = String(level ?? "")
    .trim()
    .replace(/^\[|\]$/g, "")
    .toUpperCase();

  return (LOG_LEVELS as readonly string[]).includes(normalizedLevel) ? (normalizedLevel as LogLevel) : null;
}

export function getLogLevelWeight(level: unknown, fallback = -1): number {
  const normalizedLevel = normalizeLogLevel(level);
  return normalizedLevel ? LOG_LEVEL_WEIGHTS[normalizedLevel] : fallback;
}

export function compareLogLevels(left: unknown, right: unknown): number {
  return getLogLevelWeight(left) - getLogLevelWeight(right);
}

export function isLogLevelAtLeast(level: unknown, minLevel: unknown): boolean {
  const levelWeight = getLogLevelWeight(level);
  const minLevelWeight = getLogLevelWeight(minLevel);
  return levelWeight >= 0 && minLevelWeight >= 0 && levelWeight >= minLevelWeight;
}

export function formatLogLevelTag(level: unknown): string {
  const normalizedLevel = normalizeLogLevel(level);
  return normalizedLevel ? `[${normalizedLevel}]` : "";
}

export function getLogLevelFromText(value: string): LogLevel | null {
  const match = value.match(LOG_LEVEL_REGEXP);
  return normalizeLogLevel(match?.[1]);
}

export function parseLogLine(value: string): ParsedLogLine {
  const timeMatch = value.match(LOG_TIME_REGEXP);
  const levelMatch = LOG_LEVEL_REGEXP.exec(value);
  const level = normalizeLogLevel(levelMatch?.[1]);
  const message = levelMatch ? value.slice(levelMatch.index + levelMatch[0].length).trim() : value.trim();

  return {
    rawLine: value,
    time: timeMatch ? timeMatch[1] : "",
    level,
    message,
  };
}

/** 对聚合的日志片段生成严重度与分布概要。 */
export function summarizeLogLines(lines: readonly string[]): LogLinesSummary {
  const parsedLines = lines.map(parseLogLine);
  const levelCounts = LOG_LEVELS.reduce<Record<LogLevel, number>>((result, level) => {
    result[level] = 0;
    return result;
  }, {} as Record<LogLevel, number>);
  let minLevel: LogLevel | null = null;
  let maxLevel: LogLevel | null = null;

  for (const line of parsedLines) {
    if (!line.level) {
      continue;
    }

    levelCounts[line.level] += 1;

    if (minLevel === null || compareLogLevels(line.level, minLevel) < 0) {
      minLevel = line.level;
    }

    if (maxLevel === null || compareLogLevels(line.level, maxLevel) > 0) {
      maxLevel = line.level;
    }
  }

  return {
    lines: parsedLines,
    totalCount: parsedLines.length,
    levelCounts,
    unknownLevelCount: parsedLines.filter((line) => line.level === null).length,
    minLevel,
    maxLevel,
    hasErrors: levelCounts.ERROR > 0,
    hasWarnings: levelCounts.WARN > 0,
    messages: parsedLines.map((line) => line.message),
  };
}

export function filterLogLinesByLevel(lines: readonly string[], minLevel: LogLevel | Lowercase<LogLevel>): string[] {
  const normalizedMinLevel = normalizeLogLevel(minLevel);

  if (!normalizedMinLevel) {
    return [...lines];
  }

  return lines.filter((line) => {
    const level = getLogLevelFromText(line);
    return level ? isLogLevelAtLeast(level, normalizedMinLevel) : false;
  });
}

export function formatLogLinesSummary(summary: LogLinesSummary, options: FormatLogLinesSummaryOptions = {}): string {
  if (summary.totalCount === 0) {
    return options.emptyText ?? "0 logs";
  }

  const parts = LOG_LEVELS
    .map((level) => [level, summary.levelCounts[level]] as const)
    .filter(([, count]) => count > 0)
    .map(([level, count]) => `${level}:${count}`);

  if (options.includeUnknown ?? true) {
    if (summary.unknownLevelCount > 0) {
      parts.push(`UNKNOWN:${summary.unknownLevelCount}`);
    }
  }

  return parts.join(options.separator ?? " / ") || String(summary.totalCount);
}
