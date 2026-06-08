import { createRouter, createWebHashHistory } from "vue-router";
import { routeLoading } from "./state";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/workspace" },
    {
      path: "/workspace",
      name: "workspace",
      component: () => import("../views/workspace/WorkspacePage.vue"),
    },
    {
      path: "/system",
      name: "system",
      component: () => import("../views/system/SystemPage.vue"),
    },
    {
      path: "/tools",
      name: "tools",
      component: () => import("../views/tools/ToolsPage.vue"),
    },
    {
      path: "/navigation",
      name: "navigation",
      component: () => import("../views/navigation/NavigationPage.vue"),
    },
    {
      path: "/ai",
      name: "ai",
      component: () => import("../views/ai/AiPage.vue"),
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("../views/settings/SettingsPage.vue"),
    },
    {
      path: "/file-manager",
      name: "file-manager",
      component: () => import("../views/file-manager/FileManagerPage.vue"),
    },
    {
      path: "/playground",
      name: "playground",
      component: () => import("../views/playground/PlaygroundPage.vue"),
    },
    {
      path: "/403",
      name: "403",
      component: () => import("../views/error/403Page.vue"),
    },
    {
      path: "/500",
      name: "500",
      component: () => import("../views/error/500Page.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      name: "404",
      component: () => import("../views/error/404Page.vue"),
    },
  ],
});

router.beforeEach((_to, _from, next) => {
  routeLoading.value = true;
  next();
});

router.afterEach(() => {
  window.setTimeout(() => {
    routeLoading.value = false;
  }, 120);
});

router.onError(() => {
  routeLoading.value = false;
});
