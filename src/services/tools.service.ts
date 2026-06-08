import { systemService } from "./system.service";
import type {
  PortProcessInfo,
  ProcessInstanceInfo,
} from "./system.service";
import { parseTreeTextToPathItems, removeTopPathSegment, splitBySeparators } from "../utils";

export const toolsService = {
  getAppDataDir(): Promise<string> {
    return systemService.getAppDataDir();
  },

  async createDirectoryStructure(payload: {
    rootPath: string;
    includeTopDir: boolean;
    treeInput: string;
  }): Promise<void> {
    let items = parseTreeTextToPathItems(payload.treeInput);
    if (!payload.includeTopDir) {
      items = removeTopPathSegment(items);
    }

    await systemService.createDirectoryStructure(payload.rootPath || null, items);
  },

  async readDirectoryTree(payload: {
    rootPath: string;
    excludeDirsInput: string;
    maxDepth: number;
  }): Promise<string> {
    return systemService.readDirectoryTree(
      payload.rootPath,
      splitBySeparators(payload.excludeDirsInput),
      payload.maxDepth || 10
    );
  },

  findPortProcess(port: number): Promise<PortProcessInfo[]> {
    return systemService.findPortProcess(port);
  },

  findProcessByName(name: string): Promise<ProcessInstanceInfo[]> {
    return systemService.findProcessByName(name);
  },

  killProcessByPid(pid: number): Promise<void> {
    return systemService.killProcessByPid(pid);
  },

  killProcessByName(name: string): Promise<void> {
    return systemService.killProcessByName(name);
  },
};

export type { PortProcessInfo, ProcessInstanceInfo };
