<script setup lang="ts">
import { ref } from "vue";
import { useMessage } from "../../../composables/useMessage";
import { useToast } from "../../../composables/useToast";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const { triggerToast } = useToast();
const { triggerMessage } = useMessage();

const closableAlertVisible = ref(true);
const dialogOpen = ref(false);
const compactDialogOpen = ref(false);
const loadingDialogOpen = ref(false);
const fullscreenDialogOpen = ref(false);
const actionDialogOpen = ref(false);
const lockedDialogOpen = ref(false);
const drawerOpen = ref(false);
const leftDrawerOpen = ref(false);
const loadingDrawerOpen = ref(false);
const actionDrawerOpen = ref(false);
const lockedDrawerOpen = ref(false);
const formItemName = ref("Monster Workbench");
const formItemDescription = ref("用于承载高频表单字段的标签、说明、校验反馈和辅助信息。");
const selectVal = ref("vue");
const searchValue = ref("组件");

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
</script>

<template>
  <section v-if="activeComponentKey === 'alert'" class="detail-stack">
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

  <section v-else-if="activeComponentKey === 'toast-message'" class="detail-stack">
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

  <section v-else-if="activeComponentKey === 'dialog'" class="detail-stack">
    <PlaygroundDemoSection title="对话框" subtitle="用于小范围确认、编辑和上下文表单。" icon="PanelTopOpen">
      <div class="demo-actions">
        <BaseButton type="primary" @click="dialogOpen = true">打开对话框</BaseButton>
        <BaseButton type="neutral" @click="compactDialogOpen = true">紧凑确认</BaseButton>
        <BaseButton type="neutral" @click="loadingDialogOpen = true">加载弹窗</BaseButton>
        <BaseButton type="neutral" @click="actionDialogOpen = true">头部动作</BaseButton>
        <BaseButton type="neutral" @click="lockedDialogOpen = true">关闭锁定</BaseButton>
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
        footer-align="between"
        body-label="头部动作弹窗内容"
        footer-label="头部动作弹窗页脚"
      >
        <template #actions>
          <BaseBadge type="primary" variant="outline">Beta</BaseBadge>
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
        footer-align="between"
      >
        <BaseAlert type="warning" title="关闭已锁定" description="右上角关闭按钮会禁用，业务仍可以通过明确按钮结束流程。" compact />
        <template #footer>
          <BaseBadge type="warning" variant="outline">confirmLoading</BaseBadge>
          <BaseButton type="primary" size="sm" @click="lockedDialogOpen = false">完成并关闭</BaseButton>
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

  <section v-else-if="activeComponentKey === 'drawer'" class="detail-stack">
    <PlaygroundDemoSection title="抽屉" subtitle="适合详情、筛选、设置和不中断页面上下文的编辑。" icon="PanelRightOpen">
      <div class="demo-actions">
        <BaseButton type="primary" @click="drawerOpen = true">右侧抽屉</BaseButton>
        <BaseButton type="neutral" @click="leftDrawerOpen = true">左侧抽屉</BaseButton>
        <BaseButton type="neutral" @click="loadingDrawerOpen = true">加载抽屉</BaseButton>
        <BaseButton type="neutral" @click="actionDrawerOpen = true">头部动作</BaseButton>
        <BaseButton type="neutral" @click="lockedDrawerOpen = true">关闭锁定</BaseButton>
      </div>
      <div class="dialog-demo-stack">
        <BaseDetailCard
          title="抽屉触发内容"
          description="抽屉打开后不会替换当前页面，适合保留列表上下文。"
          icon="PanelRightOpen"
          status="可交互"
          status-type="success"
          :items="detailCardItems"
          compact
        />
        <BaseAlert type="info" title="能力覆盖" description="支持左右方向、尺寸、遮罩关闭策略、ESC、加载态、关闭锁定、页脚处理中和焦点回退。" compact />
      </div>

      <BaseDrawer
        v-model="drawerOpen"
        title="组件详情"
        description="支持说明、ESC 关闭、遮罩关闭策略和页脚动作。"
        icon="PanelRightOpen"
        show-icon
        size="lg"
        footer-align="between"
        body-label="组件详情抽屉内容"
        footer-label="组件详情抽屉页脚"
        @close="triggerToast('右侧抽屉已关闭', 'info')"
      >
        <template #actions>
          <BaseBadge type="primary" variant="outline">Detail</BaseBadge>
        </template>
        <BaseDetailCard
          title="BaseDrawer"
          description="右侧抽屉适合详情查看和局部编辑。"
          icon="PanelRightOpen"
          status="右侧"
          status-type="primary"
          :items="detailCardItems"
          compact
        />
        <template #footer>
          <BaseBadge type="neutral" variant="outline">lg / right</BaseBadge>
          <BaseFormActions compact :divided="false" justify="end">
            <BaseButton type="neutral" size="sm" @click="drawerOpen = false">关闭</BaseButton>
            <BaseButton type="primary" size="sm" @click="drawerOpen = false">保存</BaseButton>
          </BaseFormActions>
        </template>
      </BaseDrawer>

      <BaseDrawer
        v-model="leftDrawerOpen"
        title="筛选设置"
        description="左侧抽屉可用于导航筛选和批量配置。"
        icon="Filter"
        show-icon
        placement="left"
        width="max-w-sm"
        :close-on-overlay="false"
        body-label="筛选设置抽屉内容"
      >
        <BaseForm title="筛选条件" description="左侧抽屉适合导航、筛选和资源选择。" compact>
          <BaseFormItem label="关键词">
            <BaseInput v-model="searchValue" />
          </BaseFormItem>
          <BaseFormItem label="组件分类">
            <BaseSelect v-model="selectVal" :options="selectOptions" />
          </BaseFormItem>
        </BaseForm>
        <template #footer>
          <BaseFormActions compact :divided="false">
            <BaseButton type="neutral" size="sm" @click="leftDrawerOpen = false">重置</BaseButton>
            <BaseButton type="primary" size="sm" @click="leftDrawerOpen = false">应用</BaseButton>
          </BaseFormActions>
        </template>
      </BaseDrawer>

      <BaseDrawer
        v-model="loadingDrawerOpen"
        title="加载资源详情"
        description="loading 和 confirmLoading 可以稳定住异步抽屉布局。"
        icon="LoaderCircle"
        show-icon
        size="xl"
        loading
        confirm-loading
        loading-text="加载资源详情"
        confirm-loading-text="保存中"
        footer-align="between"
        :close-on-overlay="false"
        body-label="加载资源抽屉内容"
        footer-label="加载资源抽屉页脚"
      >
        <BaseDescriptionList aria-label="加载前的资源摘要" :items="detailCardItems" :columns="3" compact />
        <template #footer>
          <BaseBadge type="primary" variant="outline">loading</BaseBadge>
          <BaseButton type="primary" size="sm" loading>保存中</BaseButton>
        </template>
      </BaseDrawer>

      <BaseDrawer
        v-model="actionDrawerOpen"
        title="很长的抽屉标题可以按需换行并保持头部动作区稳定"
        description="适合资源名称较长、策略说明较完整的详情抽屉，头部动作与关闭按钮不会挤压标题。"
        icon="Settings2"
        show-icon
        wrap-title
        wrap-description
        size="lg"
        footer-align="between"
        body-label="头部动作抽屉内容"
        footer-label="头部动作抽屉页脚"
      >
        <template #actions>
          <BaseBadge type="primary" variant="outline">Beta</BaseBadge>
        </template>
        <BaseAlert type="info" title="头部动作" description="actions 插槽适合状态徽标、帮助入口或轻量操作。" compact />
        <BaseDescriptionList aria-label="头部动作能力摘要" :items="detailCardItems" :columns="2" compact />
        <template #footer>
          <BaseBadge type="neutral" variant="outline">wrap</BaseBadge>
          <BaseFormActions compact :divided="false" justify="end">
            <BaseButton type="neutral" size="sm" @click="actionDrawerOpen = false">取消</BaseButton>
            <BaseButton type="primary" size="sm" @click="actionDrawerOpen = false">保存配置</BaseButton>
          </BaseFormActions>
        </template>
      </BaseDrawer>

      <BaseDrawer
        v-model="lockedDrawerOpen"
        title="处理中关闭锁定"
        description="异步保存或提交时可以锁定遮罩、ESC 和关闭按钮，避免误关造成状态不明确。"
        icon="ShieldAlert"
        show-icon
        confirm-loading
        confirm-loading-text="保存中"
        lock-close-on-loading
        :close-on-overlay="false"
        :close-on-esc="false"
        footer-align="between"
        body-label="关闭锁定抽屉内容"
        footer-label="关闭锁定抽屉页脚"
      >
        <BaseAlert type="warning" title="关闭已锁定" description="右上角关闭按钮会禁用，业务仍可以通过明确按钮结束流程。" compact />
        <template #footer>
          <BaseBadge type="warning" variant="outline">confirmLoading</BaseBadge>
          <BaseButton type="primary" size="sm" @click="lockedDrawerOpen = false">完成并关闭</BaseButton>
        </template>
      </BaseDrawer>
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

.feedback-action-row {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}

.dialog-demo-stack {
  @apply grid min-w-0 gap-3;
}
</style>
