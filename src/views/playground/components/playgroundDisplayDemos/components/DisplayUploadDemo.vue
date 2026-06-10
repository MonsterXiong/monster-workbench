<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import { joinFileNames } from "../../../../../utils";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const uploadSummary = ref("尚未选择文件");
const uploadRejectSummary = ref("暂无拒绝记录");

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
</script>

<template>
  <section class="detail-stack">
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

.upload-demo-stack,
.upload-alert-stack {
  @apply grid gap-3;
}

.upload-narrow-demo {
  @apply w-full max-w-[260px];
}
</style>
