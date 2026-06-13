<script setup lang="ts">
import { ref } from "vue";
import BaseToolbar from "../../../../../components/common/BaseToolbar.vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const actionMenuItems = [
  { key: "copy", label: "复制名称", description: "写入剪贴板。", icon: "Copy", shortcut: "Ctrl C" },
  { key: "rename", label: "重命名", description: "更新组件显示名。", icon: "Pencil" },
  { key: "disabled", label: "暂不可用", description: "等待权限开放。", icon: "Lock", disabled: true },
  { key: "delete", label: "删除组件", description: "危险操作需要确认。", icon: "Trash2", type: "danger" as const, divided: true },
];

const toolbarInstanceText = ref("等待工具栏操作");
const toolbarInstanceRef = ref<InstanceType<typeof BaseToolbar> | null>(null);

function readToolbarElement() {
  const element = toolbarInstanceRef.value?.getElement();
  toolbarInstanceText.value = element ? `DOM: ${element.tagName.toLowerCase()}.${element.classList[0] || "root"}` : "未读取到 DOM";
}

function focusToolbarFirstItem() {
  const element = toolbarInstanceRef.value?.focusFirstItem();
  toolbarInstanceText.value = element ? `首个控件: ${element.textContent?.trim() || element.tagName.toLowerCase()}` : "未找到可聚焦控件";
}

