<script setup lang="ts">
import { useMessage } from "../../../../../composables/useMessage";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();
const { triggerMessage } = useMessage();
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="轻提示" subtitle="Toast 适合一次性结果反馈，Message 适合顶部队列提示。" icon="MessageSquare">
      <div class="feedback-grid">
        <BasePanel title="底部 Toast" subtitle="单条全局提示，适合保存、复制、触发动作后的即时反馈。">
          <div class="feedback-action-row">
            <BaseButton type="primary" size="sm" @click="triggerToast('操作已完成', 'success')">成功 Toast</BaseButton>
            <BaseButton type="warning" size="sm" @click="triggerToast('需要检查配置', 'warning')">警告 Toast</BaseButton>
            <BaseButton type="danger" size="sm" @click="triggerToast('任务执行失败', 'error')">错误 Toast</BaseButton>
            <BaseButton
              type="neutral"
              size="sm"
              @click="triggerToast('组件配置已写入本地草稿。', 'success', { title: '保存成功', icon: 'Save', closable: true })"
            >
              带标题
            </BaseButton>
            <BaseButton
              type="primary"
              size="sm"
              @click="triggerToast('新的组件示例已经生成。', 'info', { title: '生成完成', actionText: '查看', onAction: () => triggerMessage('已打开生成结果', 'info') })"
            >
              带动作
            </BaseButton>
            <BaseButton
              type="danger"
              size="sm"
              @click="triggerToast('远程同步失败，可以稍后重新触发。', 'error', { title: '同步失败', duration: 0, closable: true, actionText: '重试', onAction: () => triggerMessage('已重新加入同步队列', 'warning') })"
            >
              常驻错误
            </BaseButton>
            <BaseButton
              type="neutral"
              size="sm"
              @click="triggerToast('导出任务已加入后台队列。', { type: 'info', title: '后台导出', description: '右下角 Toast 支持辅助说明、进度条和长文案换行。', duration: 4200, closable: true, showProgress: true, wrap: true })"
            >
              说明进度
            </BaseButton>
          </div>
        </BasePanel>

        <BasePanel title="顶部 Message" subtitle="支持队列、主动关闭和不同语义状态。">
          <div class="feedback-action-row">
            <BaseButton type="success" size="sm" @click="triggerMessage('队列消息：同步完成', 'success')">成功消息</BaseButton>
            <BaseButton type="neutral" size="sm" @click="triggerMessage('队列消息：正在处理', 'info', 0)">常驻消息</BaseButton>
            <BaseButton type="warning" size="sm" @click="triggerMessage('队列消息：存在待确认项', 'warning')">警告消息</BaseButton>
            <BaseButton
              type="primary"
              size="sm"
              @click="triggerMessage('类型与架构检查均已通过。', 'success', { title: '质量门禁', icon: 'ShieldCheck', actionText: '查看', onAction: () => triggerToast('打开验证结果', 'info') })"
            >
              带动作消息
            </BaseButton>
            <BaseButton
              type="danger"
              size="sm"
              @click="triggerMessage('远程服务暂时不可用，请稍后重试。', 'error', { title: '同步失败', duration: 5000, actionText: '重试', onAction: () => triggerToast('重新同步', 'info') })"
            >
              错误消息
            </BaseButton>
            <BaseButton
              type="neutral"
              size="sm"
              @click="triggerMessage('后台任务仍在队列中运行。', 'info', { title: '队列运行中', duration: 0, closable: false, icon: 'LoaderCircle' })"
            >
              不可关闭
            </BaseButton>
            <BaseButton
              type="neutral"
              size="sm"
              @click="triggerMessage('导入任务正在后台执行，完成后会自动刷新当前列表。', 'info', { title: '队列进度', description: '顶部 Message 支持说明文字、倒计时进度条和长文案换行。', duration: 4500, showProgress: true, wrap: true, actionText: '查看队列', onAction: () => triggerToast('已打开任务队列', 'info') })"
            >
              进度消息
            </BaseButton>
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

.feedback-grid {
  @apply grid min-w-0 gap-3 lg:grid-cols-2;
}

.feedback-action-row {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}
</style>
