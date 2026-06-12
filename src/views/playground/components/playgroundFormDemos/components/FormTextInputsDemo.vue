<script setup lang="ts">
import { ref } from "vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const textValue = ref("Monster Workbench");
const codeValue = ref("base-form-item");
const textareaValue = ref("用于承载高频表单字段的标签、说明、校验反馈和辅助信息。");
const numberValue = ref(36);
const latencyValue = ref(2400);
const decimalNumberValue = ref(3.5);
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="文本数值" subtitle="文本、数字、长文本、错误态和禁用态是最基础的表单能力。" icon="TextCursorInput">
      <BaseForm title="输入控件" description="常规表单字段组合，覆盖尺寸、清空、错误和禁用。" :columns="2" divided>
        <BaseFormItem label="文本输入" description="支持 clearable、placeholder 和尺寸。">
          <BaseInput v-model="textValue" clearable prefix-icon="Search" placeholder="请输入应用名" />
        </BaseFormItem>
        <BaseFormItem label="数字输入" description="适合阈值、并发数、重试次数。" success="范围有效">
          <p id="number-keyboard-hint" class="sr-only">数值输入支持上下方向键步进，Home 和 End 跳转到最小值和最大值。</p>
          <BaseNumberInput
            id="component-count-input"
            v-model="numberValue"
            name="componentCount"
            block
            :min="1"
            :max="100"
            :step="5"
            unit="个"
            aria-label="组件数量"
            aria-describedby="number-keyboard-hint"
          />
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
          <div class="field-stack">
            <BaseTextarea
              v-model="textareaValue"
              size="sm"
              :autosize="{ minRows: 2, maxRows: 6 }"
              :maxlength="180"
              placeholder="输入多行内容后自动调整高度"
            />
            <BaseTextarea v-model="textareaValue" size="xs" resize="none" :rows="2" :maxlength="80" show-word-limit />
          </div>
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
              v-model="latencyValue"
              block
              :min="0"
              :max="10000"
              :step="100"
              format-value
              unit="ms"
              aria-label="请求超时时间"
              aria-describedby="number-keyboard-hint"
            />
            <BaseNumberInput
              v-model="latencyValue"
              block
              :min="0"
              :max="10000"
              :step="100"
              format-value
              loading
              unit="milliseconds"
              aria-label="加载中的请求耗时"
              aria-describedby="number-keyboard-hint"
            />
            <div class="number-demo-row">
              <BaseNumberInput v-model="numberValue" readonly unit="%" aria-label="只读百分比" />
              <BaseNumberInput v-model="numberValue" success :min="1" :max="100" unit="%" aria-label="成功百分比" />
              <BaseNumberInput v-model="numberValue" error :min="1" :max="10" aria-label="错误数值" />
            </div>
            <div class="number-demo-row">
              <BaseNumberInput :model-value="12" :min="1" :max="100" size="xs" aria-label="迷你数值" />
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
            <div class="number-demo-row">
              <BaseNumberInput
                v-model="numberValue"
                :min="0"
                :max="100"
                :step="10"
                step-strictly
                controls-position="right"
                unit="%"
                aria-label="右侧按钮严格步进"
              />
              <BaseNumberInput
                v-model="numberValue"
                :min="0"
                :max="100"
                :controls="false"
                align="left"
                value-on-clear="min"
                aria-label="无按钮左对齐数值"
              />
              <BaseNumberInput
                v-model="latencyValue"
                :min="0"
                :max="10000"
                :step="250"
                controls-position="right"
                align="right"
                format-value
                unit="ms"
                value-on-clear="max"
                aria-label="右对齐延迟配置"
              />
            </div>
          </div>
        </BaseFormItem>
      </BaseForm>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.field-stack {
  @apply flex min-w-0 flex-col gap-3;
}

.input-demo-row {
  @apply grid min-w-0 gap-3 md:grid-cols-2;
}

.number-demo-row {
  @apply grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3;
}
</style>
