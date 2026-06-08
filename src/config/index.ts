export interface AppConfig {
  env: "development" | "staging" | "production";
  apiBaseUrl: string;
  logLevel: "debug" | "info" | "warn" | "error";
  version: string;
  title: string;
}

export const config: AppConfig = {
  env: (import.meta.env.VITE_APP_ENV as any) || "development",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
  logLevel: (import.meta.env.VITE_LOG_LEVEL as any) || "debug",
  version: import.meta.env.VITE_APP_VERSION || "0.0.3",
  title: import.meta.env.VITE_APP_TITLE || "Monster Workbench",
};
