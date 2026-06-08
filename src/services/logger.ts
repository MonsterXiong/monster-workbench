import { config } from "../config";
import { buildDatedFileName, formatDateTime, safeJsonStringify } from "../utils";
import { systemService } from "./system.service";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getTodayLogFileName(): string {
  return buildDatedFileName("", "log");
}

function formatTime(d: Date): string {
  return formatDateTime(d);
}

async function writeLog(level: LogLevel, message: string, details?: any) {
  const now = new Date();
  const timeStr = formatTime(now);

  // 组装格式化日志行
  let detailStr = "";
  if (details !== undefined && details !== null) {
    detailStr = " | Details: " + (typeof details === "object" ? safeJsonStringify(details, "[Unserializable Object]") : String(details));
  }
  const logLine = `[${timeStr}] [${level.toUpperCase()}] ${message}${detailStr}`;

  // 1. 控制台分流输出
  if (level === "error") {
    console.error(logLine);
  } else if (level === "warn") {
    console.warn(logLine);
  } else if (level === "debug") {
    console.debug(logLine);
  } else {
    console.log(logLine);
  }

  // 2. 检查等级权重限制，若满足要求则持久化追加写入物理日志
  const configWeight = LEVEL_WEIGHTS[config.logLevel] ?? 1;
  const currentWeight = LEVEL_WEIGHTS[level];

  if (currentWeight >= configWeight) {
    try {
      const fileName = getTodayLogFileName();
      await systemService.writeLogEntry(fileName, logLine);
    } catch (err) {
      console.error("[ERR_LOGGER_WRITE] [Logger Internal Error] 物理日志文件追加写入失败:", err);
    }
  }
}

export const logger = {
  debug(message: string, details?: any) {
    writeLog("debug", message, details);
  },
  info(message: string, details?: any) {
    writeLog("info", message, details);
  },
  warn(message: string, details?: any) {
    writeLog("warn", message, details);
  },
  error(message: string, details?: any) {
    writeLog("error", message, details);
  },
  getTodayLogFileName,
};
