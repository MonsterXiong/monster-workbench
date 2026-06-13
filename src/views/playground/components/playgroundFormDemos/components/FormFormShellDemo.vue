<script setup lang="ts">
import type { FormRules } from "element-plus";
import { reactive, ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const textValue = ref("Monster Workbench");
const selectValue = ref("design-system");
const numberValue = ref(36);
const tagValues = ref(["组件", "沙箱", "高频"]);
const textareaValue = ref("用于承载高频表单字段的标签、说明、校验反馈和辅助信息。");
const segmentedValue = ref("balanced");
const switchValue = ref(true);
const codeValue = ref("base-form-item");
const formInstanceText = ref("等待实例操作");
const validationFormRef = ref<{
  getNativeForm: () => unknown;
  getElement: () => HTMLElement | null;
  validate: () => Promise<boolean> | undefined;
  resetFields: () => void;
  clearValidate: () => void;
  scrollToField: (prop: string) => void;
} | null>(null);
const nativeValidationFormRef = ref<{
  validate: () => Promise<boolean> | undefined;
  resetFields: () => void;
} | null>(null);
const validationModel = reactive({
  componentName: "",
  componentCode: "base-form",
  category: "",
});
const nativeValidationModel = reactive({
  owner: "",
  category: "",
});
const validationErrors = reactive<Record<string, string>>({
  componentName: "",
  componentCode: "",
  category: "",
});

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

const segmentedOptions = [
  { label: "紧凑", value: "compact", icon: "Rows3", description: "适合侧栏与抽屉。", meta: "S" },
  { label: "均衡", value: "balanced", icon: "PanelTop", description: "默认桌面密度。", meta: "M" },
  { label: "宽松", value: "comfortable", icon: "Maximize2", description: "适合复杂表单。", meta: "L" },
  { label: "停用", value: "disabled", icon: "Lock", description: "权限不足不可选。", meta: "禁用", disabled: true },
];

const validationRules: FormRules<typeof validationModel> = {
  componentName: [{ required: true, message: "请输入组件名称。", trigger: "blur" }],
  componentCode: [
    { required: true, message: "请输入字段编码。", trigger: "blur" },
    { pattern: /^[a-z][a-z0-9-]*$/, message: "仅允许小写字母、数字和连字符，并以字母开头。", trigger: "blur" },
  ],
  category: [{ required: true, message: "请选择组件分类。", trigger: "change" }],
};

const nativeValidationRules: FormRules<typeof nativeValidationModel> = {
  owner: [{ required: true, message: "请输入负责人。", trigger: "blur" }],
  category: [{ required: true, message: "请选择组件分类。", trigger: "change" }],
};

const handleSubmit = () => {
  triggerToast("表单已提交", "success");
};

const handleReset = () => {
  codeValue.value = "base-form-item";
  triggerToast("表单已重置", "info");
};

const handleValidationEvent = (prop: string | string[], isValid: boolean, message: string) => {
  const key = Array.isArray(prop) ? prop.join(".") : prop;
  validationErrors[key] = isValid ? "" : message;
};

const validatePlaygroundForm = async () => {
  try {
    const valid = await validationFormRef.value?.validate();
    if (valid) {
      Object.keys(validationErrors).forEach((key) => {
        validationErrors[key] = "";
      });
    }
    triggerToast(valid ? "校验通过" : "仍有字段需要处理", valid ? "success" : "warning");
  } catch {
    triggerToast("仍有字段需要处理", "warning");
  }
};

const readFormElement = () => {
  const element = validationFormRef.value?.getElement();
  formInstanceText.value = element ? `DOM: ${element.tagName.toLowerCase()}.${element.classList[0] || "root"}` : "未读取到 DOM";
};

const scrollToComponentName = () => {
  validationFormRef.value?.scrollToField("componentName");
  formInstanceText.value = "已滚动到：组件名称";
};

const resetPlaygroundForm = () => {
  validationFormRef.value?.resetFields();
  Object.keys(validationErrors).forEach((key) => {
    validationErrors[key] = "";
  });
  triggerToast("校验表单已重置", "info");
};

const clearPlaygroundValidation = () => {
  validationFormRef.value?.clearValidate();
  Object.keys(validationErrors).forEach((key) => {
    validationErrors[key] = "";
  });
  triggerToast("校验状态已清空", "info");
};

const validateNativeForm = async () => {
  try {
    const valid = await nativeValidationFormRef.value?.validate();
    triggerToast(valid ? "原生校验通过" : "原生校验未通过", valid ? "success" : "warning");
  } catch {
    triggerToast("原生校验未通过", "warning");
  }
};
</script>

<template>
  <section class="detail-stack">
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
          ref="validationFormRef"
          data-native-form-ref="base-form-instance"
          title="校验表单"
          description="接入 Element Plus rules、prop、validate、resetFields 和 clearValidate。"
          :model="validationModel"
          :rules="validationRules"
          :columns="3"
          status-icon
          scroll-to-error
          divided
          no-validate
          wrap-description
          @validate="handleValidationEvent"
        >
          <template #actions>
            <BaseBadge type="primary" variant="outline">Rules</BaseBadge>
          </template>
          <BaseFormItem
            label="组件名称"
            prop="componentName"
            required
            help="失焦或点击校验时触发必填规则。"
            :error="validationErrors.componentName"
          >
            <BaseInput v-model="validationModel.componentName" clearable placeholder="例如 BaseForm" />
          </BaseFormItem>
          <BaseFormItem
            label="组件编码"
            prop="componentCode"
            required
            help="仅允许小写字母、数字和连字符。"
            :error="validationErrors.componentCode"
          >
            <BaseInput v-model="validationModel.componentCode" clearable />
          </BaseFormItem>
          <BaseFormItem
            label="组件分类"
            prop="category"
            required
            help="选择类控件可通过 change 触发规则。"
            :error="validationErrors.category"
          >
            <BaseSelect v-model="validationModel.category" :options="selectOptions" placeholder="选择分类" />
          </BaseFormItem>
          <template #footer>
            <div class="form-instance-stack">
              <div class="form-instance-panel">
                <div class="form-instance-copy">
                  <BaseIcon name="Workflow" size="14" aria-hidden="true" />
                  <span>实例能力</span>
                  <strong>{{ formInstanceText }}</strong>
                </div>
                <div class="form-instance-actions">
                  <BaseButton type="secondary" size="xs" outline @click="readFormElement">读取 DOM</BaseButton>
                  <BaseButton type="secondary" size="xs" outline @click="scrollToComponentName">滚动字段</BaseButton>
                  <BaseButton type="secondary" size="xs" outline @click="clearPlaygroundValidation">清空校验</BaseButton>
                </div>
              </div>
              <BaseFormActions title="实例方法" description="通过 ref 调用 validate、resetFields、clearValidate 和 scrollToField。" :divided="false">
                <BaseButton type="neutral" size="sm" @click="resetPlaygroundForm">重置字段</BaseButton>
                <BaseButton type="primary" size="sm" @click="validatePlaygroundForm">触发校验</BaseButton>
              </BaseFormActions>
            </div>
          </template>
        </BaseForm>

        <BaseForm
          ref="nativeValidationFormRef"
          title="原生校验消息"
          description="需要 Element Plus 原生错误消息时，Form 和 FormItem 都可以显式打开 show-message。"
          :model="nativeValidationModel"
          :rules="nativeValidationRules"
          :columns="2"
          label-suffix="："
          show-message
          inline-message
          validate-on-rule-change
          status-icon
          scroll-to-error
          :scroll-into-view-options="{ block: 'center', behavior: 'smooth' }"
          no-validate
          wrap-description
        >
          <BaseFormItem label="负责人" prop="owner" required show-message inline-message>
            <BaseInput v-model="nativeValidationModel.owner" clearable validate-event placeholder="输入负责人" />
          </BaseFormItem>
          <BaseFormItem label="组件分类" prop="category" required show-message inline-message>
            <BaseSelect v-model="nativeValidationModel.category" :options="selectOptions" validate-event placeholder="选择分类" />
          </BaseFormItem>
          <template #footer>
            <BaseFormActions compact justify="end" :divided="false">
              <BaseButton type="neutral" size="sm" @click="nativeValidationFormRef?.resetFields()">重置</BaseButton>
              <BaseButton type="primary" size="sm" @click="validateNativeForm">触发原生校验</BaseButton>
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
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.form-demo-stack {
  @apply grid gap-4;
}

.form-instance-stack {
  @apply grid gap-3;
}

.form-instance-panel {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.form-instance-copy {
  @apply flex min-w-0 items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.form-instance-copy strong {
  @apply min-w-0 truncate text-slate-800 dark:text-slate-100;
}

.form-instance-actions {
  @apply flex shrink-0 flex-wrap items-center gap-2;
}
</style>
