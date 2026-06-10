<script setup lang="ts">
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const pageShellBreadcrumbs = [
  { key: "workspace", label: "工作台", icon: "LayoutDashboard" },
  { key: "components", label: "组件库", icon: "Boxes" },
  { key: "page-shell", label: "页面外壳" },
];
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="页面外壳" subtitle="把页面头、工具条、主内容、侧栏和底部操作收成稳定结构。" icon="LayoutDashboard">
      <BasePageShell
        title="组件工作区"
        description="适合列表页、配置页 and 资源管理页的顶层页面骨架。"
        icon="Boxes"
        :breadcrumbs="pageShellBreadcrumbs"
        aside-width="260px"
        size="lg"
        :header-level="2"
        header-wrap-title
        backable
        @back="triggerToast('页面外壳返回', 'info')"
      >
        <template #meta>
          <BaseBadge type="primary">页面级容器</BaseBadge>
          <BaseStatusDot type="success" label="已同步" description="刚刚" />
        </template>
        <template #actions>
          <BaseButton type="neutral" size="sm">预览</BaseButton>
          <BaseButton type="primary" size="sm">保存</BaseButton>
        </template>
        <template #toolbar>
          <BaseFilterBar compact title="工作区筛选" description="工具条区域可放筛选、搜索和批量入口。" :filters="[]" :count="24" />
        </template>
        <BaseDataState state="ready" title="主内容区" description="内容区域可以承载表格、表单、详情或自定义布局。">
          <BaseDescriptionList
            :items="[
              { key: 'layout', label: '布局', value: '主内容 + 侧栏' },
              { key: 'toolbar', label: '工具栏', value: '已启用', status: 'success' },
              { key: 'footer', label: '底部动作', value: '固定在外壳底部' },
            ]"
            compact
          />
        </BaseDataState>
        <template #aside>
          <BaseSectionHeader title="页面侧栏" description="放页面摘要、快捷动作和局部状态。" icon="PanelRight" compact />
          <BaseDescriptionList
            class="mt-3"
            :items="[
              { key: 'owner', label: '负责人', value: '组件平台' },
              { key: 'status', label: '状态', value: '持续完善', status: 'success' },
            ]"
            compact
          />
        </template>
        <template #footer>
          <BaseFormActions compact title="页面操作" description="页脚区域适合放保存、取消、下一步。">
            <BaseButton type="neutral" size="sm">取消</BaseButton>
            <BaseButton type="primary" size="sm">继续</BaseButton>
          </BaseFormActions>
        </template>
      </BasePageShell>

      <div class="page-shell-demo-grid">
        <BasePageShell
          title="嵌套外壳"
          description="无边框内容区适合放在已有面板内部。"
          icon="PanelTop"
          compact
          size="sm"
          surface="plain"
          header-surface="muted"
          :content-padded="false"
          :header-level="3"
        >
          <BaseFieldGroup compact title="嵌套内容" icon="LayoutTemplate" surface="muted">
            <BaseDescriptionList
              :items="[
                { key: 'surface', label: '内容表面', value: 'plain' },
                { key: 'padding', label: '内边距', value: '由内部组件负责', status: 'success' },
              ]"
              compact
            />
          </BaseFieldGroup>
        </BasePageShell>

        <BasePageShell
          title="加载外壳"
          description="页面切换或提交中锁定内容区。"
          icon="LoaderCircle"
          compact
          size="sm"
          loading
          header-surface="muted"
          :header-level="3"
        >
          <BaseDataState state="loading" title="加载中" description="保持页面结构稳定。" />
        </BasePageShell>

        <BasePageShell
          title="禁用外壳"
          description="只读场景保持页面身份和布局。"
          icon="Lock"
          compact
          size="sm"
          disabled
          surface="muted"
          :header-level="3"
        >
          <BaseFormItem label="配置名称" compact>
            <BaseInput model-value="继承配置" size="sm" />
          </BaseFormItem>
        </BasePageShell>

        <BasePageShell
          title="左侧栏外壳"
          description="侧栏可放在左侧，适合资源树、目录和筛选导航。"
          icon="PanelLeft"
          compact
          size="sm"
          surface="muted"
          header-surface="plain"
          aside-position="left"
          aside-width="180px"
          :header-level="3"
        >
          <template #aside>
            <BaseList
              :items="[
                { id: 'resource', title: '资源目录', meta: '12' },
                { id: 'filter', title: '筛选条件', meta: '5' },
                { id: 'history', title: '最近访问', meta: '8' },
              ]"
              variant="row"
              size="sm"
              surface="transparent"
              divided
            />
          </template>
          <BaseDescriptionList
            :items="[
              { key: 'aside', label: '侧栏位置', value: 'left', status: 'primary' },
              { key: 'width', label: '侧栏宽度', value: '180px' },
            ]"
            compact
          />
        </BasePageShell>

        <div class="page-shell-scroll-demo">
          <BasePageShell
            title="滚动工作区"
            description="内容区可独立滚动，头部和页脚保持稳定。"
            icon="Rows3"
            compact
            content-scrollable
            header-sticky
            toolbar-sticky
            footer-sticky
            :header-level="3"
          >
            <template #toolbar>
              <BaseToolbar compact>
                <template #left>
                  <BaseBadge type="primary" variant="outline">Sticky toolbar</BaseBadge>
                </template>
              </BaseToolbar>
            </template>
            <BaseList
              :items="[
                { id: 'a', title: '字段配置', meta: '8 项' },
                { id: 'b', title: '展示设置', meta: '6 项' },
                { id: 'c', title: '权限策略', meta: '4 项' },
                { id: 'd', title: '审计日志', meta: '12 条' },
                { id: 'e', title: '扩展动作', meta: '5 项' },
              ]"
              variant="plain"
            >
              <template #default="{ item }">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ item.title }}</span>
                <BaseBadge type="neutral" size="sm">{{ item.meta }}</BaseBadge>
              </template>
            </BaseList>
            <template #footer>
              <BaseFormActions compact justify="end">
                <BaseButton type="neutral" size="sm">暂存</BaseButton>
                <BaseButton type="primary" size="sm">保存</BaseButton>
              </BaseFormActions>
            </template>
          </BasePageShell>
        </div>
      </div>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.page-shell-demo-grid {
  @apply grid gap-4 lg:grid-cols-2;
}

.page-shell-scroll-demo {
  @apply h-[300px] min-h-0;
}
</style>
