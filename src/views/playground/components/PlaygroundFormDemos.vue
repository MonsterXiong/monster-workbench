<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../composables/useToast";
import { formatNumber } from "../../../utils";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const { triggerToast } = useToast();

const textValue = ref("Monster Workbench");
const codeValue = ref("base-form-item");
const textareaValue = ref("用于承载高频表单字段的标签、说明、校验反馈和辅助信息。");
const numberValue = ref(36);
const selectValue = ref("design-system");
const multiSelectValue = ref(["vue", "design-system"]);
const segmentedValue = ref("balanced");
const checkboxValue = ref(true);
const disabledCheckboxValue = ref(false);
const radioValue = ref("balanced");
const switchValue = ref(true);
const disabledSwitchValue = ref(false);
const tagValues = ref(["组件", "沙箱", "高频"]);
const dateRangeValue = ref({ start: "2026-06-01", end: "2026-06-08" });
const sliderValue = ref(36);
const volumeValue = ref(64);
const pathFolderValue = ref("C:\\Users\\demo\\workspace");
const pathFileValue = ref("C:\\Users\\demo\\workspace\\config.json");
const imageValue = ref("");
const coverValue = ref("");

const selectOptions = [
  { value: "vue", label: "Vue 3" },
  { value: "tauri", label: "Tauri v2" },
  { value: "design-system", label: "Design System" },
  { value: "legacy", label: "暂不可用", disabled: true },
];

const radioOptions = [
  { value: "compact", label: "紧凑", description: "适合侧栏和抽屉。" },
  { value: "balanced", label: "均衡", description: "默认密度，适合多数表单。" },
  { value: "comfortable", label: "宽松", description: "适合复杂配置页。" },
  { value: "disabled", label: "禁用项", description: "不可选择。", disabled: true },
];

const segmentedOptions = [
  { label: "紧凑", value: "compact", icon: "Rows3" },
  { label: "均衡", value: "balanced", icon: "PanelTop" },
  { label: "宽松", value: "comfortable", icon: "Maximize2" },
];

const datePresets = [
  { key: "week", label: "本周", start: "2026-06-01", end: "2026-06-08" },
  { key: "month", label: "本月", start: "2026-06-01", end: "2026-06-30" },
  { key: "release", label: "发布窗口", start: "2026-06-06", end: "2026-06-12" },
];

const sliderMarks = [
  { value: 18, label: "窄" },
  { value: 36, label: "推荐" },
  { value: 54, label: "宽" },
  { value: 72, label: "满" },
];

const handleSubmit = () => {
  triggerToast("表单已提交", "success");
};

const handleReset = () => {
  codeValue.value = "base-form-item";
  triggerToast("表单已重置", "info");
};
</script>

