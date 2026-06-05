<script setup lang="ts">
import { ref } from "vue";
import { ShieldAlert, RefreshCw } from "lucide-vue-next";
import { systemService } from "../../../services/system.service";
import type { PortProcessInfo } from "../../../services/system.service";

const emit = defineEmits<{
  (e: "toast", msg: string, type?: "success" | "error"): void;
}>();

const portInput = ref<number | "">("");
const queryLoading = ref(false);
const processList = ref<PortProcessInfo[]>([]);
const hasQueried = ref(false);
const killLoadingPid = ref<number | null>(null);

async function handleQueryPort() {
  if (portInput.value === "" || isNaN(Number(portInput.value))) {
    emit("toast", "请输入有效的端口号", "error");
    return;
  }
  queryLoading.value = true;
  hasQueried.value = true;
  try {
    processList.value = await systemService.findPortProcess(Number(portInput.value));
  } catch (err) {
    emit("toast", err instanceof Error ? err.message : "查询失败", "error");
  } finally {
    queryLoading.value = false;
  }
}

async function handleKillProcess(pid: number) {
  if (!confirm(`确定要强制杀死 PID 为 ${pid} 的进程吗？\n该操作无法撤销。`)) {
    return;
  }
  killLoadingPid.value = pid;
  try {
    await systemService.killProcessByPid(pid);
    emit("toast", `成功杀死进程 (PID: ${pid})`);
    setTimeout(handleQueryPort, 600);
  } catch (err) {
    emit("toast", err instanceof Error ? err.message : "强杀进程失败", "error");
  } finally {
    killLoadingPid.value = null;
  }
}
</script>

<template>
  <div class="flex flex-col h-[520px] min-h-0">
    <!-- 头部栏 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-2 shrink-0">
      <div class="tool-section-title">
        <ShieldAlert class="h-4.5 w-4.5 text-blue-600" />
        本地端口进程诊断与强杀
      </div>
    </div>

    <!-- 主体 -->
    <div class="flex-1 flex flex-col gap-4.5 mt-4 min-h-0">
      <!-- 查询输入行 -->
      <div class="flex flex-col gap-1.5 shrink-0">
        <label class="text-xs font-bold text-slate-500">查询端口号</label>
        <div class="flex gap-2 max-w-md">
          <input
            v-model="portInput"
            type="number"
            placeholder="例如: 8080"
            class="workbench-input visual-input h-10 flex-1 text-xs"
            @keyup.enter="handleQueryPort"
          />
          <button
            class="workbench-btn bg-primary text-primary-content h-10 px-5 text-xs font-bold shadow-sm shadow-primary/10"
            :disabled="queryLoading"
            @click="handleQueryPort"
          >
            <RefreshCw v-if="queryLoading" class="h-3.5 w-3.5 animate-spin mr-1.5" />
            查询占用
          </button>
        </div>
      </div>

      <!-- 诊断结果列表 (Flex-1 自适应滚动) -->
      <div class="flex-1 flex flex-col min-h-0 gap-1.5">
        <label class="text-xs font-bold text-slate-500">诊断结果</label>
        <div class="flex-1 border border-slate-200 rounded-2xl bg-slate-50/20 overflow-y-auto no-scrollbar min-h-0">
          <div v-if="!hasQueried" class="py-20 text-center text-xs text-slate-400 font-bold italic">
            -- 请输入端口号发起查询诊断 --
          </div>
          <div v-else-if="processList.length === 0" class="py-20 text-center text-xs text-emerald-600 font-bold">
            ✓ 未检测到任何进程占用该端口
          </div>
          <div v-else class="w-full">
            <table class="table w-full text-xs font-semibold">
              <thead class="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-sm border-b border-slate-200">
                <tr class="text-slate-500 font-bold">
                  <th class="py-3 px-4">协议</th>
                  <th class="py-3 px-4">本地监听地址</th>
                  <th class="py-3 px-4">状态</th>
                  <th class="py-3 px-4 text-center">PID</th>
                  <th class="py-3 px-4">进程名</th>
                  <th class="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in processList"
                  :key="item.pid"
                  class="border-b border-slate-150 last:border-0 hover:bg-slate-50/50"
                >
                  <td class="py-3.5 px-4 font-mono text-slate-500">{{ item.proto }}</td>
                  <td class="py-3.5 px-4 font-mono text-slate-800">{{ item.local_addr }}</td>
                  <td class="py-3.5 px-4">
                    <span class="rounded bg-blue-50 text-blue-600 px-2 py-0.5 text-[10px] font-bold border border-blue-150">{{ item.state }}</span>
                  </td>
                  <td class="py-3.5 px-4 text-center font-mono font-bold text-slate-800">{{ item.pid }}</td>
                  <td class="py-3.5 px-4 text-slate-700 font-bold truncate max-w-[150px]">{{ item.name }}</td>
                  <td class="py-3.5 px-4 text-right">
                    <button
                      class="workbench-btn border border-error/20 bg-error/5 text-error hover:bg-error/10 h-7 px-3 text-[10px] font-black"
                      :disabled="killLoadingPid === item.pid"
                      @click="handleKillProcess(item.pid)"
                    >
                      <RefreshCw v-if="killLoadingPid === item.pid" class="h-3 w-3 animate-spin mr-1" />
                      强杀进程
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-section-title {
  @apply text-sm font-extrabold text-slate-800 flex items-center gap-2;
}
.visual-input {
  border: 1px solid #cbd5e1 !important;
  background-color: #f8fafc !important;
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.03) !important;
  transition: all 0.2s ease !important;
}
.visual-input:focus {
  border-color: #2563eb !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
  background-color: #ffffff !important;
  outline: none !important;
}
</style>
