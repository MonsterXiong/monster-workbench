import { defineStore } from "pinia";
import { ref } from "vue";

export const useAiImageStore = defineStore("ai-image", () => {
  const imageDraftSize = ref("1008x1792");

  return {
    imageDraftSize,
  };
});
