<script setup lang="ts">
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const formatShardProgress = ({ value, percent }: { value: number; percent: number }) => `${value} / 240 个分片 · ${percent}%`;
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="进度条" subtitle="任务执行、容量占用、导入导出和发布进度都可以复用。" icon="ChartNoAxesColumnIncreasing">
      <div class="progress-demo-grid">
        <BasePanel title="状态进度" subtitle="不同语义色用于不同任务阶段。" divided>
          <div class="progress-stack">
            <p id="progress-a11y-hint" class="sr-only">进度条会关联可见标题和说明，支持外部说明、确定进度和不确定进度。</p>
            <BaseProgress
              id="typecheck-progress"
              label="类型校验"
              description="vue-tsc 通过。"
              :value="100"
              type="success"
              surface="muted"
              bordered
              aria-describedby="progress-a11y-hint"
            />
            <BaseProgress label="架构检查" description="分层红线通过。" :value="100" type="primary" striped />
            <BaseProgress label="视觉复核" description="浏览器验证进行中。" :value="62" type="warning" />
            <BaseProgress label="异常任务" description="失败项需要重新处理。" :value="18" type="danger" size="sm" />
          </div>
        </BasePanel>
        <BasePanel title="缓冲与不确定态" subtitle="适合上传、下载、排队和后台同步。" divided>
          <div class="progress-stack">
            <BaseProgress label="资源上传" description="已上传 42%，本地缓冲 68%。" :value="42" :buffer-value="68" type="primary" striped value-text="42% / 缓冲 68%" />
            <BaseProgress label="等待队列" description="等待远端服务返回执行进度。" indeterminate type="neutral" value-text="排队中" :animated="false" />
            <BaseProgress label="同步状态" description="loading 会设置 aria-busy，并进入不确定态。" loading type="primary" status-text="同步中" live />
            <BaseProgress label="容量占用" description="缓存目录已接近上限。" :value="86" type="warning" size="lg" surface="card" bordered />
          </div>
        </BasePanel>
        <BasePanel title="环形与仪表盘" subtitle="复用 Element Plus circle / dashboard，保留统一语义色和尺寸。" divided>
          <div class="progress-ring-grid">
            <BaseProgress
              class="progress-ring-item"
              label="资产同步"
              description="圆形进度适合仪表摘要。"
              shape="circle"
              :value="76"
              value-placement="track"
              type="primary"
            />
            <BaseProgress
              class="progress-ring-item"
              label="健康度"
              description="仪表盘用于容量、质量分或健康分。"
              shape="dashboard"
              :value="88"
              value-placement="track"
              type="success"
              status-text="良好"
            />
            <BaseProgress
              class="progress-ring-item"
              label="发布窗口"
              description="支持自定义直径和端点样式。"
              shape="circle"
              :value="42"
              :width="96"
              stroke-linecap="butt"
              value-placement="both"
              type="warning"
            />
            <BaseProgress
              class="progress-ring-item"
              label="风险占比"
              description="危险态仍走统一色板。"
              shape="dashboard"
              :value="18"
              size="sm"
              value-placement="track"
              type="danger"
            />
          </div>
        </BasePanel>
        <BasePanel title="尺寸与禁用" subtitle="紧凑条适合列表，禁用态适合锁定流程。" divided>
          <div class="progress-stack">
            <BaseProgress label="XS 细条" :value="35" size="xs" :show-value="false" aria-label="XS 细条进度" />
            <BaseProgress label="紧凑任务" description="用于表格行和侧栏摘要。" :value="54" size="sm" compact surface="muted" bordered />
            <BaseProgress label="静态条纹" description="低动效或静态截图时可关闭条纹动画。" :value="46" type="primary" striped :animated="false" />
            <BaseProgress label="流程锁定" description="权限不足时保留当前进度。" :value="72" type="neutral" disabled />
          </div>
        </BasePanel>
        <BasePanel title="长文案与内嵌值" subtitle="支持区间、精度、换行和轨道内数值。" divided>
          <div class="progress-stack">
            <BaseProgress
              label="跨环境资源初始化进度会在标题较长时自动换行并保持数值区稳定"
              description="适合导入、发布、迁移这类说明较长的任务，说明最多显示两行，避免把面板撑得过高。"
              :value="37.6"
              :min="20"
              :max="80"
              :precision="1"
              wrap-label
              wrap-description
              surface="muted"
              bordered
            />
            <BaseProgress
              label="发布流水线"
              description="轨道内展示当前百分比，适合空间较紧的任务行。"
              :value="72"
              type="success"
              size="lg"
              value-placement="track"
              aria-value-text="发布流水线进度 72%，预计 2 分钟完成"
            />
            <BaseProgress
              label="导入任务"
              description="头部和轨道同时显示，用于强调关键任务。"
              :value="48"
              type="primary"
              size="lg"
              striped
              value-placement="both"
              value-text="48% 已导入"
            />
          </div>
        </BasePanel>
        <BasePanel title="边界与格式化" subtitle="覆盖上下限、无可见标签、隐藏数值和自定义展示。" divided>
          <div class="progress-stack">
            <BaseProgress
              label="低于下限"
              description="视觉宽度会归零，ARIA 仍暴露真实区间。"
              :value="-20"
              :min="0"
              :max="100"
              value-placement="none"
              aria-value-text="低于下限，已按 0 处理"
            />
            <BaseProgress
              :value="128"
              :min="0"
              :max="100"
              aria-label="无标题后台任务进度"
              value-text="超过上限，按 100%"
              type="warning"
            />
            <BaseProgress
              label="固定区间"
              description="min 与 max 相同时保持结构稳定。"
              :value="5"
              :min="5"
              :max="5"
              status-text="无区间"
              type="neutral"
            />
            <BaseProgress
              label="分片导入"
              description="formatValue 可按业务单位展示。"
              :value="128"
              :min="0"
              :max="240"
              :format-value="formatShardProgress"
              type="primary"
            />
            <div class="progress-narrow-demo">
              <BaseProgress
                label="窄容器长值"
                description="超长数值文本会截断，不撑破侧栏。"
                :value="64"
                value-placement="track"
                value-text="64% 已完成，剩余 12 个资源等待同步"
                type="success"
                size="lg"
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

.progress-stack {
  @apply flex min-w-0 flex-col gap-4;
}

.progress-demo-grid {
  @apply grid min-w-0 gap-4 xl:grid-cols-2;
}

.progress-ring-grid {
  @apply grid min-w-0 gap-4 sm:grid-cols-2;
}

.progress-ring-item {
  @apply min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.progress-narrow-demo {
  @apply w-full max-w-[220px];
}
</style>
