<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  CheckCircle2,
  Database,
  FileText,
  FolderOpen,
  FolderSearch2,
  Globe,
  Maximize2,
  Minimize2,
  RefreshCcw,
  SquareArrowOutUpRight,
  X,
} from "lucide-vue-next";
import { dbHelper } from "../../services/db";
import { request } from "../../services/request";
import { systemService } from "../../services/system.service";
import { useAsyncTask } from "../../composables/useAsyncTask";
import { useUpdateStore } from "../../stores/update";
import { useAppStore } from "../../stores/app";

const appStore = useAppStore();
const updateStore = useUpdateStore();

const {
  loading: fileLoading,
  error: fileError,
  run: runFileTask,
} = useAsyncTask();
const {
  error: pickerError,
  run: runPickerTask,
} = useAsyncTask();
const {
  error: windowError,
  run: runWindowTask,
} = useAsyncTask();

const localPath = ref("");
const fileContentInput = ref("Hello Monster Workbench");
const fileStatus = ref("");
const lastWrittenFilePath = ref("");
const customFolder = ref("");
const customFile = ref("");
const dbStatus = ref("未初始化");
const logList = ref<Array<{ id: number; action: string; detail: string; created_at: string }>>([]);
const apiResponse = ref<{ name: string; stars: number; forks: number; subscribers: number } | null>(null);
const apiStatusText = ref("");
const apiLoading = ref(false);
const contentGapClass = computed(() => (appStore.layoutPrefs.density === "compact" ? "gap-4" : "gap-5"));

onMounted(async () => {
  try {
    localPath.value = await systemService.getAppDataDir();
  } catch (error) {
    localPath.value = error instanceof Error ? error.message : "加载失败";
  }

  await initSqlite();
});

async function handleWriteFile() {
  const result = await runFileTask(async () => {
    const path = await systemService.writeTestFile(fileContentInput.value);
    lastWrittenFilePath.value = path;
    fileStatus.value = `写入完成：${path}`;
  });

  if (result === null && fileError.value) {
    fileStatus.value = `写入失败：${fileError.value}`;
  }
}

async function handleReadFile() {
  const result = await runFileTask(() => systemService.readTestFile());

  if (result) {
    fileStatus.value = `读取结果：${result}`;
  } else if (fileError.value) {
    fileStatus.value = `读取失败：${fileError.value}`;
  }
}

async function handleOpenPath(path: string, fallbackMessage: string) {
  const result = await runFileTask(() => systemService.openPath(path));
  if (result === null && fileError.value) {
    fileStatus.value = `${fallbackMessage}：${fileError.value}`;
  }
}

async function handlePickFolder() {
  const result = await runPickerTask(() => systemService.selectFolder());
  if (result) {
    customFolder.value = result;
  }
}

async function handlePickFile() {
  const result = await runPickerTask(() => systemService.selectFile());
  if (result) {
    customFile.value = result;
  }
}

async function initSqlite() {
  try {
    dbStatus.value = "连接中";
    await dbHelper.initTables();
    dbStatus.value = "已连接";
    await refreshLogs();
  } catch (error) {
    dbStatus.value = error instanceof Error ? error.message : "连接失败";
  }
}

async function addLog() {
  const actions = ["文件", "网络", "窗口", "托盘"];
  const action = actions[Math.floor(Math.random() * actions.length)];
  await dbHelper.execute("INSERT INTO test_logs (action, detail) VALUES ($1, $2)", [action, `执行 ${action} 测试`]);
  await refreshLogs();
}

async function refreshLogs() {
  logList.value = await dbHelper.select("SELECT * FROM test_logs ORDER BY id DESC LIMIT 4");
}

async function clearLogs() {
  await dbHelper.execute("DELETE FROM test_logs");
  logList.value = [];
}

async function testApiRequest() {
  apiLoading.value = true;
  apiStatusText.value = "请求中...";
  apiResponse.value = null;

  try {
    const response = await request.get<{
      full_name: string;
      stargazers_count: number;
      forks_count: number;
      subscribers_count: number;
    }>("https://api.github.com/repos/tauri-apps/tauri", undefined, { timeout: 8000 });

    if (!response.success) {
      apiStatusText.value = response.message ?? "请求失败";
      return;
    }

    apiResponse.value = {
      name: response.data.full_name,
      stars: response.data.stargazers_count,
      forks: response.data.forks_count,
      subscribers: response.data.subscribers_count,
    };
    apiStatusText.value = "请求成功";
  } finally {
    apiLoading.value = false;
  }
}

