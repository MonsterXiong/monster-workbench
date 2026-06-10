<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const commandPaletteOpen = ref(false);
const selectedCommand = ref("尚未选择命令");

const commandItems = [
  { key: "open-settings", label: "打开设置", description: "进入全局设置页查看主题与运行时配置。", icon: "Settings2", group: "跳转", shortcut: "Ctrl ," },
  { key: "refresh-playground", label: "刷新沙箱", description: "重新渲染当前沙箱。", icon: "RefreshCw", group: "维护" },
  { key: "copy-component", label: "复制组件名", description: "把当前组件名写入剪贴板。", icon: "Copy", group: "编辑", shortcut: "Ctrl C" },
  { key: "disabled", label: "暂不可用", description: "等待权限开放。", icon: "Lock", group: "维护", disabled: true },
];

const handleCommandSelect = (command: { label: string }) => {
  selectedCommand.value = command.label;
  triggerToast(`已选择命令：${command.label}`, "success");
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="命令面板" subtitle="应用级快捷入口，适合承接高频全局动作。" icon="Command">
      <BasePanel title="交互预览" subtitle="支持分组、搜索、禁用项、快捷键 and 键盘选择。">
        <div class="action-row">
          <BaseButton type="primary" @click="commandPaletteOpen = true">
            <template #icon>
              <BaseIcon name="Command" size="15" />
            </template>
            打开命令面板
          </BaseButton>
          <BaseBadge type="neutral">{{ selectedCommand }}</BaseBadge>
        </div>
      </BasePanel>
      <BaseCommandPalette
        v-model="commandPaletteOpen"
        title="组件命令"
        placeholder="搜索组件动作"
        :items="commandItems"
        @select="handleCommandSelect"
      />
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.action-row {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}
</style>
