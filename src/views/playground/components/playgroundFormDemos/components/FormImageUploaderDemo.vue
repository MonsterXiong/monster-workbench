<script setup lang="ts">
import { ref } from "vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const imageValue = ref("");
const coverValue = ref("");
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="图片上传" subtitle="封面图、头像、缩略图都可以直接复用这一层。" icon="ImageUp">
      <BaseForm title="图片字段" description="上传入口和预览反馈保持在一起。" :columns="2" divided>
        <BaseFormItem label="普通预览">
          <AppImageUploader v-model="imageValue" label="缩略图" />
        </BaseFormItem>
        <BaseFormItem label="封面裁切">
          <AppImageUploader v-model="coverValue" label="封面图" aspect-ratio="cover" />
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
