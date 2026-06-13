<script setup lang="ts">
import type { UploadFile, UploadProgressEvent, UploadRequestOptions, UploadUserFile } from "element-plus";
import { ref } from "vue";
import { useToast } from "../../../../../composables/useToast";
import { joinFileNames } from "../../../../../utils";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const { triggerToast } = useToast();

const uploadSummary = ref("尚未选择文件");
const uploadRejectSummary = ref("暂无拒绝记录");
const uploadInstanceText = ref("等待实例操作");
const uploadInstanceRef = ref<{
  getNativeUpload: () => unknown;
  getElement: () => HTMLElement | null;
  getTriggerElement: () => HTMLElement | null;
  focusTrigger: () => HTMLElement | null;
  clearFiles: () => void;
  submit: () => void;
} | null>(null);
const uploadListSummary = ref("列表模式等待选择");
const uploadListFiles = ref<UploadUserFile[]>([
  {
    name: "component-spec.md",
    status: "success",
    url: "component-spec.md",
  },
]);
const nativeUploadFiles = ref<UploadUserFile[]>([]);
const nativeUploadProgress = ref(0);
const nativeUploadSummary = ref("等待上传请求");

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

const readUploadElement = () => {
  const element = uploadInstanceRef.value?.getElement();
  uploadInstanceText.value = element ? `DOM: ${element.tagName.toLowerCase()}.${element.classList[0] || "root"}` : "未读取到 DOM";
};

const readUploadTrigger = () => {
  const element = uploadInstanceRef.value?.getTriggerElement();
  uploadInstanceText.value = element ? `Trigger: ${element.tagName.toLowerCase()}.${element.classList[0] || "trigger"}` : "未读取到触发区";
};

const focusUploadTrigger = () => {
  const element = uploadInstanceRef.value?.focusTrigger();
  uploadInstanceText.value = element ? `聚焦: ${element.tagName.toLowerCase()}.${element.classList[0] || "trigger"}` : "未找到触发区";
};

const handleUploadListSelect = (files: FileList) => {
  uploadListSummary.value = `列表模式已接收 ${files.length} 个文件：${joinFileNames(files)}`;
  triggerToast(uploadListSummary.value, "success");
};

const handleUploadPreview = (file: UploadFile) => {
  triggerToast(`预览：${file.name}`, "info");
};

const handleUploadRemove = (file: UploadFile, files: UploadFile[]) => {
  uploadListSummary.value = `已移除 ${file.name}，剩余 ${files.length} 个文件`;
};

const handleUploadExceed = (files: File[]) => {
  uploadListSummary.value = `最多保留 2 个文件，已拦截：${joinFileNames(files)}`;
  triggerToast(uploadListSummary.value, "warning");
};

const mockUploadRequest = (options: UploadRequestOptions) => {
  nativeUploadProgress.value = 0;
  nativeUploadSummary.value = `正在上传：${options.file.name}`;

  return new Promise((resolve) => {
    const timer = window.setInterval(() => {
      nativeUploadProgress.value = Math.min(nativeUploadProgress.value + 20, 100);
      options.onProgress({ percent: nativeUploadProgress.value } as UploadProgressEvent);

      if (nativeUploadProgress.value >= 100) {
        window.clearInterval(timer);
        const response = { ok: true, fileName: options.file.name, action: options.action };
        options.onSuccess(response);
        resolve(response);
      }
    }, 120);
  });
};

const handleNativeUploadProgress = (event: UploadProgressEvent, file: UploadFile) => {
  nativeUploadProgress.value = Math.round(event.percent);
  nativeUploadSummary.value = `${file.name} 上传中 ${nativeUploadProgress.value}%`;
};

const handleNativeUploadSuccess = (_response: unknown, file: UploadFile) => {
  nativeUploadSummary.value = `${file.name} 上传完成`;
  triggerToast(nativeUploadSummary.value, "success");
};

