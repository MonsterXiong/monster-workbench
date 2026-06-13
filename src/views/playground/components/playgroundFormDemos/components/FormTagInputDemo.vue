<script setup lang="ts">
import { ref } from "vue";
import BaseTagInput from "../../../../../components/common/BaseTagInput.vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const tagValues = ref(["组件", "沙箱", "高频"]);
const duplicateTagValues = ref(["Vue", "Vue", "Tauri"]);
const spaceTriggerTagValues = ref(["快捷", "空格"]);
const semanticTagValues = ref(["稳定", "可复用", "Element Plus"]);
const limitedTagValues = ref(["表单", "校验", "状态"]);
const compactTagValues = ref(["紧凑", "错误"]);
const collapsedTagValues = ref(["Element Plus", "BaseTagInput", "Playground", "封装", "稳定"]);
const draggableTagValues = ref(["待办", "进行中", "复核", "完成"]);
const customSeparatorTagValues = ref(["标签", "分隔", "粘贴"]);
const emptyTagValues = ref<string[]>([]);
const instanceTagValues = ref(["实例", "聚焦", "清空"]);
const tagInputInstanceText = ref("等待实例操作");
const tagInputInstanceRef = ref<InstanceType<typeof BaseTagInput> | null>(null);
const customSeparators = [",", "，", ";", "；", "|", "\n"];

function handleDragTag(_oldIndex: number, _newIndex: number, value: string) {
  triggerToast(`已移动标签：${value}`, "info");
}

function readTagInputElement() {
  const element = tagInputInstanceRef.value?.getElement();
  tagInputInstanceText.value = element ? `DOM: ${element.tagName.toLowerCase()}.${element.classList[0] || "root"}` : "未读取到 DOM";
}

function focusTagInput() {
  const element = tagInputInstanceRef.value?.focus();
  tagInputInstanceText.value = element ? `Focus: ${element.tagName.toLowerCase()}` : "未找到输入框";
}

function clearTagInput() {
  const values = tagInputInstanceRef.value?.clear();
  tagInputInstanceText.value = values ? `已清空，剩余 ${values.length} 个` : "清空失败";
}
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="标签输入" subtitle="标签添加、粘贴拆分、折叠、拖拽排序、重复策略、清空和状态反馈。" icon="Tags">
      <div class="form-demo-stack">
        <BaseForm title="标签输入状态" description="覆盖常规输入、折叠、拖拽、分隔符、清空、成功、错误、加载、只读和禁用。" :columns="2" divided body-gap="lg">
          <BaseFormItem label="常规标签" description="回车、逗号、中文逗号或粘贴多项都可以添加。" success="可继续添加">
            <BaseTagInput
              v-model="tagValues"
              clearable
              clear-label="清空常规标签"
              :max="6"
              placeholder="输入标签，逗号或回车添加"
              @add="triggerToast(`已添加标签：${$event}`, 'success')"
              @remove="triggerToast(`已移除标签：${$event}`, 'info')"
              @clear="triggerToast('已清空标签', 'info')"
            />
          </BaseFormItem>
          <BaseFormItem label="实例能力" description="外部可以读取 DOM、聚焦输入框和清空标签。" :span="2">
            <div class="tag-instance-panel">
              <BaseTagInput
                ref="tagInputInstanceRef"
                v-model="instanceTagValues"
                data-native-tag-input-ref="base-tag-input-instance"
                clearable
                :max="6"
                placeholder="实例能力标签"
              />
              <div class="tag-instance-actions">
                <div class="tag-instance-copy">
                  <BaseIcon name="Workflow" size="14" aria-hidden="true" />
                  <span>{{ tagInputInstanceText }}</span>
                </div>
                <div class="tag-instance-buttons">
                  <BaseButton size="xs" type="secondary" outline @click="readTagInputElement">DOM</BaseButton>
                  <BaseButton size="xs" type="secondary" outline @click="focusTagInput">Focus</BaseButton>
                  <BaseButton size="xs" type="secondary" outline @click="clearTagInput">Clear</BaseButton>
                </div>
              </div>
            </div>
          </BaseFormItem>
          <BaseFormItem label="迷你标签" description="适合更紧凑的设置面板和侧栏表单。">
            <BaseTagInput v-model="compactTagValues" size="xs" clearable :max="4" placeholder="迷你标签" />
          </BaseFormItem>
          <BaseFormItem label="大尺寸成功态" description="适合更宽松的表单和详情页。">
            <BaseTagInput v-model="tagValues" size="lg" success clearable :max="8" placeholder="添加能力标签" />
          </BaseFormItem>
          <BaseFormItem label="允许重复" description="用于权重、投票、路径片段等允许重复值的场景。">
            <BaseTagInput v-model="duplicateTagValues" allow-duplicates clearable :max="8" placeholder="允许重复标签" />
          </BaseFormItem>
          <BaseFormItem label="空格触发" description="可切换 Element Plus 的 trigger，适合关键字快速录入。">
            <BaseTagInput
              v-model="spaceTriggerTagValues"
              trigger="Space"
              tag-type="primary"
              tag-effect="plain"
              clearable
              :max="6"
              placeholder="输入后按空格添加"
            />
          </BaseFormItem>
          <BaseFormItem label="语义标签" description="标签类型、效果和折叠 tooltip 主题都可由外部配置。">
            <BaseTagInput
              v-model="semanticTagValues"
              tag-type="success"
              tag-effect="light"
              effect="dark"
              collapse-tags
              :max-collapse-tags="2"
              :max="8"
              maxlength="16"
              placeholder="最多 16 字符"
            />
          </BaseFormItem>
          <BaseFormItem label="折叠标签" description="标签很多时优先展示前几个，悬停再展开查看全部。">
            <BaseTagInput
              v-model="collapsedTagValues"
              clearable
              collapse-tags
              :max-collapse-tags="2"
              :max="8"
              placeholder="多标签会自动折叠"
            />
          </BaseFormItem>
          <BaseFormItem label="可拖拽排序" description="拖动标签即可调整顺序，适合状态、权重和路径片段。">
            <BaseTagInput
              v-model="draggableTagValues"
              clearable
              draggable
              :max="8"
              placeholder="拖动标签调整顺序"
              @drag-tag="handleDragTag"
            />
          </BaseFormItem>
          <BaseFormItem label="自定义分隔符" description="支持分号、竖线和换行粘贴拆分。">
            <BaseTagInput
              v-model="customSeparatorTagValues"
              clearable
              :separators="customSeparators"
              :max="8"
              placeholder="输入 A;B|C 后回车"
            />
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
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.form-demo-stack {
  @apply grid gap-4;
}

.tag-instance-panel {
  @apply grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950;
}

.tag-instance-actions {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2;
}

.tag-instance-copy {
  @apply flex min-w-0 items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.tag-instance-copy span {
  @apply min-w-0 truncate;
}

.tag-instance-buttons {
  @apply flex shrink-0 flex-wrap items-center gap-2;
}
</style>
