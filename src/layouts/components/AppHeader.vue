<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  Bell,
  ChevronDown,
  Settings,
  User,
  LogOut,
  ShieldAlert,
  Trash2,
  AlertCircle,
  CheckCircle2,
  BellOff,
  X,
  Languages,
  Loader2
} from "lucide-vue-next";

import { useTaskStore } from "../../stores/task";
import { useI18n } from "../../composables/useI18n";

const showUserMenu = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

const showNotificationMenu = ref(false);
const notificationMenuRef = ref<HTMLElement | null>(null);

const { t, locale, setLocale } = useI18n();
const showLangMenu = ref(false);
const langMenuRef = ref<HTMLElement | null>(null);

const taskStore = useTaskStore();

// 计算进行中的任务数
const runningTasksCount = computed(() => {
  return taskStore.tasks.filter(t => t.status === "running").length;
});

// 计算所有任务总数
const totalTasksCount = computed(() => {
  return taskStore.tasks.length;
});

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value;
}

function toggleNotificationMenu() {
  showNotificationMenu.value = !showNotificationMenu.value;
}

// 清除已完成/已失败的任务
function handleClearCompletedTasks() {
  const finishedTasks = taskStore.tasks.filter(t => t.status !== "running");
  finishedTasks.forEach(t => taskStore.removeTask(t.id));
}

function toggleLangMenu() {
  showLangMenu.value = !showLangMenu.value;
}

