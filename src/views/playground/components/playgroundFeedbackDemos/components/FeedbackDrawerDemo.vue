<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import BaseDrawer from "../../../../../components/common/BaseDrawer.vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const drawerOpen = ref(false);
const leftDrawerOpen = ref(false);
const loadingDrawerOpen = ref(false);
const actionDrawerOpen = ref(false);
const lockedDrawerOpen = ref(false);
const resizableDrawerOpen = ref(false);
const bottomDrawerOpen = ref(false);
const resizableDrawerRef = ref<InstanceType<typeof BaseDrawer> | null>(null);
const resizeSummary = ref("等待拖拽调整抽屉宽度");
const drawerMethodText = ref("等待实例方法触发");

const searchValue = ref("组件");
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

const formatDrawerSize = (size: number) => `${Math.round(size)}px`;

const handleDrawerResizeStart = (_event: MouseEvent, size: number) => {
  resizeSummary.value = `开始调整：${formatDrawerSize(size)}`;
};

const handleDrawerResize = (_event: MouseEvent, size: number) => {
  resizeSummary.value = `调整中：${formatDrawerSize(size)}`;
};

const handleDrawerResizeEnd = (_event: MouseEvent, size: number) => {
  resizeSummary.value = `调整完成：${formatDrawerSize(size)}`;
};

const openResizableDrawerViaRef = () => {
  drawerMethodText.value = "通过 open() 打开，并保持 v-model 同步";
  resizableDrawerRef.value?.open();
};

const readResizableDrawerElement = () => {
  drawerMethodText.value = resizableDrawerRef.value?.getElement() ? "已读取抽屉 DOM 根节点" : "抽屉 DOM 尚未挂载";
};

const closeResizableDrawerViaRef = () => {
  drawerMethodText.value = "通过 handleClose() 请求关闭";
  resizableDrawerRef.value?.handleClose();
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="抽屉" subtitle="适合详情、筛选、设置和不中断页面上下文的编辑。" icon="PanelRightOpen">
      <div class="demo-actions">
        <BaseButton type="primary" @click="drawerOpen = true">右侧抽屉</BaseButton>
        <BaseButton type="neutral" @click="leftDrawerOpen = true">左侧抽屉</BaseButton>
        <BaseButton type="neutral" @click="loadingDrawerOpen = true">加载抽屉</BaseButton>
        <BaseButton type="neutral" @click="actionDrawerOpen = true">头部动作</BaseButton>
        <BaseButton type="neutral" @click="lockedDrawerOpen = true">关闭锁定</BaseButton>
        <BaseButton type="neutral" @click="openResizableDrawerViaRef">可调整尺寸</BaseButton>
        <BaseButton type="neutral" @click="bottomDrawerOpen = true">底部抽屉</BaseButton>
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
        actions-label="组件详情抽屉操作"
        close-label="关闭组件详情抽屉"
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
        close-label="关闭筛选设置抽屉"
        body-label="筛选设置抽屉内容"
        footer-label="筛选设置抽屉操作"
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
        actions-label="加载资源抽屉操作"
        close-label="关闭加载资源抽屉"
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
        actions-label="头部动作抽屉操作"
        close-label="关闭头部动作抽屉"
        body-label="头部动作抽屉内容"
        footer-label="头部动作抽屉页脚"
      >
        <template #actions>
          <BaseBadge type="primary" variant="outline">Beta</BaseBadge>
          <BaseButton type="neutral" size="xs" outline @click="triggerToast('打开抽屉帮助', 'info')">帮助</BaseButton>
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
        role="alertdialog"
        :close-on-overlay="false"
        :close-on-esc="false"
        actions-label="关闭锁定抽屉操作"
        close-label="关闭锁定抽屉"
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

      <BaseDrawer
        ref="resizableDrawerRef"
        v-model="resizableDrawerOpen"
        title="可调整尺寸抽屉"
        description="透传 Element Plus resizable、resize-start、resize 和 resize-end，适合资源详情、属性面板和配置侧栏。"
        class="feedback-drawer-demo__resizable"
        data-native-drawer-ref="base-drawer-instance"
        icon="PanelRightOpen"
        show-icon
        size="lg"
        resizable
        draggable
        overflow
        trap-focus
        footer-align="between"
        body-label="可调整尺寸抽屉内容"
        footer-label="可调整尺寸抽屉操作"
        @resize-start="handleDrawerResizeStart"
        @resize="handleDrawerResize"
        @resize-end="handleDrawerResizeEnd"
      >
        <BaseAlert type="info" title="拖拽边缘调整宽度" :description="resizeSummary" compact />
        <BaseAlert type="success" title="实例方法" :description="drawerMethodText" compact />
        <BaseDescriptionList aria-label="可调整抽屉能力摘要" :items="detailCardItems" :columns="2" compact />
        <template #footer>
          <BaseBadge type="primary" variant="outline">resizable</BaseBadge>
          <BaseButton type="neutral" size="sm" @click="readResizableDrawerElement">读取 DOM</BaseButton>
          <BaseButton type="primary" size="sm" @click="closeResizableDrawerViaRef">实例关闭</BaseButton>
        </template>
      </BaseDrawer>

      <BaseDrawer
        v-model="bottomDrawerOpen"
        title="底部快速面板"
        description="placement 支持 top / bottom，适合命令输出、批量操作进度和轻量配置。"
        icon="PanelBottomOpen"
        show-icon
        placement="bottom"
        width="320px"
        :close-delay="60"
        modal-class="base-drawer-modal--playground"
        body-label="底部快速面板内容"
        footer-label="底部快速面板操作"
      >
        <BaseAlert type="success" title="底部方向" description="底部抽屉沿用相同 header、body、footer 结构和主题样式。" compact />
        <template #footer>
          <BaseButton type="neutral" size="sm" @click="bottomDrawerOpen = false">关闭</BaseButton>
          <BaseButton type="primary" size="sm" @click="bottomDrawerOpen = false">应用</BaseButton>
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

.dialog-demo-stack {
  @apply grid min-w-0 gap-3;
}
</style>
