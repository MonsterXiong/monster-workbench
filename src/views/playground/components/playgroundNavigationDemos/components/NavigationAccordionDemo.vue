<script setup lang="ts">
import { ref } from "vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const singleAccordion = ref(["usage"]);
const multiAccordion = ref(["usage", "config"]);
const lockedAccordion = ref(["config"]);
const embeddedAccordion = ref(["usage"]);
const leftIconAccordion = ref(["usage"]);
const guardedAccordion = ref(["usage"]);
const accordionGuardLocked = ref(true);
const accordionEvent = ref("等待操作");
const accordionNativeEvent = ref("等待原生事件");
const accordionInstanceText = ref("等待实例操作");
const accordionInstanceRef = ref<{
  getNativeCollapse: () => unknown;
  getElement: () => HTMLElement | null;
  getItemElement: (key: string) => HTMLElement | null;
  focusFirstHeader: () => HTMLElement | null;
  focusItemHeader: (key: string) => HTMLElement | null;
} | null>(null);

const accordionItems = [
  { key: "usage", title: "使用场景", description: "用于详情页、设置页和分组说明。", icon: "BookOpen", badge: "指南", badgeType: "primary" as const, meta: "3 min" },
  { key: "config", title: "配置能力", description: "支持单开、多开、紧凑和禁用项。", icon: "SlidersHorizontal", badge: "核心", badgeType: "success" as const, meta: "必看" },
  { key: "disabled", title: "受限配置", description: "权限不足时保持只读感知。", icon: "Lock", disabled: true, badge: "锁定", badgeType: "warning" as const, meta: "Admin" },
];

const handleAccordionToggle = (payload: { key: string; expanded: boolean }) => {
  accordionEvent.value = `${payload.key} ${payload.expanded ? "展开" : "收起"}`;
};

const handleAccordionChange = (keys: string[]) => {
  accordionEvent.value = `当前展开：${keys.join("、") || "无"}`;
};

const handleAccordionNativeChange = (value: string | number | Array<string | number>) => {
  const values = Array.isArray(value) ? value : [value];
  accordionNativeEvent.value = `native-change：${values.filter(Boolean).join("、") || "无"}`;
};

const readAccordionElement = () => {
  const element = accordionInstanceRef.value?.getElement();
  accordionInstanceText.value = element ? `DOM: ${element.tagName.toLowerCase()}.${element.classList[0] || "root"}` : "未读取到 DOM";
};

const focusAccordionFirstHeader = () => {
  const element = accordionInstanceRef.value?.focusFirstHeader();
  accordionInstanceText.value = element ? `聚焦: ${element.textContent?.trim() || element.tagName.toLowerCase()}` : "未找到可聚焦项";
};

const focusAccordionConfigHeader = () => {
  const element = accordionInstanceRef.value?.focusItemHeader("config");
  accordionInstanceText.value = element ? `配置项: ${element.textContent?.trim() || "-"}` : "未找到配置项";
};

