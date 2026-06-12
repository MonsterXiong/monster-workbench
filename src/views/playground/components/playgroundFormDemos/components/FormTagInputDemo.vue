<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const tagValues = ref(["组件", "沙箱", "高频"]);
const duplicateTagValues = ref(["Vue", "Vue", "Tauri"]);
const limitedTagValues = ref(["表单", "校验", "状态"]);
const compactTagValues = ref(["紧凑", "错误"]);
const collapsedTagValues = ref(["Element Plus", "BaseTagInput", "Playground", "封装", "稳定"]);
const draggableTagValues = ref(["待办", "进行中", "复核", "完成"]);
const customSeparatorTagValues = ref(["标签", "分隔", "粘贴"]);
const emptyTagValues = ref<string[]>([]);
const customSeparators = [",", "，", ";", "；", "|", "\n"];
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
          <BaseFormItem label="迷你标签" description="适合更紧凑的设置面板和侧栏表单。">
            <BaseTagInput v-model="compactTagValues" size="xs" clearable :max="4" placeholder="迷你标签" />
          </BaseFormItem>
          <BaseFormItem label="大尺寸成功态" description="适合更宽松的表单和详情页。">
            <BaseTagInput v-model="tagValues" size="lg" success clearable :max="8" placeholder="添加能力标签" />
          </BaseFormItem>
          <BaseFormItem label="允许重复" description="用于权重、投票、路径片段等允许重复值的场景。">
            <BaseTagInput v-model="duplicateTagValues" allow-duplicates clearable :max="8" placeholder="允许重复标签" />
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
</style>
