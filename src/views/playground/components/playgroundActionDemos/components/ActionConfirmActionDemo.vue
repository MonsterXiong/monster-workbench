<script setup lang="ts">
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const handleConfirmAction = (label: string) => {
  triggerToast(`已确认：${label}`, "success");
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="确认动作" subtitle="把二次确认弹窗和按钮状态封装在一起，业务侧只接收确认后的动作。" icon="ShieldAlert">
      <div class="demo-grid">
        <BasePanel title="危险操作" subtitle="删除、强制清理等不可逆动作使用 danger 语义。">
          <div class="action-row">
            <BaseConfirmAction
              label="删除组件"
              title="确认删除组件？"
              message="删除后将无法恢复，请确认是否继续。"
              confirm-text="确认删除"
              cancel-text="再想想"
              danger
              icon="Trash2"
              aria-label="删除组件确认"
              @open="triggerToast('打开删除确认', 'info')"
              @cancel="triggerToast('已取消删除', 'info')"
              @confirm="handleConfirmAction('删除组件')"
            />
            <BaseConfirmAction
              label="清理缓存"
              title="确认清理缓存？"
              message="将清除当前组件沙箱的临时缓存，不影响源文件。"
              type="warning"
              @confirm="handleConfirmAction('清理缓存')"
            />
            <BaseConfirmAction
              label="强制删除"
              title="强制删除组件？"
              message="该操作会绕过回收站并移除当前组件配置，请输入确认词后继续。"
              confirm-text="确认强制删除"
              cancel-text="取消操作"
              confirm-keyword="DELETE"
              confirm-input-label="输入 DELETE 确认"
              confirm-input-hint="为避免误操作，请输入 DELETE 后再确认。"
              danger
              icon="ShieldAlert"
              @confirm="handleConfirmAction('强制删除')"
            />
          </div>
        </BasePanel>

        <BasePanel title="普通确认" subtitle="归档、重置、发布前确认等可恢复动作。">
          <div class="action-row">
            <BaseConfirmAction
              label="归档组件"
              title="确认归档？"
              message="归档后仍可在历史列表中恢复。"
              type="neutral"
              outline
              @confirm="handleConfirmAction('归档组件')"
            />
            <BaseConfirmAction
              label="已禁用"
              title="不可用动作"
              message="禁用状态不会触发确认弹窗。"
              type="neutral"
              disabled
            />
          </div>
        </BasePanel>

        <BasePanel title="长文案与状态" subtitle="长标题、换行消息、加载态和块级按钮。">
          <div class="confirm-action-stack">
            <BaseConfirmAction
              label="长文案确认"
              title="确认同步一个跨工作区且名称非常长的组件配置？"
              message="该操作会同步 workspace://components/action/BaseConfirmAction/very-long-resource-name 的配置。\n请确认当前筛选、权限和目标工作区都已经检查完成。"
              confirm-text="确认同步"
              cancel-text="返回检查"
              type="primary"
              icon="RefreshCw"
              block
              @confirm="handleConfirmAction('长文案同步')"
            />
            <BaseConfirmAction
              label="提交中"
              title="保存提交"
              message="加载态下不会打开确认弹窗。"
              type="neutral"
              loading
              button-title="确认动作提交中"
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

.action-row {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}

.confirm-action-stack {
  @apply grid min-w-0 gap-3;
}
</style>
