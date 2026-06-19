<script setup lang="ts">
import { computed } from "vue";
import { Activity, BadgeCheck, FileQuestion, Link2Off, Sparkles, Star } from "lucide-vue-next";
import type { NavigationItem } from "../../../stores/navigation";
import { useI18n } from "../../../composables/useI18n";

/**
 * 整理建议面板里"高频未精选"的点击数阈值。clicks ≥ 此值且尚未被精选
 * 的资源会被建议加精。提到顶部便于以后调整或迁到 appStore 设置。
 */
const FREQUENT_CLICK_THRESHOLD = 20;

const props = defineProps<{
  items: NavigationItem[];
}>();

const emit = defineEmits<{
  (e: "mark-common"): void;
  (e: "fill-descriptions"): void;
  (e: "refresh"): void;
}>();

const { t } = useI18n();

const duplicateCount = computed(() => {
  const seen = new Set<string>();
  let count = 0;
  props.items.forEach((item) => {
    const key = item.url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (seen.has(key)) count += 1;
    seen.add(key);
  });
  return count;
});

const missingDescriptionCount = computed(() => props.items.filter((item) => !item.description?.trim()).length);
const missingLogoCount = computed(() => props.items.filter((item) => !item.logo_path).length);
const frequentUnfeaturedCount = computed(
  () => props.items.filter((item) => item.clicks >= FREQUENT_CLICK_THRESHOLD && item.is_featured !== 1).length,
);
const longUnvisitedCount = computed(() => props.items.filter((item) => !item.last_visited_at && item.clicks === 0).length);

const suggestions = computed(() => [
  {
    key: "duplicate",
    icon: Link2Off,
    label: t("navigation.reviewDuplicate"),
    count: duplicateCount.value,
  },
  {
    key: "description",
    icon: FileQuestion,
    label: t("navigation.reviewMissingDescription"),
    count: missingDescriptionCount.value,
  },
  {
    key: "logo",
    icon: BadgeCheck,
    label: t("navigation.reviewMissingLogo"),
    count: missingLogoCount.value,
  },
  {
    key: "frequent",
    icon: Star,
    label: t("navigation.reviewFrequentUnfeatured"),
    count: frequentUnfeaturedCount.value,
  },
  {
    key: "unused",
    icon: Activity,
    label: t("navigation.reviewNeverVisited"),
    count: longUnvisitedCount.value,
  },
]);
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles class="h-4 w-4" />
        </div>
        <div>
          <div class="text-xs font-black text-slate-800 dark:text-slate-100">{{ t('navigation.reviewTitle') }}</div>
          <div class="text-[10px] font-semibold text-slate-500">{{ t('navigation.reviewSubtitle') }}</div>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <BaseButton type="neutral" outline size="xs" @click="emit('fill-descriptions')">
          {{ t('navigation.reviewFillDescriptions') }}
        </BaseButton>
        <BaseButton type="neutral" outline size="xs" @click="emit('mark-common')">
          {{ t('navigation.reviewMarkCommon') }}
        </BaseButton>
        <BaseButton type="link" size="xs" @click="emit('refresh')">
          {{ t('navigation.reviewRefresh') }}
        </BaseButton>
      </div>
    </div>

    <div class="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
      <div
        v-for="item in suggestions"
        :key="item.key"
        class="rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950/60"
      >
        <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <component :is="item.icon" class="h-3.5 w-3.5" />
          <span class="truncate">{{ item.label }}</span>
        </div>
        <div class="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{{ item.count }}</div>
      </div>
    </div>
  </div>
</template>
