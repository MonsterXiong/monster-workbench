import { type App } from "vue";
import { logger } from "./logger";
import { useToast } from "../composables/useToast";
import { useLoading } from "../composables/useLoading";
import { includesAnyText, safeJsonStringify } from "../utils";

export type ErrorType =
  | "RUNTIME"     // JS 运行时错误
  | "PROMISE"     // Promise 未捕获错误
  | "TAURI"       // Tauri 底座错误
  | "NETWORK"     // 网络请求异常
  | "VALIDATION"  // 表单逻辑校验异常
  | "PERMISSION"  // 权限不足 (OS Error 5等)
  | "FILE"        // 文件读写物理错
  | "DATABASE";   // SQLite 数据库错

export class AppError extends Error {
  public type: ErrorType;
  public severity: "info" | "warn" | "error";
  public details?: any;

  constructor(
    message: string,
    type: ErrorType = "RUNTIME",
    severity: "info" | "warn" | "error" = "error",
    details?: any
  ) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.severity = severity;
    this.details = details;
  }
}

// 错误雪崩防御：记录最近弹出的报错信息与时间，相同信息在 2 秒内不再重复 Toast
const lastToastTime: Record<string, number> = {};

function triggerSafeToast(msg: string) {
  const now = Date.now();
  const lastTime = lastToastTime[msg] ?? 0;
  if (now - lastTime > 2000) {
    lastToastTime[msg] = now;
    const { triggerToast } = useToast();
    triggerToast(msg, "error");
  }
}

export const ErrorHandler = {
  init(app: App) {
    // 1. 挂载 Vue 运行时未捕获错误监听
    app.config.errorHandler = (err: any, _instance, info) => {
      this.handleError(err, "RUNTIME", { vueInfo: info });
    };

    // 2. 挂载全局 JS 运行时错误监听
    window.onerror = (message, source, lineno, colno, error) => {
      this.handleError(error || message, "RUNTIME", {
        source,
        lineno,
        colno,
      });
      return false; // 继续默认处理（不阻止控制台红字）
    };

    // 3. 挂载全局 Promise 异常监听
    window.onunhandledrejection = (event) => {
      this.handleError(event.reason, "PROMISE");
    };

    logger.info("Global error interceptor initialized successfully");
  },

  handleError(err: any, defaultType: ErrorType = "RUNTIME", extraDetails?: any) {
    let message = "[ERR_SYSTEM_UNKNOWN] 未知的系统异常";
    let stack = "";
    let type = defaultType;
    let severity: "info" | "warn" | "error" = "error";
    let details: any = extraDetails ? { ...extraDetails } : {};

    // 1. 解析错误类型与细节
    if (err instanceof AppError) {
      message = err.message;
      type = err.type;
      severity = err.severity;
      stack = err.stack ?? "";
      details = { ...details, ...err.details };
    } else if (err instanceof Error) {
      message = err.message;
      stack = err.stack ?? "";

      // 智能识别系统错误类别
      if (includesAnyText(message, ["network", "fetch", "timeout"], { ignoreCase: true })) {
        type = "NETWORK";
      } else if (includesAnyText(message, ["database", "sqlite", "sql"], { ignoreCase: true })) {
        type = "DATABASE";
      } else if (includesAnyText(message, ["permission", "denied", "os error 5"], { ignoreCase: true })) {
        type = "PERMISSION";
      } else if (includesAnyText(message, ["file", "directory", "write", "read"], { ignoreCase: true })) {
        type = "FILE";
      } else if (includesAnyText(message, ["tauri", "invoke"], { ignoreCase: true })) {
        type = "TAURI";
      }
    } else if (typeof err === "string") {
      message = err;
    } else if (err !== null && err !== undefined) {
      message = safeJsonStringify(err, String(err));
    }

    // 2. 物理日志分级持久化写入
    const logDetails = {
      errorType: type,
      stack: stack || undefined,
      ...details
    };

    if (severity === "error") {
      logger.error(`[ERR_SENTINEL_CATCH] 全局异常自愈屏障捕捉到 [${type}] 错误: ${message}`, logDetails);
    } else if (severity === "warn") {
      logger.warn(`[ERR_SENTINEL_WARN] 全局异常自愈屏障捕捉到 [${type}] 警告: ${message}`, logDetails);
    } else {
      logger.info(`[ERR_SENTINEL_INFO] 全局异常自愈屏障捕捉到 [${type}] 提示: ${message}`, logDetails);
    }

    // 3. 强行解锁 UI 阻断态 (防死锁自愈机制)
    try {
      const { hideLoading } = useLoading();
      hideLoading();
    } catch (e) {
      console.error("[ERR_SENTINEL_UNLOCK_FAIL] 异常处理器自愈机制：强行解锁全局加载状态失败:", e);
    }

    // 4. 用户 Toast 反馈 (雪崩防御)
    if (severity === "error" || severity === "warn") {
      const displayMsg = `[${type} 异常] ${message}`;
      triggerSafeToast(displayMsg);
    }
  }
};
