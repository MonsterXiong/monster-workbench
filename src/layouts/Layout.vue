<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import Sidebar from "./components/Sidebar.vue";
import AppHeader from "./components/AppHeader.vue";
import AppContent from "./components/AppContent.vue";
import UpdateModal from "./components/UpdateModal.vue";
import BaseToast from "../components/common/BaseToast.vue";
import BaseMessage from "../components/common/BaseMessage.vue";
import ConfirmDialog from "../components/common/ConfirmDialog.vue";
import GlobalLoading from "../components/common/GlobalLoading.vue";
import { routeLoading } from "../router/state";
import { useAppStore } from "../stores/app";
import { useUpdateStore } from "../stores/update";
import { useToast } from "../composables/useToast";
import { useI18n } from "../composables/useI18n";
import { addDomEventListener, mergeDomEventCleanups, type DomEventCleanup } from "../utils";

type RouteTab = "workspace" | "system" | "tools" | "navigation" | "ai" | "settings" | "file-manager" | "playground";

const router = useRouter();
const route = useRoute();
const appStore = useAppStore();
const updateStore = useUpdateStore();
const { triggerToast } = useToast();
const { t } = useI18n();
let stopNetworkStatusListeners: DomEventCleanup | null = null;

const currentTab = computed<RouteTab>(() => {
  const name = String(route.name ?? "workspace");
  if (name === "system" || name === "tools" || name === "navigation" || name === "ai" || name === "settings" || name === "file-manager" || name === "playground") {
    return name as RouteTab;
  }
  return "workspace";
});

const appScaleClass = computed(() =>
  appStore.layoutPrefs.fontScale === "large" ? "text-[15px]" : "text-sm"
);

// 离线断网检测
const isOnline = ref(navigator.onLine);
const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine;
  if (isOnline.value) {
    triggerToast(t('common.network.reconnected'), "success");
  } else {
    triggerToast(t('common.network.disconnectedToast'), "warning");
  }
};

onMounted(async () => {
  await appStore.initialize();
  updateStore.initAutoCheck();

  stopNetworkStatusListeners = mergeDomEventCleanups([
    addDomEventListener(window, "online", updateOnlineStatus),
    addDomEventListener(window, "offline", updateOnlineStatus),
  ]);
});

onUnmounted(() => {
  stopNetworkStatusListeners?.();
  stopNetworkStatusListeners = null;
});

function handleChangeTab(tab: RouteTab) {
  const routeMap: Record<RouteTab, string> = {
    workspace: "/workspace",
    system: "/system",
    tools: "/tools",
    navigation: "/navigation",
    ai: "/ai",
    settings: "/settings",
    "file-manager": "/file-manager",
    playground: "/playground",
  };

  router.push(routeMap[tab]);
}
</script>

<template>
  <div
    class="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
    :class="appScaleClass"
  >
    <!-- 顶部进度指示条 -->
    <div
      class="absolute left-0 right-0 top-0 z-30 h-0.5 origin-left bg-primary transition-transform duration-200"
      :class="routeLoading ? 'scale-x-100' : 'scale-x-0'"
    ></div>

    <!-- 左侧 Sidebar -->
    <Sidebar
      :active-tab="currentTab"
      :collapsed="appStore.layoutPrefs.sidebarCollapsed"
      :version="appStore.version"
      :has-update="updateStore.hasUpdate"
      @change-tab="handleChangeTab"
      @toggle-collapse="
        appStore.updateLayoutPrefs({
          sidebarCollapsed: !appStore.layoutPrefs.sidebarCollapsed,
        })
      "
      @check-update-manual="updateStore.checkUpdate(false)"
    />

    <!-- 右侧主界面 -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- 顶部公共工具栏 -->
      <AppHeader />

      <!-- 断网状态条 -->
      <div
        v-if="!isOnline"
        class="bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 px-4 py-2 text-xs flex items-center gap-2 select-none justify-center font-bold"
      >
        <span>⚠️</span>
        <span>{{ t('common.network.offlineBar') }}</span>
      </div>

      <!-- 主内容容器，包裹页面切换路由并带有过渡动画 -->
      <AppContent>
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </AppContent>

      <footer
        v-if="appStore.layoutPrefs.showStatusFooter"
        class="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-1.5 text-[10px] text-slate-500 select-none shrink-0"
      >
        <span>Monster Tools</span>
        <span>{{ appStore.localPath }}</span>
      </footer>
    </div>

    <!-- 全局系统更新弹窗 -->
    <UpdateModal />

    <!-- 全局 Toast 提示 -->
    <BaseToast />

    <!-- 全局 Message 提示 -->
    <BaseMessage />

    <!-- 全局确认弹窗 -->
    <ConfirmDialog />

    <!-- 全局加载遮罩 -->
    <GlobalLoading />
  </div>
</template>
