<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../composables/useToast";
import { joinFileNames, joinLines } from "../../../utils";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const { triggerToast } = useToast();

const uploadSummary = ref("尚未选择文件");
const uploadRejectSummary = ref("暂无拒绝记录");

const codeSnippet = `const panel = {
  component: "BaseResizablePanels",
  min: 18,
  max: 72,
  handle: "hover-highlight"
};`;

const longCodeSnippet = joinLines([
  "export const playgroundRoute = {",
  "  path: '/playground',",
  "  meta: {",
  "    title: '组件沙箱',",
  "    requiresDesktopShell: false,",
  "    description: 'A very long description should wrap inside the code surface instead of forcing the detail panel to scroll sideways when the layout becomes narrow.'",
  "  }",
  "};",
]);

const logSnippet = joinLines([
  "[09:16:12] START component-audit",
  "[09:16:13] CHECK BaseCodeBlock wrap=true",
  "[09:16:14] PASS line-highlight copyable empty loading",
]);

const syncSnippet = joinLines(["{", '  "status": "syncing"', "}"]);

const handleUploadSelect = (files: FileList) => {
  uploadSummary.value = joinFileNames(files);
  triggerToast(`已选择 ${files.length} 个文件`, "success");
};

const handleUploadReject = (payload: { reason: string; files: File[] }) => {
  const reasonMap: Record<string, string> = {
    accept: "类型不匹配",
    "max-files": "数量超限",
    "max-size": "大小超限",
  };
  uploadRejectSummary.value = `${reasonMap[payload.reason] ?? "未通过"}：${joinFileNames(payload.files) || "无文件名"}`;
  triggerToast(uploadRejectSummary.value, "warning");
};

const handleCopyError = () => {
  triggerToast("复制失败，请检查浏览器权限", "warning");
};
</script>

