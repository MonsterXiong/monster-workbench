<script setup lang="ts">
import { computed, ref, useAttrs } from "vue";
import * as icons from "lucide-vue-next";
import { capitalize } from "../../utils";

defineOptions({
  inheritAttrs: false,
});

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

const attrs = useAttrs();
const iconRef = ref<HTMLElement | { $el?: Element | null } | null>(null);
const iconComponent = computed(() => {
  const formattedName = capitalize(props.name);
  return (icons as any)[formattedName] || (icons as any)["HelpCircle"];
});

const getElement = () => {
  if (iconRef.value instanceof HTMLElement) return iconRef.value;
  return iconRef.value?.$el instanceof HTMLElement ? iconRef.value.$el : null;
};

defineExpose({
  getElement,
});
</script>

<template>
  <component
    :is="iconComponent"
    v-bind="attrs"
    ref="iconRef"
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
