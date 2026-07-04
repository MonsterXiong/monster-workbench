const MOCK_IMAGE_WORKBENCH_FAILURE_TYPES = new Set([
  "auth",
  "model",
  "size",
  "rate_limit",
  "provider_unavailable",
  "timeout",
  "connection",
  "save",
  "cancelled",
  "unknown",
]);

export function buildMockImageWorkbenchFailureFields(request: any) {
  const status = String(request?.status || "");
  if (!["failed", "cancelled"].includes(status)) {
    return { failureType: null, failureHint: null };
  }
  if (status === "cancelled") {
    return {
      failureType: "cancelled",
      failureHint: normalizeMockFailureHint(request?.failureHint)
        || normalizeMockFailureHint(request?.error)
        || "用户取消",
    };
  }
  const failureType = normalizeMockFailureType(request?.failureType)
    || inferMockImageWorkbenchFailureType(request?.error);
  return {
    failureType,
    failureHint: normalizeMockFailureHint(request?.failureHint)
      || normalizeMockFailureHint(request?.error),
  };
}

function normalizeMockFailureType(value: unknown) {
  const failureType = String(value || "").trim();
  if (!failureType) {
    return null;
  }
  if (!MOCK_IMAGE_WORKBENCH_FAILURE_TYPES.has(failureType)) {
    throw new Error(`[ERR_IPC_BROWSER] 图片工作台暂不支持的失败类型: ${failureType}`);
  }
  return failureType;
}

function inferMockImageWorkbenchFailureType(error: unknown) {
  const text = String(error || "").toLowerCase();
  if (!text) return "unknown";
  if (containsAny(text, ["cancel", "canceled", "cancelled", "用户取消", "取消"])) return "cancelled";
  if (containsAny(text, ["no available compatible accounts", "no available accounts", "no compatible accounts", "no available account", "account pool", "compatible accounts", "账号池", "可用账号", "兼容账号"])) return "provider_unavailable";
  if (containsAny(text, ["auth", "api key", "apikey", "unauthorized", "forbidden", "invalid token", "401", "403", "认证", "鉴权", "授权", "密钥"])) return "auth";
  if (containsAny(text, ["rate limit", "rate_limit", "too many requests", "quota", "429", "限流", "频率", "额度"])) return "rate_limit";
  if (containsAny(text, ["timeout", "timed out", "deadline", "worker_stuck", "超时", "卡住"])) return "timeout";
  if (containsAny(text, ["connection", "network", "refused", "dns", "socket", "econn", "enotfound", "连接", "网络"])) return "connection";
  if (containsAny(text, ["unsupported size", "unsupported_size", "dimension", "resolution", "image size", "尺寸", "分辨率"])) return "size";
  if (containsAny(text, ["save", "write", "copy", "file", "path", "artifact", "local image", "保存", "写入", "文件", "路径"])) return "save";
  if (containsAny(text, ["model", "not found", "unsupported model", "invalid model", "模型"])) return "model";
  return "unknown";
}

function containsAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function normalizeMockFailureHint(value: unknown) {
  const raw = String(value || "").toLowerCase();
  if (containsAny(raw, ["no available compatible accounts", "no available accounts", "no compatible accounts", "no available account", "account pool", "compatible accounts", "账号池", "可用账号", "兼容账号"])) {
    return "当前模型没有可用账号或账号池已耗尽，请换一个模型/Provider，或稍后重试。";
  }
  const hint = String(value || "")
    .replace(/sk-[a-z0-9_-]{6,}/gi, "sk-***")
    .replace(/(api[_-]?key|token|authorization)=\S+/gi, "$1=***")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return hint ? hint.slice(0, 256) : null;
}
