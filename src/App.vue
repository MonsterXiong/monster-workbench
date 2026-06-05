<script setup lang="ts">
import { RefreshCcw, ShieldCheck } from "lucide-vue-next";
import { useUpdateStore } from "./stores/update";

const updateStore = useUpdateStore();
</script>

<template>
  <main class="h-screen overflow-auto bg-base-200 p-6 flex items-center justify-center">
    <div class="mx-auto w-full max-w-lg space-y-6">
      <div class="card bg-base-100 shadow-xl border border-base-300">
        <div class="card-body text-center space-y-6">
          <div class="space-y-2">
            <h1 class="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Monster Tools
            </h1>
            <p class="text-sm text-base-content/60">
              Tauri v2 + Vue 3 整体更新客户端
            </p>
          </div>

          <div class="divider">应用更新</div>

          <div class="space-y-4 py-2">
            <p class="text-sm text-base-content/70">
              用于检测并下载完整的应用更新包，更新将直接替换当前客户端并重启生效。
            </p>

            <div v-if="updateStore.appProgress.percent > 0" class="space-y-2">
              <progress
                class="progress progress-primary w-full"
                :value="updateStore.appProgress.percent"
                max="100"
              />
              <div class="text-xs text-base-content/50">
                已下载: {{ updateStore.appProgress.percent }}%
              </div>
            </div>

            <button
              class="btn btn-primary btn-block shadow-lg mt-2"
              :disabled="updateStore.checking"
              @click="updateStore.checkAppUpdate"
            >
              <RefreshCcw class="h-4 w-4" :class="{ 'animate-spin': updateStore.checking }" />
              {{ updateStore.checking ? '正在检测更新...' : '检查应用更新' }}
            </button>
          </div>

          <div v-if="updateStore.message" class="alert bg-base-200 shadow-sm border border-base-300 justify-start text-left">
            <span class="text-sm font-medium">{{ updateStore.message }}</span>
          </div>

          <div class="alert alert-info bg-info/10 text-info-content border border-info/20 shadow-sm text-left">
            <ShieldCheck class="h-5 w-5 shrink-0" />
            <span class="text-xs">
              更新包将由 Tauri 内置的安全更新引擎进行签名与 Hash 完整性校验，请放心更新。
            </span>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