function changeLang(lang: string) {
  setLocale(lang);
  showLangMenu.value = false;
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as Node;
  if (userMenuRef.value && !userMenuRef.value.contains(target)) {
    showUserMenu.value = false;
  }
  if (notificationMenuRef.value && !notificationMenuRef.value.contains(target)) {
    showNotificationMenu.value = false;
  }
  if (langMenuRef.value && !langMenuRef.value.contains(target)) {
    showLangMenu.value = false;
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
  <header class="flex h-14 shrink-0 items-center justify-end border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 z-20">
    <!-- 右侧快捷操作与用户信息 -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3.5">
        <!-- 后台长任务通知提醒 -->
        <div ref="notificationMenuRef" class="relative">
          <button
            class="relative flex h-7.5 w-7.5 items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            @click="toggleNotificationMenu"
          >
            <Bell class="h-4 w-4" :class="{ 'animate-swing origin-top': runningTasksCount > 0 }" />
            <span v-if="runningTasksCount > 0" class="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[7px] font-bold text-white leading-none animate-bounce">
              {{ runningTasksCount }}
            </span>
          </button>

          <!-- 后台活动长任务浮动面板 -->
          <transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0 -translate-y-2"
            enter-to-class="transform scale-100 opacity-100 translate-y-0"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100 translate-y-0"
            leave-to-class="transform scale-95 opacity-0 -translate-y-2"
          >
            <div v-if="showNotificationMenu" class="absolute right-0 mt-2 w-80 origin-top-right rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-workbench-lg z-30 select-none text-slate-900 dark:text-slate-100">
              <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
                <span class="text-xs font-black">{{ t('header.backgroundTasks') }} ({{ totalTasksCount }})</span>
                <button
                  v-if="taskStore.tasks.some(t => t.status !== 'running')"
                  class="text-[9.5px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                  @click="handleClearCompletedTasks"
                >
                  <Trash2 class="h-3 w-3" />
                  {{ t('header.clearFinished') }}
                </button>
              </div>

              <!-- 列表 -->
              <div class="max-h-60 overflow-y-auto no-scrollbar space-y-2.5">
                <div v-if="taskStore.tasks.length === 0" class="py-8 text-center flex flex-col items-center justify-center gap-2">
                  <BellOff class="h-6 w-6 text-slate-400" />
                  <span class="text-[10px] text-slate-500">{{ t('header.noTasks') }}</span>
                </div>

                <div
                  v-for="task in taskStore.tasks"
                  :key="task.id"
                  class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 flex flex-col gap-1.5 relative group"
                >
                  <!-- 单项删除按钮 -->
                  <button
                    v-if="taskStore.tasks.some(t => t.id === task.id && t.status !== 'running')"
                    class="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    @click="taskStore.removeTask(task.id)"
                  >
                    <X class="h-3 w-3" />
                  </button>

                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" :title="task.name">
                      {{ task.name }}
                    </span>
                    <span
                      class="text-[9px] font-extrabold"
                      :class="{
                        'text-primary': task.status === 'running',
                        'text-emerald-600': task.status === 'success',
                        'text-red-500': task.status === 'failed'
                      }"
                    >
                      {{ task.status === 'running' ? `${task.progress}%` : (task.status === 'success' ? t('header.taskSuccess') : t('header.taskFailed')) }}
                    </span>
                  </div>

                  <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      :style="`width: ${task.progress}%`"
                      :class="{
                        'bg-primary': task.status === 'running',
                        'bg-emerald-500': task.status === 'success',
                        'bg-red-500': task.status === 'failed'
                      }"
                    ></div>
                  </div>

                   <!-- 消息说明 -->
                  <div class="flex items-center gap-1">
                    <Loader2 v-if="task.status === 'running'" class="h-3 w-3 text-primary animate-spin shrink-0" />
                    <CheckCircle2 v-else-if="task.status === 'success'" class="h-3 w-3 text-emerald-500 shrink-0" />
                    <AlertCircle v-else class="h-3 w-3 text-red-500 shrink-0" />
                    <span class="text-[9.5px] text-slate-500 truncate flex-1" :title="task.message">
                      {{ task.message }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <!-- 语言切换下拉菜单 -->
        <div ref="langMenuRef" class="relative">
          <button
            class="flex h-7.5 items-center gap-1 rounded-xl px-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            @click="toggleLangMenu"
            :title="t('header.switchLanguage')"
          >
            <Languages class="h-4 w-4" />
            <span class="text-xs font-bold">{{ locale === 'zh-CN' ? t('header.langZh') : t('header.langEn') }}</span>
            <ChevronDown class="h-3.5 w-3.5 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': showLangMenu }" />
          </button>

          <!-- 下拉面板 -->
          <transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0 -translate-y-2"
            enter-to-class="transform scale-100 opacity-100 translate-y-0"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100 translate-y-0"
            leave-to-class="transform scale-95 opacity-0 -translate-y-2"
          >
            <div v-if="showLangMenu" class="absolute right-0 mt-2 w-32 origin-top-right rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-workbench-lg z-30 select-none text-slate-900 dark:text-slate-100">
              <button
                class="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-colors cursor-pointer"
                :class="locale === 'zh-CN' ? 'bg-primary/10 text-primary font-extrabold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'"
                @click="changeLang('zh-CN')"
              >
                <span>{{ t('header.langZh') }}</span>
              </button>
              <button
                class="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-colors cursor-pointer"
                :class="locale === 'en-US' ? 'bg-primary/10 text-primary font-extrabold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'"
                @click="changeLang('en-US')"
              >
                <span>{{ t('header.langEn') }}</span>
              </button>
            </div>
          </transition>
        </div>
      </div>

      <!-- 用户下拉菜单区 -->
      <div ref="userMenuRef" class="relative">
        <button
          class="flex items-center gap-2 rounded-full border border-transparent p-0.5 text-left transition-all hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          @click="toggleUserMenu"
        >
          <!-- 头像与在线指示器 -->
          <div class="relative h-7.5 w-7.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-[10px] shadow-inner">
            AD
            <span class="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white dark:border-slate-900 bg-emerald-500"></span>
          </div>
          <span class="hidden text-xs font-bold text-slate-700 dark:text-slate-200 md:inline-block">Admin</span>
          <ChevronDown class="h-3 w-3 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': showUserMenu }" />
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
          <div v-if="showUserMenu" class="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-workbench-lg z-30">
            <div class="px-3 py-2 border-b border-slate-200 dark:border-slate-800 mb-1">
              <p class="text-xs text-slate-500">{{ t('header.loggedInAs') }}</p>
              <p class="text-sm font-bold truncate text-slate-900 dark:text-slate-100 mt-0.5">admin@monster.tools</p>
            </div>

            <button class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100">
              <User class="h-4 w-4" />
              {{ t('header.profile') }}
            </button>
            <button class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100">
              <Settings class="h-4 w-4" />
              {{ t('header.settings') }}
            </button>
            <button class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100">
              <ShieldAlert class="h-4 w-4" />
              {{ t('header.security') }}
            </button>

            <div class="my-1 border-t border-slate-200 dark:border-slate-800"></div>

            <button class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-500 transition hover:bg-red-500/10">
              <LogOut class="h-4 w-4" />
              {{ t('header.logout') }}
            </button>
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes swing {
  0%, 100% { transform: rotate(0); }
  20% { transform: rotate(15deg); }
  40% { transform: rotate(-10deg); }
  60% { transform: rotate(5deg); }
  80% { transform: rotate(-5deg); }
}
.animate-swing {
  animation: swing 2s infinite ease-in-out;
}
</style>
