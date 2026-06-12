<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const selectValue = ref("design-system");
const multiSelectValue = ref(["vue", "design-system"]);
const limitedMultiSelectValue = ref(["vue", "design-system"]);
const objectSelectValue = ref<Record<string, unknown>>({ id: "component", code: "BaseSelect" });
const creatableSelectValue = ref("component-library");
const remoteSelectValue = ref("");
const remoteSelectKeyword = ref("");
const remoteSelectLoading = ref(false);
const segmentedValue = ref("balanced");
const checkboxValue = ref(true);
const disabledCheckboxValue = ref(false);
const switchValue = ref(true);
const disabledSwitchValue = ref(false);
const radioValue = ref("balanced");
let remoteSelectTimer: ReturnType<typeof setTimeout> | undefined;

const selectOptions = [
  { value: "vue", label: "Vue 3", description: "前端交互框架。", icon: "PanelsTopLeft", meta: "前端" },
  { value: "tauri", label: "Tauri v2", description: "桌面端运行底座。", icon: "MonitorCog", meta: "桌面" },
  {
    value: "design-system",
    label: "Design System",
    selectedLabel: "设计系统",
    description: "Base 组件与主题规范。",
    icon: "Component",
    meta: "组件",
  },
  { value: "legacy", label: "暂不可用", description: "禁用项保持可读但不可选。", icon: "Lock", meta: "停用", disabled: true },
];

const longSelectOptions = [
  {
    value: "workflow-console",
    label: "工作流控制台和资源编排",
    selectedLabel: "工作流",
    description: "用于验证长标签、长描述和筛选文本的截断表现。",
    icon: "Workflow",
    meta: "workspace://component/select/meta/very-long-option-badge",
    filterText: "workflow console resource orchestration",
  },
  {
    value: "design-system",
    label: "Design System · Base 组件规范与主题联动",
    selectedLabel: "设计系统",
    description: "搜索 Design、组件、主题都应能命中这一项。",
    icon: "Component",
    meta: "推荐",
    filterText: "Design System Base component theme",
  },
  {
    value: "telemetry",
    label: "运行状态观测与异常回放",
    selectedLabel: "状态观测",
    description: "适合日志、性能和错误追踪类配置。",
    icon: "Activity",
    meta: "Beta",
    filterText: "telemetry observability replay",
  },
  {
    value: "audit-log",
    label: "审计日志归档",
    selectedLabel: "审计",
    description: "长列表用于验证键盘导航时高亮项会保持可见。",
    icon: "FileClock",
    meta: "Log",
    filterText: "audit log archive",
  },
  {
    value: "quota-policy",
    label: "配额策略联动",
    selectedLabel: "配额",
    description: "适合资源阈值、速率限制和容量提示。",
    icon: "Gauge",
    meta: "Quota",
    filterText: "quota policy capacity",
  },
  {
    value: "release-window",
    label: "发布窗口编排",
    selectedLabel: "发布",
    description: "覆盖变更发布、灰度切换和回滚窗口。",
    icon: "Rocket",
    meta: "Release",
    filterText: "release window rollout",
  },
  {
    value: "permission-scope",
    label: "权限范围映射",
    selectedLabel: "权限",
    description: "用于团队、角色和资源范围配置。",
    icon: "ShieldCheck",
    meta: "Auth",
    filterText: "permission scope role",
  },
  {
    value: "notification-rule",
    label: "通知规则聚合",
    selectedLabel: "通知",
    description: "适合告警订阅、消息分流和静默策略。",
    icon: "BellRing",
    meta: "Notify",
    filterText: "notification alert rule",
  },
  {
    value: "backup-plan",
    label: "备份计划",
    selectedLabel: "备份",
    description: "覆盖本地备份、导出策略和恢复入口。",
    icon: "Archive",
    meta: "Backup",
    filterText: "backup export restore",
  },
  {
    value: "quality-gate",
    label: "质量门禁",
    selectedLabel: "门禁",
    description: "适合类型检查、架构检查和发布前校验。",
    icon: "BadgeCheck",
    meta: "Gate",
    filterText: "quality gate verify",
  },
  {
    value: "integration-hub",
    label: "集成中心",
    selectedLabel: "集成",
    description: "用于跨系统接入、同步状态和扩展配置。",
    icon: "Cable",
    meta: "Hub",
    filterText: "integration hub extension",
  },
];

