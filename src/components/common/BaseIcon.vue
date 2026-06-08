<script setup lang="ts">
import { computed } from "vue";
import * as icons from "lucide-vue-next";
import { capitalize } from "../../utils";

interface Props {
  name: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  ariaLabel?: string;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 18,
  strokeWidth: 2,
  ariaLabel: "",
  title: "",
});

const iconComponent = computed(() => {
  const formattedName = capitalize(props.name);
  return (icons as any)[formattedName] || (icons as any)["HelpCircle"];
});
</script>

<template>
  <component
    :is="iconComponent"
    :size="size"
    :color="color"
    :stroke-width="strokeWidth"
    :aria-label="ariaLabel || undefined"
    :role="ariaLabel ? 'img' : undefined"
    focusable="false"
    class="inline-block align-middle transition duration-150"
  >
    <title v-if="title || ariaLabel">{{ title || ariaLabel }}</title>
  </component>
</template>
