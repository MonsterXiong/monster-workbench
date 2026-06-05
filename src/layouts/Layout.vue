<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import Sidebar from "./components/Sidebar.vue";
import AppHeader from "./components/AppHeader.vue";
import AppContent from "./components/AppContent.vue";
import UpdateModal from "./components/UpdateModal.vue";
import GlobalToast from "../components/common/GlobalToast.vue";
import ConfirmModal from "../components/common/ConfirmModal.vue";
import { routeLoading } from "../router/state";
import { useAppStore } from "../stores/app";
import { useUpdateStore } from "../stores/update";

type RouteTab = "workspace" | "system" | "tools" | "navigation" | "settings" | "file-manager";

const router = useRouter();
const route = useRoute();
const appStore = useAppStore();
const updateStore = useUpdateStore();

const currentTab = computed<RouteTab>(() => {
  const name = String(route.name ?? "workspace");
  if (name === "system" || name === "tools" || name === "navigation" || name === "settings" || name === "file-manager") {
    return name as RouteTab;
  }
  return "workspace";
});

const appScaleClass = computed(() =>
  appStore.layoutPrefs.fontScale === "large" ? "text-[15px]" : "text-sm"
);

onMounted(async () => {
  await appStore.initialize();
  updateStore.initAutoCheck();
});

function handleChangeTab(tab: RouteTab) {
  const routeMap: Record<RouteTab, string> = {
    workspace: "/workspace",
    system: "/system",
    tools: "/tools",
    navigation: "/navigation",
    settings: "/settings",
    "file-manager": "/file-manager",
  };

  router.push(routeMap[tab]);
}
</script>

<template>
  <div
    data-theme="workbench"
    class="flex h-screen overflow-hidden bg-base-200 text-base-content"
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

    <!-- 右侧主界面：包含顶部栏、自适应滚动容器、以及底部状态栏 -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- 顶部公共工具栏 -->
      <AppHeader />

      <!-- 主内容容器，包裹页面切换路由并带有过渡动画 -->
      <AppContent>
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </AppContent>

      <!-- 状态指示页脚 -->
      <footer
        v-if="appStore.layoutPrefs.showStatusFooter"
        class="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2 text-xs text-base-content/60"
      >
        <span>Monster Tools</span>
        <span>{{ appStore.localPath }}</span>
      </footer>
    </div>

    <!-- 全局系统更新弹窗 -->
    <UpdateModal />

    <!-- 全局 Toast 提示 -->
    <GlobalToast />

    <!-- 全局确认弹窗 -->
    <ConfirmModal />
  </div>
</template>
