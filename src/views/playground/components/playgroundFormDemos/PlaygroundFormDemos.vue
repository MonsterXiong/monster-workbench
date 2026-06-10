<script setup lang="ts">
import FormTextInputsDemo from "./components/FormTextInputsDemo.vue";
import FormChoiceControlsDemo from "./components/FormChoiceControlsDemo.vue";
import FormFormShellDemo from "./components/FormFormShellDemo.vue";
import FormFormItemDemo from "./components/FormFormItemDemo.vue";
import FormTagInputDemo from "./components/FormTagInputDemo.vue";
import FormPathSelectorDemo from "./components/FormPathSelectorDemo.vue";
import FormImageUploaderDemo from "./components/FormImageUploaderDemo.vue";
import FormDateRangeDemo from "./components/FormDateRangeDemo.vue";
import FormSliderDemo from "./components/FormSliderDemo.vue";

defineProps<{
  activeComponentKey: string;
}>();
</script>

<template>
  <div>
    <FormTextInputsDemo v-if="activeComponentKey === 'text-inputs'" />
    <FormChoiceControlsDemo v-else-if="activeComponentKey === 'choice-controls'" />
    <FormFormShellDemo v-else-if="activeComponentKey === 'form-shell'" />
    <FormFormItemDemo v-else-if="activeComponentKey === 'form-item'" />
    <FormTagInputDemo v-else-if="activeComponentKey === 'tag-input'" />
    <FormPathSelectorDemo v-else-if="activeComponentKey === 'path-selector'" />
    <FormImageUploaderDemo v-else-if="activeComponentKey === 'image-uploader'" />
    <FormDateRangeDemo v-else-if="activeComponentKey === 'date-range'" />
    <FormSliderDemo v-else-if="activeComponentKey === 'slider'" />
  </div>
</template>
