<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const activeTab = ref("overview");
const underlineTab = ref("config");
const compactTab = ref("all");
const equalTab = ref("build");
const scrollTab = ref("assets");
const customTab = ref("preview");
const dynamicTab = ref("draft");
const verticalTab = ref("profile");
const nativeEventTab = ref("preview");
const guardLocked = ref(true);
const nextDynamicIndex = ref(3);
const nativeEventText = ref("等待标签事件");

const tabs = [
  { key: "overview", title: "概览", icon: "LayoutDashboard", badge: "New", badgeColor: "bg-primary text-white" },
  { key: "config", title: "配置", icon: "SlidersHorizontal" },
  { key: "activity", title: "动态", icon: "History", badge: "3" },
  { key: "disabled", title: "受限", icon: "Lock", disabled: true },
];

const compactTabs = [
  { key: "all", title: "全部" },
  { key: "ready", title: "可用", badge: "18" },
  { key: "draft", title: "草稿", badge: "6" },
  { key: "locked", title: "锁定", disabled: true },
];

const equalTabs = [
  { key: "build", title: "构建", icon: "Hammer" },
  { key: "preview", title: "预览", icon: "Eye" },
  { key: "release", title: "发布", icon: "Rocket", badge: "2" },
];

const scrollTabs = [
  { key: "assets", title: "资源与素材配置", icon: "PackageOpen" },
  { key: "workflow", title: "自动化流程编排", icon: "Workflow" },
  { key: "permission", title: "成员权限与审批", icon: "ShieldCheck" },
  { key: "audit", title: "审计记录", icon: "History" },
  { key: "archive", title: "归档策略", icon: "Archive" },
  { key: "disabled", title: "受限视图", icon: "Lock", disabled: true },
];

const customTabs = [
  { key: "preview", title: "预览", icon: "Monitor", badge: "Live", badgeColor: "bg-emerald-500 text-white" },
  { key: "schema", title: "结构", icon: "Braces", badge: "JSON" },
  { key: "history", title: "历史", icon: "History" },
];

const nativeEventTabs = [
  { key: "preview", title: "预览", icon: "Monitor", lazy: false },
  { key: "schema", title: "结构", icon: "Braces", lazy: false },
  { key: "history", title: "历史", icon: "History", lazy: false },
];

const dynamicTabs = ref([
  { key: "draft", title: "草稿", icon: "FilePenLine", closable: false },
  { key: "review", title: "评审", icon: "ClipboardCheck", badge: "2", closable: true },
  { key: "release", title: "发布", icon: "Rocket", closable: true },
]);

const verticalTabs = [
  { key: "profile", title: "资料", icon: "UserRound" },
  { key: "rules", title: "规则", icon: "ShieldCheck", badge: "锁定" },
  { key: "logs", title: "日志", icon: "ScrollText" },
];

const addDynamicTab = () => {
  const key = `custom-${nextDynamicIndex.value}`;
  dynamicTabs.value.push({
    key,
    title: `视图 ${nextDynamicIndex.value}`,
    icon: "PanelTop",
    closable: true,
  });
  nextDynamicIndex.value += 1;
  dynamicTab.value = key;
  triggerToast("已新增标签页", "success");
};

const removeDynamicTab = (key: string | number) => {
  dynamicTabs.value = dynamicTabs.value.filter((tab) => tab.key !== key);
  if (dynamicTab.value === key) {
    dynamicTab.value = dynamicTabs.value[0]?.key ?? "";
  }
  triggerToast(`已移除 ${key}`, "info");
};

const handleDynamicEdit = (payload: { key?: string | number; action: "add" | "remove" }) => {
  if (payload.action === "add") {
    addDynamicTab();
    return;
  }
  if (payload.key !== undefined) removeDynamicTab(payload.key);
};

const guardBeforeLeave = (newKey: string | number, oldKey: string | number) => {
  if (guardLocked.value && oldKey === "rules" && newKey !== "rules") {
    triggerToast("规则页正在校验，暂不能离开", "warning");
    return false;
  }
  return true;
};

const handleNativeTabClick = (payload: { key?: string | number; tab?: { title: string } }) => {
  nativeEventText.value = `tab-click：${payload.tab?.title || payload.key || "未知"}`;
};

