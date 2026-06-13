<script setup lang="ts">
import type { UtilityDocQualityReport } from "../utilsDocsContent";
import { getQualityClasses, getQualityLabel } from "../utilsDocsUi";

const props = withDefaults(
  defineProps<{
    report: UtilityDocQualityReport;
    variant?: "label" | "score" | "compact";
  }>(),
  {
    variant: "label",
  }
);

function getDisplayText(): string {
  if (props.variant === "score") return String(props.report.score);
  if (props.variant === "compact") return `${getQualityLabel(props.report)} · ${props.report.score}`;
  return getQualityLabel(props.report);
}
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center rounded-lg border px-2 py-0.5 text-[10px] font-black leading-5"
    :class="getQualityClasses(report)"
  >
    {{ getDisplayText() }}
  </span>
</template>
