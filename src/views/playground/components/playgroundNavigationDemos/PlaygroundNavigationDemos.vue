<script setup lang="ts">
import NavigationBreadcrumbDemo from "./components/NavigationBreadcrumbDemo.vue";
import NavigationTabsDemo from "./components/NavigationTabsDemo.vue";
import NavigationAccordionDemo from "./components/NavigationAccordionDemo.vue";
import NavigationTreeDemo from "./components/NavigationTreeDemo.vue";
import NavigationListDemo from "./components/NavigationListDemo.vue";

defineProps<{
  activeComponentKey: string;
}>();
</script>

<template>
  <div>
    <NavigationBreadcrumbDemo v-if="activeComponentKey === 'breadcrumb'" />
    <NavigationTabsDemo v-else-if="activeComponentKey === 'tabs'" />
    <NavigationAccordionDemo v-else-if="activeComponentKey === 'accordion'" />
    <NavigationTreeDemo v-else-if="activeComponentKey === 'tree'" />
    <NavigationListDemo v-else-if="activeComponentKey === 'list'" />
  </div>
</template>
