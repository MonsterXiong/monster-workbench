<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../composables/useToast";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const { triggerToast } = useToast();

const searchValue = ref("组件");
const foundationPage = ref(2);
const foundationPageSize = ref(20);

const simpleTableColumns = [
  { key: "name", title: "组件", width: "32%" },
  { key: "usage", title: "用途", width: "34%" },
  { key: "status", title: "状态", width: "18%" },
  { key: "owner", title: "维护", width: "16%", align: "right" as const },
];

const simpleTableRows = [
  { name: "BaseButton", usage: "动作入口", status: "稳定", owner: "基础组" },
  { name: "BaseSearchInput", usage: "列表搜索", status: "稳定", owner: "基础组" },
  { name: "BasePagination", usage: "分页导航", status: "新增展示", owner: "数据组" },
  { name: "BaseTable", usage: "轻量表格", status: "待增强", owner: "数据组" },
];

const descriptionItems = [
  { key: "name", label: "组件名称", value: "BaseDescriptionList", status: "primary" as const },
  { key: "category", label: "所属分类", value: "基础控件" },
  { key: "coverage", label: "覆盖能力", value: "属性 / 状态 / 描述", status: "success" as const },
  { key: "density", label: "显示密度", value: "compact", description: "适合侧栏和详情摘要" },
  { key: "remark", label: "备注", value: "支持跨列", description: "span 可用于长字段", span: 2 as const },
];

const auditDescriptionItems = [
  { key: "version", label: "版本", value: "0.0.3", status: "success" as const },
  { key: "owner", label: "维护团队", value: "组件平台" },
  { key: "scene", label: "高频场景", value: "详情页 / 审批页 / 配置确认", span: 2 as const },
  { key: "risk", label: "风险等级", value: "低", status: "neutral" as const },
  { key: "updated", label: "最近更新", value: "2026-06-08", description: "通过类型与架构检查" },
];

const keyValueItems = [
  { key: "runtime", label: "运行态", value: "正常", icon: "Activity", status: "success" as const, description: "实时状态" },
  { key: "version", label: "版本", value: "0.0.3", icon: "Package", description: "当前包版本" },
  { key: "quality", label: "质量门禁", value: "通过", icon: "ShieldCheck", status: "primary" as const },
];

const keyValueAuditItems = [
  { key: "build", label: "构建状态", value: "已通过", icon: "CircleCheck", status: "success" as const, description: "typecheck / architecture" },
  { key: "coverage", label: "覆盖范围", value: "6 个状态", icon: "LayoutGrid", status: "primary" as const },
  { key: "risk", label: "残余风险", value: "低", icon: "ShieldCheck", status: "neutral" as const },
  { key: "note", label: "备注", value: "适合侧栏摘要、详情卡片和确认页", icon: "FileText", span: 2 as const },
];

const handleSearch = (value: string) => {
  triggerToast(`已执行筛选：${value || "空查询"}`, "info");
};
</script>

