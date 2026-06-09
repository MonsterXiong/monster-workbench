import { useToast } from "../composables/useToast";
import {
  buildUrlWithQuery,
  clearTimeoutHandle,
  createTimeout,
  getErrorMessage,
  isAbortError,
  isJsonMimeType,
  isNativeRequestBody,
  safeJsonStringify,
} from "../utils";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  timeout?: number;
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: BodyInit | Record<string, unknown> | null;
  showToastOnError?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  status: number;
  message?: string;
}

import { config } from "../config";

function buildUrl(
  input: string,
  baseURL: string,
  params?: RequestOptions["params"]
): string {
  const defaultBase = baseURL || config.apiBaseUrl || window.location.origin;
  return buildUrlWithQuery(input, { baseUrl: defaultBase, params });
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (isJsonMimeType(contentType)) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

class RequestClient {
  private baseURL = "";

  private defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  setBaseURL(url: string) {
    this.baseURL = url;
  }

  setHeader(key: string, value: string) {
    this.defaultHeaders = {
      ...(this.defaultHeaders as Record<string, string>),
      [key]: value,
    };
  }

  async request<T>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { timeout = 15000, params, headers, body, showToastOnError, ...rest } = options;
    const controller = new AbortController();
    const timer = createTimeout(() => controller.abort(), timeout);
    const finalUrl = buildUrl(url, this.baseURL, params);

    const finalBody =
      body && typeof body === "object" && !isNativeRequestBody(body)
        ? safeJsonStringify(body)
        : (body ?? null);

    try {
      const response = await fetch(finalUrl, {
        ...rest,
        body: finalBody,
        headers: {
          ...(this.defaultHeaders as Record<string, string>),
          ...(headers as Record<string, string> | undefined),
        },
        signal: controller.signal,
      });

      const data = await parseResponse<T>(response);

      if (!response.ok) {
        const errMsg = `[ERR_HTTP_REQUEST] 网络请求失败: ${response.status} ${response.statusText}`.trim();
        if (showToastOnError) {
          useToast().triggerToast(errMsg, "error");
        }
        return {
          success: false,
          data,
          status: response.status,
          message: errMsg,
        };
      }

      return {
        success: true,
        data,
        status: response.status,
      };
    } catch (error) {
      let errMsg = "";
      let status = 0;
      if (isAbortError(error)) {
        errMsg = "[ERR_HTTP_TIMEOUT] 网络请求超时，请稍后再试";
        status = 408;
      } else {
        const message = getErrorMessage(error, "");
        errMsg = message ? `[ERR_HTTP_FAILED] ${message}` : "[ERR_HTTP_NETWORK] 网络连接请求失败";
      }

      if (showToastOnError) {
        useToast().triggerToast(errMsg, "error");
      }

      return {
        success: false,
        data: null as T,
        status,
        message: errMsg,
      };
    } finally {
      clearTimeoutHandle(timer);
    }
  }

  get<T>(url: string, params?: RequestOptions["params"], options?: RequestOptions) {
    return this.request<T>(url, { ...options, method: "GET", params });
  }

  post<T>(url: string, body?: RequestOptions["body"], options?: RequestOptions) {
    return this.request<T>(url, { ...options, method: "POST", body });
  }

  put<T>(url: string, body?: RequestOptions["body"], options?: RequestOptions) {
    return this.request<T>(url, { ...options, method: "PUT", body });
  }

  delete<T>(url: string, params?: RequestOptions["params"], options?: RequestOptions) {
    return this.request<T>(url, { ...options, method: "DELETE", params });
  }
}

export const request = new RequestClient();
