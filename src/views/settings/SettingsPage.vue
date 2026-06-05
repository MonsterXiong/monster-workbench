<script setup lang="ts">
import { computed } from "vue";
import { LayoutPanelLeft, PanelBottom, Type, FolderSearch2 } from "lucide-vue-next";
import { useAppStore } from "../../stores/app";
import type { LayoutPrefs } from "../../stores/app";
import { systemService } from "../../services/system.service";

const appStore = useAppStore();

const model = computed({
  get: () => appStore.layoutPrefs,
  set: (value: LayoutPrefs) => appStore.updateLayoutPrefs(value),
});

function patchPrefs(patch: Partial<LayoutPrefs>) {
  model.value = {
    ...model.value,
    ...patch,
  };
}

async function handleSelectDataDir() {
  try {
    const selected = await systemService.selectFolder();
    if (selected) {
      appStore.updateLocalPath(selected);
    }
  } catch (err) {
    // 浏览器兼容处理或报错捕获
    console.warn("无法选择目录:", err);
  }
}
</script>

<template>
  <div class="flex flex-col h-full space-y-5 min-h-0 overflow-y-auto pr-1 no-scrollbar">
    <div class="grid gap-6 grid-cols-1 shrink-0">
      <!-- 偏好设置卡片 -->
      <section class="workbench-card p-6">
        <div class="flex flex-col gap-6">
          <!-- 卡片头部标题 -->
          <div>
            <div class="text-[16px] font-bold text-base-content">偏好设置</div>
            <div class="mt-1 text-xs text-base-content/40 font-semibold">统一桌面布局风格、信息密度与物理数据目录。</div>
          </div>

          <!-- 设置项列表 -->
          <div class="flex flex-col gap-2">
            <!-- 侧边导航设置 -->
            <div class="setting-item">
              <div class="flex items-center gap-3">
                <div class="setting-icon-wrapper bg-primary/10 text-primary">
                  <LayoutPanelLeft class="h-4.5 w-4.5" />
                </div>
                <div>
                  <div class="setting-title">侧边导航</div>
                  <div class="setting-desc text-base-content/40">默认收起左侧主导航栏</div>
                </div>
              </div>
              <div>
                <input
                  :checked="model.sidebarCollapsed"
                  type="checkbox"
                  class="toggle toggle-primary toggle-sm transition-all duration-300"
                  @change="patchPrefs({ sidebarCollapsed: !model.sidebarCollapsed })"
                />
              </div>
            </div>

            <!-- 字体尺寸设置 -->
            <div class="setting-item">
              <div class="flex items-center gap-3">
                <div class="setting-icon-wrapper bg-accent/10 text-accent">
                  <Type class="h-4.5 w-4.5" />
                </div>
                <div>
                  <div class="setting-title">字体尺寸</div>
                  <div class="setting-desc text-base-content/40">调整全局界面阅读文字的大小</div>
                </div>
              </div>
              <div class="capsule-group">
                <button
                  class="capsule-btn"
                  :class="model.fontScale === 'normal' ? 'bg-primary text-primary-content shadow-sm' : 'bg-transparent text-base-content/50 hover:bg-slate-200/60 hover:text-base-content'"
                  @click="patchPrefs({ fontScale: 'normal' })"
                >
                  标准
                </button>
                <button
                  class="capsule-btn"
                  :class="model.fontScale === 'large' ? 'bg-primary text-primary-content shadow-sm' : 'bg-transparent text-base-content/50 hover:bg-slate-200/60 hover:text-base-content'"
                  @click="patchPrefs({ fontScale: 'large' })"
                >
                  放大
                </button>
              </div>
            </div>

            <!-- 状态栏设置 -->
            <div class="setting-item">
              <div class="flex items-center gap-3">
                <div class="setting-icon-wrapper bg-info/10 text-info">
                  <PanelBottom class="h-4.5 w-4.5" />
                </div>
                <div>
                  <div class="setting-title">状态栏</div>
                  <div class="setting-desc text-base-content/40">控制窗口底部状态栏的显隐</div>
                </div>
              </div>
              <div>
                <input
                  :checked="model.showStatusFooter"
                  type="checkbox"
                  class="toggle toggle-info toggle-sm transition-all duration-300"
                  @change="patchPrefs({ showStatusFooter: !model.showStatusFooter })"
                />
              </div>
            </div>

            <!-- 分割线 -->
            <div class="border-t border-slate-100 my-2"></div>

            <!-- 数据目录自定义设置 -->
            <div class="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50/20 border border-slate-100">
              <div class="flex flex-col gap-1">
                <div class="text-xs font-bold text-slate-700">物理数据目录</div>
              </div>
              
              <div class="flex gap-2.5 items-center mt-1">
                <input
                  :value="appStore.localPath"
                  type="text"
                  readonly
                  placeholder="未选定工作空间"
                  class="workbench-input visual-input h-10 flex-1 text-xs select-all font-mono"
                />
                <button
                  class="workbench-btn border border-slate-200 bg-base-100 hover:bg-slate-50 text-slate-700 h-10 px-4 text-xs font-bold shrink-0 shadow-sm"
                  @click="handleSelectDataDir"
                >
                  <FolderSearch2 class="h-4 w-4 mr-1.5" />
                  修改目录
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.setting-item {
  @apply flex items-center justify-between p-3.5 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all duration-300 cursor-pointer;
}
.setting-icon-wrapper {
  @apply flex h-9 w-9 items-center justify-center rounded-xl shrink-0 transition-transform duration-300;
}
.setting-item:hover .setting-icon-wrapper {
  @apply scale-105;
}
.setting-title {
  @apply text-sm font-bold text-base-content;
}
.setting-desc {
  @apply text-[11px] font-semibold;
}
.capsule-group {
  @apply flex border border-slate-200 rounded-full p-0.5 bg-slate-100/80;
}
.capsule-btn {
  @apply flex items-center justify-center px-3.5 py-1 text-xs font-bold rounded-full transition-all duration-200;
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