<template>
  <section v-if="activeComponentKey === 'buttons-badges'" class="detail-stack">
    <PlaygroundDemoSection title="按钮徽标" subtitle="按钮和徽标是所有业务动作、状态摘要的基础颗粒。" icon="MousePointer">
      <div class="foundation-grid">
        <BasePanel title="按钮语义" subtitle="覆盖主按钮、普通按钮、成功、警告、危险、幽灵和链接形态。">
          <div class="button-demo-row">
            <BaseButton type="primary">保存</BaseButton>
            <BaseButton type="neutral">取消</BaseButton>
            <BaseButton type="success">通过</BaseButton>
            <BaseButton type="warning">提醒</BaseButton>
            <BaseButton type="danger">删除</BaseButton>
            <BaseButton type="ghost">轻量</BaseButton>
            <BaseButton type="link">详情</BaseButton>
          </div>
          <BaseDivider compact />
          <div class="button-demo-row">
            <BaseButton type="primary" size="xs">XS</BaseButton>
            <BaseButton type="primary" size="sm">SM</BaseButton>
            <BaseButton type="primary" size="md">MD</BaseButton>
            <BaseButton type="primary" size="lg">LG</BaseButton>
            <BaseButton type="neutral" outline>轮廓</BaseButton>
            <BaseButton type="primary" loading>保存中</BaseButton>
            <BaseButton type="primary" disabled>禁用</BaseButton>
          </div>
          <BaseDivider compact dashed label="图标与形态" />
          <div class="button-demo-row">
            <BaseButton type="primary" round>
              <template #icon><BaseIcon name="Save" size="14" /></template>
              圆角保存
            </BaseButton>
            <BaseButton type="neutral" outline>
              <template #icon><BaseIcon name="Download" size="14" /></template>
              导出
            </BaseButton>
            <BaseButton type="primary" circle aria-label="新增组件" title="新增组件">
              <template #icon><BaseIcon name="Plus" size="14" /></template>
            </BaseButton>
            <BaseButton type="neutral" circle aria-label="刷新列表" title="刷新列表">
              <template #icon><BaseIcon name="RefreshCw" size="14" /></template>
            </BaseButton>
            <BaseButton type="danger" circle outline aria-label="删除组件" title="删除组件">
              <template #icon><BaseIcon name="Trash2" size="14" /></template>
            </BaseButton>
          </div>
          <BaseDivider compact dashed label="表单按钮" />
          <div class="button-demo-row">
            <BaseButton type="primary" native-type="submit">提交表单</BaseButton>
            <BaseButton type="neutral" native-type="reset" outline>重置</BaseButton>
            <BaseButton type="success" block>整行确认</BaseButton>
          </div>
        </BasePanel>

        <BasePanel title="徽标状态" subtitle="用于行状态、卡片标签、数量提示和语义摘要。">
          <div class="badge-demo-row">
            <BaseBadge type="primary">Primary</BaseBadge>
            <BaseBadge type="success">Success</BaseBadge>
            <BaseBadge type="warning">Warning</BaseBadge>
            <BaseBadge type="danger">Danger</BaseBadge>
            <BaseBadge type="neutral">Neutral</BaseBadge>
          </div>
          <BaseDivider compact dashed label="形态" />
          <div class="badge-demo-row">
            <BaseBadge type="primary" variant="solid" dot>Solid</BaseBadge>
            <BaseBadge type="success" variant="outline" dot>Outline</BaseBadge>
            <BaseBadge type="warning" size="xs">XS</BaseBadge>
            <BaseBadge type="neutral" size="md">MD</BaseBadge>
          </div>
          <BaseDivider compact dashed label="交互" />
          <div class="badge-demo-row">
            <BaseBadge type="primary" size="lg" clickable title="点击查看筛选" @click="triggerToast('点击了徽标', 'info')">可点击</BaseBadge>
            <BaseBadge type="success" closable close-label="移除已接入标签" @close="triggerToast('徽标已移除', 'info')">可关闭</BaseBadge>
            <BaseBadge type="warning" dot closable close-label="移除风险标签">风险项</BaseBadge>
            <BaseBadge type="danger" disabled closable>禁用关闭</BaseBadge>
            <BaseBadge type="neutral" variant="outline" aria-label="只读状态：归档">归档</BaseBadge>
          </div>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'search-pagination'" class="detail-stack">
    <PlaygroundDemoSection title="搜索分页" subtitle="列表页、弹窗选择器和资源管理页最常用的检索组合。" icon="Search">
      <BasePanel title="检索结果" subtitle="搜索输入支持清空、加载、回车搜索；分页支持页码和页容量切换。">
        <div class="search-pagination-demo">
          <BaseSearchInput
            v-model="searchValue"
            placeholder="搜索组件、分类或状态"
            @search="handleSearch"
            @clear="triggerToast('搜索已清空', 'info')"
          />
          <BaseSearchInput model-value="加载中" placeholder="加载态" loading disabled />
          <BaseSearchInput model-value="错误关键词" placeholder="错误态" error clear-text="清空错误关键词" />
          <BaseSearchInput model-value="只读查询" placeholder="只读态" readonly surface="muted" />
          <BaseSearchInput v-model="searchValue" placeholder="即时搜索" search-on-input surface="plain" :clearable="false">
            <template #suffix>
              <BaseBadge type="primary" variant="outline">Live</BaseBadge>
            </template>
          </BaseSearchInput>
          <BaseSearchInput v-model="searchValue" placeholder="带前缀搜索" size="lg" surface="muted">
            <template #prefix>
              <BaseIcon name="Command" size="14" class="text-slate-400" aria-hidden="true" />
            </template>
          </BaseSearchInput>
        </div>
        <BaseDivider compact />
        <div class="pagination-demo-stack">
          <BasePagination
            v-model:page="foundationPage"
            v-model:page-size="foundationPageSize"
            :total="128"
            show-edges
            aria-label="完整分页"
            @change="triggerToast(`分页：${$event.page} / ${$event.pageSize}`, 'info')"
          />
          <BasePagination
            v-model:page="foundationPage"
            v-model:page-size="foundationPageSize"
            :total="42"
            compact
            surface="muted"
            :show-page-size="false"
          />
          <BasePagination
            v-model:page="foundationPage"
            v-model:page-size="foundationPageSize"
            :total="128"
            simple
            surface="plain"
            :show-summary="false"
          />
          <BasePagination
            v-model:page="foundationPage"
            v-model:page-size="foundationPageSize"
            :total="0"
            loading
            size="lg"
          />
          <BasePagination
            :page="1"
            :page-size="10"
            :total="0"
            disabled
            compact
            :show-page-size="false"
          />
        </div>
      </BasePanel>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'empty-error'" class="detail-stack">
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
          >
            <BaseButton type="primary" size="sm">新建组件</BaseButton>
            <BaseButton type="neutral" size="sm">重置筛选</BaseButton>
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
          >
            <BaseButton type="danger" size="sm">申请权限</BaseButton>
          </BaseEmpty>
        </BasePanel>
        <BasePanel title="错误反馈" subtitle="覆盖标准重试、紧凑提示、禁用错误和嵌入面板。">
          <div class="error-demo-stack">
            <BaseError
              title="加载组件失败"
              message="请检查本地服务状态，或稍后重新尝试。"
              show-retry
              retry-text="重新加载"
              surface="muted"
              bordered
              min-height="220px"
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
                @retry="triggerToast('检查配置项', 'info')"
              >
                <BaseBadge type="warning" variant="outline">WARN_SCHEMA</BaseBadge>
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

  <section v-else-if="activeComponentKey === 'description-lists'" class="detail-stack">
    <PlaygroundDemoSection title="描述列表" subtitle="属性网格和键值摘要用于详情、侧栏、卡片页脚和配置确认。" icon="ListTodo">
      <div class="foundation-grid">
        <BasePanel title="属性网格" subtitle="支持列数、紧凑、状态点和跨列字段。">
          <BaseDescriptionList aria-label="组件属性网格" :items="descriptionItems" :columns="2" compact />
        </BasePanel>
        <BasePanel title="审计摘要" subtitle="三列布局适合配置确认、审计结果和发布检查。">
          <BaseDescriptionList aria-label="审计摘要" :items="auditDescriptionItems" :columns="3" surface="muted" size="lg" />
        </BasePanel>
        <BasePanel title="嵌套形态" subtitle="plain 表面适合放入详情卡、抽屉和面板正文。">
          <BaseDescriptionList aria-label="嵌套描述列表" :items="auditDescriptionItems.slice(0, 4)" :columns="2" surface="plain" :bordered="false" />
        </BasePanel>
        <BasePanel title="状态兜底" subtitle="加载、空态和禁用态让异步详情区域更稳定。">
          <div class="description-state-stack">
            <BaseDescriptionList aria-label="加载中的描述列表" :items="[]" loading compact />
            <BaseDescriptionList aria-label="空描述列表" :items="[]" empty-text="暂无可展示属性" compact />
            <BaseDescriptionList aria-label="禁用描述列表" :items="descriptionItems.slice(0, 2)" disabled compact />
          </div>
        </BasePanel>
        <BasePanel title="状态点" subtitle="状态点适合表格行、卡片摘要、工具栏和只读属性里的轻量状态。">
          <div class="status-dot-demo-stack">
            <div class="status-dot-row">
              <BaseStatusDot type="primary" label="同步中" description="后台任务" pulse />
              <BaseStatusDot type="success" label="运行中" description="实时同步" />
              <BaseStatusDot type="warning" label="待处理" description="需要复核" />
              <BaseStatusDot type="danger" label="异常" description="等待重试" />
              <BaseStatusDot type="neutral" label="离线" description="未连接" disabled />
            </div>
            <BaseDivider compact dashed label="尺寸" />
            <div class="status-dot-size-grid">
              <BaseStatusDot type="success" size="xs" label="XS" orientation="horizontal" />
              <BaseStatusDot type="success" size="sm" label="SM" orientation="horizontal" />
              <BaseStatusDot type="success" size="md" label="MD" orientation="horizontal" />
              <BaseStatusDot type="success" size="lg" label="LG" orientation="horizontal" />
              <BaseStatusDot type="primary" size="md" aria-label="仅状态点：已选中" />
            </div>
          </div>
        </BasePanel>
        <BasePanel title="键值摘要" subtitle="更适合卡片内局部摘要和侧栏简要状态。">
          <div class="key-value-demo-stack">
            <BaseKeyValueList aria-label="运行态键值摘要" :items="keyValueItems" :columns="1" />
            <BaseKeyValueList aria-label="审计键值摘要" :items="keyValueAuditItems" :columns="2" surface="card" size="lg" />
            <BaseKeyValueList aria-label="嵌套键值摘要" :items="keyValueAuditItems.slice(0, 3)" :columns="3" surface="plain" :bordered="false" compact />
            <div class="key-value-state-grid">
              <BaseKeyValueList aria-label="加载中的键值摘要" :items="[]" loading compact />
              <BaseKeyValueList aria-label="空键值摘要" :items="[]" empty-text="暂无摘要指标" compact />
              <BaseKeyValueList aria-label="禁用键值摘要" :items="keyValueItems.slice(0, 2)" disabled compact />
            </div>
          </div>
          <BaseDivider compact />
          <div class="status-dot-row">
            <BaseStatusDot type="success" label="运行中" description="实时同步" pulse />
            <BaseStatusDot type="warning" label="待处理" description="需要复核" />
            <BaseStatusDot type="danger" label="异常" description="等待重试" />
          </div>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'simple-table'" class="detail-stack">
    <PlaygroundDemoSection title="轻量表格" subtitle="基础表格适合小型数据、嵌套面板和不需要完整工具条的列表。" icon="Table2">
      <div class="simple-table-grid">
        <BasePanel title="紧凑表格" subtitle="支持自定义单元格、条纹和 hover。">
          <BaseTable
            aria-label="紧凑组件表格"
            :columns="simpleTableColumns"
            :data="simpleTableRows"
            row-key="name"
            :selected-keys="['BasePagination']"
            size="sm"
          >
            <template #name="{ row }">
              <strong class="simple-table-name">{{ row.name }}</strong>
            </template>
            <template #status="{ row }">
              <BaseBadge :type="row.status === '稳定' ? 'success' : row.status === '待增强' ? 'warning' : 'primary'" variant="outline">
                {{ row.status }}
              </BaseBadge>
            </template>
          </BaseTable>
        </BasePanel>
        <BasePanel title="审计表格" subtitle="caption、列对齐、muted 表面和选中行适合确认页。">
          <BaseTable
            caption="组件审计表格"
            :columns="simpleTableColumns"
            :data="simpleTableRows"
            row-key="name"
            :selected-keys="['BaseButton', 'BaseSearchInput']"
            surface="muted"
            size="lg"
            empty-icon="SearchX"
          >
            <template #name="{ row }">
              <strong class="simple-table-name">{{ row.name }}</strong>
            </template>
            <template #owner="{ row }">
              <BaseStatusDot type="primary" :label="row.owner" orientation="horizontal" />
            </template>
          </BaseTable>
        </BasePanel>
        <BasePanel title="加载与空态" subtitle="轻量表格内置加载骨架和空态。">
          <div class="table-state-stack">
            <BaseTable aria-label="加载中的轻量表格" :columns="simpleTableColumns.slice(0, 3)" :data="[]" loading :skeleton-rows="4" size="sm" />
            <BaseTable aria-label="空轻量表格" :columns="simpleTableColumns.slice(0, 2)" :data="[]" size="sm" empty-text="暂无组件记录" empty-icon="FolderOpen" />
            <BaseTable
              aria-label="禁用 plain 表格"
              :columns="simpleTableColumns.slice(0, 3)"
              :data="simpleTableRows.slice(0, 2)"
              surface="plain"
              :bordered="false"
              :hover="false"
              disabled
              size="sm"
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

.foundation-grid {
  @apply grid min-w-0 gap-3 xl:grid-cols-2;
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

.button-demo-row,
.badge-demo-row,
.status-dot-row {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}

.search-pagination-demo {
  @apply grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_260px];
}

.pagination-demo-stack {
  @apply grid min-w-0 gap-3;
}

.simple-table-grid {
  @apply grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)];
}

.simple-table-name {
  @apply text-xs font-black text-slate-800 dark:text-slate-100;
}

.table-state-stack {
  @apply flex min-w-0 flex-col gap-3;
}

.description-state-stack {
  @apply grid min-w-0 gap-3;
}

.key-value-demo-stack {
  @apply grid min-w-0 gap-3;
}

.key-value-state-grid {
  @apply grid min-w-0 gap-3 lg:grid-cols-3;
}

.status-dot-demo-stack {
  @apply grid min-w-0 gap-3;
}

.status-dot-size-grid {
  @apply grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-5;
}
</style>
