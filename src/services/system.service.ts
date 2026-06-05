import type { WindowAction } from "../types/system";
import { ensureBrowserMessage, isTauriRuntime } from "./runtime";
import { callTauri } from "./tauri";

const BROWSER_FILE_KEY = "monster-workbench-browser-file";

export const systemService = {
  async getAppDataDir(): Promise<string> {
    if (!isTauriRuntime()) {
      return "浏览器预览模式";
    }

    return callTauri<string>("get_app_paths");
  },

  async writeTestFile(content: string): Promise<string> {
    if (!isTauriRuntime()) {
      localStorage.setItem(BROWSER_FILE_KEY, content);
      return "浏览器预览缓存";
    }

    return callTauri<string>("write_file_data", { content });
  },

  async readTestFile(): Promise<string> {
    if (!isTauriRuntime()) {
      return localStorage.getItem(BROWSER_FILE_KEY) ?? "暂无内容";
    }

    return callTauri<string>("read_file_data");
  },

  async openPath(path: string): Promise<void> {
    if (!isTauriRuntime()) {
      if (path.startsWith("http")) {
        window.open(path, "_blank", "noopener,noreferrer");
        return;
      }

      throw new Error(ensureBrowserMessage("打开本地路径"));
    }

    return callTauri<void>("open_system_path", { path });
  },

  async controlWindow(action: WindowAction): Promise<void> {
    if (!isTauriRuntime()) {
      throw new Error(ensureBrowserMessage("窗口控制"));
    }

    return callTauri<void>("control_window", { action });
  },

  async selectFolder(): Promise<string | null> {
    if (!isTauriRuntime()) {
      throw new Error(ensureBrowserMessage("文件夹选择"));
    }

    return callTauri<string | null>("select_folder");
  },

  async selectFile(): Promise<string | null> {
    if (!isTauriRuntime()) {
      throw new Error(ensureBrowserMessage("文件选择"));
    }

    return callTauri<string | null>("select_file");
  },

  async createDirectoryStructure(rootPath: string | null, items: PathItem[]): Promise<void> {
    if (!isTauriRuntime()) {
      console.log("[Browser Mock] 批量创建目录结构:", rootPath, items);
      return;
    }
    return callTauri<void>("create_directory_structure", { rootPath, items });
  },

  async findPortProcess(port: number): Promise<PortProcessInfo[]> {
    if (!isTauriRuntime()) {
      console.log("[Browser Mock] 查询端口进程:", port);
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
      console.log("[Browser Mock] 杀死进程 PID:", pid);
      return;
    }
    return callTauri<void>("kill_process_by_pid", { pid });
  },

  async readDirectoryTree(dirPath: string, skipDirs: string[], maxDepth: number): Promise<string> {
    if (!isTauriRuntime()) {
      console.log("[Browser Mock] 读取目录树结构:", dirPath, skipDirs, maxDepth);
      return `MockRoot/
├── child_dir/
│   └── file.txt
└── test.html`;
    }
    return callTauri<string>("read_directory_tree", { dirPath, skipDirs, maxDepth });
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
