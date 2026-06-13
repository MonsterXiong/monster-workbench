<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import BaseActionMenu from "../../../../../components/common/BaseActionMenu.vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();
const instanceActionMenuRef = ref<InstanceType<typeof BaseActionMenu> | null>(null);
const actionMenuMethodText = ref("等待实例方法触发");

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

const verboseActionMenuItems = [
  {
    key: "sync-long",
    label: "同步一个跨工作区的超长组件配置名称",
    description: "用于验证菜单项长标题和说明在受限宽度内自然换行，不挤压快捷键区域。",
    icon: "RefreshCw",
    shortcut: "Ctrl Shift S",
  },
  {
    key: "copy-trace",
    label: "复制 trace://playground/action-menu/very-long-resource-identifier",
    description: "长路径、trace id 和资源 URI 需要留在菜单内部。",
    icon: "Copy",
    meta: "trace://workspace/component/action-menu/meta/overflow-check",
  },
  {
    key: "shortcut-long",
    label: "长快捷键",
    description: "尾部快捷键和元信息也需要被约束，不能撑破菜单宽度。",
    icon: "Keyboard",
    shortcut: "Ctrl Shift Alt Meta Enter",
  },
  {
    key: "remove-long",
    label: "删除这个仍然很长的菜单项",
    description: "危险动作保留红色语义，并且不会撑开弹层。",
    icon: "Trash2",
    type: "danger" as const,
    divided: true,
  },
];

const statusActionMenuItems = [
  { key: "compact", label: "紧凑视图", description: "适合侧栏和高密度表格。", icon: "Rows3", selected: true, meta: "当前" },
  { key: "comfortable", label: "舒适视图", description: "适合信息较多的详情页。", icon: "Maximize2", meta: "L" },
  { key: "syncing", label: "同步中", description: "异步动作执行期间保持可见但不可点击。", icon: "RefreshCw", loading: true, meta: "保存" },
  { key: "readonly", label: "只读模式", description: "权限不足时禁用入口。", icon: "Lock", disabled: true },
];

const openActionMenuViaRef = () => {
  actionMenuMethodText.value = "通过 open() 打开菜单";
  instanceActionMenuRef.value?.open();
};

const readActionMenuElement = () => {
  actionMenuMethodText.value = instanceActionMenuRef.value?.getElement()
    ? "已读取菜单触发根节点"
    : "菜单触发根节点尚未挂载";
};

const closeActionMenuViaRef = () => {
  actionMenuMethodText.value = "通过 close() 关闭菜单";
  instanceActionMenuRef.value?.close();
};
</script>

<template>
  <section class="detail-stack">
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
            <BaseActionMenu :actions="verboseActionMenuItems" label="换行菜单" wrap-text :min-width="240" :max-width="280" />
            <BaseActionMenu :actions="actionMenuItems" label="菜单 A" />
            <BaseActionMenu :actions="actionMenuItems" label="菜单 B" align="left" />
            <BaseActionMenu :actions="actionMenuItems" icon="SlidersHorizontal" aria-label="更多设置" />
          </div>
        </BasePanel>

        <BasePanel title="状态菜单" subtitle="支持当前项、元信息和加载中的异步动作。">
          <div class="action-menu-instance">
            <div class="action-row">
              <BaseActionMenu
                ref="instanceActionMenuRef"
                data-native-action-menu-ref="base-action-menu-instance"
                :actions="statusActionMenuItems"
                label="视图状态"
                align="left"
                @select="triggerToast(`状态菜单：${$event.label}`, 'info')"
              />
              <BaseActionMenu :actions="statusActionMenuItems" icon="ListChecks" aria-label="状态更多操作" />
              <BaseActionMenu
                :actions="statusActionMenuItems"
                label="悬停菜单"
                trigger="hover"
                :show-arrow="true"
                popper-class="action-menu-demo-popper"
              />
            </div>
            <div class="action-menu-instance__footer">
              <BaseBadge type="neutral" variant="outline">{{ actionMenuMethodText }}</BaseBadge>
              <div class="action-row">
                <BaseButton type="neutral" size="sm" outline @click="openActionMenuViaRef">实例打开</BaseButton>
                <BaseButton type="neutral" size="sm" outline @click="readActionMenuElement">读取 DOM</BaseButton>
                <BaseButton type="neutral" size="sm" outline @click="closeActionMenuViaRef">实例关闭</BaseButton>
              </div>
            </div>
          </div>
        </BasePanel>

        <BasePanel title="裁切容器" subtitle="弹层会脱离局部 overflow 容器，适合表格、卡片和侧栏内更多操作。">
          <div class="action-clip-demo">
            <div class="action-clip-demo__bar">
              <BaseBadge type="primary" variant="outline">overflow hidden</BaseBadge>
              <BaseActionMenu :actions="actionMenuItems" label="裁切容器" placement="auto" />
            </div>
            <BaseAlert type="info" title="保持打开" description="closeOnSelect=false 可用于连续执行多个弱操作。" compact />
            <BaseActionMenu
              :actions="actionMenuItems.slice(0, 3)"
              label="保持打开"
              :close-on-select="false"
              align="left"
              @select="triggerToast(`保持打开：${$event.label}`, 'info')"
            />
            <BaseActionMenu :actions="[]" label="空菜单" empty-text="暂无可用操作" align="left" />
          </div>
        </BasePanel>
      </div>
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

.action-menu-instance {
  @apply flex min-w-0 flex-col gap-3;
}

.action-menu-instance__footer {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950;
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

.action-clip-demo {
  @apply max-h-32 overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950;
}

.action-clip-demo__bar {
  @apply mb-3 flex min-w-0 items-center justify-between gap-3;
}

:global(.action-menu-demo-popper .el-dropdown-menu) {
  min-width: 210px;
}
</style>
