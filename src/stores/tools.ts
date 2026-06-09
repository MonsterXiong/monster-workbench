import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { toolsService } from "../services/tools.service";
import type { PortProcessInfo, ProcessInstanceInfo } from "../services/tools.service";
import { getStorageBoolean, getStorageIntegerInRange, getStorageItem, setStorageItems, sleep, toInteger, toTrimmedString } from "../utils";

export const useToolsStore = defineStore("tools", () => {
  // 1. 目录结构生成 (DirGenerator)
  const dirGenerator = ref({
    rootPath: getStorageItem("tool_dg_rootPath"),
    includeTopDir: getStorageBoolean("tool_dg_includeTopDir", true),
    treeInput: getStorageItem("tool_dg_treeInput"),
  });

  // 2. 目录结构读取 (DirReader)
  const dirReader = ref({
    rootPath: getStorageItem("tool_dr_rootPath"),
    excludeDirsInput: getStorageItem("tool_dr_excludeDirsInput", "node_modules, .git, dist", { emptyAsMissing: true }),
    maxDepth: getStorageIntegerInRange("tool_dr_maxDepth", 1, 99, 10),
    treeOutput: getStorageItem("tool_dr_treeOutput"),
  });

  // 3. 端口进程排查 (PortCleaner)
  const portCleaner = ref({
    portInput: getStorageItem("tool_pc_portInput"),
    processNameInput: getStorageItem("tool_pc_processNameInput"),
  });

  // 4. JSON美化 (JsonFormatter)
  const jsonFormatter = ref({
    jsonInput: getStorageItem("tool_jf_jsonInput"),
  });

  // 5. Base64编解码 (Base64Converter)
  const base64Converter = ref({
    base64Input: getStorageItem("tool_b64_base64Input"),
  });

  // 6. 时间戳转换 (TimestampConverter)
  const timestampConverter = ref({
    timestampInput: getStorageItem("tool_tc_timestampInput"),
  });

  const dirGeneratorDefaultPath = ref("");
  const dirGeneratorCreateLoading = ref(false);

  const dirReaderReadLoading = ref(false);

  const portQueryLoading = ref(false);
  const portProcessList = ref<PortProcessInfo[]>([]);
  const hasQueriedPort = ref(false);
  const queryInstancesLoading = ref(false);
  const processInstances = ref<ProcessInstanceInfo[]>([]);
  const hasQueriedInstances = ref(false);
  const killLoadingPid = ref<number | null>(null);
  const killAllLoading = ref(false);

  async function loadDirGeneratorDefaultPath(fallback: string) {
    try {
      dirGeneratorDefaultPath.value = await toolsService.getAppDataDir();
    } catch {
      dirGeneratorDefaultPath.value = fallback;
    }
  }

  function loadDirGeneratorExample() {
    dirGenerator.value.treeInput = `LifeOS/
├── 00_Inbox/
│   ├── files.js
│   ├── notes_temp/
│   ├── downloads_pending/
│   └── ideas_draft/`;
  }

  async function createDirectoryStructure() {
    dirGeneratorCreateLoading.value = true;
    try {
      await toolsService.createDirectoryStructure(dirGenerator.value);
    } finally {
      dirGeneratorCreateLoading.value = false;
    }
  }

  async function readDirectoryTree() {
    dirReaderReadLoading.value = true;
    dirReader.value.treeOutput = "";
    try {
      dirReader.value.treeOutput = await toolsService.readDirectoryTree(dirReader.value);
    } finally {
      dirReaderReadLoading.value = false;
    }
  }

  async function queryPortProcess() {
    portQueryLoading.value = true;
    hasQueriedPort.value = true;
    try {
      portProcessList.value = await toolsService.findPortProcess(toInteger(portCleaner.value.portInput));
    } finally {
      portQueryLoading.value = false;
    }
  }

  async function queryProcessInstances() {
    queryInstancesLoading.value = true;
    hasQueriedInstances.value = true;
    try {
      processInstances.value = await toolsService.findProcessByName(toTrimmedString(portCleaner.value.processNameInput));
    } finally {
      queryInstancesLoading.value = false;
    }
  }

  async function killPortProcess(pid: number) {
    killLoadingPid.value = pid;
    try {
      await toolsService.killProcessByPid(pid);
      await sleep(500);
      await queryPortProcess();
    } finally {
      killLoadingPid.value = null;
    }
  }

  async function killProcessInstance(pid: number) {
    killLoadingPid.value = pid;
    try {
      await toolsService.killProcessByPid(pid);
      await sleep(500);
      await queryProcessInstances();
      if (portCleaner.value.portInput !== "") {
        await queryPortProcess();
      }
    } finally {
      killLoadingPid.value = null;
    }
  }

  async function killAllProcessInstances() {
    const name = toTrimmedString(portCleaner.value.processNameInput);
    if (!name) return;

    killAllLoading.value = true;
    try {
      await toolsService.killProcessByName(name);
      await sleep(500);
      await queryProcessInstances();
      if (portCleaner.value.portInput !== "") {
        await queryPortProcess();
      }
    } finally {
      killAllLoading.value = false;
    }
  }

  // 自动监听并在修改时写回 localStorage
  watch(
    () => dirGenerator.value,
    (val) => {
      setStorageItems({
        tool_dg_rootPath: val.rootPath,
        tool_dg_includeTopDir: val.includeTopDir,
        tool_dg_treeInput: val.treeInput,
      });
    },
    { deep: true }
  );

  watch(
    () => dirReader.value,
    (val) => {
      setStorageItems({
        tool_dr_rootPath: val.rootPath,
        tool_dr_excludeDirsInput: val.excludeDirsInput,
        tool_dr_maxDepth: val.maxDepth,
        tool_dr_treeOutput: val.treeOutput,
      });
    },
    { deep: true }
  );

  watch(
    () => portCleaner.value,
    (val) => {
      setStorageItems({
        tool_pc_portInput: val.portInput,
        tool_pc_processNameInput: val.processNameInput,
      });
    },
    { deep: true }
  );

  watch(
    () => jsonFormatter.value,
    (val) => {
      setStorageItems({ tool_jf_jsonInput: val.jsonInput });
    },
    { deep: true }
  );

  watch(
    () => base64Converter.value,
    (val) => {
      setStorageItems({ tool_b64_base64Input: val.base64Input });
    },
    { deep: true }
  );

  watch(
    () => timestampConverter.value,
    (val) => {
      setStorageItems({ tool_tc_timestampInput: val.timestampInput });
    },
    { deep: true }
  );

  return {
    dirGenerator,
    dirReader,
    portCleaner,
    jsonFormatter,
    base64Converter,
    timestampConverter,
    dirGeneratorDefaultPath,
    dirGeneratorCreateLoading,
    dirReaderReadLoading,
    portQueryLoading,
    portProcessList,
    hasQueriedPort,
    queryInstancesLoading,
    processInstances,
    hasQueriedInstances,
    killLoadingPid,
    killAllLoading,
    loadDirGeneratorDefaultPath,
    loadDirGeneratorExample,
    createDirectoryStructure,
    readDirectoryTree,
    queryPortProcess,
    queryProcessInstances,
    killPortProcess,
    killProcessInstance,
    killAllProcessInstances,
  };
});
