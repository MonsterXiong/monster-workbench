import { createRouter, createWebHistory } from "vue-router";
import { routeLoading } from "./state";

export const router = createRouter({
  history: createWebHistory(),
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
      path: "/settings",
      name: "settings",
      component: () => import("../views/settings/SettingsPage.vue"),
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
