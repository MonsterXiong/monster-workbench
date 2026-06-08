<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../composables/useToast";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const { triggerToast } = useToast();

const commandPaletteOpen = ref(false);
const selectedCommand = ref("尚未选择命令");

const commandItems = [
  { key: "open-settings", label: "打开设置", description: "进入全局设置页查看主题与运行时配置。", icon: "Settings2", group: "跳转", shortcut: "Ctrl ," },
  { key: "refresh-playground", label: "刷新沙箱", description: "重新渲染当前沙箱。", icon: "RefreshCw", group: "维护" },
  { key: "copy-component", label: "复制组件名", description: "把当前组件名写入剪贴板。", icon: "Copy", group: "编辑", shortcut: "Ctrl C" },
  { key: "disabled", label: "暂不可用", description: "等待权限开放。", icon: "Lock", group: "维护", disabled: true },
];

const actionMenuItems = [
  { key: "copy", label: "复制名称", description: "写入剪贴板。", icon: "Copy", shortcut: "Ctrl C" },
  { key: "rename", label: "重命名", description: "更新组件显示名。", icon: "Pencil" },
  { key: "disabled", label: "暂不可用", description: "等待权限开放。", icon: "Lock", disabled: true },
  { key: "delete", label: "删除组件", description: "危险操作需要确认。", icon: "Trash2", type: "danger" as const, divided: true },
];

const handleCommandSelect = (command: { label: string }) => {
  selectedCommand.value = command.label;
  triggerToast(`已选择命令：${command.label}`, "success");
};

const handleConfirmAction = (label: string) => {
  triggerToast(`已确认：${label}`, "success");
};
</script>

<template>
  <section v-if="activeComponentKey === 'command-palette'" class="detail-stack">
    <PlaygroundDemoSection title="命令面板" subtitle="应用级快捷入口，适合承接高频全局动作。" icon="Command">
      <BasePanel title="交互预览" subtitle="支持分组、搜索、禁用项、快捷键和键盘选择。">
        <div class="action-row">
          <BaseButton type="primary" @click="commandPaletteOpen = true">
            <template #icon><BaseIcon name="Command" size="15" /></template>
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

  <section v-else-if="activeComponentKey === 'action-menu'" class="detail-stack">
    <PlaygroundDemoSection title="操作菜单" subtitle="表格行操作、卡片更多操作和工具栏扩展入口都可以复用。" icon="MoreHorizontal">
      <div class="demo-grid">
        <BasePanel title="行操作菜单" subtitle="支持图标、说明、快捷键、禁用项、分割线和危险动作。">
          <template #actions>
            <BaseActionMenu :actions="actionMenuItems" label="更多" @select="triggerToast(`选择：${$event.label}`, 'info')" />
          </template>
          <BaseAlert type="info" title="使用建议" description="操作菜单适合承载低频动作，避免按钮区过度拥挤。" compact />
        </BasePanel>

        <BasePanel title="不同方向" subtitle="可根据触发点位置调整展开方向。">
          <div class="action-row">
            <BaseActionMenu :actions="actionMenuItems.slice(0, 3)" label="左对齐" align="left" />
            <BaseActionMenu :actions="actionMenuItems.slice(0, 3)" label="向上" placement="top" />
            <BaseActionMenu :actions="actionMenuItems" icon="Settings2" aria-label="设置动作" />
          </div>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'toolbar'" class="detail-stack">
    <PlaygroundDemoSection title="工具栏" subtitle="统一页面、表格、编辑器顶部的左中右操作组。" icon="Wrench">
      <BaseToolbar aria-label="组件编辑工具栏">
        <template #left>
          <BaseBadge type="primary">组件库</BaseBadge>
          <BaseButton type="neutral" size="sm">返回</BaseButton>
        </template>
        <BaseButton type="neutral" size="sm">
          <template #icon><BaseIcon name="Undo2" size="14" /></template>
          撤销
        </BaseButton>
        <BaseButton type="neutral" size="sm">
          <template #icon><BaseIcon name="Redo2" size="14" /></template>
          重做
        </BaseButton>
        <template #right>
          <BaseButton type="neutral" size="sm">预览</BaseButton>
          <BaseButton type="primary" size="sm">保存</BaseButton>
        </template>
      </BaseToolbar>

      <BaseToolbar compact :wrap="false" aria-label="紧凑工具栏">
        <template #left>
          <BaseStatusDot type="success" label="已同步" description="刚刚" />
        </template>
        <BaseButton type="ghost" size="sm">复制</BaseButton>
        <BaseButton type="ghost" size="sm">导出</BaseButton>
        <template #right>
          <BaseActionMenu :actions="actionMenuItems" />
        </template>
      </BaseToolbar>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'confirm-action'" class="detail-stack">
    <PlaygroundDemoSection title="确认动作" subtitle="把二次确认弹窗和按钮状态封装在一起，业务侧只接收确认后的动作。" icon="ShieldAlert">
      <div class="demo-grid">
        <BasePanel title="危险操作" subtitle="删除、强制清理等不可逆动作使用 danger 语义。">
          <div class="action-row">
            <BaseConfirmAction
              label="删除组件"
              title="确认删除组件？"
              message="删除后将无法恢复，请确认是否继续。"
              confirm-text="确认删除"
              cancel-text="再想想"
              danger
              @confirm="handleConfirmAction('删除组件')"
            />
            <BaseConfirmAction
              label="清理缓存"
              title="确认清理缓存？"
              message="将清除当前组件沙箱的临时缓存，不影响源文件。"
              type="warning"
              @confirm="handleConfirmAction('清理缓存')"
            />
          </div>
        </BasePanel>

        <BasePanel title="普通确认" subtitle="归档、重置、发布前确认等可恢复动作。">
          <div class="action-row">
            <BaseConfirmAction
              label="归档组件"
              title="确认归档？"
              message="归档后仍可在历史列表中恢复。"
              type="neutral"
              outline
              @confirm="handleConfirmAction('归档组件')"
            />
            <BaseConfirmAction
              label="已禁用"
              title="不可用动作"
              message="禁用状态不会触发确认弹窗。"
              type="neutral"
              disabled
            />
          </div>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'form-actions'" class="detail-stack">
    <PlaygroundDemoSection title="表单动作栏" subtitle="说明区、状态区和按钮区的职责更清晰。" icon="PanelBottomOpen">
      <BasePanel title="模型参数" subtitle="适合与 BaseForm、BaseFieldGroup、BasePanel 组合。">
        <BaseFormActions sticky title="待保存修改" description="滚动较长时保持操作入口稳定。" justify="end">
          <template #meta>
            <BaseStatusDot type="warning" label="有 3 项变更" description="尚未保存" />
          </template>
          <BaseButton type="neutral" size="sm">取消</BaseButton>
          <BaseButton type="primary" size="sm">保存配置</BaseButton>
        </BaseFormActions>
      </BasePanel>

      <BasePanel title="紧凑动作" subtitle="抽屉、侧栏和小表单使用 compact。">
        <BaseFormActions compact title="字段动作" description="用于局部配置保存。" justify="between">
          <BaseButton type="ghost" size="sm">重置</BaseButton>
          <BaseButton type="primary" size="sm">应用</BaseButton>
        </BaseFormActions>
      </BasePanel>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}

.action-row {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}
</style>