const objectSelectOptions = [
  {
    key: "component",
    value: { id: "component", code: "BaseSelect" },
    label: "公共组件",
    selectedLabel: "BaseSelect",
    description: "通过 valueKey=id 识别对象值。",
    icon: "Box",
    meta: "对象",
    filterText: "object value component",
  },
  {
    key: "layout",
    value: { id: "layout", code: "BaseThreeColumnLayout" },
    label: "布局容器",
    selectedLabel: "三栏布局",
    description: "对象值切换后仍保持稳定选中态。",
    icon: "PanelLeftRight",
    meta: "对象",
    filterText: "object layout three column",
  },
];

const clearObjectSelectValue = () => ({ id: "", code: "" });

const createSelectOptions = [
  ...selectOptions,
  {
    value: "component-library",
    label: "组件库",
    selectedLabel: "组件库",
    description: "允许输入后回车创建新标签。",
    icon: "PackagePlus",
    meta: "可创建",
    filterText: "component library create",
  },
];

const remoteSelectSourceOptions = [
  {
    value: "layout-kit",
    label: "布局套件",
    selectedLabel: "布局",
    description: "三栏布局、分割面板和容器组合。",
    icon: "LayoutTemplate",
    meta: "Layout",
    filterText: "layout panels container",
  },
  {
    value: "filter-kit",
    label: "筛选工具集",
    selectedLabel: "筛选",
    description: "筛选条、搜索输入和结果摘要。",
    icon: "ListFilter",
    meta: "Data",
    filterText: "filter search result",
  },
  {
    value: "form-kit",
    label: "表单控件集",
    selectedLabel: "表单",
    description: "输入、选择、日期和校验状态。",
    icon: "SquarePen",
    meta: "Form",
    filterText: "form input select date validation",
  },
  {
    value: "feedback-kit",
    label: "反馈浮层集",
    selectedLabel: "反馈",
    description: "提示、弹窗、抽屉和轻提示。",
    icon: "MessagesSquare",
    meta: "Feedback",
    filterText: "tooltip dialog drawer toast",
  },
  {
    value: "table-kit",
    label: "数据表格集",
    selectedLabel: "表格",
    description: "固定列、排序、批量选择和空态。",
    icon: "Table2",
    meta: "Table",
    filterText: "table sort fixed selection empty",
  },
];

const remoteSelectOptions = computed(() => {
  const keyword = remoteSelectKeyword.value.trim().toLowerCase();
  if (!keyword) return remoteSelectSourceOptions.slice(0, 4);

  return remoteSelectSourceOptions.filter((option) =>
    [option.label, option.selectedLabel, option.description, option.meta, option.filterText]
      .join(" ")
      .toLowerCase()
      .includes(keyword)
  );
});

const handleRemoteSelectSearch = (query: string) => {
  remoteSelectKeyword.value = query;
  remoteSelectLoading.value = true;

  if (remoteSelectTimer) clearTimeout(remoteSelectTimer);
  remoteSelectTimer = setTimeout(() => {
    remoteSelectLoading.value = false;
  }, 260);
};

onBeforeUnmount(() => {
  if (remoteSelectTimer) clearTimeout(remoteSelectTimer);
});

const radioOptions = [
  { value: "compact", label: "紧凑", description: "适合侧栏和抽屉。", icon: "Rows3", meta: "S" },
  { value: "balanced", label: "均衡", description: "默认密度，适合多数表单。", icon: "PanelTop", meta: "M" },
  { value: "comfortable", label: "宽松", description: "适合复杂配置页。", icon: "Maximize2", meta: "L" },
  { value: "disabled", label: "禁用项", description: "不可选择。", icon: "Lock", meta: "停用", disabled: true },
];

