<script setup lang="ts">
import type BaseFormItem from "../../../../../components/common/BaseFormItem.vue";
import { reactive, ref } from "vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const textValue = ref("Monster Workbench");
const codeValue = ref("base-form-item");
const selectValue = ref("design-system");
const tagValues = ref(["组件", "沙箱", "高频"]);
const fieldMethodItemRef = ref<InstanceType<typeof BaseFormItem> | null>(null);
const fieldMethodStatus = ref("等待字段方法");
const fieldMethodModel = reactive({
  methodName: "",
});
const fieldMethodRules = {
  methodName: [{ required: true, message: "请输入字段名称。", trigger: "change" }],
};

const validateFieldItem = async () => {
  try {
    const isValid = await fieldMethodItemRef.value?.validate("change");
    fieldMethodStatus.value = isValid === false ? "字段 validate 未通过" : "字段 validate 通过";
  } catch {
    fieldMethodStatus.value = "字段 validate 未通过";
  }
};

const clearFieldItem = () => {
  fieldMethodItemRef.value?.clearValidate();
  fieldMethodStatus.value = "已调用 clearValidate";
};

const resetFieldItem = () => {
  fieldMethodItemRef.value?.resetField();
  fieldMethodStatus.value = "已调用 resetField";
};

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
</script>

<template>
  <section class="detail-stack">
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

        <BaseForm
          title="字段级方法"
          description="BaseFormItem 透传原生属性，并通过 ref 暴露 Element Plus 字段级方法。"
          :model="fieldMethodModel"
          :rules="fieldMethodRules"
          :columns="2"
          surface="muted"
          divided
        >
          <template #actions>
            <BaseBadge type="neutral" variant="outline">{{ fieldMethodStatus }}</BaseBadge>
          </template>
          <BaseFormItem
            ref="fieldMethodItemRef"
            label="字段名称"
            prop="methodName"
            required
            show-message
            data-test-id="base-form-item-native-ref"
          >
            <BaseInput v-model="fieldMethodModel.methodName" placeholder="输入后可调用 validate" clearable />
          </BaseFormItem>
          <BaseFormItem label="方法调用" description="validate、clearValidate、resetField 均来自 el-form-item 实例。">
            <div class="method-actions">
              <BaseButton type="primary" size="sm" @click="validateFieldItem">校验字段</BaseButton>
              <BaseButton type="neutral" size="sm" outline @click="clearFieldItem">清空校验</BaseButton>
              <BaseButton type="neutral" size="sm" outline @click="resetFieldItem">重置字段</BaseButton>
            </div>
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

.field-stack {
  @apply flex min-w-0 flex-col gap-3;
}

.method-actions {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}
</style>
