<script setup lang="ts">
import LayoutPageShellDemo from "./components/LayoutPageShellDemo.vue";
import LayoutPageHeaderDemo from "./components/LayoutPageHeaderDemo.vue";
import LayoutSectionHeaderDemo from "./components/LayoutSectionHeaderDemo.vue";
import LayoutPanelDemo from "./components/LayoutPanelDemo.vue";
import LayoutFieldGroupDemo from "./components/LayoutFieldGroupDemo.vue";
import LayoutResizablePanelsDemo from "./components/LayoutResizablePanelsDemo.vue";
import LayoutThreeColumnDemo from "./components/LayoutThreeColumnDemo.vue";

defineProps<{
  activeComponentKey: string;
}>();
</script>

<template>
  <div>
    <LayoutPageShellDemo v-if="activeComponentKey === 'page-shell'" />
    <LayoutPageHeaderDemo v-else-if="activeComponentKey === 'page-header'" />
    <LayoutSectionHeaderDemo v-else-if="activeComponentKey === 'section-header'" />
    <LayoutPanelDemo v-else-if="activeComponentKey === 'panel'" />
    <LayoutFieldGroupDemo v-else-if="activeComponentKey === 'field-group'" />
    <LayoutResizablePanelsDemo v-else-if="activeComponentKey === 'resizable-panels'" />
    <LayoutThreeColumnDemo v-else-if="activeComponentKey === 'three-column-layout'" />
  </div>
</template>
