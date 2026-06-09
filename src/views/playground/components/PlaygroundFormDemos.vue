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
const decimalNumberValue = ref(3.5);
const selectValue = ref("design-system");
const multiSelectValue = ref(["vue", "design-system"]);
const segmentedValue = ref("balanced");
const checkboxValue = ref(true);
const disabledCheckboxValue = ref(false);
const radioValue = ref("balanced");
const switchValue = ref(true);
const disabledSwitchValue = ref(false);
const tagValues = ref(["组件", "沙箱", "高频"]);
const duplicateTagValues = ref(["Vue", "Vue", "Tauri"]);
const limitedTagValues = ref(["表单", "校验", "状态"]);
const compactTagValues = ref(["紧凑", "错误"]);
const emptyTagValues = ref<string[]>([]);
const dateRangeValue = ref({ start: "2026-06-01", end: "2026-06-08" });
const compactDateRangeValue = ref({ start: "2026-06-06", end: "2026-06-12" });
const sundayDateRangeValue = ref({ start: "2026-06-07", end: "2026-06-14" });
const boundaryDateRangeValue = ref({ start: "2026-06-01", end: "2026-06-30" });
const boundaryOverflowDateRangeValue = ref({ start: "2026-05-20", end: "2026-07-02" });
const invalidOrderDateRangeValue = ref({ start: "2026-06-12", end: "2026-06-06" });
const plainDateRangeValue = ref({ start: "", end: "" });
const manualDateRangeValue = ref({ start: "2026-06-10", end: "2026-06-20" });
const sliderValue = ref(36);
const volumeValue = ref(64);
const pathFolderValue = ref("C:\\Users\\demo\\workspace");
const pathFileValue = ref("C:\\Users\\demo\\workspace\\config.json");
const imageValue = ref("");
const coverValue = ref("");

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

const sliderBoundaryMarks = [
  { value: -20, label: "低" },
  { value: 0, label: "0" },
  { value: 50, label: "50" },
  { value: 120, label: "高" },
];

