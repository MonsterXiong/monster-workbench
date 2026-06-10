<script setup lang="ts">
import { useToast } from "../../../../../composables/useToast";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="空态错误" subtitle="空数据和错误反馈要给出明确状态、说明和下一步动作。" icon="CircleOff">
      <div class="empty-demo-grid">
        <BasePanel title="标准空态" subtitle="适合搜索无结果、列表初始态和数据未接入场景。">
          <BaseEmpty
            title="暂无匹配组件"
            description="当前筛选条件下暂无组件，可以调整关键词或新建组件。"
            icon="FolderOpen"
            icon-tone="primary"
            surface="muted"
            bordered
            min-height="260px"
            actions-label="空结果操作"
          >
            <BaseButton type="primary" size="sm">新建组件</BaseButton>
            <BaseButton type="neutral" size="sm">重置筛选</BaseButton>
          </BaseEmpty>
        </BasePanel>
        <BasePanel title="完成空态" subtitle="成功态和大尺寸适合引导页、完成页和空看板。">
          <BaseEmpty
            title="当前筛选已覆盖全部组件"
            description="所有高频基础控件都已经完成首轮审查，可继续切换到数据展示、表单输入或布局容器分类继续补齐。"
            icon="CheckCircle2"
            icon-tone="success"
            size="lg"
            surface="card"
            bordered
            min-height="260px"
            actions-label="完成态操作"
          >
            <BaseButton type="success" size="sm">继续审查</BaseButton>
            <BaseButton type="neutral" size="sm" outline>查看记录</BaseButton>
          </BaseEmpty>
        </BasePanel>
        <BasePanel title="嵌入空态" subtitle="紧凑尺寸可放入表格、详情卡、抽屉和局部面板。">
          <div class="empty-demo-stack">
            <BaseEmpty
              title="暂无审计记录"
              description="当前组件还没有发布、变更或权限调整记录。"
              icon="Inbox"
              size="sm"
              compact
              align="start"
              surface="plain"
              aria-label="暂无审计记录"
              actions-label="审计记录操作"
            >
              <BaseButton type="neutral" size="xs" outline>查看规则</BaseButton>
            </BaseEmpty>
            <BaseEmpty
              title="模板未启用"
              description="该区域会在开启布局模板后展示可复用配置。"
              icon="LayoutTemplate"
              icon-tone="warning"
              size="sm"
              surface="card"
              bordered
              compact
            />
          </div>
        </BasePanel>
        <BasePanel title="权限与禁用" subtitle="权限为空或只读状态可以保留原因说明，但禁用交互入口。">
          <BaseEmpty
            title="暂无访问权限"
            description="当前账号没有查看该组件分组的权限，请联系管理员开通。"
            icon="LockKeyhole"
            icon-tone="danger"
            surface="muted"
            bordered
            disabled
            actions-label="权限申请操作"
          >
            <BaseButton type="danger" size="sm">申请权限</BaseButton>
          </BaseEmpty>
        </BasePanel>
        <BasePanel title="错误反馈" subtitle="覆盖标准重试、紧凑提示、禁用错误和嵌入面板。">
          <div class="error-demo-stack">
            <BaseError
              title="加载组件失败"
              message="请检查本地 service 状态，或稍后重新尝试。"
              show-retry
              retry-text="重新加载"
              surface="muted"
              bordered
              min-height="220px"
              extra-label="错误代码"
              @retry="triggerToast('重新加载组件列表', 'info')"
            >
              <BaseBadge type="danger" variant="outline">ERR_COMPONENT_LOAD</BaseBadge>
            </BaseError>
            <div class="error-demo-inline-grid">
              <BaseError
                title="配置暂不可用"
                message="当前模板缺少必要字段，补齐后可继续保存。"
                icon="TriangleAlert"
                tone="warning"
                align="start"
                surface="plain"
                compact
                show-retry
                retry-text="检查配置"
                extra-label="配置错误标记"
                @retry="triggerToast('检查配置项', 'info')"
              >
                <BaseBadge type="warning" variant="outline">WARN_SCHEMA</BaseBadge>
              </BaseError>
              <BaseError
                title="同步任务返回了非常长的错误标题但仍然需要保持卡片内部换行稳定"
                message="错误详情包含组件路径、筛选条件、运行环境和本地服务状态等较长内容时，标题与说明应当在容器内部自然换行，不挤压按钮，也不产生横向滚动。"
                icon="AlertTriangle"
                tone="danger"
                surface="muted"
                compact
                show-retry
                retry-text="重新同步"
                extra-label="长错误标记"
                @retry="triggerToast('重新同步任务', 'info')"
              >
                <BaseBadge type="danger" variant="outline">ERR_SYNC_LONG_MESSAGE</BaseBadge>
              </BaseError>
              <BaseError
                title="同步已暂停"
                message="流程锁定期间不会自动重试。"
                icon="CirclePause"
                tone="neutral"
                surface="card"
                bordered
                disabled
                compact
                show-retry
                retry-text="继续同步"
                aria-label="同步已暂停"
              />
            </div>
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

.empty-demo-grid {
  @apply grid min-w-0 gap-3 xl:grid-cols-2;
}

.empty-demo-stack {
  @apply grid min-w-0 gap-3;
}

.error-demo-stack {
  @apply grid min-w-0 gap-3;
}

.error-demo-inline-grid {
  @apply grid min-w-0 gap-3 lg:grid-cols-2;
}
</style>
