<script setup lang="ts">
import { ref } from "vue";
import { joinBy, roundTo } from "../../../../../utils";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const panelSummary = ref("28% / 72%");
const verticalPanelSummary = ref("58% / 42%");
const plainPanelSummary = ref("34% / 33% / 33%");

type PanelResizePayload = { panes: Array<{ size: number }> };

const formatPanelSummary = (payload: PanelResizePayload) => joinBy(payload.panes, (pane) => `${roundTo(pane.size)}%`, " / ");

const handlePanelResized = (payload: PanelResizePayload) => {
  panelSummary.value = formatPanelSummary(payload);
};

const handleVerticalPanelResized = (payload: PanelResizePayload) => {
  verticalPanelSummary.value = formatPanelSummary(payload);
};

const handlePlainPanelResized = (payload: PanelResizePayload) => {
  plainPanelSummary.value = formatPanelSummary(payload);
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="拖拽面板" subtitle="横向布局、最小最大尺寸和拖拽反馈。" icon="PanelsLeftRight">
      <div class="resizable-demo-stack">
        <div class="resizable-demo-block resizable-demo-block--primary">
          <BaseSectionHeader title="横向工作台" description="常见资源树 + 主工作区，pane 级最小/最大值限制。" icon="PanelsLeftRight" compact>
            <template #actions>
              <BaseBadge type="primary" variant="outline">{{ panelSummary }}</BaseBadge>
            </template>
          </BaseSectionHeader>
          <div class="resizable-demo">
            <BaseResizablePanels
              aria-label="横向拖拽面板示例"
              :panes="[
                { key: 'nav', size: 28, minSize: 18, maxSize: 40, label: '资源导航' },
                { key: 'work', size: 72, minSize: 44, maxSize: 82, label: '主工作区' },
              ]"
              @resize="handlePanelResized"
              @resized="handlePanelResized"
            >
              <template #nav>
                <div class="pane-body pane-body--side">
                  <BaseSectionHeader title="资源导航" description="最小 18%，最大 40%。" icon="FolderTree" compact />
                  <BaseList :items="[{ id: 'a', title: '组件库' }, { id: 'b', title: '布局模板' }, { id: 'c', title: '交互状态' }]">
                    <template #default="{ item }">
                      <span class="text-xs font-black text-slate-700 dark:text-slate-200">{{ item.title }}</span>
                      <BaseIcon name="ChevronRight" size="14" class="text-slate-400" />
                    </template>
                  </BaseList>
                </div>
              </template>
              <template #work>
                <div class="pane-body">
                  <BaseSectionHeader title="主工作区" description="拖拽手柄 hover 高亮，中间加粗。" icon="PanelRight" compact />
                  <BaseDescriptionList
                    :items="[
                      { key: 'summary', label: '状态输出', value: panelSummary, status: 'primary' },
                      { key: 'minmax', label: '限制', value: 'pane 级 minSize / maxSize' },
                      { key: 'keyboard', label: '键盘', value: '方向键每次 4%' },
                    ]"
                    compact
                  />
                </div>
              </template>
            </BaseResizablePanels>
          </div>
        </div>

        <div class="resizable-demo-grid">
          <div class="resizable-demo-block">
            <BaseSectionHeader title="纵向堆叠" description="适合预览区、日志区、底部检查器等上下分区。" icon="Rows3" compact>
              <template #actions>
                <BaseBadge type="neutral" variant="outline">{{ verticalPanelSummary }}</BaseBadge>
              </template>
            </BaseSectionHeader>
            <div class="resizable-demo resizable-demo--compact">
              <BaseResizablePanels
                direction="vertical"
                size="sm"
                surface="muted"
                aria-label="纵向拖拽面板示例"
                :keyboard-step="3"
                :panes="[
                  { key: 'preview', size: 58, minSize: 36, maxSize: 72, label: '预览区' },
                  { key: 'logs', size: 42, minSize: 24, maxSize: 64, label: '日志区' },
                ]"
                @resize="handleVerticalPanelResized"
                @resized="handleVerticalPanelResized"
              >
                <template #preview>
                  <div class="pane-body">
                    <BaseSectionHeader title="预览区" description="上下拖拽改变工作区高度。" icon="Monitor" compact />
                    <BaseInfoCard title="任务预览" description="纵向 splitter 保留水平手柄，hover 时只高亮中间加粗部分。" icon="PanelTop" />
                  </div>
                </template>
                <template #logs>
                  <div class="pane-body pane-body--side">
                    <BaseSectionHeader title="日志区" description="最小 24%，最大 64%。" icon="FileText" compact />
                    <BaseDescriptionList
                      :items="[
                        { key: 'resize', label: 'resize', value: verticalPanelSummary, status: 'primary' },
                        { key: 'step', label: 'keyboardStep', value: '3%' },
                      ]"
                      compact
                      surface="muted"
                    />
                  </div>
                </template>
              </BaseResizablePanels>
            </div>
          </div>

          <div class="resizable-demo-block">
            <BaseSectionHeader title="无框三栏" description="外层背景由页面决定，组件仅提供透明热区和中心手柄。" icon="PanelTop" compact>
              <template #actions>
                <BaseBadge type="neutral" variant="outline">{{ plainPanelSummary }}</BaseBadge>
              </template>
            </BaseSectionHeader>
            <div class="resizable-demo resizable-demo--compact">
              <BaseResizablePanels
                :framed="false"
                surface="plain"
                size="lg"
                aria-label="无框三栏拖拽面板示例"
                :min-size="18"
                :max-size="64"
                :panes="[
                  { key: 'catalog', size: 34, label: '目录' },
                  { key: 'canvas', size: 33, label: '画布' },
                  { key: 'inspector', size: 33, label: '检查器' },
                ]"
                @resize="handlePlainPanelResized"
                @resized="handlePlainPanelResized"
              >
                <template #catalog>
                  <div class="pane-body pane-body--plain pane-body--side">
                    <BaseSectionHeader title="目录" description="全局 min 18%。" icon="ListTree" compact />
                  </div>
                </template>
                <template #canvas>
                  <div class="pane-body pane-body--plain">
                    <BaseSectionHeader title="画布" description="三栏均复用默认限制。" icon="LayoutTemplate" compact />
                    <div class="pane-note">透明表面适合嵌入已有工作台容器。</div>
                  </div>
                </template>
                <template #inspector>
                  <div class="pane-body pane-body--plain pane-body--side">
                    <BaseSectionHeader title="检查器" description="全局 max 64%。" icon="SlidersHorizontal" compact />
                  </div>
                </template>
              </BaseResizablePanels>
            </div>
          </div>
        </div>
      </div>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.resizable-demo {
  @apply h-[360px] min-h-0;
}

.resizable-demo--compact {
  @apply h-[300px];
}

.resizable-demo-stack {
  @apply grid gap-4;
}

.resizable-demo-grid {
  @apply grid gap-4 xl:grid-cols-2;
}

.resizable-demo-block {
  @apply min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.resizable-demo-block--primary {
  @apply bg-slate-50/70 dark:bg-slate-950/40;
}

.pane-body {
  @apply flex h-full min-h-0 flex-col gap-3 overflow-auto bg-white p-4 dark:bg-slate-900;
}

.pane-body--side {
  @apply bg-slate-50 dark:bg-slate-950;
}

.pane-body--plain {
  @apply bg-white/90 dark:bg-slate-900/80;
}

.pane-note {
  @apply rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-bold leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400;
  overflow-wrap: anywhere;
}
</style>