const guardAccordionCollapse = (key: string) => {
  if (accordionGuardLocked.value && key === "config") {
    accordionEvent.value = "配置能力需要先解锁";
    return false;
  }
  return true;
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="折叠面板" subtitle="展示单开、多开、紧凑和禁用项，适合配置组、帮助说明和详情分段。" icon="PanelsTopLeft">
      <div class="demo-grid">
        <BasePanel title="单开模式" subtitle="一次只展开一个配置段，支持 badge、meta 和 toggle 事件。">
          <BaseAccordion v-model="singleAccordion" :items="accordionItems" aria-label="单开折叠面板" @toggle="handleAccordionToggle">
            <template #usage>
              <BaseAlert type="info" title="使用场景" description="适合说明文字、局部配置和详情分段。" compact />
            </template>
            <template #config>
              <BaseDescriptionList :items="[{ key: 'mode', label: '模式', value: 'single' }]" compact />
            </template>
          </BaseAccordion>
          <template #footer>
            <span class="navigation-result">最近事件：{{ accordionEvent }}</span>
          </template>
        </BasePanel>
        <BasePanel title="多开紧凑" subtitle="适合设置页多个分组同时展开，actions 插槽可放状态提示。">
          <BaseAccordion v-model="multiAccordion" :items="accordionItems" multiple compact size="sm" surface="muted">
            <template #actions="{ expanded }">
              <BaseBadge :type="expanded ? 'success' : 'neutral'" size="xs">{{ expanded ? "展开" : "收起" }}</BaseBadge>
            </template>
            <template #usage>
              <BaseBadge type="primary">局部帮助</BaseBadge>
            </template>
            <template #config>
              <BaseAlert type="success" title="配置能力" description="通过 v-model 接管展开项，业务侧可以持久化或联动校验状态。" compact />
            </template>
          </BaseAccordion>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="不可折回" subtitle="allowCollapse=false 适合必须保留一个当前配置段的场景。">
          <BaseAccordion v-model="lockedAccordion" :items="accordionItems" size="lg" surface="muted" :allow-collapse="false" aria-label="不可折回折叠面板">
            <template #usage>
              <BaseAlert type="info" title="使用说明" description="点击其它项会切换当前配置段，点击已展开项不会清空。" compact />
            </template>
            <template #config>
              <BaseDescriptionList
                :items="[
                  { key: 'collapse', label: '允许清空', value: '否', status: 'warning' },
                  { key: 'size', label: '尺寸', value: 'lg' },
                ]"
                compact
              />
            </template>
          </BaseAccordion>
        </BasePanel>

        <BasePanel title="左侧展开图标" subtitle="expandIconPosition=left 复用 Element Plus 图标位置能力，更贴近设置清单。">
          <BaseAccordion
            ref="accordionInstanceRef"
            data-native-accordion-ref="base-accordion-instance"
            v-model="leftIconAccordion"
            :items="accordionItems"
            multiple
            expand-icon-position="left"
            surface="muted"
            aria-label="左侧展开图标折叠面板"
            @change="handleAccordionChange"
            @native-change="handleAccordionNativeChange"
          >
            <template #actions="{ expanded }">
              <BaseBadge :type="expanded ? 'primary' : 'neutral'" size="xs">{{ expanded ? "已展开" : "未展开" }}</BaseBadge>
            </template>
            <template #default="{ item }">
              <BaseAlert type="info" :title="item.title" :description="item.description || '暂无说明。'" compact />
            </template>
          </BaseAccordion>
          <div class="accordion-instance-panel">
            <div class="accordion-instance-copy">
              <BaseIcon name="Workflow" size="14" aria-hidden="true" />
              <span>实例能力</span>
              <strong>{{ accordionInstanceText }}</strong>
            </div>
            <div class="accordion-instance-actions">
              <BaseButton size="xs" type="secondary" outline @click="readAccordionElement">读取 DOM</BaseButton>
              <BaseButton size="xs" type="secondary" outline @click="focusAccordionFirstHeader">聚焦首项</BaseButton>
              <BaseButton size="xs" type="secondary" outline @click="focusAccordionConfigHeader">聚焦配置</BaseButton>
            </div>
          </div>
          <template #footer>
            <div class="accordion-footer-actions">
              <span class="navigation-result">最近事件：{{ accordionEvent }}</span>
              <span class="navigation-result">{{ accordionNativeEvent }}</span>
            </div>
          </template>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="折叠前拦截" subtitle="beforeCollapse 可阻止未校验配置展开，适合权限、保存和校验场景。">
          <BaseAccordion
            v-model="guardedAccordion"
            :items="accordionItems"
            surface="card"
            :before-collapse="guardAccordionCollapse"
            aria-label="拦截折叠面板"
            @toggle="handleAccordionToggle"
          >
            <template #usage>
              <BaseAlert type="info" title="使用说明" description="配置能力项被锁定时，点击不会展开。" compact />
            </template>
            <template #config>
              <BaseAlert type="success" title="配置已解锁" description="解锁后 beforeCollapse 返回 true，面板可正常展开。" compact />
            </template>
          </BaseAccordion>
          <template #footer>
            <div class="accordion-footer-actions">
              <span class="navigation-result">最近事件：{{ accordionEvent }}</span>
              <BaseButton type="neutral" size="xs" outline @click="accordionGuardLocked = !accordionGuardLocked">
                {{ accordionGuardLocked ? "解除拦截" : "恢复拦截" }}
              </BaseButton>
            </div>
          </template>
        </BasePanel>

        <BasePanel title="嵌入式 Plain" subtitle="plain 表面、无边框和 keepMounted 适合嵌在侧栏或详情正文。">
          <BaseAccordion
            v-model="embeddedAccordion"
            :items="accordionItems"
            surface="plain"
            size="sm"
            :bordered="false"
            :divided="false"
            keep-mounted
            aria-label="嵌入式折叠面板"
          >
            <template #default="{ item }">
              <BaseAlert type="info" :title="item.title" :description="item.description || '暂无说明。'" compact />
            </template>
          </BaseAccordion>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel title="自管理状态" subtitle="不传 v-model 时通过 defaultValue 初始化，组件内部维护展开状态。">
          <BaseAccordion
            :items="accordionItems"
            :default-value="['usage']"
            multiple
            surface="muted"
            :show-chevron="false"
            aria-label="自管理折叠面板"
            @toggle="handleAccordionToggle"
          >
            <template #actions="{ expanded }">
              <BaseBadge :type="expanded ? 'primary' : 'neutral'" size="xs">{{ expanded ? "已打开" : "未打开" }}</BaseBadge>
            </template>
            <template #default="{ item, expanded }">
              <BaseDescriptionList
                :items="[
                  { key: 'key', label: '节点', value: item.key, status: expanded ? 'primary' : 'neutral' },
                  { key: 'mode', label: '状态来源', value: 'internal' },
                ]"
                compact
              />
            </template>
          </BaseAccordion>
          <template #footer>
            <span class="navigation-result">最近事件：{{ accordionEvent }}</span>
          </template>
        </BasePanel>

        <BasePanel title="整组禁用" subtitle="权限不足或流程锁定时禁用所有触发器，但保留内容状态可读。">
          <BaseAccordion :items="accordionItems" :default-value="['usage']" disabled surface="card" aria-label="禁用折叠面板">
            <template #default="{ item }">
              <BaseAlert type="warning" :title="item.title" description="当前流程锁定，只展示已有配置。" compact />
            </template>
          </BaseAccordion>
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

.navigation-result {
  @apply text-xs font-black text-slate-500 dark:text-slate-400;
}

.accordion-footer-actions {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2;
}

.accordion-instance-panel {
  @apply mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.accordion-instance-copy {
  @apply flex min-w-0 items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.accordion-instance-copy strong {
  @apply min-w-0 truncate text-slate-800 dark:text-slate-100;
}

.accordion-instance-actions {
  @apply flex shrink-0 flex-wrap items-center gap-2;
}
</style>
