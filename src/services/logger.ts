import { config } from "../config";
import { buildDatedFileName, formatCurrentDateTime, formatLogLevelTag, getLogLevelWeight, safeJsonStringify } from "../utils";
import { systemService } from "./system.service";

export type LogLevel = "debug" | "info" | "warn" | "error";

function getTodayLogFileName(): string {
  return buildDatedFileName("", "log");
}

async function writeLog(level: LogLevel, message: string, details?: any) {
  const timeStr = formatCurrentDateTime();

  // 组装格式化日志行
  let detailStr = "";
  if (details !== undefined && details !== null) {
    detailStr = " | Details: " + (typeof details === "object" ? safeJsonStringify(details, "[Unserializable Object]") : String(details));
  }
  const logLine = `[${timeStr}] ${formatLogLevelTag(level)} ${message}${detailStr}`;

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
  const configWeight = getLogLevelWeight(config.logLevel, 1);
  const currentWeight = getLogLevelWeight(level, 0);

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
