<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Link, ListPlus } from "lucide-vue-next";
import { useNavigationStore, type NavigationItem } from "../../../stores/navigation";
import { useI18n } from "../../../composables/useI18n";

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", val: boolean): void;
  (e: "submit", items: NavigationItem[]): void;
}>();

const navigationStore = useNavigationStore();
const { t } = useI18n();
const rawText = ref("");

const parsedItems = computed(() => navigationStore.createItemsFromText(rawText.value));

const showModalValue = computed({
  get: () => props.visible,
  set: (val: boolean) => emit("update:visible", val),
});

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      rawText.value = "";
    }
  }
);

function handleSubmit() {
  if (parsedItems.value.length === 0) return;
  emit("submit", parsedItems.value);
}
</script>

<template>
  <BaseDialog
    v-model="showModalValue"
    :title="t('navigation.batchPasteTitle')"
    width="max-w-[560px]"
  >
    <div class="space-y-4">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-semibold leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
        {{ t('navigation.batchPasteHint') }}
      </div>

      <textarea
        v-model="rawText"
        rows="8"
        :placeholder="t('navigation.batchPastePlaceholder')"
        class="workbench-textarea min-h-40 p-3 text-xs leading-5"
      ></textarea>

      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
          <div class="flex items-center gap-2 text-[11px] font-black text-slate-700 dark:text-slate-200">
            <ListPlus class="h-3.5 w-3.5 text-primary" />
            {{ t('navigation.batchPastePreview') }}
          </div>
          <span class="text-[10px] font-bold text-slate-500">
            {{ t('navigation.batchPasteCount').replace('{count}', String(parsedItems.length)) }}
          </span>
        </div>
        <div class="max-h-44 overflow-y-auto p-2">
          <div
            v-if="parsedItems.length === 0"
            class="py-8 text-center text-[11px] font-semibold text-slate-400"
          >
            {{ t('navigation.batchPasteEmpty') }}
          </div>
          <div
            v-for="item in parsedItems"
            v-else
            :key="item.url"
            class="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/70"
          >
            <Link class="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span class="min-w-0 flex-1 truncate font-bold text-slate-800 dark:text-slate-100">{{ item.title }}</span>
            <span class="max-w-[220px] truncate text-[10px] font-semibold text-slate-500">{{ item.url }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton type="neutral" outline size="sm" @click="emit('update:visible', false)">
        {{ t('common.cancel') }}
      </BaseButton>
      <BaseButton type="primary" size="sm" :disabled="parsedItems.length === 0" @click="handleSubmit">
        {{ t('navigation.batchPasteCreate') }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>
