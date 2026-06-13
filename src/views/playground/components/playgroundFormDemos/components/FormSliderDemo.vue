<script setup lang="ts">
import { ref } from "vue";
import { formatNumber } from "../../../../../utils";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const sliderValue = ref(36);
const numberValue = ref(36);
const volumeValue = ref(64);
const rangeValue = ref([24, 64]);
const verticalValue = ref(42);
const sliderInstanceText = ref("等待实例操作");
const sliderInstanceRef = ref<{
  getNativeSlider: () => unknown;
  getElement: () => HTMLElement | null;
  getTrackElement: () => HTMLElement | null;
  getThumbElement: (index?: number) => HTMLElement | null;
  focusThumb: (index?: number) => HTMLElement | null;
} | null>(null);

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

const readSliderElement = () => {
  const element = sliderInstanceRef.value?.getElement();
  sliderInstanceText.value = element ? `DOM: ${element.tagName.toLowerCase()}.${element.classList[0] || "root"}` : "未读取到 DOM";
};

const readSliderTrack = () => {
  const element = sliderInstanceRef.value?.getTrackElement();
  sliderInstanceText.value = element ? `Track: ${element.tagName.toLowerCase()}.${element.classList[0] || "track"}` : "未读取到轨道";
};

const focusSliderThumb = () => {
  const element = sliderInstanceRef.value?.focusThumb();
  sliderInstanceText.value = element ? `聚焦: ${element.getAttribute("role") || element.tagName.toLowerCase()}` : "未找到滑块手柄";
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="滑块" subtitle="比例、阈值、并发、音量和图像参数等数值调节都适合使用。" icon="SlidersHorizontal">
      <div class="demo-grid">
        <BasePanel title="范围与刻度" subtitle="展示单位、格式化数值、刻度和 hover 聚焦反馈。">
          <p id="slider-keyboard-hint" class="sr-only">滑块支持方向键、PageUp、PageDown、Home 和 End 调整数值。</p>
          <BaseSlider
            ref="sliderInstanceRef"
            id="panel-width-slider"
            data-native-slider-ref="base-slider-instance"
            name="panelWidth"
            v-model="sliderValue"
            label="面板宽度"
            description="拖动调整目标比例。"
            :min="18"
            :max="72"
            :step="2"
            unit="%"
            :marks="sliderMarks"
            show-stops
            tooltip-placement="bottom"
            aria-describedby="slider-keyboard-hint"
          />
          <div class="slider-instance-panel">
            <div class="slider-instance-copy">
              <BaseIcon name="Workflow" size="14" aria-hidden="true" />
              <span>实例能力</span>
              <strong>{{ sliderInstanceText }}</strong>
            </div>
            <div class="slider-instance-actions">
              <BaseButton size="xs" type="secondary" outline @click="readSliderElement">读取 DOM</BaseButton>
              <BaseButton size="xs" type="secondary" outline @click="readSliderTrack">读取轨道</BaseButton>
              <BaseButton size="xs" type="secondary" outline @click="focusSliderThumb">聚焦手柄</BaseButton>
            </div>
          </div>
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
            <BaseSlider
              v-model="numberValue"
              compact
              label="内置数字输入"
              description="直接启用 Element Plus 的 showInput，用于轻量配置场景。"
              :min="1"
              :max="100"
              :step="1"
              show-input
              :show-input-controls="false"
              :show-range="false"
              size="sm"
            />
            <BaseSlider
              v-model="rangeValue"
              compact
              range
              label="范围选择"
              description="复用 Element Plus range，用于区间、阈值和裁剪范围。"
              :min="0"
              :max="100"
              :step="4"
              unit="%"
              range-start-label="最小阈值"
              range-end-label="最大阈值"
              :show-range="false"
            />
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
              show-stops
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
            <BaseSlider
              v-model="verticalValue"
              compact
              vertical
              label="竖向滑块"
              description="适合音量、透明度和窄侧栏参数。"
              :min="0"
              :max="100"
              unit="%"
              height="168px"
              :show-range="false"
            />
          </div>
        </BasePanel>
        <BasePanel title="紧凑、只读与禁用" subtitle="适合卡片、侧栏和不可编辑状态。">
          <div class="field-stack">
            <BaseSlider :model-value="18" compact size="xs" label="迷你滑块" :min="0" :max="100" :show-value="false" :show-range="false" />
            <BaseSlider v-model="sliderValue" compact size="sm" label="紧凑滑块" :min="0" :max="100" />
            <BaseSlider :model-value="72" compact size="lg" label="宽松滑块" :min="0" :max="100" unit="%" />
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
              description="modelValue 超出范围时，轨道、显示值 and aria 会归一到最大值。"
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

.slider-instance-panel {
  @apply mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.slider-instance-copy {
  @apply flex min-w-0 items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.slider-instance-copy strong {
  @apply min-w-0 truncate text-slate-800 dark:text-slate-100;
}

.slider-instance-actions {
  @apply flex shrink-0 flex-wrap items-center gap-2;
}
</style>