const segmentedOptions = [
  { label: "紧凑", value: "compact", icon: "Rows3", description: "适合侧栏与抽屉。", meta: "S" },
  { label: "均衡", value: "balanced", icon: "PanelTop", description: "默认桌面密度。", meta: "M" },
  { label: "宽松", value: "comfortable", icon: "Maximize2", description: "适合复杂表单。", meta: "L" },
  { label: "停用", value: "disabled", icon: "Lock", description: "权限不足不可选。", meta: "禁用", disabled: true },
];

const longSegmentedOptions = [
  {
    label: "自动编排资源入口",
    value: "auto-routing",
    icon: "Workflow",
    description: "验证长标签、说明和 meta 在窄容器中的稳定排版。",
    meta: "推荐",
  },
  {
    label: "保留人工审核流程",
    value: "manual-review",
    icon: "ClipboardCheck",
    description: "适合需要人工确认、审计和回退的配置。",
    meta: "审核",
  },
  {
    label: "暂停同步策略",
    value: "paused",
    icon: "PauseCircle",
    description: "禁用项保持可读但不可切换。",
    meta: "停用",
    disabled: true,
  },
];
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="选择开关" subtitle="下拉、勾选、单选、开关和分段控制是配置页最高频组合。" icon="ListChecks">
      <div class="demo-grid">
        <BasePanel title="下拉与分段" subtitle="适合分类、模式、密度等互斥选择。">
          <div class="field-stack">
            <p id="select-filter-hint" class="sr-only">筛选会匹配选项标题、选中标题、说明、标签和扩展关键词。</p>
            <p id="segmented-keyboard-hint" class="sr-only">分段控件支持方向键、Home 和 End 在可用选项之间切换。</p>
            <BaseSelect
              id="playground-main-select"
              v-model="selectValue"
              name="playgroundMainSelect"
              :options="selectOptions"
              clearable
              filterable
              no-match-text="没有匹配能力"
              placeholder="选择技术栈"
              :value-on-clear="''"
              aria-describedby="select-filter-hint"
            />
            <BaseSelect
              v-model="multiSelectValue"
              :options="selectOptions"
              multiple
              clearable
              filterable
              :max-collapse-tags="1"
              placeholder="选择多个能力"
              aria-label="多选能力"
            />
            <BaseSelect
              v-model="limitedMultiSelectValue"
              :options="selectOptions"
              multiple
              clearable
              filterable
              :multiple-limit="2"
              :max-collapse-tags="1"
              :collapse-tags-tooltip="false"
              placeholder="最多选择两个能力"
              aria-label="多选上限"
            />
            <BaseSelect
              v-model="selectValue"
              :options="longSelectOptions"
              clearable
              filterable
              size="lg"
              placeholder="长文案与搜索关键词"
              aria-label="长文案选择"
            />
            <BaseSelect
              :model-value="objectSelectValue"
              :options="objectSelectOptions"
              value-key="id"
              clearable
              filterable
              :value-on-clear="clearObjectSelectValue"
              placeholder="对象值选择"
              aria-label="对象值选择"
              @update:model-value="objectSelectValue = $event as Record<string, unknown>"
            />
            <BaseSelect
              v-model="creatableSelectValue"
              :options="createSelectOptions"
              clearable
              filterable
              allow-create
              default-first-option
              :reserve-keyword="false"
              automatic-dropdown
              placeholder="输入后回车创建能力"
              aria-label="可创建能力选择"
            />
            <BaseSelect
              v-model="remoteSelectValue"
              :options="remoteSelectOptions"
              clearable
              filterable
              remote
              remote-show-suffix
              :loading="remoteSelectLoading"
              :remote-method="handleRemoteSelectSearch"
              :debounce="180"
              no-match-text="没有远程结果"
              placeholder="远程搜索组件能力"
              aria-label="远程搜索能力选择"
            />
            <div class="input-demo-row">
              <BaseSelect model-value="tauri" :options="selectOptions" size="xs" placeholder="迷你尺寸" />
              <BaseSelect model-value="tauri" :options="selectOptions" size="sm" placeholder="紧凑尺寸" />
            </div>
            <BaseSelect model-value="" :options="[]" loading loading-text="正在加载能力" placeholder="加载选项" />
            <BaseSelect model-value="" :options="[]" empty-text="暂无可选能力" placeholder="空态选项" />
            <BaseSelect model-value="legacy" :options="selectOptions" disabled placeholder="禁用下拉" />
            <BaseSelect
              model-value=""
              :options="selectOptions"
              error
              error-message="请选择一个可用能力后再继续。"
              placeholder="错误态选择"
              aria-label="错误态选择"
            />
            <BaseSegmented
              id="density-segmented"
              v-model="segmentedValue"
              :options="segmentedOptions"
              aria-label="密度分段"
              aria-describedby="segmented-keyboard-hint"
            />
            <BaseSegmented
              v-model="segmentedValue"
              :options="segmentedOptions.slice(0, 3)"
              size="xs"
              compact
              aria-label="迷你密度分段"
              aria-describedby="segmented-keyboard-hint"
            />
            <BaseSegmented
              v-model="segmentedValue"
              :options="segmentedOptions"
              block
              detailed
              success
              size="lg"
              aria-label="铺满分段"
              aria-describedby="segmented-keyboard-hint"
            />
            <BaseSegmented
              model-value="auto-routing"
              :options="longSegmentedOptions"
              block
              wrap
              detailed
              aria-label="长文案分段"
              aria-describedby="segmented-keyboard-hint"
            />
            <BaseSegmented
              model-value="balanced"
              :options="segmentedOptions"
              readonly
              wrap
              detailed
              aria-label="只读分段"
              aria-describedby="segmented-keyboard-hint"
            />
            <BaseSegmented
              model-value="unknown"
              :options="segmentedOptions"
              compact
              error
              aria-label="未命中值分段"
              aria-describedby="segmented-keyboard-hint"
            />
            <BaseSegmented
              model-value="balanced"
              :options="segmentedOptions"
              loading
              loading-text="正在保存密度"
              aria-label="加载分段"
              aria-describedby="segmented-keyboard-hint"
            />
            <BaseSegmented
              model-value="compact"
              :options="segmentedOptions"
              size="sm"
              disabled
              aria-label="禁用分段"
            />
          </div>
        </BasePanel>

        <BasePanel title="勾选与开关" subtitle="适合布尔配置、权限开关和功能启停。">
          <div class="field-stack">
            <p id="checkbox-keyboard-hint" class="sr-only">勾选框支持 Space 和 Enter 切换，只读、加载和禁用状态不会改值。</p>
            <p id="switch-aria-only-hint" class="sr-only">无可见标签开关依赖 aria-label 提供可访问名称。</p>
            <BaseCheckbox
              id="component-cache-checkbox"
              v-model="checkboxValue"
              name="componentCache"
              value="enabled"
              label="启用组件缓存"
              description="提升重复打开组件沙箱时的响应速度。"
              aria-describedby="checkbox-keyboard-hint"
            />
            <BaseCheckbox
              model-value
              indeterminate
              label="部分组件已启用"
              description="适合全选/部分选中的批量选择状态。"
            />
            <BaseCheckbox model-value loading label="同步中" description="保存或同步中锁定当前值。" />
            <BaseCheckbox model-value success label="校验通过" description="可以用语义色表达当前选择结果。" />
            <BaseCheckbox model-value error label="存在冲突" description="用于权限、依赖或互斥配置提示。" />
            <BaseCheckbox model-value label="只读选项" description="展示当前配置，不允许在此处修改。" readonly />
            <BaseCheckbox v-model="disabledCheckboxValue" label="受限选项" description="权限不足时不可操作。" disabled />
            <BaseCheckbox v-model="checkboxValue" label="迷你勾选" compact size="xs" />
            <BaseCheckbox v-model="checkboxValue" label="紧凑勾选" compact size="sm" />
            <BaseCheckbox
              v-model="checkboxValue"
              size="lg"
              label="很长的勾选项标题会保持勾选框、标题和说明稳定排版"
              description="用于权限继承、批量同步、实验功能启用等需要较长说明的配置项。"
            />
            <BaseCheckbox v-model="checkboxValue" aria-label="仅图形勾选项" aria-describedby="checkbox-keyboard-hint" />
            <BaseCheckbox :model-value="false" success label="未勾选但校验通过" description="关闭当前能力仍然符合策略。" />
            <BaseCheckbox :model-value="false" error label="未勾选存在冲突" description="用于提示必选项、依赖项或权限配置缺失。" />
            <BaseSwitch
              v-model="switchValue"
              label="自动保存"
              description="修改配置后自动写入本地状态。"
              active-text="已开启"
              inactive-text="已关闭"
            />
            <BaseSwitch model-value success label="同步可用" description="成功态适合展示策略已生效。" active-text="正常" />
            <BaseSwitch :model-value="false" error label="同步失败" description="错误态适合展示开关不可用或依赖失败。" inactive-text="异常" />
            <BaseSwitch model-value label="只读开关" description="当前继承自系统策略，不能在此处修改。" readonly />
            <BaseSwitch v-model="switchValue" label="同步中" description="加载态会阻止切换。" loading />
            <BaseSwitch v-model="disabledSwitchValue" label="禁用开关" description="等待管理员开放。" disabled />
            <BaseSwitch v-model="switchValue" label="迷你开关" compact size="xs" />
            <BaseSwitch v-model="switchValue" label="紧凑开关" compact size="sm" />
            <BaseSwitch
              v-model="switchValue"
              size="lg"
              label="长文案策略开关会保持右侧控件稳定"
              description="适合权限继承、自动化策略、通知订阅等描述较长的配置项。"
              active-text="策略已开启"
              inactive-text="策略已关闭"
            />
            <BaseSwitch
              v-model="switchValue"
              aria-label="仅图形区域开关"
              aria-describedby="switch-aria-only-hint"
              active-text="隐藏标签开启"
              inactive-text="隐藏标签关闭"
            />
            <BaseSwitch :model-value="false" success label="未开启但校验通过" description="用于表达当前关闭值仍然符合策略。" inactive-text="允许关闭" />
            <BaseSwitch model-value error label="已开启但存在风险" description="用于表达当前开启值需要处理冲突。" active-text="存在风险" />
          </div>
        </BasePanel>
      </div>

      <BasePanel title="单选卡片" subtitle="用于较长说明的互斥选项。">
        <div class="field-stack">
          <p id="radio-keyboard-hint" class="sr-only">支持方向键、Home 和 End 在可用选项之间切换。</p>
          <BaseRadioGroup
            id="density-radio-group"
            v-model="radioValue"
            :options="radioOptions"
            size="lg"
            success
            aria-label="密度选择"
            aria-describedby="radio-keyboard-hint"
          />
          <BaseRadioGroup v-model="radioValue" :options="radioOptions" inline compact aria-label="横向密度选择" />
          <BaseRadioGroup v-model="radioValue" :options="radioOptions.slice(0, 3)" size="xs" inline compact aria-label="迷你密度选择" />
          <BaseRadioGroup
            v-model="radioValue"
            :options="radioOptions"
            :columns="3"
            compact
            readonly
            aria-label="只读密度选择"
          />
          <BaseRadioGroup model-value="unknown" :options="radioOptions" compact error aria-label="未命中值密度选择" />
          <BaseRadioGroup model-value="balanced" :options="radioOptions" disabled aria-label="禁用密度选择" />
        </div>
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

.field-stack {
  @apply flex min-w-0 flex-col gap-3;
}

.input-demo-row {
  @apply grid min-w-0 gap-3 md:grid-cols-2;
}
</style>
