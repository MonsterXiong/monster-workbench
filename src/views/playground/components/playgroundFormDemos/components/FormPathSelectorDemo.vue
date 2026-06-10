<script setup lang="ts">
import { ref } from "vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const pathFolderValue = ref("C:\\Users\\demo\\workspace");
const pathFileValue = ref("C:\\Users\\demo\\workspace\\config.json");
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="路径选择" subtitle="桌面场景里非常高频，浏览器预览时会自动降级提示。" icon="FolderSearch2">
      <BaseForm title="本地路径输入" description="目录生成、日志导出和资源目录配置都能直接复用。" :columns="2" divided>
        <BaseFormItem label="目录路径">
          <AppPathSelector v-model="pathFolderValue" type="folder" />
        </BaseFormItem>
        <BaseFormItem label="文件路径">
          <AppPathSelector v-model="pathFileValue" type="file" />
        </BaseFormItem>
        <BaseFormItem label="当前值" :span="2">
          <BaseDescriptionList
            :items="[
              { key: 'folder', label: '目录', value: pathFolderValue || '未选择', span: 2 },
              { key: 'file', label: '文件', value: pathFileValue || '未选择', span: 2 },
            ]"
            compact
          />
        </BaseFormItem>
      </BaseForm>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}
</style>
