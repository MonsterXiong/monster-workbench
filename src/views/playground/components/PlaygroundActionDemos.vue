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

const longActionMenuItems = [
  { key: "open", label: "打开详情", description: "进入组件详情页。", icon: "ExternalLink" },
  { key: "pin", label: "固定到顶部", description: "加入常用操作。", icon: "Pin" },
  { key: "copy", label: "复制名称", description: "写入剪贴板。", icon: "Copy", shortcut: "Ctrl C" },
  { key: "duplicate", label: "创建副本", description: "复制当前配置。", icon: "CopyPlus" },
  { key: "rename", label: "重命名", description: "更新组件显示名。", icon: "Pencil" },
  { key: "tag", label: "添加标签", description: "补充检索标签。", icon: "Tag" },
  { key: "export", label: "导出配置", description: "生成 JSON 配置。", icon: "Download" },
  { key: "archive", label: "归档组件", description: "移入历史列表。", icon: "Archive" },
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

        <BasePanel title="智能定位" subtitle="贴近容器边缘时会自动夹住弹层，避免被视口裁切。">
          <div class="action-edge-demo">
            <div class="action-edge-demo__row">
              <BaseActionMenu :actions="actionMenuItems" label="左上" align="left" placement="auto" />
              <BaseActionMenu :actions="actionMenuItems" label="右上" placement="auto" />
            </div>
            <div class="action-edge-demo__row action-edge-demo__row--bottom">
              <BaseActionMenu :actions="actionMenuItems" label="左下" align="left" placement="auto" />
              <BaseActionMenu :actions="actionMenuItems" label="右下" placement="auto" />
            </div>
          </div>
        </BasePanel>

        <BasePanel title="长菜单与单开" subtitle="长列表限制高度并滚动；连续打开多个菜单时只保留当前一个。">
          <div class="action-row">
            <BaseActionMenu :actions="longActionMenuItems" label="长菜单" :max-height="220" />
            <BaseActionMenu :actions="actionMenuItems" label="菜单 A" />
            <BaseActionMenu :actions="actionMenuItems" label="菜单 B" align="left" />
            <BaseActionMenu :actions="actionMenuItems" icon="SlidersHorizontal" aria-label="更多设置" />
          </div>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'toolbar'" class="detail-stack">
    <PlaygroundDemoSection title="工具栏" subtitle="统一页面、表格、编辑器顶部的左中右操作组。" icon="Wrench">
      <BaseToolbar aria-label="组件编辑工具栏" size="lg" divided left-label="上下文" main-label="编辑动作" right-label="发布动作">
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

      <BaseToolbar compact :wrap="false" aria-label="紧凑滚动工具栏" surface="muted">
        <template #left>
          <BaseStatusDot type="success" label="已同步" description="刚刚" />
        </template>
        <BaseButton type="ghost" size="sm">复制</BaseButton>
        <BaseButton type="ghost" size="sm">导出</BaseButton>
        <BaseButton type="ghost" size="sm">归档</BaseButton>
        <BaseButton type="ghost" size="sm">同步</BaseButton>
        <template #right>
          <BaseActionMenu :actions="actionMenuItems" />
        </template>
      </BaseToolbar>

      <div class="demo-grid">
        <BasePanel title="嵌入式工具栏" subtitle="plain 表面适合放进卡片正文、抽屉或侧栏。">
          <BaseToolbar surface="plain" justify="start" main-align="start" aria-label="嵌入式工具栏">
            <template #left>
              <BaseBadge type="neutral" variant="outline">Plain</BaseBadge>
            </template>
            <BaseButton type="neutral" size="sm">筛选</BaseButton>
            <BaseButton type="neutral" size="sm">排序</BaseButton>
            <BaseButton type="primary" size="sm">应用</BaseButton>
          </BaseToolbar>
        </BasePanel>

        <BasePanel title="吸顶工具栏" subtitle="列表或长表单滚动时可保持操作入口稳定。">
          <div class="toolbar-scroll-demo">
            <BaseToolbar sticky surface="muted" compact aria-label="吸顶工具栏">
              <template #left>
                <BaseBadge type="primary" variant="outline">Sticky</BaseBadge>
              </template>
              <BaseButton type="neutral" size="sm">刷新</BaseButton>
              <template #right>
                <BaseButton type="primary" size="sm">保存</BaseButton>
              </template>
            </BaseToolbar>
            <BaseList
              class="mt-3"
              :items="[
                { id: 'a', title: '字段配置', meta: '8' },
                { id: 'b', title: '展示设置', meta: '6' },
                { id: 'c', title: '权限策略', meta: '4' },
                { id: 'd', title: '审计日志', meta: '12' },
              ]"
              variant="plain"
              simple
              :bordered="false"
            />
          </div>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BaseToolbar loading loading-text="保存工具栏状态" aria-label="加载工具栏">
          <template #left>
            <BaseBadge type="warning">保存中</BaseBadge>
          </template>
          <BaseButton type="neutral" size="sm">撤销</BaseButton>
          <template #right>
            <BaseButton type="primary" size="sm">保存</BaseButton>
          </template>
        </BaseToolbar>

        <BaseToolbar disabled surface="muted" aria-label="禁用工具栏">
          <template #left>
            <BaseBadge type="neutral">只读</BaseBadge>
          </template>
          <BaseButton type="neutral" size="sm">编辑</BaseButton>
          <template #right>
            <BaseButton type="primary" size="sm">提交</BaseButton>
          </template>
        </BaseToolbar>
      </div>
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

.action-edge-demo {
  @apply flex min-h-[220px] flex-col justify-between rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950;
}

.action-edge-demo__row {
  @apply flex items-center justify-between gap-2;
}

.action-edge-demo__row--bottom {
  @apply items-end;
}

.toolbar-scroll-demo {
  @apply h-48 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950;
}
</style>
