<script setup lang="ts">
import { useToast } from "../../../../../composables/useToast";
import { joinLines } from "../../../../../utils";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

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

const handleCopyError = () => {
  triggerToast("复制失败，请检查浏览器权限", "warning");
};
</script>

<template>
  <section class="detail-stack">
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
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.demo-grid {
  @apply grid items-start gap-4 lg:grid-cols-2;
}

.code-demo-stack {
  @apply grid gap-3;
}

.copy-button-demo-row {
  @apply flex min-w-0 flex-wrap items-center gap-3;
}
</style>
