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
const controlledTooltipOpen = ref(true);
const avatarImageSrc =
  "data:image/svg+xml;utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Crect%20width='64'%20height='64'%20rx='18'%20fill='%232563eb'/%3E%3Ccircle%20cx='32'%20cy='25'%20r='12'%20fill='white'%20opacity='.92'/%3E%3Cpath%20d='M13%2058c3-15%2013-23%2019-23s16%208%2019%2023'%20fill='white'%20opacity='.78'/%3E%3C/svg%3E";

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

const commandSnippet =
  "monster-workbench component audit --target BaseCodeBlock --mode strict --output ./reports/component-audit/code-copy/very-long-command-output.json --include-accessibility --include-overflow-check";

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
          trend-label="接入完成率 75%"
          trend-direction="up"
          type="success"
          clickable
          aria-label="查看已接入组件"
          @click="triggerToast('查看已接入组件', 'info')"
        />
        <BaseStatCard label="待完善" value="8" description="交互和状态补齐" icon="CircleAlert" trend="本周" type="warning" surface="muted" />
        <BaseStatCard label="阻塞项" value="1" description="等待真实窗口复核" icon="Bug" trend="1" trend-direction="down" type="danger" />
        <BaseStatCard label="分类数" value="10" description="细粒度组件目录" icon="Boxes" trend="稳定" type="primary" size="lg" />
        <BaseStatCard label="覆盖率" value="92" unit="%" description="公共组件展示覆盖" icon="ChartNoAxesColumnIncreasing" trend="+12%" trend-direction="up" type="primary" />
        <BaseStatCard label="加载中" value="--" description="等待统计接口返回" icon="LoaderCircle" trend="Loading" loading loading-text="统计数据加载中" compact />
        <BaseStatCard label="只读指标" value="18" suffix=" 项" description="权限不足时不可点击" icon="Lock" trend="Readonly" disabled clickable type="neutral" />
        <BaseStatCard label="Plain 指标" value="4" description="无边框表面适合嵌套在面板内部" icon="FileText" trend="plain" surface="plain" type="neutral" />
        <BaseStatCard label="预算" value="24.8" prefix="¥" suffix="k" description="纯文本指标，无图标和趋势。" type="neutral" />
        <BaseStatCard
          label="非常长的统计指标名称需要在窄容器里稳定换行"
          value="128,640"
          suffix=" 次"
          description="说明文案来自异步统计、权限上下文或跨模块汇总时，应该能按需换行，而不是撑破卡片边界。"
          icon="Activity"
          trend="+18.6%"
          trend-label="较上周增长 18.6%"
          trend-direction="up"
          type="primary"
          wrap-label
          wrap-value
          wrap-description
          :max-description-lines="3"
        />
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
          meta-label="组件沙箱状态"
          actions-label="组件沙箱操作"
          content-label="组件沙箱摘要"
          clickable
          wrap-description
          @click="triggerToast('打开组件沙箱入口', 'info')"
        >
          <BaseDescriptionList
            :items="[
              { key: 'state', label: '状态', value: '持续完善', status: 'primary' },
              { key: 'scope', label: '范围', value: 'Base* / App*' },
            ]"
            compact
          />
        </BaseInfoCard>

        <BaseInfoCard
          title="发布检查"
          description="信息卡可以承载警告、成功、危险等语义，保持统一密度。"
          icon="ShieldCheck"
          meta="Ready"
          meta-label="发布检查状态"
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
          meta-label="风险等级"
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
          meta-label="处理状态"
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
          wrap-description
        >
          <BaseStatusDot type="primary" label="可用于侧栏" description="窄容器友好" />
        </BaseInfoCard>

        <div class="info-card-narrow-demo">
          <BaseInfoCard
            title="侧栏配置项标题很长时也要稳"
            description="宽度只有 320px 左右时，图标、标题、元信息、动作区和正文都需要自然换行，不遮挡也不撑开父容器。"
            icon="PanelLeft"
            meta="320px"
            meta-label="窄容器宽度"
            type="neutral"
            size="sm"
            wrap-title
            wrap-description
            actions-label="窄容器信息卡操作"
          >
            <template #default="{ interactiveDisabled }">
              <BaseStatusDot
                type="success"
                label="布局稳定"
                description="用于抽屉、资源栏和三栏布局侧边面板。"
                :disabled="interactiveDisabled"
              />
            </template>
            <template #actions="{ interactiveDisabled }">
              <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">查看</BaseButton>
              <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">应用</BaseButton>
            </template>
          </BaseInfoCard>
        </div>

        <BaseInfoCard
          title="非常长的信息卡标题需要允许换行并保持动作区稳定"
          description="配置项、资源摘要和跨系统提示经常包含很长的中文说明，卡片需要在列表、侧栏和抽屉中保持可读，不产生横向溢出。"
          icon="TextCursorInput"
          meta="Long"
          meta-label="长文案示例"
          type="primary"
          wrap-title
          wrap-description
          :max-description-lines="4"
          actions-label="长文案信息卡操作"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">查看</BaseButton>
            <BaseButton type="primary" size="sm" :disabled="interactiveDisabled">处理</BaseButton>
          </template>
        </BaseInfoCard>

        <BaseInfoCard
          title="加载中"
          description="保持卡片高度和结构，等待远程数据返回。"
          icon="LoaderCircle"
          meta="Loading"
          meta-label="加载状态"
          loading
          loading-text="信息卡数据加载中"
          actions-label="加载信息卡操作"
        >
          <BaseSkeletonCard compact />
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :loading="interactiveDisabled">同步中</BaseButton>
          </template>
        </BaseInfoCard>

        <BaseInfoCard
          title="禁用入口"
          description="权限不足时保留入口说明，但禁止触发点击。"
          icon="Lock"
          meta="Readonly"
          meta-label="入口状态"
          clickable
          disabled
          aria-label="禁用的信息入口"
          actions-label="禁用信息卡操作"
        >
          <template #actions="{ interactiveDisabled }">
            <BaseButton type="neutral" size="sm" :disabled="interactiveDisabled">无权限</BaseButton>
          </template>
        </BaseInfoCard>

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
      <div class="demo-grid">
        <BasePanel title="协作成员" subtitle="覆盖尺寸、姓名首字母、图片、状态点和可点击入口。">
          <div class="avatar-row">
            <BaseAvatar name="刘雄成" status="online" size="xl" clickable @click="triggerToast('打开刘雄成资料', 'info')" />
            <BaseAvatar name="Design System" status="busy" size="lg" />
            <BaseAvatar name="AI" status="offline" size="sm" />
            <BaseAvatar name="Q" size="xs" status="none" />
            <BaseBadge type="success" variant="outline">在线</BaseBadge>
          </div>
          <BaseDivider label="图片与兜底" />
          <div class="avatar-row">
            <BaseAvatar name="组件平台" :src="avatarImageSrc" alt="组件平台头像" status="online" size="lg" shape="rounded" />
            <BaseAvatar name="Broken Image" src="data:image/png;base64,broken" status="busy" fallback="BI" />
            <BaseAvatar name="加载头像" loading status="online" />
            <BaseAvatar name="禁用头像" disabled status="offline" />
          </div>
        </BasePanel>

        <BasePanel title="头像组" subtitle="列表、详情页、审批人和协作成员常用重叠展示。">
          <div class="avatar-stack" aria-label="协作成员头像组">
            <BaseAvatar name="刘雄成" status="online" />
            <BaseAvatar name="Design System" status="busy" />
            <BaseAvatar name="Monster Tools" status="online" />
            <BaseAvatar name="Reviewer" status="offline" />
            <span class="avatar-overflow" aria-label="还有 6 位成员">+6</span>
          </div>
          <BaseDivider label="长姓名" align="start" />
          <div class="avatar-row">
            <BaseAvatar name="非常长的中文负责人姓名" size="lg" status="online" />
            <BaseAvatar name="Very Long Product Designer Name" shape="rounded" />
            <BaseAvatar icon="UserRound" aria-label="匿名成员" status="none" />
          </div>
        </BasePanel>

        <BasePanel title="分隔线形态" subtitle="横向、纵向、语义色、粗细、装饰性和不同 label 对齐方式。">
          <BaseDivider label="分组" icon="Rows3" />
          <div class="divider-preview">
            <span>基础信息</span>
            <BaseDivider direction="vertical" aria-label="基础信息与操作状态分隔" />
            <span>操作状态</span>
            <BaseDivider direction="vertical" dashed tone="primary" aria-label="操作状态与审查记录分隔" />
            <span>审查记录</span>
          </div>
          <BaseDivider label="起始标签" dashed align="start" tone="primary" />
          <BaseDivider label="结束标签" dotted align="end" compact tone="success" />
          <BaseDivider label="粗分隔" tone="warning" thickness="md" spacing="sm" />
          <BaseDivider decorative thickness="lg" tone="danger" spacing="sm" aria-label="装饰性分隔线" />
        </BasePanel>

        <BasePanel title="窄容器" subtitle="头像和分隔线在侧栏里也保持稳定。">
          <div class="avatar-narrow-demo">
            <div class="avatar-row">
              <BaseAvatar name="侧栏成员" status="online" size="sm" />
              <BaseAvatar name="配置负责人" status="busy" size="sm" />
              <BaseAvatar name="归档成员" status="offline" size="sm" />
            </div>
            <BaseDivider label="状态" compact tone="primary" />
            <BaseDivider label="非常长的侧栏分隔说明文本" compact dotted tone="warning" aria-label="侧栏长标签分隔线" />
            <BaseStatusDot type="success" label="已同步" description="头像组无横向溢出" />
          </div>
        </BasePanel>
      </div>
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

        <BasePanel title="横向滚动" subtitle="命令、路径和单行日志可保留原始格式，并在代码区内部滚动。">
          <BaseCodeBlock
            :code="commandSnippet"
            language="bash"
            title="component-audit.sh"
            :show-line-numbers="false"
            max-height="96px"
            copyable
            copy-label="复制命令"
            copied-label="已复制命令"
            copy-error-label="命令复制失败"
            @copied="triggerToast('命令已复制', 'success')"
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

        <BasePanel title="复制按钮状态" subtitle="普通、仅图标和禁用状态可单独用于摘要、路径和命令。">
          <div class="copy-button-demo-row">
            <BaseCopyButton
              :text="codeSnippet"
              label="复制片段"
              copied-label="片段已复制"
              @copied="triggerToast('片段已复制', 'success')"
              @error="handleCopyError"
            />
            <BaseCopyButton
              :text="commandSnippet"
              :show-text="false"
              aria-label="仅图标复制命令"
              copied-label="已复制"
              @copied="triggerToast('命令已复制', 'success')"
              @error="handleCopyError"
            />
            <BaseCopyButton text="" label="无内容" disabled />
          </div>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'tooltip-upload'" class="detail-stack">
    <PlaygroundDemoSection title="悬浮提示" subtitle="工具提示补充短说明，支持方向、禁用、受控打开、视口避让和多行文案。" icon="MessageCircleQuestion">
      <div class="demo-grid">
        <BasePanel title="基础方向" subtitle="hover 或 focus 都会打开，Escape 可关闭当前提示。">
          <div class="tooltip-row">
            <BaseTooltip content="顶部提示">
              <template #default="{ tooltipId }">
                <BaseButton type="neutral" size="sm" :aria-describedby="tooltipId">Top</BaseButton>
              </template>
            </BaseTooltip>
            <BaseTooltip content="右侧提示支持长文案换行，适合解释紧凑图标按钮。" placement="right" multiline>
              <BaseButton type="neutral" size="sm">Right</BaseButton>
            </BaseTooltip>
            <BaseTooltip content="底部提示" placement="bottom">
              <template #default="{ tooltipId }">
                <BaseButton type="neutral" size="sm" :aria-describedby="tooltipId">Bottom</BaseButton>
              </template>
            </BaseTooltip>
            <BaseTooltip content="左侧提示" placement="left">
              <BaseButton type="neutral" size="sm">Left</BaseButton>
            </BaseTooltip>
            <BaseTooltip content="禁用提示" disabled>
              <BaseButton type="neutral" size="sm">Disabled</BaseButton>
            </BaseTooltip>
          </div>
        </BasePanel>

        <BasePanel title="裁切容器" subtitle="提示层 Teleport 到 body，不会被 overflow 容器裁掉。">
          <div class="tooltip-clip-demo">
            <BaseTooltip
              content="这个提示来自 overflow hidden 容器内部，浮层应该完整显示，并且靠近视口边缘时自动避让。"
              placement="right"
              multiline
              :max-width="260"
            >
              <BaseButton type="primary" size="sm">容器内按钮</BaseButton>
            </BaseTooltip>
          </div>
        </BasePanel>

        <BasePanel title="受控状态" subtitle="业务侧可以通过 v-model:open 驱动提示显隐。">
          <div class="tooltip-row">
            <BaseButton type="neutral" size="sm" @click="controlledTooltipOpen = !controlledTooltipOpen">
              {{ controlledTooltipOpen ? "关闭提示" : "打开提示" }}
            </BaseButton>
            <BaseTooltip
              v-model:open="controlledTooltipOpen"
              content="受控提示可用于新手引导、局部状态说明和首次进入页面时的轻提示。"
              placement="bottom"
              multiline
              :show-delay="0"
              :hide-delay="0"
            >
              <BaseBadge type="primary" variant="outline">受控入口</BaseBadge>
            </BaseTooltip>
          </div>
        </BasePanel>

        <BasePanel title="窄容器长文案" subtitle="长文案会按最大宽度换行，不撑破内容区。">
          <div class="tooltip-narrow-demo">
            <BaseTooltip
              placement="bottom"
              multiline
              :max-width="220"
              content="非常长的解释文案用于说明某个高频图标按钮的作用、风险和触发时机，窄容器下也需要稳定换行。"
            >
              <BaseButton type="neutral" size="sm">长文案提示</BaseButton>
            </BaseTooltip>
          </div>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'upload'" class="detail-stack">
    <PlaygroundDemoSection title="文件上传" subtitle="点击选择、拖拽、类型/数量/大小限制与上传状态。" icon="UploadCloud">
      <div class="demo-grid">
        <BasePanel title="基础上传" subtitle="支持点击选择和拖拽选择，业务侧接收 FileList。">
          <p id="upload-keyboard-hint" class="sr-only">上传区域支持点击、拖拽、Enter 和 Space 触发文件选择。</p>
          <BaseUpload
            id="playground-resource-upload"
            name="resourceFiles"
            title="拖拽文件到这里"
            description="支持图片、JSON、Markdown 等常见资源文件。"
            accept=".png,.jpg,.jpeg,.json,.md"
            :max-files="3"
            :max-size="1048576"
            multiple
            aria-describedby="upload-keyboard-hint"
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
              title="拖拽悬停"
              description="active 可用于沙箱和业务预览中稳定展示拖入反馈。"
              active
              helper="拖入文件时边框与图标会高亮"
              compact
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

        <BasePanel title="尺寸与长文案" subtitle="覆盖大尺寸、紧凑窄容器、无辅助文本和插槽自定义。">
          <div class="upload-demo-stack">
            <BaseUpload
              title="上传非常长的跨项目资源包名称也不能撑破容器"
              description="说明文案可能来自业务配置、文件要求或远端策略，窄容器里需要稳定换行并保留清晰边界。"
              helper="支持 .workflow.json、.monster-template、.md，最多 2 个文件，单个不超过 512 KB"
              accept=".workflow.json,.json,.md,.monster-template"
              :max-files="2"
              :max-size="524288"
              size="lg"
              multiple
              aria-label="上传资源包"
            />
            <div class="upload-narrow-demo">
              <BaseUpload
                title="紧凑上传"
                description="适合侧栏和抽屉。"
                accept="image/*"
                compact
                :show-helper="false"
                aria-label="紧凑图片上传"
              >
                <template #status>
                  等待选择
                </template>
              </BaseUpload>
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

