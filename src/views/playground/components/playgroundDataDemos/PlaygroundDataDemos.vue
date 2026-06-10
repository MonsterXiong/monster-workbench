<script setup lang="ts">
import DataFilterBarDemo from "./components/DataFilterBarDemo.vue";
import DataDetailCardDemo from "./components/DataDetailCardDemo.vue";
import DataDataTableDemo from "./components/DataDataTableDemo.vue";
import DataTableToolbarDemo from "./components/DataTableToolbarDemo.vue";
import DataSelectionBarDemo from "./components/DataSelectionBarDemo.vue";
import DataDataStateDemo from "./components/DataDataStateDemo.vue";

defineProps<{
  activeComponentKey: string;
}>();
</script>

<template>
  <div>
    <DataFilterBarDemo v-if="activeComponentKey === 'filter-bar'" />
    <DataDetailCardDemo v-else-if="activeComponentKey === 'detail-card'" />
    <DataDataTableDemo v-else-if="activeComponentKey === 'data-table'" />
    <DataTableToolbarDemo v-else-if="activeComponentKey === 'table-toolbar'" />
    <DataSelectionBarDemo v-else-if="activeComponentKey === 'selection-bar'" />
    <DataDataStateDemo v-else-if="activeComponentKey === 'data-state'" />
  </div>
</template>
