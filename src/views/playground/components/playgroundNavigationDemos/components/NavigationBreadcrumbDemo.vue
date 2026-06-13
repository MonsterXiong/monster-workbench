<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const selectedBreadcrumbKey = ref("detail");
const breadcrumbExpandEvent = ref("等待展开");
const breadcrumbInstanceText = ref("等待实例操作");
const breadcrumbInstanceRef = ref<{
  getNativeBreadcrumb: () => unknown;
  getElement: () => HTMLElement | null;
  focusFirstItem: () => HTMLElement | null;
  focusCurrentItem: () => HTMLElement | null;
} | null>(null);

const breadcrumbItems = [
  { key: "workspace", label: "工作台", icon: "LayoutDashboard" },
  { key: "components", label: "组件库", icon: "Boxes" },
  { key: "navigation", label: "导航组织", badge: "5", badgeType: "primary" as const },
  { key: "detail", label: "面包屑" },
];

const longBreadcrumbItems = [
  { key: "home", label: "Monster Workbench", icon: "Home" },
  { key: "workspace", label: "工作台" },
  { key: "project", label: "组件平台" },
  { key: "library", label: "公共组件库" },
  { key: "navigation", label: "导航组织" },
  { key: "breadcrumb", label: "BaseBreadcrumb" },
];

const stateBreadcrumbItems = [
  { key: "settings", label: "系统设置", icon: "Settings" },
  { key: "permission", label: "权限中心", disabled: true, badge: "只读", badgeType: "warning" as const },
  { key: "audit", label: "审计规则" },
];

const guardedBreadcrumbItems = [
  { key: "security", label: "安全中心", icon: "ShieldCheck", href: "#/settings/security", disabled: true, badge: "禁用", badgeType: "warning" as const },
  { key: "policy", label: "策略模板", href: "#/settings/policy" },
  { key: "review", label: "审批详情", href: "#/settings/review", badge: "当前", badgeType: "success" as const },
];

const nowrapBreadcrumbItems = [
  { key: "workspace", label: "工作台", icon: "LayoutDashboard" },
  { key: "tenant", label: "华东区域生产环境多租户资源编排中心" },
  { key: "pipeline", label: "自动化发布流水线与审批策略" },
  { key: "detail", label: "版本回滚任务详情" },
];

const handleBreadcrumbSelect = (item: { key: string; label: string }) => {
  selectedBreadcrumbKey.value = item.key;
  triggerToast(`选择面包屑：${item.label}`, "info");
};

const handleBreadcrumbExpand = (count: number) => {
  breadcrumbExpandEvent.value = `展开 ${count} 级路径`;
};

const readBreadcrumbElement = () => {
  const element = breadcrumbInstanceRef.value?.getElement();
  breadcrumbInstanceText.value = element ? `DOM: ${element.tagName.toLowerCase()}.${element.classList[0] || "root"}` : "未读取到 DOM";
};

const focusBreadcrumbFirstItem = () => {
  const element = breadcrumbInstanceRef.value?.focusFirstItem();
  breadcrumbInstanceText.value = element ? `聚焦: ${element.textContent?.trim() || element.tagName.toLowerCase()}` : "未找到可聚焦项";
};