const handleNativeTabChange = (payload: { key: string | number; tab: { title: string } }) => {
  nativeEventText.value = `tab-change：${payload.tab.title}`;
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="标签页" subtitle="覆盖胶囊、下划线、图标、徽标和禁用状态，适合页面内视图切换。" icon="PanelTop">
      <BasePanel title="胶囊标签" subtitle="适合紧凑工具面板、设置分段和局部视图切换。">
        <BaseTab v-model="activeTab" :tabs="tabs" size="lg" @select="(tab) => triggerToast(`切换到 ${tab.title}`, 'info')" />
        <BaseDataState class="mt-4" state="ready" :title="`当前视图：${activeTab}`" description="切换后业务区保持稳定，只替换当前内容。">
          <BaseDescriptionList
            :items="[
              { key: 'variant', label: '形态', value: 'pills' },
              { key: 'active', label: '当前项', value: activeTab, status: 'primary' },
            ]"
            compact
          />
        </BaseDataState>
      </BasePanel>

      <div class="demo-grid">
        <BasePanel title="下划线标签" subtitle="适合详情页二级导航和内容区顶部分类。">
          <BaseTab v-model="underlineTab" :tabs="tabs" variant="underline" full-width />
        </BasePanel>

        <BasePanel title="紧凑 Plain" subtitle="无背景表面适合嵌入工具栏、卡片页脚和浮层顶部。">
          <BaseTab v-model="compactTab" :tabs="compactTabs" size="sm" surface="plain" />
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="等分填充" subtitle="equal + fullWidth 适合流程分段和三段式工作区。">
          <BaseTab v-model="equalTab" :tabs="equalTabs" surface="muted" full-width equal align="between" />
        </BasePanel>

        <BasePanel title="禁用整组" subtitle="流程锁定时整组禁用，但仍保留当前状态可读。">
          <BaseTab model-value="build" :tabs="equalTabs" disabled full-width equal aria-label="禁用标签页" />
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="长标签滚动" subtitle="内容较多时在组件内部横向滚动，不撑破页面。">
          <BaseTab v-model="scrollTab" :tabs="scrollTabs" size="sm" surface="muted" full-width aria-label="长标签页" />
        </BasePanel>

        <BasePanel title="自定义项内容" subtitle="通过 tab / badge 插槽接入业务标记，同时保留键盘和选中状态。">
          <BaseTab v-model="customTab" :tabs="customTabs" surface="plain" full-width aria-label="自定义标签页">
            <template #tab="{ tab, active }">
              <span class="tab-demo-custom-icon" :class="{ 'is-active': active }">
                <BaseIcon v-if="tab.icon" :name="tab.icon" size="14" aria-hidden="true" />
              </span>
              <span class="min-w-0 truncate">{{ tab.title }}</span>
              <BaseBadge v-if="tab.badge" :type="active ? 'primary' : 'neutral'" size="xs">{{ tab.badge }}</BaseBadge>
            </template>
          </BaseTab>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="动态标签" subtitle="透出 Element Plus editable / closable / addable 能力，适合多视图工作区。">
          <BaseTab
            v-model="dynamicTab"
            :tabs="dynamicTabs"
            type="card"
            editable
            surface="plain"
            full-width
            aria-label="动态标签页"
            @edit="handleDynamicEdit"
          />
          <BaseDataState class="mt-4" state="ready" :title="`当前动态页：${dynamicTab || '无'}`" description="新增和关闭事件由 BaseTab 统一转交业务侧，组件不直接持久化视图。">
            <BaseDescriptionList
              :items="[
                { key: 'count', label: '标签数量', value: `${dynamicTabs.length}`, status: 'primary' },
                { key: 'mode', label: 'Element Plus', value: 'editable / closable' },
              ]"
              compact
            />
          </BaseDataState>
        </BasePanel>

        <BasePanel title="原生事件" subtitle="tab-click / tab-change 事件透出给业务侧，仍保留 BaseTab 的统一样式。">
          <BaseTab
            v-model="nativeEventTab"
            :tabs="nativeEventTabs"
            surface="muted"
            full-width
            :lazy="false"
            :tabindex="0"
            aria-label="原生事件标签页"
            @tab-click="handleNativeTabClick"
            @tab-change="handleNativeTabChange"
          />
          <BaseDataState class="mt-4" state="ready" title="事件输出" :description="nativeEventText">
            <BaseDescriptionList
              :items="[
                { key: 'active', label: '当前项', value: nativeEventTab, status: 'primary' },
                { key: 'event', label: '透传事件', value: 'tab-click / tab-change' },
              ]"
              compact
            />
          </BaseDataState>
        </BasePanel>

        <BasePanel title="垂直与拦截" subtitle="支持 left / right 标签位置，并可通过 beforeLeave 拦截未完成切换。">
          <div class="vertical-tab-demo">
            <BaseTab
              v-model="verticalTab"
              :tabs="verticalTabs"
              variant="underline"
              tab-position="left"
              surface="plain"
              :before-leave="guardBeforeLeave"
              aria-label="垂直标签页"
            />
            <BaseDataState class="min-w-0 flex-1" state="ready" :title="`当前：${verticalTab}`" description="切到规则页后，在解锁前离开会被 beforeLeave 拦截。">
              <BaseButton v-if="verticalTab === 'rules' && guardLocked" type="warning" size="sm" @click="guardLocked = false">解除拦截</BaseButton>
              <BaseButton v-else type="neutral" size="sm" outline @click="guardLocked = true">恢复拦截</BaseButton>
            </BaseDataState>
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

.tab-demo-custom-icon {
  @apply flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400;
}

.tab-demo-custom-icon.is-active {
  @apply bg-primary text-white;
}

.vertical-tab-demo {
  @apply flex min-w-0 items-stretch gap-4;
}
</style>