const handleNativeUploadError = (error: Error, file: UploadFile) => {
  nativeUploadSummary.value = `${file.name} 上传失败：${error.message}`;
  triggerToast(nativeUploadSummary.value, "error");
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="文件上传" subtitle="点击选择、拖拽、类型/数量/大小限制与上传状态。" icon="UploadCloud">
      <div class="demo-grid">
        <BasePanel title="基础上传" subtitle="支持点击选择和拖拽选择，业务侧接收 FileList。">
          <p id="upload-keyboard-hint" class="sr-only">上传区域支持点击、拖拽、Enter 和 Space 触发文件选择。</p>
          <BaseUpload
            ref="uploadInstanceRef"
            id="playground-resource-upload"
            data-native-upload-ref="base-upload-instance"
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
          <div class="upload-instance-panel">
            <div class="upload-instance-copy">
              <BaseIcon name="Workflow" size="14" aria-hidden="true" />
              <span>实例能力</span>
              <strong>{{ uploadInstanceText }}</strong>
            </div>
            <div class="upload-instance-actions">
              <BaseButton type="secondary" size="xs" outline @click="readUploadElement">读取 DOM</BaseButton>
              <BaseButton type="secondary" size="xs" outline @click="readUploadTrigger">读取触发区</BaseButton>
              <BaseButton type="secondary" size="xs" outline @click="focusUploadTrigger">聚焦触发区</BaseButton>
            </div>
          </div>
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

        <BasePanel title="文件列表与限制" subtitle="基于 Element Plus 文件列表能力，补齐预览、移除、超限和非拖拽入口。">
          <div class="upload-demo-stack">
            <BaseUpload
              v-model:file-list="uploadListFiles"
              title="选择规范附件"
              description="展示已选文件列表，适合表单附件、素材包和配置清单。"
              helper="最多 2 个文件，支持 .md、.json 和图片"
              accept=".md,.json,image/*"
              :limit="2"
              :max-size="1048576"
              multiple
              show-file-list
              :clear-after-select="false"
              @select="handleUploadListSelect"
              @preview="handleUploadPreview"
              @remove="handleUploadRemove"
              @exceed="handleUploadExceed"
              @reject="handleUploadReject"
            />
            <BaseAlert type="info" :title="uploadListSummary" description="showFileList 模式保留 Element Plus 列表交互，同时继续输出 select/reject 事件。" compact />
            <BaseUpload
              title="点击选择图标"
              description="关闭拖拽后，保持同一套校验、状态和可访问性语义。"
              accept="image/*"
              :limit="1"
              :show-helper="false"
              :drag="false"
              compact
              show-file-list
              list-type="picture"
              :clear-after-select="false"
              @preview="handleUploadPreview"
              @remove="handleUploadRemove"
              @exceed="handleUploadExceed"
            />
          </div>
        </BasePanel>

        <BasePanel title="原生上传链路" subtitle="透传 Element Plus action、data、httpRequest、autoUpload、progress 和 success/error。">
          <div class="upload-demo-stack">
            <BaseUpload
              v-model:file-list="nativeUploadFiles"
              title="自动上传资源包"
              description="选择文件后直接进入请求链路，业务侧可以替换 httpRequest 接入 Tauri 或远端服务。"
              helper="沙箱使用 mock 请求展示进度，不会访问真实接口。"
              accept=".zip,.json,.md"
              action="/mock/component-assets"
              method="post"
              :data="{ source: 'playground', kind: 'component-assets' }"
              :http-request="mockUploadRequest"
              :limit="1"
              auto-upload
              show-file-list
              :clear-after-select="false"
              @progress="handleNativeUploadProgress"
              @success="handleNativeUploadSuccess"
              @error="handleNativeUploadError"
              @reject="handleUploadReject"
            />
            <BaseProgress :value="nativeUploadProgress" size="sm" label="上传进度" />
            <BaseAlert type="success" :title="nativeUploadSummary" description="BaseUpload 保持统一视觉，底层请求与文件状态交给 Element Plus 处理。" compact />
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

.upload-instance-panel {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.upload-instance-copy {
  @apply flex min-w-0 items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.upload-instance-copy strong {
  @apply min-w-0 truncate text-slate-800 dark:text-slate-100;
}

.upload-instance-actions {
  @apply flex shrink-0 flex-wrap items-center gap-2;
}
</style>
