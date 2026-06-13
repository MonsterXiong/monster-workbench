<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import BaseDialog from "../../../../../components/common/BaseDialog.vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const dialogOpen = ref(false);
const compactDialogOpen = ref(false);
const loadingDialogOpen = ref(false);
const fullscreenDialogOpen = ref(false);
const actionDialogOpen = ref(false);
const lockedDialogOpen = ref(false);
const nativeDialogOpen = ref(false);
const nativeDialogRef = ref<InstanceType<typeof BaseDialog> | null>(null);
const nativeDialogMethodText = ref("等待实例方法触发");

const formItemName = ref("Monster Workbench");
const formItemDescription = ref("用于承载高频表单字段的标签、说明、校验反馈和辅助信息。");
const selectVal = ref("vue");

const selectOptions = [
  { value: "vue", label: "Vue 3" },
  { value: "tauri", label: "Tauri v2" },
  { value: "design-system", label: "Design System" },
];

const detailCardItems = [
  { key: "owner", label: "负责人", value: "组件平台", status: "success" as const },
  { key: "category", label: "分类", value: "反馈浮层" },
  { key: "updated", label: "更新时间", value: "2026-06-08" },
];

const openNativeDialogViaRef = () => {
  nativeDialogMethodText.value = "通过 open() 打开，并保持 v-model 同步";
  nativeDialogRef.value?.open();
};

const resetNativeDialogPosition = () => {
  nativeDialogRef.value?.resetPosition();
  nativeDialogMethodText.value = "已调用 resetPosition() 重置拖拽位置";
};

const readNativeDialogElement = () => {
  nativeDialogMethodText.value = nativeDialogRef.value?.getElement() ? "已读取弹窗 DOM 根节点" : "弹窗 DOM 尚未挂载";
};

