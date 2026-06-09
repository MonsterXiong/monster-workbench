<script setup lang="ts">
import { computed, ref } from "vue";
import { BookOpen, Braces, Code2, Files, Layers3, Search, SplitSquareHorizontal } from "lucide-vue-next";
import BaseCodeBlock from "../../components/common/BaseCodeBlock.vue";
import { getUtilityDocStats, utilityDocGroups, utilityDocs, type UtilityDocEntry } from "./utilsDocsContent";

const searchKeyword = ref("");
const activeGroup = ref("全部");
const stats = getUtilityDocStats();

const groups = computed(() => ["全部", ...utilityDocGroups]);
const normalizedKeyword = computed(() => searchKeyword.value.trim().toLowerCase());

const filteredDocs = computed(() => {
  const keyword = normalizedKeyword.value;

  return utilityDocs.filter((entry) => {
    if (activeGroup.value !== "全部" && entry.group !== activeGroup.value) return false;
    if (!keyword) return true;

    return [
      entry.key,
      entry.title,
      entry.group,
      entry.description,
      entry.importPath,
      ...entry.sourceFiles,
      ...entry.functions,
      ...entry.snippets,
      ...entry.examples.flatMap((item) => [item.label, item.expression]),
      ...entry.boundaryCases.flatMap((item) => [item.title, item.input, item.expected]),
    ].join(" ").toLowerCase().includes(keyword);
  });
});

function stringifyExample(value: unknown): string {
  const seen = new WeakSet<object>();

  return JSON.stringify(
    value,
    (_key, currentValue) => {
      if (currentValue instanceof Error) {
        return { name: currentValue.name, message: currentValue.message };
      }

      if (typeof currentValue === "bigint") {
        return currentValue.toString();
      }

      if (typeof currentValue === "function") {
        return `[Function ${currentValue.name || "anonymous"}]`;
      }

      if (currentValue && typeof currentValue === "object") {
        if (seen.has(currentValue)) return "[Circular]";
        seen.add(currentValue);
      }

      return currentValue;
    },
    2
  ) ?? String(value);
}

