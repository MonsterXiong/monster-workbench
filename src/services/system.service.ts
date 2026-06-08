import { ref } from "vue";
import type { WindowAction } from "../types/system";
import {
  buildDatedFileName,
  getCurrentUnixTimestamp,
  getFileExtensionWithDot,
  getSafeFileName,
  getYearMonthPath,
  equalsIgnoreCase,
  normalizeStringKey,
  objectEntries,
  safeJsonParse,
  safeJsonStringifyPretty,
  tryJsonParseObject,
} from "../utils";
import { ensureBrowserMessage, isTauriRuntime } from "./runtime";
import { callTauri } from "./tauri";

const BROWSER_FILE_KEY = "monster-workbench-browser-file";

// 浏览器 Mock 物理日志存储（最多 500 条）
export const mockLogs = ref<string[]>([
  `[2026-06-06 10:20:00] [INFO] Browser Mock log system initialized successfully`,
  `[2026-06-06 10:20:01] [DEBUG] Currently in non-Tauri runtime environment, log operations downgraded to memory stream`
]);

export const systemService = {
  async getAppDataDir(): Promise<string> {
    if (!isTauriRuntime()) {
      return "Browser Preview Mode";
    }

    return callTauri<string>("get_app_paths");
  },

  async checkDbStatus(): Promise<void> {
    if (!isTauriRuntime()) {
      return; // Browser mock ignores db check
    }
    return callTauri<void>("check_db_status");
  },

  async writeTestFile(content: string): Promise<string> {
    if (!isTauriRuntime()) {
      localStorage.setItem(BROWSER_FILE_KEY, content);
      return "Browser Preview Cache";
    }

    return callTauri<string>("write_file_data", { content });
  },

  async readTestFile(): Promise<string> {
    if (!isTauriRuntime()) {
      return localStorage.getItem(BROWSER_FILE_KEY) ?? "No Content";
    }

    return callTauri<string>("read_file_data");
  },

  async openPath(path: string): Promise<void> {
    if (!isTauriRuntime()) {
      if (path.startsWith("http")) {
        window.open(path, "_blank", "noopener,noreferrer");
        return;
      }

      throw new Error("[ERR_SYS_OPEN_PATH] " + ensureBrowserMessage("打开本地路径功能"));
    }

    return callTauri<void>("open_system_path", { path });
  },

  async controlWindow(action: WindowAction): Promise<void> {
    if (!isTauriRuntime()) {
      throw new Error("[ERR_SYS_WINDOW_CTRL] " + ensureBrowserMessage("窗口控制功能"));
    }

    return callTauri<void>("control_window", { action });
  },

  async selectFolder(): Promise<string | null> {
    if (!isTauriRuntime()) {
      throw new Error("[ERR_SYS_SELECT_FOLDER] " + ensureBrowserMessage("文件夹选择功能"));
    }

    return callTauri<string | null>("select_folder");
  },

  async selectFile(): Promise<string | null> {
    if (!isTauriRuntime()) {
      throw new Error("[ERR_SYS_SELECT_FILE] " + ensureBrowserMessage("文件选择功能"));
    }

    return callTauri<string | null>("select_file");
  },

  async createDirectoryStructure(rootPath: string | null, items: PathItem[]): Promise<void> {
    if (!isTauriRuntime()) {
      console.log("[Browser Mock] Batch create directory structure:", rootPath, items);
      return;
    }
    return callTauri<void>("create_directory_structure", { rootPath, items });
  },

  async findPortProcess(port: number): Promise<PortProcessInfo[]> {
    if (!isTauriRuntime()) {
      console.log("[Browser Mock] Query port process:", port);
      if (port === 8080) {
        return [
          { proto: "TCP", local_addr: `0.0.0.0:${port}`, state: "LISTENING", pid: 8888, name: "mock-node-server.exe" },
          { proto: "TCP", local_addr: `[::]:${port}`, state: "LISTENING", pid: 8888, name: "mock-node-server.exe" }
        ];
      }
      return [];
    }
    return callTauri<PortProcessInfo[]>("find_port_process", { port });
  },

  async killProcessByPid(pid: number): Promise<void> {
    if (!isTauriRuntime()) {
      console.log("[Browser Mock] Kill process PID:", pid);
      return;
    }
    return callTauri<void>("kill_process_by_pid", { pid });
  },

  async readDirectoryTree(dirPath: string, skipDirs: string[], maxDepth: number): Promise<string> {
    if (!isTauriRuntime()) {
      console.log("[Browser Mock] Read directory tree structure:", dirPath, skipDirs, maxDepth);
      return `MockRoot/
├── child_dir/
│   └── file.txt
└── test.html`;
    }
    return callTauri<string>("read_directory_tree", { dirPath, skipDirs, maxDepth });
  },

  async uploadFile(srcPath: string, fileType: "image" | "file"): Promise<string> {
    if (!isTauriRuntime()) {
      // 提取文件名与扩展名
      const fileName = getSafeFileName(srcPath, "mock_file");
      const fileExt = getFileExtensionWithDot(fileName) || (fileType === "image" ? ".png" : ".txt");
      const uuidName = crypto.randomUUID();
      const mockPath = `uploads/${fileType === "image" ? "images" : "files"}/2026/06/${uuidName}${fileExt}`;

      // 动态导入以防止循环依赖，将 Mock 文件入库内存池
      import("./file-manager.service").then(({ mockFiles }) => {
        mockFiles.value.unshift({
          rel_path: mockPath,
          file_name: fileName,
          file_size: 1024 * Math.floor(Math.random() * 300 + 12),
          file_type: fileType,
          modified: getCurrentUnixTimestamp()
        });
      });

      return mockPath;
    }

    const yearMonth = getYearMonthPath();
    const uuidName = crypto.randomUUID();

    return callTauri<string>("upload_file", {
      srcPath,
      fileType,
      yearMonth,
      uuidName
    });
  },

  async killProcessByName(name: string): Promise<void> {
    if (!isTauriRuntime()) {
      console.log("[Browser Mock] Kill process by name:", name);
      return;
    }
    return callTauri<void>("kill_process_by_name", { name });
  },

  async exportDatabase(targetPath: string): Promise<void> {
    if (!isTauriRuntime()) {
      // Web 端备份降级：搜集搜寻以 monster- 开头的所有 LocalStorage 数据
      const backup: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("monster-") || key === "monster_workbench_db_mock")) {
          backup[key] = localStorage.getItem(key) ?? "";
        }
      }

      const jsonStr = safeJsonStringifyPretty(backup, "{}");
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monster_workbench_backup.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    return callTauri<void>("export_database", { targetPath });
  },

  async importDatabase(srcPathOrJson: string): Promise<void> {
    if (!isTauriRuntime()) {
      try {
        const backupResult = tryJsonParseObject<Record<string, string>>(srcPathOrJson);
        if (!backupResult.ok || !backupResult.data) {
          throw new Error("[ERR_SYS_BACKUP_FORMAT] 数据库备份文件数据格式不合法，缺少必要的节点记录");
        }

        // 物理清理并覆盖 LocalStorage 状态
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("monster-") || key === "monster_workbench_db_mock")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        const backup = backupResult.data;
        objectEntries(backup).forEach(([key, val]) => {
          localStorage.setItem(key, val);
        });

        setTimeout(() => {
          window.location.reload();
        }, 500);
        return;
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "[ERR_SYS_BACKUP_PARSE] 恢复备份失败：备份数据 JSON 解析异常");
      }
    }
    return callTauri<void>("import_database", { srcPath: srcPathOrJson });
  },

  async resetDatabase(): Promise<void> {
    if (!isTauriRuntime()) {
      localStorage.clear();
      setTimeout(() => {
        window.location.reload();
      }, 500);
      return;
    }
    return callTauri<void>("reset_database");
  },

  async isProcessRunning(name: string): Promise<boolean> {
    if (!isTauriRuntime()) {
      // 浏览器 Mock 环境下，判断特定名字是否占用
      return ["monster-tools.exe", "nginx.exe", "node.exe"].includes(normalizeStringKey(name));
    }
    return callTauri<boolean>("is_process_running", { name });
  },

  async findProcessByName(name: string): Promise<ProcessInstanceInfo[]> {
    if (!isTauriRuntime()) {
      console.log("[Browser Mock] Query process name instances:", name);
      if (equalsIgnoreCase(name, "nginx.exe")) {
        return [
          { name: "nginx.exe", pid: 1024, session_name: "Console", session_num: 1, mem_usage: "7,688 K" },
          { name: "nginx.exe", pid: 2048, session_name: "Console", session_num: 1, mem_usage: "12,140 K" }
        ];
      }
      if (equalsIgnoreCase(name, "monster-tools.exe")) {
        return [
          { name: "monster-tools.exe", pid: 9912, session_name: "Services", session_num: 0, mem_usage: "45,820 K" }
        ];
      }
      return [];
    }
    const res = await callTauri<string>("find_process_by_name", { name });
    return safeJsonParse<ProcessInstanceInfo[]>(res, []);
  },

  async writeLogEntry(fileName: string, line: string): Promise<void> {
    if (!isTauriRuntime()) {
      mockLogs.value.push(line);
      if (mockLogs.value.length > 500) {
        mockLogs.value.shift();
      }
      return;
    }
    return callTauri<void>("write_log_entry", { fileName, line });
  },

  async readLogFile(fileName: string): Promise<string> {
    if (!isTauriRuntime()) {
      return mockLogs.value.join("\n");
    }
    return callTauri<string>("read_log_file", { fileName });
  },

  async clearAllLogs(): Promise<void> {
    if (!isTauriRuntime()) {
      mockLogs.value = [];
      return;
    }
    return callTauri<void>("clear_all_logs");
  },

  async exportLogFile(fileName: string, targetPath: string): Promise<void> {
    if (!isTauriRuntime()) {
      // 浏览器 Mock 导出日志
      const logText = mockLogs.value.join("\n");
      const blob = new Blob([logText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    return callTauri<void>("export_log_file", { fileName, targetPath });
  },

  async exportSystemDiagnostics(targetPath: string): Promise<void> {
    const now = new Date();
    const currentTime = now.toLocaleString();
    if (!isTauriRuntime()) {
      const meta = [
        "==================================================",
        "        MONSTER WORKBENCH SYSTEM DIAGNOSTICS      ",
        "==================================================",
        `Generated Time: ${currentTime}`,
        "App Version: 0.0.3-mock",
        `OS Platform: ${navigator.userAgent}`,
        "CPU Architecture: mock-browser-arch",
        "Database Path: localStorage::monster_workbench",
        "Database Size: ~10 KB",
        "\n==================================================",
        "              CLIENT EXCEPTION LOGS               ",
        "=================================================="
      ].join("\n");
      const logText = mockLogs.value.join("\n");
      const fullText = `${meta}\n${logText}`;
      const blob = new Blob([fullText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildDatedFileName("monster_workbench_diagnostics", "txt", now);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    return callTauri<void>("export_system_diagnostics", { targetPath, currentTime });
  },

  async saveFileDialog(options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }): Promise<string | null> {
    if (!isTauriRuntime()) return null;
    const { save } = await import("@tauri-apps/plugin-dialog");
    return save(options);
  },

  async openFileDialog(options: { multiple?: boolean; filters?: { name: string; extensions: string[] }[] }): Promise<string | string[] | null> {
    if (!isTauriRuntime()) return null;
    const { open } = await import("@tauri-apps/plugin-dialog");
    return open(options);
  },

  async readBrowserTextFile(accept: string, failedMessage: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.onchange = (event: Event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (readerEvent: ProgressEvent<FileReader>) => {
          resolve(String(readerEvent.target?.result ?? ""));
        };
        reader.onerror = () => reject(new Error(failedMessage));
        reader.readAsText(file);
      };
      input.click();
    });
  },

  async writeTextFile(path: string, contents: string): Promise<void> {
    if (!isTauriRuntime()) return;
    return callTauri<void>("write_text_file", { path, contents });
  },

  async readTextFile(path: string): Promise<string> {
    if (!isTauriRuntime()) return "";
    return callTauri<string>("read_text_file", { path });
  },
};

export interface PathItem {
  path: string;
  is_file: boolean;
}

export interface PortProcessInfo {
  proto: string;
  // Rust 端返回的字段为蛇形，序列化后返回给 JS 的 key 是 "proto", "local_addr", "state", "pid", "name"
  local_addr: string;
  state: string;
  pid: number;
  name: string;
}

export interface ProcessInstanceInfo {
  name: string;
  pid: number;
  session_name: string;
  session_num: number;
  mem_usage: string;
}
