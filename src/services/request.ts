export interface RequestOptions extends Omit<RequestInit, "body"> {
  timeout?: number;
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: BodyInit | Record<string, unknown> | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  status: number;
  message?: string;
}

function buildUrl(
  input: string,
  baseURL: string,
  params?: RequestOptions["params"]
): string {
  const url = input.startsWith("http") ? new URL(input) : new URL(input, baseURL || window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
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
    const { timeout = 15000, params, headers, body, ...rest } = options;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    const finalUrl = buildUrl(url, this.baseURL, params);

    const finalBody =
      body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof URLSearchParams)
        ? JSON.stringify(body)
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
        return {
          success: false,
          data,
          status: response.status,
          message: `请求失败：${response.status} ${response.statusText}`.trim(),
        };
      }

      return {
        success: true,
        data,
        status: response.status,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return {
          success: false,
          data: null as T,
          status: 408,
          message: "请求超时，请稍后重试",
        };
      }

      return {
        success: false,
        data: null as T,
        status: 0,
        message: error instanceof Error ? error.message : "网络请求失败",
      };
    } finally {
      window.clearTimeout(timer);
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