<template>
  <section v-if="activeComponentKey === 'text-inputs'" class="detail-stack">
    <PlaygroundDemoSection title="文本数值" subtitle="文本、数字、长文本、错误态和禁用态是最基础的表单能力。" icon="TextCursorInput">
      <BaseForm title="输入控件" description="常规表单字段组合，覆盖尺寸、清空、错误和禁用。" :columns="2" divided>
        <BaseFormItem label="文本输入" description="支持 clearable、placeholder 和尺寸。">
          <BaseInput v-model="textValue" clearable prefix-icon="Search" placeholder="请输入应用名" />
        </BaseFormItem>
        <BaseFormItem label="数字输入" description="适合阈值、并发数、重试次数。" success="范围有效">
          <BaseNumberInput v-model="numberValue" :min="1" :max="100" :step="5" unit="个" />
        </BaseFormItem>
        <BaseFormItem label="错误态" error="编码已被占用，请换一个更具体的名称。">
          <BaseInput v-model="codeValue" error placeholder="请输入编码" />
        </BaseFormItem>
        <BaseFormItem label="禁用态">
          <BaseInput model-value="只读配置" disabled />
        </BaseFormItem>
        <BaseFormItem label="只读前后缀" description="适合固定路径、单位、协议和只读结果展示。">
          <BaseInput v-model="textValue" readonly prefix-icon="Lock" suffix-icon="CheckCircle" />
        </BaseFormItem>
        <BaseFormItem label="加载与字数" description="适合远程校验、搜索建议和名称长度限制。">
          <BaseInput
            v-model="codeValue"
            loading
            clearable
            :maxlength="24"
            show-word-limit
            placeholder="输入后远程校验"
          />
        </BaseFormItem>
        <BaseFormItem label="长文本" description="适合备注、Prompt、JSON 片段和长文本配置。" :span="2">
          <BaseTextarea v-model="textareaValue" :rows="4" :maxlength="120" />
        </BaseFormItem>
        <BaseFormItem label="自动高度" description="内容变长时自动撑开，适合 Prompt、说明和配置片段。" :span="2">
          <BaseTextarea
            v-model="textareaValue"
            :autosize="{ minRows: 2, maxRows: 6 }"
            :maxlength="180"
            placeholder="输入多行内容后自动调整高度"
          />
        </BaseFormItem>
        <BaseFormItem label="只读与错误" error="描述内容过短，请补充必要上下文。" :span="2">
          <div class="field-stack">
            <BaseTextarea v-model="textareaValue" readonly resize="none" :rows="2" />
            <BaseTextarea
              v-model="textareaValue"
              error
              error-message="描述内容过短，请补充必要上下文。"
              resize="none"
              :rows="2"
            />
          </div>
        </BaseFormItem>
        <BaseFormItem label="数值状态" description="覆盖格式化、只读、错误和键盘步进。" :span="2">
          <div class="field-stack">
            <BaseNumberInput
              v-model="numberValue"
              :min="0"
              :max="10000"
              :step="100"
              format-value
              unit="ms"
              aria-label="请求超时时间"
            />
            <BaseNumberInput v-model="numberValue" readonly unit="%" />
            <BaseNumberInput v-model="numberValue" error :min="1" :max="10" />
          </div>
        </BaseFormItem>
      </BaseForm>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'choice-controls'" class="detail-stack">
    <PlaygroundDemoSection title="选择开关" subtitle="下拉、勾选、单选、开关和分段控制是配置页最高频组合。" icon="ListChecks">
      <div class="demo-grid">
        <BasePanel title="下拉与分段" subtitle="适合分类、模式、密度等互斥选择。">
          <div class="field-stack">
            <BaseSelect v-model="selectValue" :options="selectOptions" clearable filterable placeholder="选择技术栈" />
            <BaseSelect
              v-model="multiSelectValue"
              :options="selectOptions"
              multiple
              clearable
              filterable
              placeholder="选择多个能力"
              aria-label="多选能力"
            />
            <BaseSelect model-value="" :options="[]" loading placeholder="加载选项" />
            <BaseSelect model-value="" :options="[]" empty-text="暂无可选能力" placeholder="空态选项" />
            <BaseSegmented v-model="segmentedValue" :options="segmentedOptions" aria-label="密度分段" />
            <BaseSegmented v-model="segmentedValue" :options="segmentedOptions" block size="lg" aria-label="铺满分段" />
            <BaseSegmented model-value="balanced" :options="segmentedOptions" readonly wrap aria-label="只读分段" />
            <BaseSegmented model-value="compact" :options="segmentedOptions" size="sm" disabled />
          </div>
        </BasePanel>

        <BasePanel title="勾选与开关" subtitle="适合布尔配置、权限开关和功能启停。">
          <div class="field-stack">
            <BaseCheckbox v-model="checkboxValue" label="启用组件缓存" description="提升重复打开组件沙箱时的响应速度。" />
            <BaseCheckbox
              model-value
              indeterminate
              label="部分组件已启用"
              description="适合全选/部分选中的批量选择状态。"
            />
            <BaseCheckbox model-value label="只读选项" description="展示当前配置，不允许在此处修改。" readonly />
            <BaseCheckbox v-model="disabledCheckboxValue" label="受限选项" description="权限不足时不可操作。" disabled />
            <BaseCheckbox v-model="checkboxValue" label="紧凑勾选" compact />
            <BaseSwitch
              v-model="switchValue"
              label="自动保存"
              description="修改配置后自动写入本地状态。"
              active-text="已开启"
              inactive-text="已关闭"
            />
            <BaseSwitch model-value label="只读开关" description="当前继承自系统策略，不能在此处修改。" readonly />
            <BaseSwitch v-model="switchValue" label="同步中" description="加载态会阻止切换。" loading />
            <BaseSwitch v-model="disabledSwitchValue" label="禁用开关" description="等待管理员开放。" disabled />
            <BaseSwitch v-model="switchValue" label="紧凑开关" compact size="sm" />
          </div>
        </BasePanel>
      </div>

      <BasePanel title="单选卡片" subtitle="用于较长说明的互斥选项。">
        <div class="field-stack">
          <BaseRadioGroup v-model="radioValue" :options="radioOptions" aria-label="密度选择" />
          <BaseRadioGroup v-model="radioValue" :options="radioOptions" inline compact aria-label="横向密度选择" />
          <BaseRadioGroup
            v-model="radioValue"
            :options="radioOptions"
            :columns="3"
            compact
            readonly
            aria-label="只读密度选择"
          />
        </div>
      </BasePanel>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'form-shell'" class="detail-stack">
    <PlaygroundDemoSection title="表单容器" subtitle="把表单标题、字段布局和尾部动作区收在一个基础组件里。" icon="FileText">
      <BaseForm
        title="组件配置"
        description="适合设置页、编辑页和抽屉内表单。"
        :columns="2"
        divided
        autocomplete="off"
        no-validate
        @submit="handleSubmit"
        @reset="handleReset"
      >
        <template #actions>
          <BaseBadge type="primary">双列</BaseBadge>
        </template>
        <BaseFormItem label="组件名称" required>
          <BaseInput v-model="textValue" clearable />
        </BaseFormItem>
        <BaseFormItem label="分类">
          <BaseSelect v-model="selectValue" :options="selectOptions" />
        </BaseFormItem>
        <BaseFormItem label="阈值">
          <BaseNumberInput v-model="numberValue" :min="1" :max="100" />
        </BaseFormItem>
        <BaseFormItem label="标签">
          <BaseTagInput
            v-model="tagValues"
            :max="6"
            placeholder="输入标签，逗号或回车添加"
            @add="triggerToast(`已添加标签：${$event}`, 'success')"
            @remove="triggerToast(`已移除标签：${$event}`, 'info')"
          />
        </BaseFormItem>
        <BaseFormItem label="备注" :span="2">
          <BaseTextarea v-model="textareaValue" :rows="3" />
        </BaseFormItem>
        <template #footer>
          <BaseFormActions title="提交前检查" description="建议先确认字段完整性。">
            <template #meta>
              <BaseStatusDot type="success" label="校验通过" description="可直接提交" />
            </template>
            <BaseButton type="neutral" size="sm" native-type="reset">重置</BaseButton>
            <BaseButton type="primary" size="sm" native-type="submit">提交</BaseButton>
          </BaseFormActions>
        </template>
      </BaseForm>

      <BaseForm title="三列快速配置" description="适合密度更高的参数面板。" :columns="3" compact>
        <template #actions>
          <BaseBadge type="neutral" variant="outline">三列</BaseBadge>
        </template>
        <BaseFormItem label="密度" compact>
          <BaseSegmented v-model="segmentedValue" :options="segmentedOptions" size="sm" />
        </BaseFormItem>
        <BaseFormItem label="并发" compact>
          <BaseNumberInput v-model="numberValue" size="sm" :min="1" :max="100" />
        </BaseFormItem>
        <BaseFormItem label="开关" compact>
          <BaseSwitch v-model="switchValue" size="sm" compact label="自动保存" />
        </BaseFormItem>
      </BaseForm>

      <BaseForm compact title="紧凑单列表单" description="适合抽屉、侧栏和空间受限区域。">
        <BaseFormItem label="字段编码" help="紧凑模式会降低标签和间距密度。" compact>
          <BaseInput v-model="codeValue" size="sm" />
        </BaseFormItem>
        <template #footer>
          <BaseFormActions compact justify="end">
            <BaseButton type="primary" size="sm">应用</BaseButton>
          </BaseFormActions>
        </template>
      </BaseForm>

      <BaseForm title="整表禁用" description="加载、权限不足或提交中可锁定整组字段。" disabled>
        <BaseFormItem label="配置名称">
          <BaseInput model-value="系统继承配置" />
        </BaseFormItem>
        <BaseFormItem label="继承状态" success="来自默认策略">
          <BaseSwitch model-value label="启用继承" />
        </BaseFormItem>
      </BaseForm>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'form-item'" class="detail-stack">
    <PlaygroundDemoSection title="表单字段" subtitle="统一标签、说明、校验反馈、帮助信息和横向布局。" icon="Rows3">
      <BaseForm title="字段状态" description="覆盖默认、帮助、错误、成功、标签元信息和跨列输入。" :columns="2" divided>
        <BaseFormItem label="应用名称" description="显示在窗口标题、导航和导出文件名里。" required>
          <template #meta>
            <BaseBadge type="success" variant="outline">已校验</BaseBadge>
          </template>
          <BaseInput v-model="textValue" clearable />
        </BaseFormItem>
        <BaseFormItem label="字段编码" help="仅允许小写字母、数字和连字符。" error="编码已被占用。">
          <BaseInput v-model="codeValue" error />
        </BaseFormItem>
        <BaseFormItem label="组件分类" success="当前配置可保存。">
          <BaseSelect v-model="selectValue" :options="selectOptions" />
        </BaseFormItem>
        <BaseFormItem label="负责团队" help="可选，用于交接和审查分配。" optional-text="可选">
          <BaseTagInput v-model="tagValues" placeholder="支持粘贴多个团队，逗号分隔" />
        </BaseFormItem>
        <BaseFormItem label="只读字段" description="展示继承配置，不允许在此处修改。" readonly>
          <BaseInput model-value="继承自全局模板" readonly prefix-icon="Lock" />
          <template #extra>
            <BaseAlert compact type="info" title="继承策略" description="如需修改，请先解除全局模板继承。" />
          </template>
        </BaseFormItem>
        <BaseFormItem label="禁用字段" description="权限不足时保持字段结构和反馈可见。" disabled>
          <BaseSelect model-value="" :options="selectOptions" disabled placeholder="等待权限开放" />
        </BaseFormItem>
        <BaseFormItem label="标签状态" help="只读、错误和紧凑模式适合不同密度的表单。" :span="2">
          <div class="field-stack">
            <BaseTagInput :model-value="tagValues" readonly />
            <BaseTagInput v-model="tagValues" error compact :max="4" />
          </div>
        </BaseFormItem>
        <BaseFormItem label="横向字段" help="适合设置页和属性面板。" horizontal :span="2">
          <BaseInput v-model="textValue" />
        </BaseFormItem>
      </BaseForm>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'path-selector'" class="detail-stack">
    <PlaygroundDemoSection title="路径选择" subtitle="桌面场景里非常高频，浏览器预览时会自动降级提示。" icon="FolderSearch2">
      <BaseForm title="本地路径输入" description="目录生成、日志导出和资源目录配置都能直接复用。" :columns="2" divided>
        <BaseFormItem label="目录路径">
          <AppPathSelector v-model="pathFolderValue" type="folder" />
        </BaseFormItem>
        <BaseFormItem label="文件路径">
          <AppPathSelector v-model="pathFileValue" type="file" />
        </BaseFormItem>
        <BaseFormItem label="当前值" :span="2">
          <BaseDescriptionList
            :items="[
              { key: 'folder', label: '目录', value: pathFolderValue || '未选择', span: 2 },
              { key: 'file', label: '文件', value: pathFileValue || '未选择', span: 2 },
            ]"
            compact
          />
        </BaseFormItem>
      </BaseForm>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'image-uploader'" class="detail-stack">
    <PlaygroundDemoSection title="图片上传" subtitle="封面图、头像、缩略图都可以直接复用这一层。" icon="ImageUp">
      <BaseForm title="图片字段" description="上传入口和预览反馈保持在一起。" :columns="2" divided>
        <BaseFormItem label="普通预览">
          <AppImageUploader v-model="imageValue" label="缩略图" />
        </BaseFormItem>
        <BaseFormItem label="封面裁切">
          <AppImageUploader v-model="coverValue" label="封面图" aspect-ratio="cover" />
        </BaseFormItem>
      </BaseForm>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'date-range'" class="detail-stack">
    <PlaygroundDemoSection title="日期范围" subtitle="时间筛选、发布窗口、日志范围和统计报表都可以复用。" icon="CalendarRange">
      <div class="demo-grid">
        <BaseDateRange
          v-model="dateRangeValue"
          label="发布窗口"
          :presets="datePresets"
          min="2026-06-01"
          max="2026-06-30"
          @preset="triggerToast(`已选择：${$event.label}`, 'info')"
        />
        <BaseDateRange
          :model-value="{ start: '', end: '' }"
          label="错误态"
          error="结束日期不能早于开始日期。"
          compact
        />
        <BaseDateRange
          :model-value="{ start: '2026-06-12', end: '2026-06-06' }"
          label="自动校验"
          min="2026-06-01"
          max="2026-06-30"
          compact
        />
        <BaseDateRange :model-value="dateRangeValue" label="只读态" readonly />
        <BaseDateRange :model-value="dateRangeValue" label="禁用态" disabled />
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'slider'" class="detail-stack">
    <PlaygroundDemoSection title="滑块" subtitle="比例、阈值、并发、音量和图像参数等数值调节都适合使用。" icon="SlidersHorizontal">
      <div class="demo-grid">
        <BasePanel title="范围与刻度" subtitle="展示单位、格式化数值、刻度和 hover 聚焦反馈。">
          <BaseSlider
            v-model="sliderValue"
            label="面板宽度"
            description="拖动调整目标比例。"
            :min="18"
            :max="72"
            :step="2"
            unit="%"
            :marks="sliderMarks"
          />
        </BasePanel>
        <BasePanel title="精确输入组合" subtitle="滑块负责直觉调节，数字输入负责精确值。">
          <div class="field-stack">
            <BaseSlider
              v-model="numberValue"
              compact
              label="并发数量"
              description="滑块和数字输入保持联动。"
              :min="1"
              :max="100"
              :format-value="(value) => `${formatNumber(value)} 个`"
            />
            <BaseNumberInput v-model="numberValue" :min="1" :max="100" />
          </div>
        </BasePanel>
        <BasePanel title="音量调节" subtitle="适合偏好设置、图像参数和资源阈值。">
          <div class="field-stack">
            <BaseSlider
              v-model="volumeValue"
              compact
              label="通知音量"
              :min="0"
              :max="100"
              :step="5"
              unit="%"
              :show-range="false"
            />
            <BaseSlider
              :model-value="92"
              compact
              label="风险阈值"
              description="错误态用于提示当前值超出推荐范围。"
              :min="0"
              :max="100"
              unit="%"
              error
            />
          </div>
        </BasePanel>
        <BasePanel title="紧凑、只读与禁用" subtitle="适合卡片、侧栏和不可编辑状态。">
          <div class="field-stack">
            <BaseSlider v-model="sliderValue" compact size="sm" label="紧凑滑块" :min="0" :max="100" />
            <BaseSlider :model-value="42" compact label="只读滑块" description="展示当前配置，不允许修改。" readonly unit="%" />
            <BaseSlider :model-value="48" compact label="禁用滑块" disabled />
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

.field-stack {
  @apply flex min-w-0 flex-col gap-3;
}
</style>
