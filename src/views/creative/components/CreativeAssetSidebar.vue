<script setup lang="ts">
import { Folder, Image as ImageIcon, Book, Clapperboard, Hash } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'select', category: string): void
}>();

const projects = [
  { id: 'p1', name: '默认创作项目', active: true },
  { id: 'p2', name: '故事资产项目', active: false },
  { id: 'p3', name: '批量生图项目', active: false },
];

const assetCategories = [
  { id: 'character', name: '角色资产', icon: ImageIcon },
  { id: 'scene', name: '场景设定', icon: ImageIcon },
  { id: 'prop', name: '标志性道具', icon: ImageIcon },
  { id: 'storyboard', name: '分镜表', icon: Clapperboard },
  { id: 'bible', name: '项目设定集', icon: Book },
];

const tags = [
  { id: 't1', name: '草稿' },
  { id: 't2', name: '已审查' },
  { id: 't3', name: '待返工' },
];
</script>

<template>
  <div class="h-full flex flex-col bg-white overflow-hidden text-sm">
    <!-- Header -->
    <div class="h-14 flex items-center px-4 shrink-0 justify-between select-none border-b border-slate-100">
      <span class="font-semibold text-slate-800">创作资产库</span>
    </div>

    <!-- Scrollable Area -->
    <div class="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">

      <!-- Projects Section -->
      <section>
        <div class="text-xs font-semibold text-slate-400 mb-2 px-2 uppercase tracking-wider select-none">
          项目
        </div>
        <div class="space-y-0.5">
          <button
            v-for="project in projects"
            :key="project.id"
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors"
            :class="[
              project.active
                ? 'bg-emerald-50 text-emerald-700 font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            ]"
          >
            <Folder class="w-4 h-4 shrink-0" :class="project.active ? 'text-emerald-500' : 'text-slate-400'" />
            <span class="truncate">{{ project.name }}</span>
          </button>
        </div>
      </section>

      <!-- Assets Section -->
      <section>
        <div class="text-xs font-semibold text-slate-400 mb-2 px-2 uppercase tracking-wider select-none">
          资产分类
        </div>
        <div class="space-y-0.5">
          <button
            v-for="category in assetCategories"
            :key="category.id"
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-slate-600 hover:bg-slate-100 transition-colors"
            @click="emit('select', category.id)"
          >
            <component :is="category.icon" class="w-4 h-4 shrink-0 text-slate-400" />
            <span class="truncate">{{ category.name }}</span>
          </button>
        </div>
      </section>

      <!-- Tags Section -->
      <section>
        <div class="text-xs font-semibold text-slate-400 mb-2 px-2 uppercase tracking-wider select-none">
          标签
        </div>
        <div class="space-y-0.5">
          <button
            v-for="tag in tags"
            :key="tag.id"
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Hash class="w-4 h-4 shrink-0 text-slate-300" />
            <span class="truncate">{{ tag.name }}</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}
</style>