async function runWindowAction(action: "minimize" | "maximize" | "hide", label: string) {
  await runWindowTask(() => systemService.controlWindow(action));
  if (windowError.value) {
    apiStatusText.value = `${label}失败：${windowError.value}`;
  }
}
</script>

<template>
  <div class="flex flex-col h-full space-y-5 min-h-0 overflow-y-auto pr-1 no-scrollbar">
    <div class="grid grid-cols-1 lg:grid-cols-3 shrink-0" :class="contentGapClass">
      <!-- 文件读写卡片 -->
      <section class="workbench-card p-5">
        <div class="flex flex-col gap-4.5">
          <div class="flex items-center gap-3">
            <div class="card-icon-wrapper bg-primary/10 text-primary">
              <FileText class="h-4.5 w-4.5" />
            </div>
            <div>
              <div class="card-title-text">文件</div>
              <div class="card-desc-text text-base-content/40">基础读写与目录定位</div>
            </div>
          </div>

          <div class="status-panel-mono">
            {{ localPath }}
          </div>

          <input
            v-model="fileContentInput"
            type="text"
            placeholder="输入测试内容"
            class="workbench-input h-11 w-full"
          />

          <div class="grid grid-cols-2 gap-3">
            <button class="workbench-btn bg-primary text-primary-content h-9 text-xs font-semibold shadow-sm shadow-primary/10 hover:shadow" :disabled="fileLoading" @click="handleWriteFile">
              写入文件
            </button>
            <button class="workbench-btn border border-slate-200/80 bg-base-100 hover:bg-slate-50 h-9 text-xs font-semibold" :disabled="fileLoading" @click="handleReadFile">
              读取文件
            </button>
          </div>

          <div class="status-panel-base text-base-content/60">
            {{ fileStatus || "等待操作" }}
          </div>
        </div>
      </section>

      <!-- 打开路径卡片 -->
      <section class="workbench-card p-5">
        <div class="flex flex-col gap-4.5">
          <div class="flex items-center gap-3">
            <div class="card-icon-wrapper bg-secondary/10 text-secondary">
              <FolderOpen class="h-4.5 w-4.5" />
            </div>
            <div>
              <div class="card-title-text">打开路径</div>
              <div class="card-desc-text text-base-content/40">目录、文件与外部链接</div>
            </div>
          </div>

          <div class="grid gap-3">
            <button class="workbench-btn border border-slate-200/80 bg-base-100 hover:bg-slate-50 h-10 px-4 text-xs justify-start font-semibold" @click="handleOpenPath(localPath, '打开目录失败')">
              <FolderOpen class="h-4 w-4" />
              数据目录
            </button>
            <button
              class="workbench-btn border border-slate-200/80 bg-base-100 hover:bg-slate-50 h-10 px-4 text-xs justify-start font-semibold"
              @click="handleOpenPath(lastWrittenFilePath || `${localPath}\\monster_test_file.txt`, '打开文件失败')"
            >
              <FileText class="h-4 w-4" />
              测试文件
            </button>
            <button
              class="workbench-btn border border-transparent bg-transparent text-secondary hover:bg-secondary/5 h-10 px-4 text-xs justify-start font-semibold"
              @click="handleOpenPath('https://github.com/MonsterXiong/monster-workbench', '打开网页失败')"
            >
              <SquareArrowOutUpRight class="h-4 w-4" />
              项目主页
            </button>
          </div>
        </div>
      </section>

      <!-- 选择器卡片 -->
      <section class="workbench-card p-5">
        <div class="flex flex-col gap-4.5">
          <div class="flex items-center gap-3">
            <div class="card-icon-wrapper bg-accent/10 text-accent">
              <FolderSearch2 class="h-4.5 w-4.5" />
            </div>
            <div>
              <div class="card-title-text">选择器</div>
              <div class="card-desc-text text-base-content/40">调用系统文件选择能力</div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-bold text-base-content/70">文件夹</span>
                <button class="workbench-btn border border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 h-7 px-3 text-[11px] font-bold" @click="handlePickFolder">选择</button>
              </div>
              <div class="status-panel-mono">
                {{ customFolder || "未选择" }}
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-bold text-base-content/70">文件</span>
                <button class="workbench-btn border border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 h-7 px-3 text-[11px] font-bold" @click="handlePickFile">选择</button>
              </div>
              <div class="status-panel-mono">
                {{ customFile || "未选择" }}
              </div>
            </div>

            <div v-if="pickerError" class="text-xs text-error font-semibold">{{ pickerError }}</div>
          </div>
        </div>
      </section>

      <!-- SQLite 卡片 -->
      <section class="workbench-card p-5">
        <div class="flex flex-col gap-4.5">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="card-icon-wrapper bg-success/10 text-success">
                <Database class="h-4.5 w-4.5" />
              </div>
              <div>
                <div class="card-title-text">SQLite</div>
                <div class="card-desc-text text-base-content/40">日志写入与读取</div>
              </div>
            </div>
            <div class="rounded-full border border-success/20 bg-success/5 px-2 py-0.5 text-[10px] font-bold text-success">{{ dbStatus }}</div>
          </div>

          <div class="flex gap-3">
            <button class="workbench-btn bg-success text-success-content flex-1 h-9 text-xs font-semibold shadow-sm shadow-success/10" @click="addLog">写入记录</button>
            <button class="workbench-btn border border-success/20 bg-base-100 hover:bg-success/5 text-success flex-1 h-9 text-xs font-semibold" @click="refreshLogs">刷新</button>
          </div>

          <button class="workbench-btn border border-transparent bg-transparent text-error hover:bg-error/5 w-full h-8 text-xs font-semibold" @click="clearLogs">清空记录</button>

          <!-- 极客风浅色控制台终端 SQLite -->
          <div class="terminal-panel">
            <div class="terminal-header">
              <span class="flex gap-1.5"><span class="h-2 w-2 rounded-full bg-red-400"></span><span class="h-2 w-2 rounded-full bg-yellow-400"></span><span class="h-2 w-2 rounded-full bg-green-400"></span></span>
              <span class="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">sqlite-console.sh</span>
            </div>
            <div class="terminal-body no-scrollbar">
              <div v-if="logList.length === 0" class="py-6 text-center text-xs text-slate-400 font-bold italic">-- TERMINAL EMPTY --</div>
              <ul v-else class="space-y-3 font-mono">
                <li
                  v-for="item in logList"
                  :key="item.id"
                  class="flex items-start gap-2 text-xs border-b border-slate-100 pb-2.5 last:border-0 last:pb-0"
                >
                  <span class="text-emerald-600 select-none font-bold">sqlite&gt;</span>
                  <div class="flex-1 min-w-0">
                    <div class="text-emerald-600 font-bold flex items-center justify-between">
                      <span class="text-emerald-600 font-extrabold">#{{ item.id }} {{ item.action }}</span>
                      <span class="text-[9px] text-slate-400 font-semibold">{{ item.created_at || 'just now' }}</span>
                    </div>
                    <div class="text-slate-600 font-medium leading-relaxed break-all mt-0.5">{{ item.detail }}</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- 网络请求卡片 -->
      <section class="workbench-card p-5">
        <div class="flex flex-col gap-4.5">
          <div class="flex items-center gap-3">
            <div class="card-icon-wrapper bg-info/10 text-info">
              <Globe class="h-4.5 w-4.5" />
            </div>
            <div>
              <div class="card-title-text">网络请求</div>
              <div class="card-desc-text text-base-content/40">统一请求封装验证</div>
            </div>
          </div>

          <button class="workbench-btn bg-info text-info-content h-9 text-xs font-semibold shadow-sm shadow-info/10" :disabled="apiLoading" @click="testApiRequest">
            <RefreshCcw class="h-4 w-4" :class="{ 'animate-spin': apiLoading }" />
            {{ apiLoading ? "请求中..." : "发起请求" }}
          </button>

          <!-- 极客风浅色控制台终端 cURL -->
          <div class="terminal-panel">
            <div class="terminal-header">
              <span class="flex gap-1.5"><span class="h-2 w-2 rounded-full bg-red-400"></span><span class="h-2 w-2 rounded-full bg-yellow-400"></span><span class="h-2 w-2 rounded-full bg-green-400"></span></span>
              <span class="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">curl-api.sh</span>
            </div>
            <div class="terminal-body font-mono text-xs no-scrollbar">
              <div v-if="!apiResponse" class="text-slate-400 font-bold italic">{{ apiStatusText || "Waiting for request..." }}</div>
              <div v-else class="space-y-2.5">
                <div class="flex items-center gap-1.5 font-bold text-sky-600">
                  <CheckCircle2 class="h-4 w-4 shrink-0" />
                  <span>{{ apiStatusText }}</span>
                </div>
                <div class="space-y-1 text-slate-600">
                  <div class="flex"><span class="text-sky-600 select-none mr-2 font-extrabold">$</span><span class="text-emerald-600 font-bold">response.json()</span></div>
                  <div class="grid grid-cols-1 gap-1 text-[11px] leading-4 text-slate-600 bg-slate-100/60 p-2.5 rounded-xl border border-slate-200">
                    <div>{</div>
                    <div class="pl-4">"repo": <span class="text-amber-600">"{{ apiResponse.name }}"</span>,</div>
                    <div class="pl-4">"stars": <span class="text-indigo-600 font-bold">{{ apiResponse.stars }}</span>,</div>
                    <div class="pl-4">"forks": <span class="text-indigo-600 font-bold">{{ apiResponse.forks }}</span>,</div>
                    <div class="pl-4">"watchers": <span class="text-indigo-600 font-bold">{{ apiResponse.subscribers }}</span></div>
                    <div>}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 客户端更新卡片 -->
      <section class="workbench-card p-5">
        <div class="flex flex-col gap-4.5">
          <div class="flex items-center gap-3">
            <div class="card-icon-wrapper bg-success/10 text-success">
              <RefreshCcw class="h-4.5 w-4.5" />
            </div>
            <div>
              <div class="card-title-text">客户端更新</div>
              <div class="card-desc-text text-base-content/40">走 Tauri 原生更新链路</div>
            </div>
          </div>

          <div v-if="updateStore.appProgress.percent > 0" class="space-y-2">
            <progress class="progress progress-success w-full" :value="updateStore.appProgress.percent" max="100" />
            <div class="text-right text-xs text-base-content/40 font-bold">{{ updateStore.appProgress.percent }}%</div>
          </div>

          <button class="workbench-btn bg-success text-success-content h-9 text-xs font-semibold shadow-sm shadow-success/10" :disabled="updateStore.checking" @click="updateStore.checkUpdate(false)">
            <RefreshCcw class="h-4 w-4" :class="{ 'animate-spin': updateStore.checking }" />
            检查更新
          </button>

          <div
            v-if="updateStore.message"
            class="status-panel-base text-base-content/75 leading-6"
          >
            {{ updateStore.message }}
          </div>
        </div>
      </section>

      <!-- 窗口控制卡片 -->
      <section class="workbench-card p-5 lg:col-span-3">
        <div class="flex flex-col gap-4.5">
          <div class="flex items-center gap-3">
            <div class="card-icon-wrapper bg-warning/10 text-warning">
              <Maximize2 class="h-4.5 w-4.5" />
            </div>
            <div>
              <div class="card-title-text">窗口控制</div>
              <div class="card-desc-text text-base-content/40">最小化、最大化与隐藏</div>
            </div>
          </div>

          <div class="flex flex-wrap gap-3">
            <button class="workbench-btn border border-warning/20 bg-warning/5 text-warning hover:bg-warning/10 h-9 px-4.5 text-xs font-semibold" @click="runWindowAction('minimize', '最小化')">
              <Minimize2 class="h-4 w-4" />
              最小化
            </button>
            <button class="workbench-btn border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 h-9 px-4.5 text-xs font-semibold" @click="runWindowAction('maximize', '最大化')">
              <Maximize2 class="h-4 w-4" />
              最大化
            </button>
            <button class="workbench-btn border border-error/20 bg-error/5 text-error hover:bg-error/10 h-9 px-4.5 text-xs font-semibold" @click="runWindowAction('hide', '隐藏')">
              <X class="h-4 w-4" />
              隐藏
            </button>
          </div>

          <div v-if="windowError" class="text-xs text-error font-semibold">{{ windowError }}</div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.card-icon-wrapper {
  @apply rounded-xl p-2.5 shrink-0 flex items-center justify-center;
}
.card-title-text {
  @apply text-[15px] font-bold text-base-content;
}
.card-desc-text {
  @apply text-xs font-semibold;
}
.status-panel-base {
  @apply rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-5;
}
.status-panel-mono {
  @apply status-panel-base font-mono;
}
.terminal-panel {
  @apply rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-inner relative flex flex-col gap-3;
}
.terminal-header {
  @apply flex items-center justify-between border-b border-slate-200 pb-2.5;
}
.terminal-body {
  @apply overflow-y-auto max-h-60 w-full;
}
</style>