const focusBreadcrumbCurrentItem = () => {
  const element = breadcrumbInstanceRef.value?.focusCurrentItem();
  breadcrumbInstanceText.value = element ? `当前项: ${element.textContent?.trim() || "-"}` : "未找到当前项";
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="面包屑" subtitle="展示层级路径、返回入口、折叠路径、禁用项和当前项交互。" icon="Route">
      <BasePanel title="标准路径" subtitle="保留旧 API：只传 items 就能获得可点击层级导航。">
        <div class="breadcrumb-demo-stack">
          <BaseBreadcrumb
            ref="breadcrumbInstanceRef"
            data-native-breadcrumb-ref="base-breadcrumb-instance"
            :items="breadcrumbItems"
            @select="handleBreadcrumbSelect"
          />
          <div class="breadcrumb-instance-panel">
            <div class="breadcrumb-instance-copy">
              <BaseIcon name="Workflow" size="14" aria-hidden="true" />
              <span>实例能力</span>
              <strong>{{ breadcrumbInstanceText }}</strong>
            </div>
            <div class="breadcrumb-instance-actions">
              <BaseButton size="xs" type="secondary" outline @click="readBreadcrumbElement">读取 DOM</BaseButton>
              <BaseButton size="xs" type="secondary" outline @click="focusBreadcrumbFirstItem">聚焦首项</BaseButton>
              <BaseButton size="xs" type="secondary" outline @click="focusBreadcrumbCurrentItem">聚焦当前项</BaseButton>
            </div>
          </div>
        </div>
        <template #footer>
          <span class="navigation-result">最近选择：{{ selectedBreadcrumbKey }}</span>
        </template>
      </BasePanel>

      <div class="demo-grid">
        <BasePanel title="长路径折叠" subtitle="maxItems 会折叠中间层级，适合深层资源详情。">
          <BaseBreadcrumb
            :items="longBreadcrumbItems"
            surface="muted"
            separator="slash"
            :max-items="4"
            aria-label="长路径面包屑"
            @select="handleBreadcrumbSelect"
            @expand="handleBreadcrumbExpand"
          />
          <template #footer>
            <span class="navigation-result">{{ breadcrumbExpandEvent }}</span>
          </template>
        </BasePanel>

        <BasePanel title="返回入口" subtitle="返回按钮会优先选择上一级，也可以单独监听 back 事件。">
          <BaseBreadcrumb
            :items="breadcrumbItems"
            surface="card"
            size="lg"
            show-back
            current-clickable
            aria-label="带返回入口面包屑"
            @select="handleBreadcrumbSelect"
            @back="triggerToast('触发返回入口', 'info')"
          />
        </BasePanel>

        <BasePanel title="折叠菜单" subtitle="折叠项可用下拉菜单承载隐藏层级，避免深路径展开后挤占空间。">
          <BaseBreadcrumb
            :items="longBreadcrumbItems"
            surface="card"
            :max-items="4"
            ellipsis-mode="dropdown"
            aria-label="折叠菜单面包屑"
            @select="handleBreadcrumbSelect"
            @expand="handleBreadcrumbExpand"
          />
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="紧凑只读" subtitle="适合表格详情、弹窗顶部和窄栏区域。">
          <BaseBreadcrumb :items="stateBreadcrumbItems" size="sm" surface="plain" :wrap="false" />
        </BasePanel>

        <BasePanel title="链接拦截" subtitle="禁用项和不可点击当前项会保留 href 信息，但不会触发默认跳转。">
          <BaseBreadcrumb :items="guardedBreadcrumbItems" surface="card" aria-label="链接拦截面包屑" @select="handleBreadcrumbSelect" />
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="窄容器不换行" subtitle="wrap=false 会在组件内部横向滚动，避免撑破页面。">
          <BaseBreadcrumb :items="nowrapBreadcrumbItems" surface="muted" :wrap="false" aria-label="不换行长路径面包屑" />
        </BasePanel>

        <BasePanel title="自定义项内容" subtitle="通过 item 插槽接入业务状态或更强的视觉提示。">
          <BaseBreadcrumb :items="breadcrumbItems" surface="muted" aria-label="自定义面包屑">
            <template #item="{ item, current }">
              <BaseIcon v-if="item.icon" :name="item.icon" size="14" aria-hidden="true" />
              <span>{{ item.label }}</span>
              <BaseBadge v-if="current" type="success" size="xs">当前</BaseBadge>
            </template>
          </BaseBreadcrumb>
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

.breadcrumb-demo-stack {
  @apply grid min-w-0 gap-3;
}

.breadcrumb-instance-panel {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.breadcrumb-instance-copy {
  @apply flex min-w-0 items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.breadcrumb-instance-copy strong {
  @apply min-w-0 truncate text-slate-800 dark:text-slate-100;
}

.breadcrumb-instance-actions {
  @apply flex shrink-0 flex-wrap items-center gap-2;
}

.navigation-result {
  @apply text-xs font-black text-slate-500 dark:text-slate-400;
}
</style>
