<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const listItems = ref([
  { id: "filter", title: "BaseFilterBar", description: "列表页筛选、搜索和动作入口。", status: "已接入", type: "success" as const, icon: "ListFilter", meta: "Data" },
  { id: "panels", title: "BaseResizablePanels", description: "可拖拽拉伸的布局容器。", status: "优化中", type: "warning" as const, icon: "PanelLeftRight", meta: "Layout" },
  { id: "list", title: "BaseList", description: "动态行、任务队列和轻量结果。", status: "完善中", type: "primary" as const, icon: "List", meta: "Nav" },
]);

const activeSimpleListKey = ref("filter");
const activeRowListKey = ref("list");

interface SimpleListItem {
  id: string;
  title: string;
  disabled?: boolean;
}

interface RowListItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge: string;
  type: "primary" | "success" | "warning";
  meta: string;
  disabled?: boolean;
}

const simpleListItems: SimpleListItem[] = [
  { id: "filter", title: "筛选条" },
  { id: "detail", title: "详情卡片" },
  { id: "table", title: "数据表格" },
  { id: "toolbar", title: "列表工具栏", disabled: true },
];

const simpleMetaListItems = [
  { id: "catalog", title: "组件目录", meta: "10" },
  { id: "form", title: "表单输入", meta: "8" },
  { id: "layout", title: "布局容器", meta: "7" },
  { id: "feedback", title: "反馈浮层", meta: "4" },
];

const rowListItems: RowListItem[] = [
  { id: "queue", title: "任务队列", description: "排队、执行中和失败重试的状态列表。", icon: "ListChecks", badge: "运行中", type: "primary" as const, meta: "12 项" },
  { id: "audit", title: "审计记录", description: "按时间记录关键操作，可点击进入详情。", icon: "History", badge: "已归档", type: "success" as const, meta: "48 条" },
  { id: "blocked", title: "权限受限", description: "禁用行仍保留信息密度，但不会触发点击。", icon: "Lock", badge: "禁用", type: "warning" as const, meta: "Admin", disabled: true },
];
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="动态列表" subtitle="展示自定义行内容、状态标签、行内动作和 transition-group 动效。" icon="List">
      <BasePanel title="增强默认列表" subtitle="默认渲染即可覆盖图标、说明、徽标、meta、选中和禁用态。">
        <BaseList
          data-testid="enhanced-base-list"
          :items="rowListItems"
          variant="row"
          surface="muted"
          divided
          clickable
          :active-key="activeRowListKey"
          aria-label="增强默认列表"
          @item-click="(item: RowListItem) => (activeRowListKey = item.id)"
        >
          <template #actions="{ item }">
            <BaseButton type="neutral" size="sm" @click="triggerToast(`行内动作：${item.title}`, 'success')">操作</BaseButton>
          </template>
        </BaseList>
        <template #footer>
          <span class="navigation-result">当前行：{{ activeRowListKey }}</span>
        </template>
      </BasePanel>

      <div class="demo-grid">
        <BasePanel title="卡片列表" subtitle="适合任务队列、结果列表和带动作的行内容。">
          <BaseList :items="listItems" size="lg" clickable :active-key="activeRowListKey" @item-click="(item: RowListItem) => (activeRowListKey = item.id)">
            <template #default="{ item }">
              <div class="flex min-w-0 items-center gap-3">
                <span class="list-demo-icon">
                  <BaseIcon :name="item.icon" size="16" aria-hidden="true" />
                </span>
                <div class="min-w-0">
                  <strong class="block truncate text-xs font-black text-slate-800 dark:text-slate-100">{{ item.title }}</strong>
                  <span class="mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500">{{ item.description }}</span>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <span class="hidden text-[10px] font-black text-slate-400 sm:inline">{{ item.meta }}</span>
                <BaseBadge :type="item.type">{{ item.status }}</BaseBadge>
                <BaseActionMenu :actions="[{ key: 'preview', label: '预览', icon: 'Eye' }, { key: 'copy', label: '复制', icon: 'Copy' }]" />
              </div>
            </template>
          </BaseList>
        </BasePanel>

        <BasePanel title="轻量单行" subtitle="适合目录、分类列表和只需要中文标题的导航项。">
          <BaseList
            :items="simpleListItems"
            variant="plain"
            size="sm"
            simple
            :bordered="false"
            :active-key="activeSimpleListKey"
            clickable
            @item-click="(item: SimpleListItem) => (activeSimpleListKey = item.id)"
          />
        </BasePanel>

        <BasePanel title="单行带计数" subtitle="标题和右侧 meta 固定在同一行，适合侧栏分类和轻量统计。">
          <BaseList
            :items="simpleMetaListItems"
            variant="plain"
            size="xs"
            surface="transparent"
            simple
            :bordered="false"
            clickable
            active-key="form"
            aria-label="单行带计数列表"
          />
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="空态列表" subtitle="没有数据时使用内置空态行，适合筛选结果和权限列表。">
          <BaseList :items="[]" variant="row" surface="transparent" empty-text="暂无匹配组件" aria-label="空态列表" />
        </BasePanel>

        <BasePanel title="紧凑行" subtitle="xs 尺寸、透明表面适合侧栏和浮层中的短列表。">
          <BaseList
            :items="rowListItems"
            variant="plain"
            size="xs"
            surface="transparent"
            :bordered="false"
            clickable
            :active-key="activeRowListKey"
            @item-click="(item: RowListItem) => (activeRowListKey = item.id)"
          >
            <template #default="{ item, active, disabled }">
              <span class="min-w-0 truncate text-xs font-black" :class="active ? 'text-primary' : 'text-slate-700 dark:text-slate-200'">{{ item.title }}</span>
              <span class="ml-auto flex shrink-0 items-center gap-2">
                <BaseBadge :type="item.type" size="xs">{{ disabled ? "禁用" : item.meta }}</BaseBadge>
              </span>
            </template>
          </BaseList>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="加载列表" subtitle="异步刷新时使用 loading 锁定行交互，并展示轻量状态行。">
          <BaseList
            :items="rowListItems"
            variant="row"
            surface="muted"
            loading
            loading-text="正在加载组件列表"
            aria-label="加载中的动态列表"
          />
        </BasePanel>

        <BasePanel title="整组禁用" subtitle="流程锁定或权限不足时禁用所有行，但保留当前内容可读。">
          <BaseList
            :items="rowListItems"
            variant="row"
            surface="transparent"
            disabled
            clickable
            active-key="queue"
            aria-label="禁用动态列表"
          />
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

.navigation-result {
  @apply text-xs font-black text-slate-500 dark:text-slate-400;
}

.list-demo-icon {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-primary dark:bg-slate-800;
}
</style>
