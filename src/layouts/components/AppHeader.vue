<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import {
  Bell,
  ChevronDown,
  HelpCircle,
  MessageSquare,
  Plus,
  Settings,
  User,
  LogOut,
  ShieldAlert
} from "lucide-vue-next";

const showUserMenu = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value;
}

function handleOutsideClick(event: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    showUserMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener("click", handleOutsideClick);
});
</script>

<template>
  <header
    class="flex h-14 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-5 z-20"
  >
    <!-- 右侧快捷操作与用户信息 -->
    <div class="flex items-center gap-4">
      <!-- 快捷按钮组 -->
      <div class="flex items-center gap-1.5 border-r border-slate-200 pr-3.5">
        <!-- 快捷新建 -->
        <button
          class="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-primary text-primary-content shadow-sm transition-all duration-150 hover:bg-primary/90 hover:scale-105 active:scale-95"
          title="新建项目"
        >
          <Plus class="h-4 w-4 font-bold" />
        </button>

        <!-- 通知提醒 -->
        <button
          class="relative flex h-7.5 w-7.5 items-center justify-center rounded-xl text-base-content/60 transition-colors hover:bg-slate-100 hover:text-base-content"
          title="通知"
        >
          <Bell class="h-4 w-4" />
          <span class="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-error px-0.5 text-[7px] font-bold text-error-content leading-none">
            8
          </span>
        </button>

        <!-- 聊天消息 -->
        <button
          class="flex h-7.5 w-7.5 items-center justify-center rounded-xl text-base-content/60 transition-colors hover:bg-slate-100 hover:text-base-content"
          title="消息"
        >
          <MessageSquare class="h-4 w-4" />
        </button>

        <!-- 帮助中心 -->
        <button
          class="flex h-7.5 w-7.5 items-center justify-center rounded-xl text-base-content/60 transition-colors hover:bg-slate-100 hover:text-base-content"
          title="帮助中心"
        >
          <HelpCircle class="h-4 w-4" />
        </button>
      </div>

      <!-- 用户下拉菜单区 -->
      <div ref="userMenuRef" class="relative">
        <button
          class="flex items-center gap-2 rounded-full border border-transparent p-0.5 text-left transition-all hover:border-slate-200 hover:bg-slate-100"
          @click="toggleUserMenu"
        >
          <!-- 头像与在线指示器 -->
          <div class="relative h-7.5 w-7.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-[10px] shadow-inner">
            AD
            <span class="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-base-100 bg-success"></span>
          </div>
          <span class="hidden text-xs font-bold text-base-content/80 md:inline-block">Admin</span>
          <ChevronDown class="h-3 w-3 text-base-content/40 transition-transform duration-200" :class="{ 'rotate-180': showUserMenu }" />
        </button>

        <!-- 用户下拉浮动面板 -->
        <transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="transform scale-95 opacity-0 -translate-y-2"
          enter-to-class="transform scale-100 opacity-100 translate-y-0"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="transform scale-100 opacity-100 translate-y-0"
          leave-to-class="transform scale-95 opacity-0 -translate-y-2"
        >
          <div
            v-if="showUserMenu"
            class="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-100 bg-base-100 p-2 shadow-workbench-lg z-30"
          >
            <div class="px-3 py-2 border-b border-slate-100 mb-1">
              <p class="text-xs text-base-content/40">已登录账号</p>
              <p class="text-sm font-bold truncate text-base-content mt-0.5">admin@monster.tools</p>
            </div>
            
            <button class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-base-content/80 transition hover:bg-base-200 hover:text-base-content">
              <User class="h-4 w-4" />
              个人信息
            </button>
            <button class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-base-content/80 transition hover:bg-base-200 hover:text-base-content">
              <Settings class="h-4 w-4" />
              偏好设置
            </button>
            <button class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-base-content/80 transition hover:bg-base-200 hover:text-base-content">
              <ShieldAlert class="h-4 w-4" />
              账号安全
            </button>
            
            <div class="my-1 border-t border-slate-100"></div>
            
            <button class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-error transition hover:bg-error/10">
              <LogOut class="h-4 w-4" />
              退出登录
            </button>
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>