const sliderDecimalMarks = [
  { value: 0, label: "0" },
  { value: 2.5, label: "中" },
  { value: 5, label: "5" },
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
          <BaseNumberInput v-model="numberValue" block :min="1" :max="100" :step="5" unit="个" />
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
        <BaseFormItem label="前后缀组合" description="覆盖插槽前后缀、密码显隐和紧凑尺寸。" :span="2">
          <div class="field-stack">
            <BaseInput v-model="codeValue" block placeholder="输入访问域名" aria-label="访问域名">
              <template #prepend>https://</template>
              <template #append>.monster.dev</template>
            </BaseInput>
            <div class="input-demo-row">
              <BaseInput
                v-model="codeValue"
                block
                type="password"
                show-password
                prefix-icon="KeyRound"
                placeholder="访问密钥"
                aria-label="访问密钥"
              />
              <BaseInput
                v-model="codeValue"
                block
                size="sm"
                suffix-icon="Hash"
                placeholder="紧凑编码"
                aria-label="紧凑编码"
              />
            </div>
          </div>
        </BaseFormItem>
        <BaseFormItem label="长文本" description="适合备注、Prompt、JSON 片段和长文本配置。" :span="2">
          <BaseTextarea v-model="textareaValue" size="lg" :rows="4" :maxlength="120" show-word-limit />
        </BaseFormItem>
        <BaseFormItem label="自动高度" description="内容变长时自动撑开，适合 Prompt、说明和配置片段。" :span="2">
          <BaseTextarea
            v-model="textareaValue"
            size="sm"
            :autosize="{ minRows: 2, maxRows: 6 }"
            :maxlength="180"
            placeholder="输入多行内容后自动调整高度"
          />
        </BaseFormItem>
        <BaseFormItem label="只读、加载与错误" error="描述内容过短，请补充必要上下文。" :span="2">
          <div class="field-stack">
            <BaseTextarea v-model="textareaValue" readonly resize="none" :rows="2" />
            <BaseTextarea
              v-model="textareaValue"
              loading
              :maxlength="180"
              :rows="2"
              resize="none"
              placeholder="远程生成中"
            />
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
              block
              :min="0"
              :max="10000"
              :step="100"
              format-value
              unit="ms"
              aria-label="请求超时时间"
            />
            <div class="number-demo-row">
              <BaseNumberInput v-model="numberValue" readonly unit="%" aria-label="只读百分比" />
              <BaseNumberInput v-model="numberValue" error :min="1" :max="10" aria-label="错误数值" />
            </div>
            <div class="number-demo-row">
              <BaseNumberInput :model-value="1" :min="1" :max="100" size="sm" aria-label="最小边界" />
              <BaseNumberInput :model-value="100" :min="1" :max="100" size="sm" aria-label="最大边界" />
              <BaseNumberInput :model-value="48" disabled size="sm" aria-label="禁用数值" />
            </div>
            <BaseNumberInput
              v-model="decimalNumberValue"
              block
              :min="0"
              :max="10"
              :step="0.25"
              :precision="2"
              unit="s"
              decrement-label="减少 0.25 秒"
              increment-label="增加 0.25 秒"
              aria-label="小数秒数"
            />
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
            <BaseSelect v-model="selectValue" :options="selectOptions" clearable filterable no-match-text="没有匹配能力" placeholder="选择技术栈" />
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
            <BaseSelect model-value="tauri" :options="selectOptions" size="sm" placeholder="紧凑尺寸" />
            <BaseSelect model-value="" :options="[]" loading loading-text="正在加载能力" placeholder="加载选项" />
            <BaseSelect model-value="" :options="[]" empty-text="暂无可选能力" placeholder="空态选项" />
            <BaseSelect model-value="legacy" :options="selectOptions" disabled placeholder="禁用下拉" />
            <BaseSelect model-value="" :options="selectOptions" error placeholder="错误态选择" aria-label="错误态选择" />
            <BaseSegmented v-model="segmentedValue" :options="segmentedOptions" aria-label="密度分段" />
            <BaseSegmented v-model="segmentedValue" :options="segmentedOptions" block detailed success size="lg" aria-label="铺满分段" />
            <BaseSegmented model-value="balanced" :options="segmentedOptions" readonly wrap detailed aria-label="只读分段" />
            <BaseSegmented model-value="unknown" :options="segmentedOptions" compact error aria-label="未命中值分段" />
            <BaseSegmented model-value="balanced" :options="segmentedOptions" loading loading-text="正在保存密度" aria-label="加载分段" />
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
            <BaseCheckbox model-value loading label="同步中" description="保存或同步中锁定当前值。" />
            <BaseCheckbox model-value success label="校验通过" description="可以用语义色表达当前选择结果。" />
            <BaseCheckbox model-value error label="存在冲突" description="用于权限、依赖或互斥配置提示。" />
            <BaseCheckbox model-value label="只读选项" description="展示当前配置，不允许在此处修改。" readonly />
            <BaseCheckbox v-model="disabledCheckboxValue" label="受限选项" description="权限不足时不可操作。" disabled />
            <BaseCheckbox v-model="checkboxValue" label="紧凑勾选" compact size="sm" />
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
            <BaseSwitch v-model="switchValue" label="紧凑开关" compact size="sm" />
          </div>
        </BasePanel>
      </div>

      <BasePanel title="单选卡片" subtitle="用于较长说明的互斥选项。">
        <div class="field-stack">
          <BaseRadioGroup v-model="radioValue" :options="radioOptions" size="lg" success aria-label="密度选择" />
          <BaseRadioGroup v-model="radioValue" :options="radioOptions" inline compact aria-label="横向密度选择" />
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

  <section v-else-if="activeComponentKey === 'form-shell'" class="detail-stack">
    <PlaygroundDemoSection title="表单容器" subtitle="把表单标题、字段布局和尾部动作区收在一个基础组件里。" icon="FileText">
      <div class="form-demo-stack">
        <BaseForm
          title="组件配置"
          description="适合设置页、编辑页和抽屉内表单。"
          :columns="2"
          body-gap="lg"
          divided
          autocomplete="off"
          no-validate
          wrap-description
          footer-label="组件配置动作"
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
            <BaseNumberInput v-model="numberValue" block :min="1" :max="100" />
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

        <BaseForm
          title="加载表单"
          description="提交、保存或远程读取期间显示轻量加载状态，并锁定内部字段与底部动作。"
          :columns="2"
          surface="muted"
          body-gap="sm"
          loading
          loading-text="保存中"
          wrap-description
        >
          <template #actions>
            <BaseBadge type="warning" variant="outline">处理中</BaseBadge>
          </template>
          <BaseFormItem label="配置名称" loading loading-text="正在同步名称">
            <BaseInput model-value="远程配置" loading />
          </BaseFormItem>
          <BaseFormItem label="启用状态">
            <BaseSwitch model-value label="自动启用" />
          </BaseFormItem>
          <template #footer>
            <BaseFormActions compact justify="end">
              <BaseButton type="neutral" size="sm" native-type="reset">重置</BaseButton>
              <BaseButton type="primary" size="sm" native-type="submit">保存</BaseButton>
            </BaseFormActions>
          </template>
        </BaseForm>

        <BaseForm title="三列快速配置" description="适合密度更高的参数面板。" :columns="3" compact size="sm">
          <template #actions>
            <BaseBadge type="neutral" variant="outline">三列</BaseBadge>
          </template>
          <BaseFormItem label="密度" compact>
            <BaseSegmented v-model="segmentedValue" :options="segmentedOptions" size="sm" />
          </BaseFormItem>
          <BaseFormItem label="并发" compact>
            <BaseNumberInput v-model="numberValue" block size="sm" :min="1" :max="100" />
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

        <BaseForm title="整表禁用" description="加载、权限不足或提交中可锁定整组字段。" disabled surface="muted">
          <BaseFormItem label="配置名称">
            <BaseInput model-value="系统继承配置" />
          </BaseFormItem>
          <BaseFormItem label="继承状态" success="来自默认策略">
            <BaseSwitch model-value label="启用继承" />
          </BaseFormItem>
        </BaseForm>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'form-item'" class="detail-stack">
    <PlaygroundDemoSection title="表单字段" subtitle="统一标签、说明、校验反馈、帮助信息和横向布局。" icon="Rows3">
      <div class="form-demo-stack">
        <BaseForm title="字段状态" description="覆盖默认、帮助、错误、成功、标签元信息和跨列输入。" :columns="3" divided body-gap="lg">
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
          <BaseFormItem label="远程校验" description="加载状态会接入 aria-busy。" loading loading-text="正在校验字段可用性">
            <BaseInput v-model="codeValue" loading placeholder="输入后远程校验" />
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
          <BaseFormItem
            label="很长的字段标签会自动换行并保持元信息稳定"
            description="适合策略名、资源名和跨系统配置说明比较长的表单项。"
            :span="3"
            wrap-description
          >
            <template #meta>
              <BaseBadge type="primary" variant="outline">长标签</BaseBadge>
            </template>
            <BaseInput v-model="textValue" />
          </BaseFormItem>
          <BaseFormItem label="隐藏标签" hide-label aria-label="隐藏标签字段" :span="3">
            <BaseInput v-model="textValue" placeholder="视觉上隐藏标签，但保留可访问名称" />
          </BaseFormItem>
          <BaseFormItem label="标签状态" help="只读、错误和紧凑模式适合不同密度的表单。" :span="3">
            <div class="field-stack">
              <BaseTagInput :model-value="tagValues" readonly />
              <BaseTagInput v-model="tagValues" error compact :max="4" />
            </div>
          </BaseFormItem>
          <BaseFormItem label="横向字段" help="适合设置页和属性面板。" horizontal label-width="120px" :span="3">
            <BaseInput v-model="textValue" />
          </BaseFormItem>
        </BaseForm>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'tag-input'" class="detail-stack">
    <PlaygroundDemoSection title="标签输入" subtitle="标签添加、粘贴拆分、重复策略、清空、满额和状态反馈。" icon="Tags">
      <div class="form-demo-stack">
        <BaseForm title="标签输入状态" description="覆盖常规输入、清空、成功、错误、加载、只读和禁用。" :columns="2" divided body-gap="lg">
          <BaseFormItem label="常规标签" description="回车、逗号、中文逗号或粘贴多项都可以添加。" success="可继续添加">
            <BaseTagInput
              v-model="tagValues"
              clearable
              :max="6"
              placeholder="输入标签，逗号或回车添加"
              @add="triggerToast(`已添加标签：${$event}`, 'success')"
              @remove="triggerToast(`已移除标签：${$event}`, 'info')"
              @clear="triggerToast('已清空标签', 'info')"
            />
          </BaseFormItem>
          <BaseFormItem label="大尺寸成功态" description="适合更宽松的表单和详情页。">
            <BaseTagInput v-model="tagValues" size="lg" success clearable :max="8" placeholder="添加能力标签" />
          </BaseFormItem>
          <BaseFormItem label="允许重复" description="用于权重、投票、路径片段等允许重复值的场景。">
            <BaseTagInput v-model="duplicateTagValues" allow-duplicates clearable :max="8" placeholder="允许重复标签" />
          </BaseFormItem>
          <BaseFormItem label="满额状态" description="达到上限后隐藏输入入口，但仍可清空或删除。" help="删除一个标签后会重新显示输入入口。">
            <BaseTagInput v-model="limitedTagValues" clearable :max="3" placeholder="最多 3 个标签" />
          </BaseFormItem>
          <BaseFormItem label="紧凑错误态" error="标签数量或内容不符合规则。">
            <BaseTagInput v-model="compactTagValues" compact error :max="4" placeholder="紧凑标签" />
          </BaseFormItem>
          <BaseFormItem label="加载锁定" description="同步中保留标签和计数，不允许编辑。">
            <BaseTagInput v-model="tagValues" loading loading-text="同步标签" :max="6" />
          </BaseFormItem>
          <BaseFormItem label="只读标签" description="展示继承配置，不显示删除按钮。">
            <BaseTagInput :model-value="tagValues" readonly :max="6" />
          </BaseFormItem>
          <BaseFormItem label="禁用标签" description="权限不足时保持结构可见。">
            <BaseTagInput :model-value="tagValues" disabled :max="6" />
          </BaseFormItem>
          <BaseFormItem label="无计数嵌入" description="适合空间很紧的行内配置。" :span="2">
            <BaseTagInput v-model="emptyTagValues" :show-count="false" placeholder="输入后回车添加" />
          </BaseFormItem>
        </BaseForm>
      </div>
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
          size="lg"
          @preset="triggerToast(`已选择：${$event.label}`, 'info')"
        />
        <BaseDateRange
          v-model="compactDateRangeValue"
          label="紧凑范围"
          :presets="datePresets.slice(0, 2)"
          min="2026-06-01"
          max="2026-06-30"
          compact
          surface="muted"
        />
        <BaseDateRange
          v-model="sundayDateRangeValue"
          label="周日起始"
          :first-day-of-week="0"
          min="2026-06-01"
          max="2026-06-30"
          compact
        />
        <BaseDateRange
          v-model="boundaryDateRangeValue"
          label="边界限制"
          start-placeholder="最早日期"
          end-placeholder="最晚日期"
          min="2026-06-01"
          max="2026-06-30"
          surface="muted"
        />
        <BaseDateRange
          v-model="boundaryOverflowDateRangeValue"
          label="越界提示"
          :presets="datePresets"
          min="2026-06-01"
          max="2026-06-30"
          compact
          surface="muted"
        />
        <BaseDateRange
          :model-value="{ start: '', end: '' }"
          label="错误态"
          error="结束日期不能早于开始日期。"
          compact
        />
        <BaseDateRange
          v-model="invalidOrderDateRangeValue"
          label="自动校验"
          min="2026-06-01"
          max="2026-06-30"
          compact
        />
        <BaseDateRange :model-value="dateRangeValue" label="只读态" readonly />
        <BaseDateRange :model-value="dateRangeValue" label="禁用态" disabled />
        <BaseDateRange
          v-model="plainDateRangeValue"
          label="Plain 嵌入"
          surface="plain"
          :presets="datePresets"
          min="2026-06-01"
          max="2026-06-30"
        />
        <BaseDateRange
          v-model="manualDateRangeValue"
          label="手输模式"
          :show-calendar="false"
          surface="muted"
          compact
        />
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
            <BaseNumberInput v-model="numberValue" block :min="1" :max="100" />
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
            <BaseSlider
              :model-value="28"
              compact
              size="sm"
              label="静默阈值"
              description="隐藏数值和范围，适合窄侧栏设置。"
              :show-value="false"
              :show-range="false"
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
        <BasePanel title="边界与长文案" subtitle="外部值、刻度和文案都按组件自身规则兜底。">
          <div class="field-stack">
            <BaseSlider
              :model-value="142"
              compact
              label="外部值越界"
              description="modelValue 超出范围时，轨道、显示值和 aria 会归一到最大值。"
              :min="0"
              :max="100"
              :step="10"
              unit="%"
              :marks="sliderBoundaryMarks"
              wrap-description
            />
            <BaseSlider
              :model-value="2.75"
              compact
              label="小数步进"
              description="支持 0.25 这类精细步长，并按 step 对齐显示。"
              :min="0"
              :max="5"
              :step="0.25"
              :marks="sliderDecimalMarks"
              :format-value="(value) => value.toFixed(2)"
            />
            <BaseSlider
              :model-value="40"
              compact
              label="非常长的滑块标题可以在配置面板里按需换行显示"
              description="wrapLabel 与 wrapDescription 适合资源名称、策略名称、图像参数或实验配置说明较长的场景。"
              :min="0"
              :max="80"
              :step="5"
              wrap-label
              wrap-description
            />
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

.form-demo-stack {
  @apply grid gap-4;
}

.input-demo-row {
  @apply grid min-w-0 gap-3 md:grid-cols-2;
}

.number-demo-row {
  @apply grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3;
}
</style>