<template>
  <section v-if="activeComponentKey === 'stat-card'" class="detail-stack">
    <PlaygroundDemoSection title="统计卡片" subtitle="用于工作台、列表摘要和任务看板顶部指标。" icon="ChartNoAxesColumnIncreasing">
      <div class="stat-grid">
        <BaseStatCard
          label="已接入"
          value="36"
          description="已进入组件沙箱"
          icon="CheckCircle2"
          trend="75%"
          trend-direction="up"
          type="success"
          clickable
          @click="triggerToast('查看已接入组件', 'info')"
        />
        <BaseStatCard label="待完善" value="8" description="交互和状态补齐" icon="CircleAlert" trend="本周" type="warning" surface="muted" />
        <BaseStatCard label="阻塞项" value="1" description="等待真实窗口复核" icon="Bug" trend="1" trend-direction="down" type="danger" />
        <BaseStatCard label="分类数" value="10" description="细粒度组件目录" icon="Boxes" trend="稳定" type="primary" size="lg" />
        <BaseStatCard label="覆盖率" value="92" unit="%" description="公共组件展示覆盖" icon="ChartNoAxesColumnIncreasing" trend="+12%" trend-direction="up" type="primary" />
        <BaseStatCard label="加载中" value="--" description="等待统计接口返回" icon="LoaderCircle" trend="Loading" loading compact />
        <BaseStatCard label="只读指标" value="18" suffix=" 项" description="权限不足时不可点击" icon="Lock" trend="Readonly" disabled clickable type="neutral" />
        <BaseStatCard label="Plain 指标" value="4" description="无边框表面适合嵌套在面板内部" icon="FileText" trend="plain" surface="plain" type="neutral" />
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'info-card'" class="detail-stack">
    <PlaygroundDemoSection title="信息卡片" subtitle="适合功能入口、状态说明、设置项和资源摘要。" icon="Info">
      <div class="demo-grid">
        <BaseInfoCard
          title="组件沙箱"
          description="承载公共组件的完整能力展示，按分类进入单组件详情。"
          icon="Boxes"
          meta="Playground"
          clickable
          @click="triggerToast('打开组件沙箱入口', 'info')"
        >
          <BaseDescriptionList
            :items="[
              { key: 'state', label: '状态', value: '持续完善', status: 'primary' },
              { key: 'scope', label: '范围', value: 'Base* / App*' },
            ]"
            compact
          />
          <template #actions>
            <BaseButton type="ghost" size="sm">查看</BaseButton>
          </template>
        </BaseInfoCard>

        <BaseInfoCard
          title="发布检查"
          description="信息卡可以承载警告、成功、危险等语义，保持统一密度。"
          icon="ShieldCheck"
          meta="Ready"
          type="success"
          compact
        >
          <BaseBadge type="success" variant="outline">类型检查通过</BaseBadge>
        </BaseInfoCard>

        <BaseInfoCard
          title="风险提示"
          description="危险语义用于不可逆操作、失败状态和需要用户关注的资源。"
          icon="TriangleAlert"
          meta="High"
          type="danger"
          surface="muted"
        >
          <BaseBadge type="danger" variant="outline">需要复核</BaseBadge>
        </BaseInfoCard>

        <BaseInfoCard
          title="等待处理"
          description="警告语义适合待审核、待同步和配置不完整的状态。"
          icon="Clock3"
          meta="Pending"
          type="warning"
          size="lg"
        />

        <BaseInfoCard
          title="纵向信息卡"
          description="纵向布局适合窄侧栏、移动视图和图标作为主视觉的入口。"
          icon="PanelTop"
          type="neutral"
          orientation="vertical"
          compact
        >
          <BaseStatusDot type="primary" label="可用于侧栏" description="窄容器友好" />
        </BaseInfoCard>

        <BaseInfoCard
          title="加载中"
          description="保持卡片高度和结构，等待远程数据返回。"
          icon="LoaderCircle"
          meta="Loading"
          loading
        >
          <BaseSkeletonCard compact />
        </BaseInfoCard>

        <BaseInfoCard
          title="禁用入口"
          description="权限不足时保留入口说明，但禁止触发点击。"
          icon="Lock"
          meta="Readonly"
          clickable
          disabled
        />

        <BaseInfoCard
          title="Plain 嵌套"
          description="无边框表面适合嵌在 BasePanel、BasePageShell 或详情卡内部。"
          icon="FileText"
          surface="plain"
          type="neutral"
        >
          <BaseDescriptionList
            :items="[
              { key: 'surface', label: '表面', value: 'plain' },
              { key: 'border', label: '边框', value: '无', status: 'success' },
            ]"
            compact
          />
        </BaseInfoCard>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'avatar-divider'" class="detail-stack">
    <PlaygroundDemoSection title="头像分隔" subtitle="成员身份、状态点和内容区分隔是详情页和协作区高频组合。" icon="Users">
      <BasePanel title="协作成员" subtitle="头像支持尺寸、姓名首字母和在线状态。">
        <div class="avatar-row">
          <BaseAvatar name="刘雄成" status="online" size="lg" />
          <BaseAvatar name="Design System" status="busy" />
          <BaseAvatar name="AI" status="offline" size="sm" />
          <BaseBadge type="success" variant="outline">在线</BaseBadge>
        </div>
        <BaseDivider label="分组" />
        <div class="divider-preview">
          <span>基础信息</span>
          <BaseDivider direction="vertical" />
          <span>操作状态</span>
          <BaseDivider direction="vertical" dashed />
          <span>审查记录</span>
        </div>
        <BaseDivider label="虚线形态" dashed align="start" />
      </BasePanel>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'code-copy'" class="detail-stack">
    <PlaygroundDemoSection title="代码复制" subtitle="代码片段、命令、配置预览和一键复制常常一起出现。" icon="Code2">
      <div class="demo-grid">
        <BasePanel title="配置片段" subtitle="标题、语言、行号、高亮行和内置复制。">
          <BaseCodeBlock
            :code="codeSnippet"
            language="ts"
            title="panel.config.ts"
            description="可用于配置、命令和 JSON 片段。"
            copyable
            :highlight-lines="[2, 4]"
            @copied="triggerToast('代码已复制', 'success')"
            @copy-error="handleCopyError"
          />
        </BasePanel>

        <BasePanel title="长行换行" subtitle="wrap=true 时长行不会撑出内容区域。">
          <BaseCodeBlock
            :code="longCodeSnippet"
            language="ts"
            title="route.ts"
            max-height="180px"
            wrap
            copyable
            :line-number-start="12"
            @copied="triggerToast('长代码已复制', 'success')"
            @copy-error="handleCopyError"
          />
        </BasePanel>

        <BasePanel title="日志片段" subtitle="支持隐藏行号和更紧凑的展示密度。">
          <BaseCodeBlock
            :code="logSnippet"
            language="log"
            title="audit.log"
            size="sm"
            :show-line-numbers="false"
            max-height="110px"
          />
        </BasePanel>

        <BasePanel title="状态展示" subtitle="空态和加载态保持代码块结构稳定。">
          <div class="code-demo-stack">
            <BaseCodeBlock code="" title="empty.json" language="json" empty-text="暂无配置内容" max-height="92px" />
            <BaseCodeBlock
              :code="syncSnippet"
              title="sync.json"
              language="json"
              loading
              loading-text="同步中"
              max-height="112px"
            />
          </div>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'tooltip-upload'" class="detail-stack">
    <PlaygroundDemoSection title="悬浮提示" subtitle="工具提示补充短说明，支持方向、禁用和多行文案。" icon="MessageCircleQuestion">
      <BasePanel title="悬浮提示" subtitle="四个方向都可用于图标按钮和紧凑工具条。">
        <div class="tooltip-row">
          <BaseTooltip content="顶部提示">
            <BaseButton type="neutral" size="sm">Top</BaseButton>
          </BaseTooltip>
          <BaseTooltip content="右侧提示支持长文案换行，适合解释紧凑图标按钮。" placement="right" multiline>
            <BaseButton type="neutral" size="sm">Right</BaseButton>
          </BaseTooltip>
          <BaseTooltip content="底部提示" placement="bottom">
            <BaseButton type="neutral" size="sm">Bottom</BaseButton>
          </BaseTooltip>
          <BaseTooltip content="禁用提示" disabled>
            <BaseButton type="neutral" size="sm">Disabled</BaseButton>
          </BaseTooltip>
        </div>
      </BasePanel>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'upload'" class="detail-stack">
    <PlaygroundDemoSection title="文件上传" subtitle="点击选择、拖拽、类型/数量/大小限制与上传状态。" icon="UploadCloud">
      <div class="demo-grid">
        <BasePanel title="基础上传" subtitle="支持点击选择和拖拽选择，业务侧接收 FileList。">
          <BaseUpload
            title="拖拽文件到这里"
            description="支持图片、JSON、Markdown 等常见资源文件。"
            accept=".png,.jpg,.jpeg,.json,.md"
            :max-files="3"
            :max-size="1048576"
            multiple
            @select="handleUploadSelect"
            @reject="handleUploadReject"
          />
          <div class="upload-alert-stack">
            <BaseAlert type="info" :title="uploadSummary" description="选择结果会通过 select 事件交给业务侧。" compact />
            <BaseAlert type="warning" :title="uploadRejectSummary" description="类型、数量或大小不符合时会触发 reject 事件。" compact />
          </div>
        </BasePanel>

        <BasePanel title="状态反馈" subtitle="加载、成功、错误、紧凑和禁用状态都由组件统一表达。">
          <div class="upload-demo-stack">
            <BaseUpload
              title="正在上传"
              description="上传中会锁定点击、拖拽和键盘触发。"
              loading
              loading-text="上传中"
              size="sm"
            />
            <BaseUpload
              title="上传完成"
              description="成功态适合展示已完成或已同步的资源。"
              success
              success-text="资源已同步"
              compact
              :show-helper="false"
            />
            <BaseUpload
              title="上传失败"
              description="错误态用于类型不支持、容量过大或服务异常。"
              error
              error-text="文件超过限制"
              helper="请重新选择 1MB 以内文件"
            />
            <BaseUpload
              title="禁用上传"
              description="权限不足时保留上传说明但不可操作。"
              disabled
              accept=".zip"
              :max-files="1"
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

.stat-grid {
  @apply grid gap-4 sm:grid-cols-2 xl:grid-cols-4;
}

.avatar-row,
.tooltip-row,
.divider-preview {
  @apply flex min-w-0 flex-wrap items-center gap-3;
}

.divider-preview {
  @apply text-xs font-bold text-slate-500 dark:text-slate-400;
}

.upload-demo-stack,
.upload-alert-stack,
.code-demo-stack {
  @apply grid gap-3;
}
</style>
