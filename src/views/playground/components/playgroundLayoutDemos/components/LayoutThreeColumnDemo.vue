<script setup lang="ts">
import { ref } from "vue";
import { roundTo } from "../../../../../utils";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const threeColumnSummary = ref("220px / 280px");
const compactThreeColumnSummary = ref("120px / 140px");
const leftSidebarCollapsed = ref(false);
const rightSidebarCollapsed = ref(false);
const compactLeftSidebarCollapsed = ref(true);
const compactRightSidebarCollapsed = ref(false);

const handleThreeColumnResize = (payload: { leftWidth: number; rightWidth: number }) => {
  threeColumnSummary.value = `${roundTo(payload.leftWidth)}px / ${roundTo(payload.rightWidth)}px`;
};

const handleCompactThreeColumnResize = (payload: { leftWidth: number; rightWidth: number }) => {
  compactThreeColumnSummary.value = `${roundTo(payload.leftWidth)}px / ${roundTo(payload.rightWidth)}px`;
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="三栏布局" subtitle="左右侧栏可拖拽、可收缩，展开入口贴边 hover 显示。" icon="PanelsLeftRight">
      <div class="three-column-demo-stack">
        <div class="three-column-demo-block three-column-demo-block--primary">
          <BaseSectionHeader title="标准三栏工作台" description="拖拽、键盘步进、左右收缩和贴边 hover 展开入口。" icon="PanelsLeftRight" compact>
            <template #actions>
              <BaseBadge type="primary" variant="outline">{{ threeColumnSummary }}</BaseBadge>
            </template>
          </BaseSectionHeader>
          <div class="three-column-demo">
            <BaseThreeColumnLayout
              v-model:left-collapsed="leftSidebarCollapsed"
              v-model:right-collapsed="rightSidebarCollapsed"
              aria-label="标准三栏布局示例"
              main-label="主工作区"
              size="lg"
              :left-width="180"
              :right-width="220"
              :min-left-width="140"
              :max-left-width="260"
              :min-right-width="160"
              :max-right-width="300"
              left-label="资源栏"
              right-label="属性栏"
              left-collapse-label="收缩资源栏"
              right-collapse-label="收缩属性栏"
              left-expand-label="展开资源栏"
              right-expand-label="展开属性栏"
              @resize="handleThreeColumnResize"
              @collapse="triggerToast('侧栏已收缩', 'info')"
              @expand="triggerToast('侧栏已展开', 'info')"
            >
              <template #left>
                <div class="three-column-pane three-column-pane--side">
                  <BaseSectionHeader title="资源栏" description="目录、筛选和工作集入口。" icon="FolderTree" compact />
                  <BaseList
                    class="mt-3"
                    :items="[
                      { id: 'all', title: '全部组件', meta: '48' },
                      { id: 'layout', title: '布局容器', meta: '7' },
                      { id: 'form', title: '表单输入', meta: '8' },
                      { id: 'data', title: '数据展示', meta: '6' },
                    ]"
                    variant="plain"
                  >
                    <template #default="{ item }">
                      <span class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ item.title }}</span>
                      <BaseBadge type="neutral" size="sm">{{ item.meta }}</BaseBadge>
                    </template>
                  </BaseList>
                </div>
              </template>

              <div class="three-column-pane three-column-pane--main">
                <BaseSectionHeader title="主工作区" description="中间区域随左右栏状态自动伸缩。" icon="PanelTop" compact />
                <div class="three-column-workspace">
                  <BaseInfoCard title="概览面板" description="适合资源详情、配置编辑和复杂工作台页面。" icon="LayoutTemplate" />
                  <BaseDescriptionList
                    :items="[
                      { key: 'left', label: '左侧栏', value: leftSidebarCollapsed ? '已收缩' : '可拖拽', status: leftSidebarCollapsed ? 'warning' : 'success' },
                      { key: 'right', label: '右侧栏', value: rightSidebarCollapsed ? '已收缩' : '可拖拽', status: rightSidebarCollapsed ? 'warning' : 'success' },
                      { key: 'range', label: '宽度限制', value: '左 140-260px / 右 160-300px' },
                    ]"
                    compact
                  />
                </div>
              </div>

              <template #right>
                <div class="three-column-pane three-column-pane--side">
                  <BaseSectionHeader title="属性栏" description="放置状态、配置和上下文操作。" icon="SlidersHorizontal" compact />
                  <BaseFieldGroup class="mt-3" compact title="布局状态" icon="PanelRight">
                    <BaseStatusDot
                      :type="leftSidebarCollapsed || rightSidebarCollapsed ? 'warning' : 'success'"
                      label="侧栏状态"
                      :description="leftSidebarCollapsed || rightSidebarCollapsed ? '存在收缩栏' : '全部展开'"
                    />
                  </BaseFieldGroup>
                  <BaseToolbar class="mt-3" compact>
                    <template #left>
                      <BaseButton type="neutral" size="sm" @click="leftSidebarCollapsed = !leftSidebarCollapsed">
                        左栏
                      </BaseButton>
                      <BaseButton type="neutral" size="sm" @click="rightSidebarCollapsed = !rightSidebarCollapsed">
                        右栏
                      </BaseButton>
                    </template>
                  </BaseToolbar>
                </div>
              </template>
            </BaseThreeColumnLayout>
          </div>
        </div>

        <div class="three-column-demo-grid">
          <div class="three-column-demo-block">
            <BaseSectionHeader title="初始收缩" description="左侧栏默认收起，展开按钮贴边 hover 后显示。" icon="PanelLeftOpen" compact>
              <template #actions>
                <BaseBadge type="neutral" variant="outline">{{ compactThreeColumnSummary }}</BaseBadge>
              </template>
            </BaseSectionHeader>
            <div class="three-column-demo three-column-demo--compact">
              <BaseThreeColumnLayout
                v-model:left-collapsed="compactLeftSidebarCollapsed"
                v-model:right-collapsed="compactRightSidebarCollapsed"
                aria-label="初始收缩三栏布局示例"
                main-label="编辑区"
                size="sm"
                surface="plain"
                :bordered="false"
                :left-width="120"
                :right-width="140"
                :min-left-width="96"
                :max-left-width="180"
                :min-right-width="110"
                :max-right-width="200"
                left-label="导航"
                right-label="设置"
                @resize="handleCompactThreeColumnResize"
              >
                <template #left>
                  <div class="three-column-pane three-column-pane--plain">
                    <BaseSectionHeader title="导航" description="默认收起。" icon="ListTree" compact />
                  </div>
                </template>
                <div class="three-column-pane three-column-pane--main three-column-pane--plain">
                  <BaseSectionHeader title="编辑区" description="Plain 表面适合嵌入已有容器。" icon="PanelTop" compact />
                  <div class="pane-note">左侧贴边区域 hover 后展示展开入口。</div>
                </div>
                <template #right>
                  <div class="three-column-pane three-column-pane--plain">
                    <BaseSectionHeader title="设置" description="右侧仍可拖拽。" icon="SlidersHorizontal" compact />
                  </div>
                </template>
              </BaseThreeColumnLayout>
            </div>
          </div>

          <div class="three-column-demo-block">
            <BaseSectionHeader title="禁用态" description="权限不足或流程锁定时保留结构和宽度状态。" icon="Lock" compact />
            <div class="three-column-demo three-column-demo--compact">
              <BaseThreeColumnLayout
                aria-label="禁用三栏布局示例"
                main-label="只读区"
                size="sm"
                surface="muted"
                disabled
                :left-width="112"
                :right-width="128"
                :min-left-width="96"
                :max-left-width="160"
                :min-right-width="110"
                :max-right-width="180"
                left-label="只读导航"
                right-label="只读属性"
              >
                <template #left>
                  <div class="three-column-pane three-column-pane--side">
                    <BaseSectionHeader title="只读导航" description="禁用拖拽。" icon="Lock" compact />
                  </div>
                </template>
                <div class="three-column-pane three-column-pane--main">
                  <BaseSectionHeader title="只读区" description="分割线保留但不可操作。" icon="PanelTop" compact />
                  <BaseStatusDot type="warning" label="已锁定" description="等待权限开放" />
                </div>
                <template #right>
                  <div class="three-column-pane three-column-pane--side">
                    <BaseSectionHeader title="只读属性" description="禁用收缩。" icon="SlidersHorizontal" compact />
                  </div>
                </template>
              </BaseThreeColumnLayout>
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

.three-column-demo {
  @apply h-[440px] min-h-0;
}

.three-column-demo--compact {
  @apply h-[320px];
}

.three-column-demo-stack {
  @apply grid gap-4;
}

.three-column-demo-grid {
  @apply grid gap-4 xl:grid-cols-2;
}

.three-column-demo-block {
  @apply min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.three-column-demo-block--primary {
  @apply bg-slate-50/70 dark:bg-slate-950/40;
}

.three-column-pane {
  @apply flex h-full min-h-0 flex-col overflow-auto p-4;
}

.three-column-pane--side {
  @apply bg-white dark:bg-slate-900;
}

.three-column-pane--plain {
  @apply bg-white/90 dark:bg-slate-900/80;
}

.three-column-pane--main {
  @apply gap-4 bg-slate-50 dark:bg-slate-950;
}

.three-column-workspace {
  @apply grid gap-3;
}

.pane-note {
  @apply rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-bold leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400;
  overflow-wrap: anywhere;
}
</style>
