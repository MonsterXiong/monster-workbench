<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const closableAlertVisible = ref(true);
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="提示条" subtitle="页面级、表单级和局部区域的轻量反馈。" icon="BellRing">
      <div class="feedback-grid">
        <BaseAlert type="info" title="信息提示" description="用于中性说明、上下文解释和非阻断提示。" />
        <BaseAlert type="success" title="成功提示" description="用于保存成功、校验通过和任务完成。" />
        <BaseAlert type="warning" title="警告提示" description="用于风险提醒、待确认状态和临界阈值。" />
        <BaseAlert type="danger" title="危险提示" description="用于错误反馈、不可逆操作和失败状态。" />
      </div>
    </PlaygroundDemoSection>

    <PlaygroundDemoSection title="尺寸与变体" subtitle="提示条可以作为页面横幅、卡片内说明或轻量嵌入提示。" icon="Rows3">
      <div class="feedback-grid">
        <BaseAlert type="info" size="lg" variant="solid" title="发布检查通过" description="所有必需项已完成，可以继续执行下一步。">
          <template #actions>
            <BaseButton type="neutral" size="xs" outline>查看详情</BaseButton>
          </template>
        </BaseAlert>
        <BaseAlert type="success" title="已自动保存" description="草稿会在切换页面前保持最新。" compact />
        <BaseAlert type="warning" title="配额接近上限" description="建议清理历史缓存或调整任务批次。" icon="Gauge">
          <template #actions>
            <BaseButton type="warning" size="xs">处理</BaseButton>
          </template>
        </BaseAlert>
        <BaseAlert type="info" variant="plain" title="嵌入提示" description="plain 形态适合放入已有卡片或表单正文。" :show-icon="false" />
      </div>
    </PlaygroundDemoSection>

    <PlaygroundDemoSection title="横幅与长文案" subtitle="页面级横幅、左侧强调线和底部动作适合承载更完整的提示信息。" icon="Megaphone">
      <div class="dialog-demo-stack">
        <BaseAlert
          type="info"
          variant="outline"
          title="页面横幅"
          description="banner 形态适合放在页面或面板顶部，弱化卡片感，只保留边界与语义色。"
          banner
          accent
        />
        <BaseAlert
          type="warning"
          title="长说明提示"
          description="这是一段较长的提示说明，用于验证提示条在窄屏或复杂表单中是否能够稳定换行，并通过最大行数控制避免占用过多纵向空间。"
          wrap-title
          wrap-description
          :max-description-lines="2"
          actions-placement="bottom"
          accent
        >
          <template #actions>
            <BaseButton type="warning" size="xs">立即处理</BaseButton>
            <BaseButton type="neutral" size="xs" outline>稍后提醒</BaseButton>
          </template>
        </BaseAlert>
        <BaseAlert
          type="success"
          variant="outline"
          title="垂直居中提示"
          description="align=center 适合单行动作说明，图标与正文垂直居中。"
          align="center"
          role="note"
          actions-label="垂直居中提示操作"
        >
          <template #actions>
            <BaseBadge type="success" variant="outline">已启用</BaseBadge>
          </template>
        </BaseAlert>
        <BaseAlert
          type="info"
          title="动作区换行"
          description="当右侧动作较多或容器较窄时，按钮会稳定换行，不会挤压正文或溢出面板。"
          wrap-description
          actions-label="动作区换行提示操作"
        >
          <template #actions>
            <BaseButton type="primary" size="xs">查看详情</BaseButton>
            <BaseButton type="neutral" size="xs" outline>同步策略</BaseButton>
            <BaseButton type="neutral" size="xs" outline>忽略本次</BaseButton>
          </template>
        </BaseAlert>
        <BaseAlert
          type="info"
          variant="plain"
          description="仅描述提示可以通过 aria-label 补充可访问名称，适合表单辅助说明和局部状态说明。"
          aria-label="仅描述提示"
          role="note"
          :show-icon="false"
          wrap-description
        />
      </div>
    </PlaygroundDemoSection>

    <PlaygroundDemoSection title="可关闭提示" subtitle="支持 v-model 控制可见性，适合一次性提醒。" icon="X">
      <div class="demo-actions">
        <BaseButton type="neutral" size="sm" @click="closableAlertVisible = true">重新显示</BaseButton>
        <BaseBadge type="neutral">visible: {{ closableAlertVisible ? "true" : "false" }}</BaseBadge>
      </div>
      <BaseAlert
        v-model="closableAlertVisible"
        type="warning"
        title="需要确认"
        description="关闭后父级状态会同步更新。"
        closable
        @close="triggerToast('提示已关闭', 'info')"
      >
        可关闭提示可以放入额外内容，补充操作建议或风险说明。
      </BaseAlert>
      <BaseAlert
        class="mt-3"
        type="danger"
        title="流程锁定"
        description="禁用态会保留内容，但关闭按钮不会触发事件。"
        closable
        disabled
        aria-label="流程锁定提示"
      />
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

.feedback-grid {
  @apply grid min-w-0 gap-3 lg:grid-cols-2;
}

.dialog-demo-stack {
  @apply grid min-w-0 gap-3;
}
</style>