.demo-grid {
  @apply grid items-start gap-4 lg:grid-cols-2;
}

.stat-grid {
  @apply grid gap-4 sm:grid-cols-2 xl:grid-cols-4;
}

.avatar-row,
.tooltip-row,
.divider-preview,
.copy-button-demo-row {
  @apply flex min-w-0 flex-wrap items-center gap-3;
}

.avatar-stack {
  @apply flex min-w-0 items-center;
}

.avatar-stack :deep(.base-avatar),
.avatar-overflow {
  @apply ring-2 ring-white dark:ring-slate-900;
}

.avatar-stack :deep(.base-avatar + .base-avatar),
.avatar-stack .avatar-overflow {
  @apply -ml-2;
}

.avatar-overflow {
  @apply inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-black text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300;
}

.avatar-narrow-demo {
  @apply grid w-full max-w-[240px] gap-3;
}

.info-card-narrow-demo {
  @apply w-full max-w-[320px];
}

.tooltip-clip-demo {
  @apply flex h-24 max-w-[220px] items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950;
}

.tooltip-narrow-demo {
  @apply w-full max-w-[180px];
}

.divider-preview {
  @apply text-xs font-bold text-slate-500 dark:text-slate-400;
}

.upload-demo-stack,
.upload-alert-stack,
.code-demo-stack {
  @apply grid gap-3;
}

.upload-narrow-demo {
  @apply w-full max-w-[260px];
}
</style>
