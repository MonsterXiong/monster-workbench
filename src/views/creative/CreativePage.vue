<script setup lang="ts">
import { ref } from 'vue';
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';

import CreativeAssetSidebar from './components/CreativeAssetSidebar.vue';
import CreativeWorkspace from './components/CreativeWorkspace.vue';
import CreativeAgentMonitor from './components/CreativeAgentMonitor.vue';

// 侧边栏折叠状态控制
const showLeftSidebar = ref(true);
const showRightSidebar = ref(true);

const toggleLeftSidebar = () => {
  showLeftSidebar.value = !showLeftSidebar.value;
};

const toggleRightSidebar = () => {
  showRightSidebar.value = !showRightSidebar.value;
};
</script>

<template>
  <main class="creative-page">
    <Splitpanes>

      <!-- Left Panel -->
      <Pane v-if="showLeftSidebar" :size="20" :min-size="4" :max-size="30">
        <div class="h-full relative">
          <CreativeAssetSidebar />
        </div>
      </Pane>

      <!-- Middle Panel -->
      <Pane>
        <CreativeWorkspace
          :show-left-sidebar="showLeftSidebar"
          :show-right-sidebar="showRightSidebar"
          @toggle-left="toggleLeftSidebar"
          @toggle-right="toggleRightSidebar"
        />
      </Pane>

      <!-- Right Panel -->
      <Pane v-if="showRightSidebar" :size="25" :min-size="4" :max-size="40">
        <div class="h-full relative">
          <CreativeAgentMonitor />
        </div>
      </Pane>

    </Splitpanes>
  </main>
</template>

<style scoped>
.creative-page {
  @apply h-full min-h-0 overflow-hidden text-slate-900 bg-slate-50;
}

/* Customizing splitpanes to be extremely subtle */
:deep(.splitpanes__splitter) {
  background-color: transparent !important;
  border: none !important;
  width: 1px !important;
  position: relative;
}

:deep(.splitpanes__splitter:hover),
:deep(.splitpanes__splitter:before) {
  background-color: #10b981 !important; /* emerald-500 */
  opacity: 0.5;
  transition: opacity 0.2s;
}

:deep(.splitpanes__splitter:before) {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: -2px !important;
  right: -2px !important;
  width: 5px !important;
  z-index: 100;
  opacity: 0;
}
</style>
