<script setup lang="ts">
import { AlertCircle, LoaderCircle, SearchX } from "lucide-vue-next";

defineProps<{
  type: "loading" | "error" | "empty";
  title: string;
  message?: string;
}>();
</script>

<template>
  <div class="flex h-full min-h-[280px] items-center justify-center">
    <div class="flex flex-col items-center gap-3 text-center text-base-content/60">
      <div
        class="flex h-14 w-14 items-center justify-center rounded-2xl border border-base-300 bg-base-100"
      >
        <LoaderCircle v-if="type === 'loading'" class="h-6 w-6 animate-spin text-primary" />
        <AlertCircle v-else-if="type === 'error'" class="h-6 w-6 text-error" />
        <SearchX v-else class="h-6 w-6 text-base-content/45" />
      </div>
      <div class="space-y-1">
        <div class="text-base font-semibold text-base-content">{{ title }}</div>
        <div v-if="message" class="text-sm">{{ message }}</div>
      </div>
    </div>
  </div>
</template>