const closeNativeDialogViaRef = () => {
  nativeDialogMethodText.value = "通过 handleClose() 请求关闭";
  nativeDialogRef.value?.handleClose();
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="对话框" subtitle="用于小范围确认、编辑和上下文表单。" icon="PanelTopOpen">
      <div class="demo-actions">
        <BaseButton type="primary" @click="dialogOpen = true">打开对话框</BaseButton>
        <BaseButton type="neutral" @click="compactDialogOpen = true">紧凑确认</BaseButton>
        <BaseButton type="neutral" @click="loadingDialogOpen = true">加载弹窗</BaseButton>
        <BaseButton type="neutral" @click="actionDialogOpen = true">头部动作</BaseButton>
        <BaseButton type="neutral" @click="lockedDialogOpen = true">关闭锁定</BaseButton>
        <BaseButton type="neutral" @click="openNativeDialogViaRef">原生能力</BaseButton>
        <BaseButton type="neutral" @click="fullscreenDialogOpen = true">全屏弹窗</BaseButton>
        <BaseBadge type="neutral">open: {{ dialogOpen ? "true" : "false" }}</BaseBadge>
      </div>
      <BasePanel title="对话框触发区" subtitle="对话框内容使用现有表单、警告和动作条组合。">
        <div class="dialog-demo-stack">
          <BaseAlert type="info" title="演示说明" description="点击按钮打开对话框，关闭后会触发 close 事件。" />
          <BaseAlert type="success" title="能力覆盖" description="支持描述、尺寸、加载、全屏、自定义宽度、页脚状态和关闭策略。" compact />
        </div>
      </BasePanel>
      <BaseDialog
        v-model="dialogOpen"
        title="编辑组件信息"
        description="对话框适合短表单、确认操作和上下文编辑。"
        width="560px"
        :close-on-click-modal="false"
        body-label="编辑组件信息表单"
        footer-label="编辑组件信息操作"
        close-label="关闭编辑组件信息"
        @close="triggerToast('对话框已关闭', 'info')"
      >
        <BaseForm title="基础信息" description="对话框适合承载短表单。" :columns="2" compact>
          <BaseFormItem label="组件名称" required>
            <BaseInput v-model="formItemName" />
          </BaseFormItem>
          <BaseFormItem label="分类">
            <BaseSelect v-model="selectVal" :options="selectOptions" />
          </BaseFormItem>
          <BaseFormItem label="说明" :span="2">
            <BaseTextarea v-model="formItemDescription" :rows="3" resize="none" />
          </BaseFormItem>
        </BaseForm>
        <template #footer>
          <BaseButton type="neutral" size="sm" @click="dialogOpen = false">取消</BaseButton>
          <BaseButton type="primary" size="sm" @click="dialogOpen = false">保存</BaseButton>
        </template>
      </BaseDialog>
      <BaseDialog
        v-model="compactDialogOpen"
        title="确认归档组件"
        description="紧凑对话框适合二次确认和轻量说明。"
        size="sm"
        role="alertdialog"
        close-label="关闭归档确认"
        footer-label="归档确认操作"
        @close="triggerToast('确认弹窗已关闭', 'info')"
      >
        <BaseAlert type="warning" title="归档后仍可恢复" description="归档不会删除组件数据，但会从默认列表中隐藏。" compact />
        <template #footer>
          <BaseButton type="neutral" size="sm" @click="compactDialogOpen = false">取消</BaseButton>
          <BaseButton type="warning" size="sm" @click="compactDialogOpen = false">确认归档</BaseButton>
        </template>
      </BaseDialog>
      <BaseDialog
        v-model="loadingDialogOpen"
        title="加载组件详情"
        description="loading 会在正文顶部展示稳定骨架，页脚也可以展示确认中状态。"
        size="lg"
        loading
        confirm-loading
        loading-text="加载组件配置"
        confirm-loading-text="同步中"
      >
        <BaseDescriptionList aria-label="加载前的组件摘要" :items="detailCardItems" :columns="3" compact />
        <template #footer>
          <BaseButton type="neutral" size="sm" @click="loadingDialogOpen = false">关闭</BaseButton>
          <BaseButton type="primary" size="sm" loading>保存中</BaseButton>
        </template>
      </BaseDialog>
      <BaseDialog
        v-model="actionDialogOpen"
        title="很长的对话框标题可以按需换行并保持头部操作区稳定"
        description="适合资源名称较长、策略说明较完整的弹窗，头部动作与关闭按钮不会挤压标题。"
        icon="Settings2"
        show-icon
        wrap-title
        wrap-description
        actions-label="头部动作弹窗操作"
        close-label="关闭头部动作弹窗"
        footer-align="between"
        body-label="头部动作弹窗内容"
        footer-label="头部动作弹窗页脚"
      >
        <template #actions>
          <BaseBadge type="primary" variant="outline">Beta</BaseBadge>
          <BaseButton type="neutral" size="xs" outline @click="triggerToast('打开帮助文档', 'info')">帮助</BaseButton>
        </template>
        <BaseAlert type="info" title="头部动作" description="actions 插槽适合状态徽标、帮助入口或轻量操作。" compact />
        <template #footer>
          <BaseButton type="neutral" size="sm" @click="actionDialogOpen = false">取消</BaseButton>
          <BaseButton type="primary" size="sm" @click="actionDialogOpen = false">保存配置</BaseButton>
        </template>
      </BaseDialog>
      <BaseDialog
        v-model="lockedDialogOpen"
        title="处理中关闭锁定"
        description="异步保存或提交时可以锁定遮罩、ESC 和关闭按钮，避免误关造成状态不明确。"
        icon="ShieldAlert"
        show-icon
        confirm-loading
        confirm-loading-text="保存中"
        lock-close-on-loading
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        role="alertdialog"
        actions-label="关闭锁定弹窗操作"
        close-label="关闭锁定弹窗"
        footer-align="between"
      >
        <BaseAlert type="warning" title="关闭已锁定" description="右上角关闭按钮会禁用，业务仍可以通过明确按钮结束流程。" compact />
        <template #footer>
          <BaseBadge type="warning" variant="outline">confirmLoading</BaseBadge>
          <BaseButton type="primary" size="sm" @click="lockedDialogOpen = false">完成并关闭</BaseButton>
        </template>
      </BaseDialog>
      <BaseDialog
        ref="nativeDialogRef"
        v-model="nativeDialogOpen"
        title="原生能力对话框"
        description="透传 Element Plus alignCenter、draggable、overflow、openDelay、closeDelay、appendTo 和焦点控制。"
        class="feedback-dialog-demo__native"
        data-native-dialog-ref="base-dialog-instance"
        icon="Move"
        show-icon
        size="lg"
        align-center
        draggable
        overflow
        trap-focus
        :open-delay="80"
        :close-delay="60"
        append-to="body"
        modal-class="base-dialog-modal--playground"
        body-label="原生能力对话框内容"
        footer-label="原生能力对话框操作"
        @open="triggerToast('原生能力对话框开始打开', 'info')"
        @opened="triggerToast('原生能力对话框已打开', 'success')"
      >
        <BaseAlert
          type="info"
          title="可拖拽与居中"
          description="标题区域可拖拽，overflow 打开后可拖出视窗边界，适合调试或对比窗口。"
          compact
        />
        <BaseAlert type="success" title="实例方法" :description="nativeDialogMethodText" compact />
        <BaseDescriptionList aria-label="原生对话框能力" :items="detailCardItems" :columns="3" compact />
        <template #footer>
          <BaseBadge type="primary" variant="outline">draggable</BaseBadge>
          <BaseButton type="neutral" size="sm" @click="readNativeDialogElement">读取 DOM</BaseButton>
          <BaseButton type="neutral" size="sm" @click="resetNativeDialogPosition">重置位置</BaseButton>
          <BaseButton type="primary" size="sm" @click="closeNativeDialogViaRef">实例关闭</BaseButton>
        </template>
      </BaseDialog>
      <BaseDialog
        v-model="fullscreenDialogOpen"
        title="全屏配置"
        description="全屏弹窗适合大表单、复杂配置和需要更多上下文的编辑流。"
        fullscreen
        :close-on-click-modal="false"
      >
        <BaseForm title="发布配置" description="全屏模式下仍复用表单、提示条和动作区。" :columns="2">
          <BaseFormItem label="组件名称" required>
            <BaseInput v-model="formItemName" />
          </BaseFormItem>
          <BaseFormItem label="技术栈">
            <BaseSelect v-model="selectVal" :options="selectOptions" />
          </BaseFormItem>
          <BaseFormItem label="说明" :span="2">
            <BaseTextarea v-model="formItemDescription" :rows="4" resize="none" />
          </BaseFormItem>
        </BaseForm>
        <template #footer>
          <BaseButton type="neutral" size="sm" @click="fullscreenDialogOpen = false">关闭</BaseButton>
          <BaseButton type="primary" size="sm" @click="fullscreenDialogOpen = false">保存配置</BaseButton>
        </template>
      </BaseDialog>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.demo-actions {
  @apply mb-4 flex flex-wrap items-center gap-2;
}

.dialog-demo-stack {
  @apply grid min-w-0 gap-3;
}
</style>
