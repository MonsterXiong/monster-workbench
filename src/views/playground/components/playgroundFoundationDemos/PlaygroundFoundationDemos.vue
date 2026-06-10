<script setup lang="ts">
import FoundationButtonsBadgesDemo from "./components/FoundationButtonsBadgesDemo.vue";
import FoundationSearchPaginationDemo from "./components/FoundationSearchPaginationDemo.vue";
import FoundationEmptyErrorDemo from "./components/FoundationEmptyErrorDemo.vue";
import FoundationDescriptionListsDemo from "./components/FoundationDescriptionListsDemo.vue";
import FoundationSimpleTableDemo from "./components/FoundationSimpleTableDemo.vue";

defineProps<{
  activeComponentKey: string;
}>();
</script>

<template>
  <div>
    <FoundationButtonsBadgesDemo v-if="activeComponentKey === 'buttons-badges'" />
    <FoundationSearchPaginationDemo v-else-if="activeComponentKey === 'search-pagination'" />
    <FoundationEmptyErrorDemo v-else-if="activeComponentKey === 'empty-error'" />
    <FoundationDescriptionListsDemo v-else-if="activeComponentKey === 'description-lists'" />
    <FoundationSimpleTableDemo v-else-if="activeComponentKey === 'simple-table'" />
  </div>
</template>