function focusToolbarLastItem() {
  const element = toolbarInstanceRef.value?.focusLastItem();
  toolbarInstanceText.value = element ? `末尾控件: ${element.textContent?.trim() || element.tagName.toLowerCase()}` : "未找到可聚焦控件";
}
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="工具栏" subtitle="统一页面、表格、编辑器顶部的左中右操作组。" icon="Wrench">
      <BaseToolbar
        ref="toolbarInstanceRef"
        data-native-toolbar-ref="base-toolbar-instance"
        aria-label="组件编辑工具栏"
        size="lg"
        divided
        left-label="上下文"
        main-label="编辑动作"
        right-label="发布动作"
      >
        <template #left>
          <BaseBadge type="primary">组件库</BaseBadge>
          <BaseButton type="neutral" size="sm">返回</BaseButton>
        </template>
        <BaseButton type="neutral" size="sm">
          <template #icon>
            <BaseIcon name="Undo2" size="14" />
          </template>
          撤销
        </BaseButton>
        <BaseButton type="neutral" size="sm">
          <template #icon>
            <BaseIcon name="Redo2" size="14" />
          </template>
          重做
        </BaseButton>
        <template #right>
          <BaseButton type="neutral" size="sm">预览</BaseButton>
          <BaseButton type="primary" size="sm">保存</BaseButton>
        </template>
      </BaseToolbar>
      <BasePanel title="工具栏实例" subtitle="组合组件可以直接控制工具栏的 DOM 与焦点。">
        <div class="toolbar-instance-panel">
          <div class="toolbar-instance-copy">
            <BaseIcon name="Workflow" size="14" aria-hidden="true" />
            <span>{{ toolbarInstanceText }}</span>
          </div>
          <div class="toolbar-instance-actions">
            <BaseButton size="xs" type="secondary" outline @click="readToolbarElement">DOM</BaseButton>
            <BaseButton size="xs" type="secondary" outline @click="focusToolbarFirstItem">首项</BaseButton>
            <BaseButton size="xs" type="secondary" outline @click="focusToolbarLastItem">末项</BaseButton>
          </div>
        </div>
      </BasePanel>

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

        <BasePanel title="图标工具栏" subtitle="图标按钮、分组和侧向工具栏适合编辑器与窄侧栏。">
          <div class="toolbar-orientation-demo">
            <BaseToolbar compact divided aria-label="图标编辑工具栏" left-label="历史操作" main-label="文本操作" right-label="扩展操作">
              <template #left>
                <BaseButton type="ghost" size="sm" circle aria-label="撤销" title="撤销">
                  <template #icon>
                    <BaseIcon name="Undo2" size="14" />
                  </template>
                </BaseButton>
                <BaseButton type="ghost" size="sm" circle aria-label="重做" title="重做">
                  <template #icon>
                    <BaseIcon name="Redo2" size="14" />
                  </template>
                </BaseButton>
              </template>
              <BaseButton type="ghost" size="sm" circle aria-label="加粗" title="加粗">
                <template #icon>
                  <BaseIcon name="Bold" size="14" />
                </template>
              </BaseButton>
              <BaseButton type="ghost" size="sm" circle aria-label="斜体" title="斜体">
                <template #icon>
                  <BaseIcon name="Italic" size="14" />
                </template>
              </BaseButton>
              <BaseButton type="ghost" size="sm" circle aria-label="链接" title="链接">
                <template #icon>
                  <BaseIcon name="Link" size="14" />
                </template>
              </BaseButton>
              <template #right>
                <BaseActionMenu :actions="actionMenuItems" icon="MoreHorizontal" aria-label="编辑器更多操作" />
              </template>
            </BaseToolbar>

            <BaseToolbar orientation="vertical" compact divided surface="muted" aria-label="侧向工具栏">
              <template #left>
                <BaseButton type="ghost" size="sm" circle aria-label="选择" title="选择">
                  <template #icon>
                    <BaseIcon name="MousePointer2" size="14" />
                  </template>
                </BaseButton>
                <BaseButton type="ghost" size="sm" circle aria-label="移动" title="移动">
                  <template #icon>
                    <BaseIcon name="Move" size="14" />
                  </template>
                </BaseButton>
              </template>
              <BaseButton type="ghost" size="sm" circle aria-label="缩放" title="缩放">
                <template #icon>
                  <BaseIcon name="ScanSearch" size="14" />
                </template>
              </BaseButton>
              <template #right>
                <BaseButton type="ghost" size="sm" circle aria-label="吸附" title="吸附">
                  <template #icon>
                    <BaseIcon name="Magnet" size="14" />
                  </template>
                </BaseButton>
              </template>
            </BaseToolbar>
          </div>
        </BasePanel>

        <BasePanel title="吸顶工具栏" subtitle="列表或长表单滚动时可保持操作入口稳定。">
          <div class="toolbar-scroll-demo">
            <BaseToolbar sticky :sticky-offset="6" surface="muted" compact aria-label="吸顶工具栏">
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

        <BasePanel title="长内容与空态" subtitle="长上下文不撑破容器；无动作时有明确兜底。">
          <div class="toolbar-demo-stack">
            <BaseToolbar surface="muted" aria-label="长上下文工具栏" left-label="资源上下文" right-label="扩展动作">
              <template #left>
                <BaseBadge class="toolbar-long-badge" type="primary" variant="outline">
                  workspace://components/action/BaseToolbar/very-long-resource-name
                </BaseBadge>
              </template>
              <BaseButton type="neutral" size="sm">同步跨工作区配置</BaseButton>
              <template #right>
                <BaseActionMenu :actions="actionMenuItems" />
              </template>
            </BaseToolbar>
            <BaseToolbar aria-label="空工具栏" surface="plain" empty-text="暂无可用动作" empty-icon="Inbox" />
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
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}

.toolbar-scroll-demo {
  @apply h-48 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950;
}

.toolbar-demo-stack {
  @apply grid min-w-0 gap-3;
}

.toolbar-orientation-demo {
  @apply grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3;
}

.toolbar-long-badge {
  @apply max-w-full;
}

.toolbar-instance-panel {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.toolbar-instance-copy {
  @apply flex min-w-0 items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.toolbar-instance-copy span {
  @apply min-w-0 truncate;
}

.toolbar-instance-actions {
  @apply flex shrink-0 flex-wrap items-center gap-2;
}
</style>
