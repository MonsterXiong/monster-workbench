<script setup lang="ts">
import { ref } from "vue";
import BaseCommandPalette from "../../../../../components/common/BaseCommandPalette.vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const commandPaletteOpen = ref(false);
const selectedCommand = ref("尚未选择命令");
const commandPaletteInstanceText = ref("等待实例操作");
const commandPaletteInstanceRef = ref<InstanceType<typeof BaseCommandPalette> | null>(null);

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

const openCommandPaletteByRef = async () => {
  const element = await commandPaletteInstanceRef.value?.open();
  commandPaletteInstanceText.value = element ? `已打开: ${element.tagName.toLowerCase()}` : "未找到面板";
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
      <BasePanel title="实例能力" subtitle="外部可以通过 ref 打开、关闭和聚焦搜索框。">
        <div class="command-instance-panel">
          <div class="command-instance-copy">
            <BaseIcon name="Workflow" size="14" aria-hidden="true" />
            <span>{{ commandPaletteInstanceText }}</span>
          </div>
          <div class="command-instance-actions">
            <BaseButton size="xs" type="secondary" outline @click="openCommandPaletteByRef">打开</BaseButton>
          </div>
        </div>
      </BasePanel>
      <BaseCommandPalette
        ref="commandPaletteInstanceRef"
        data-native-command-palette-ref="base-command-palette-instance"
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

.command-instance-panel {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.command-instance-copy {
  @apply flex min-w-0 items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.command-instance-copy span {
  @apply min-w-0 truncate;
}

.command-instance-actions {
  @apply flex shrink-0 flex-wrap items-center gap-2;
}
</style>