function getModuleHref(entry: UtilityDocEntry): string {
  return `#utils-doc-${entry.key}`;
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <header class="shrink-0 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-xs font-black text-primary">
            <BookOpen class="h-4 w-4" />
            src/utils
          </div>
          <h1 class="mt-1 text-xl font-black tracking-normal text-slate-950 dark:text-white">工具函数文档站点</h1>
          <p class="mt-1 max-w-4xl text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">
            公共工具函数按模块归档，典型示例和边界案例直接来自 src/utils/examples，用于检查导出能力、业务复用方式和拆分进度。
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <div class="text-[10px] font-black uppercase tracking-normal text-slate-400">模块</div>
            <div class="mt-1 text-base font-black">{{ stats.moduleCount }}</div>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <div class="text-[10px] font-black uppercase tracking-normal text-slate-400">已拆分</div>
            <div class="mt-1 text-base font-black text-emerald-600 dark:text-emerald-400">{{ stats.splitCount }}</div>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <div class="text-[10px] font-black uppercase tracking-normal text-slate-400">示例</div>
            <div class="mt-1 text-base font-black">{{ stats.exampleCount }}</div>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <div class="text-[10px] font-black uppercase tracking-normal text-slate-400">边界</div>
            <div class="mt-1 text-base font-black">{{ stats.boundaryCaseCount }}</div>
          </div>
        </div>
      </div>
    </header>

    <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside class="shrink-0 border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:w-72 lg:border-b-0 lg:border-r">
        <label class="relative block">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model="searchKeyword"
            class="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-bold outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:focus:bg-slate-900"
            placeholder="搜索模块、函数、示例"
          />
        </label>

        <div class="mt-4 flex flex-wrap gap-2 lg:flex-col">
          <button
            v-for="group in groups"
            :key="group"
            class="rounded-lg border px-3 py-2 text-left text-xs font-black transition"
            :class="
              activeGroup === group
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-slate-100'
            "
            @click="activeGroup = group"
          >
            {{ group }}
          </button>
        </div>

        <nav class="mt-5 hidden max-h-[calc(100vh-260px)] space-y-1 overflow-y-auto pr-1 lg:block" aria-label="工具函数模块">
          <a
            v-for="entry in filteredDocs"
            :key="entry.key"
            :href="getModuleHref(entry)"
            class="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <span class="truncate">{{ entry.key }}</span>
            <span
              class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black"
              :class="entry.splitStatus === 'split' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'"
            >
              {{ entry.splitStatus === 'split' ? 'split' : 'single' }}
            </span>
          </a>
        </nav>
      </aside>

      <main class="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
        <div v-if="filteredDocs.length === 0" class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          没有匹配的工具函数模块
        </div>

        <div v-else class="space-y-4">
          <section
            v-for="entry in filteredDocs"
            :id="`utils-doc-${entry.key}`"
            :key="entry.key"
            class="scroll-mt-4 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <header class="border-b border-slate-100 p-4 dark:border-slate-800">
              <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="text-base font-black tracking-normal text-slate-950 dark:text-white">{{ entry.title }}</h2>
                    <span class="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">{{ entry.group }}</span>
                    <span
                      class="rounded px-2 py-0.5 text-[10px] font-black"
                      :class="entry.splitStatus === 'split' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'"
                    >
                      {{ entry.splitStatus === 'split' ? '已拆分' : '待拆分' }}
                    </span>
                  </div>
                  <p class="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{{ entry.description }}</p>
                </div>

                <div class="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 xl:w-[360px]">
                  <div class="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Code2 class="h-3.5 w-3.5" />
                    <code class="truncate">{{ entry.importPath }}</code>
                  </div>
                  <div class="mt-2 flex items-start gap-2">
                    <Files class="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div class="min-w-0 space-y-1">
                      <code v-for="file in entry.sourceFiles" :key="file" class="block truncate">{{ file }}</code>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div class="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
              <div class="min-w-0 space-y-4">
                <div>
                  <div class="mb-2 flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200">
                    <Layers3 class="h-4 w-4 text-primary" />
                    核心函数
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <code v-for="fn in entry.functions" :key="fn" class="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{{ fn }}</code>
                  </div>
                </div>

                <div>
                  <div class="mb-2 flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200">
                    <Braces class="h-4 w-4 text-primary" />
                    典型用法
                  </div>
                  <div class="grid gap-2 md:grid-cols-2">
                    <BaseCodeBlock v-for="snippet in entry.snippets" :key="snippet" :code="snippet" language="ts" size="sm" max-height="90px" :show-line-numbers="false" wrap />
                  </div>
                </div>

                <div>
                  <div class="mb-2 flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200">
                    <Code2 class="h-4 w-4 text-primary" />
                    典型示例
                  </div>
                  <div class="grid gap-3 md:grid-cols-2">
                    <article v-for="example in entry.examples" :key="example.label" class="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <div class="mb-2 min-w-0">
                        <div class="truncate text-xs font-black text-slate-800 dark:text-slate-100">{{ example.label }}</div>
                        <code class="mt-1 block truncate text-[11px] font-semibold text-primary">{{ example.expression }}</code>
                      </div>
                      <BaseCodeBlock :code="stringifyExample(example.value)" language="json" size="sm" max-height="180px" :show-line-numbers="false" />
                    </article>
                  </div>
                </div>
              </div>

              <aside class="min-w-0">
                <div class="mb-2 flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200">
                  <SplitSquareHorizontal class="h-4 w-4 text-primary" />
                  边界案例
                </div>
                <div class="space-y-2">
                  <article v-for="item in entry.boundaryCases" :key="item.key" class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div class="text-xs font-black text-slate-800 dark:text-slate-100">{{ item.title }}</div>
                    <code class="mt-1 block break-words text-[11px] font-bold text-primary">{{ item.input }}</code>
                    <div class="mt-2 rounded bg-white px-2 py-1.5 text-[11px] font-semibold leading-5 text-slate-600 dark:bg-slate-900 dark:text-slate-300">{{ item.expected }}</div>
                  </article>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>
</template>
