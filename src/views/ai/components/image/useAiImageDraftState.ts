import { computed, ref, watch } from "vue";
import type { EmptyPromptStarter } from "./AiImageComposerPromptTools.vue";
import type { AiPromptItem } from "../../../../types/ai";
import {
  buildEnhancedPrompt,
  formatStylePromptContent,
  getPromptSubjectCandidate,
  isEnhancedPrompt,
  isStyledPrompt,
  STYLE_PROMPT_CATEGORY_ID,
  STYLE_PROMPT_SUBJECT_PLACEHOLDER,
} from "./aiImagePromptDraft";
import {
  filterBySearchTextFields,
  findByValue,
  formatTemplate,
  isBlank,
  toTrimmedString,
} from "../../../../utils";

type ImageTranslate = (key: string) => string;

type AiImageDraftPromptStore = {
  pendingPrompt: unknown;
  consumePendingPrompt: (type: "image") => string | undefined | null;
  getPrompts: (type: "image", categoryId: string) => AiPromptItem[];
};

type AiImageDraftStateOptions = {
  t: ImageTranslate;
  promptStore: AiImageDraftPromptStore;
  getActiveSizeLabel: () => string;
  setImageDraftSize: (size: string) => void;
  focusImageInput: () => Promise<void>;
};

export function useAiImageDraftState(options: AiImageDraftStateOptions) {
  const input = ref("");
  const selectedStylePromptId = ref("");
  const stylePromptSearch = ref("");
  const promptStartersExpanded = ref(false);
  const stylePresetsExpanded = ref(false);
  const promptBeforeEnhance = ref("");
  const stylePromptIdBeforeEnhance = ref("");

  const stylePromptPresets = computed(() =>
    options.promptStore.getPrompts("image", STYLE_PROMPT_CATEGORY_ID)
  );
  const filteredStylePromptPresets = computed(() => {
    const keyword = toTrimmedString(stylePromptSearch.value);
    if (!keyword) {
      return stylePromptPresets.value;
    }
    return filterBySearchTextFields(stylePromptPresets.value, keyword, [
      (item) => item.title,
      (item) => item.content,
    ]);
  });
  const selectedStylePrompt = computed(() =>
    findByValue(stylePromptPresets.value, (item) => item.id, selectedStylePromptId.value) ?? null
  );
  const stylePickerLabel = computed(() =>
    selectedStylePrompt.value?.title || options.t("aiPage.image.stylePresetLabel")
  );
  const stylePresetCountLabel = computed(() =>
    formatTemplate(options.t("aiPage.image.stylePresetCount"), {
      count: filteredStylePromptPresets.value.length,
      total: stylePromptPresets.value.length,
    })
  );
  const canEnhancePrompt = computed(() => !isBlank(input.value));
  const canUndoPromptEnhance = computed(() => !isBlank(promptBeforeEnhance.value));
  const draftPromptLength = computed(() => toTrimmedString(input.value).length);
  const draftHasStyleSubjectPlaceholder = computed(() =>
    toTrimmedString(input.value).includes(STYLE_PROMPT_SUBJECT_PLACEHOLDER)
  );
  const draftMetaItems = computed(() => {
    if (!draftPromptLength.value) {
      return [];
    }
    const items = [
      formatTemplate(options.t("aiPage.image.draftLength"), { count: draftPromptLength.value }),
      options.getActiveSizeLabel(),
    ];
    if (selectedStylePrompt.value) {
      items.push(formatTemplate(options.t("aiPage.image.draftStyle"), { style: selectedStylePrompt.value.title }));
    } else if (isEnhancedPrompt(input.value, options.t("aiPage.image.enhancedPromptMarker"))) {
      items.push(options.t("aiPage.image.draftEnhanced"));
    }
    if (draftHasStyleSubjectPlaceholder.value) {
      items.push(options.t("aiPage.image.draftSubjectMissing"));
    }
    return items;
  });

  function consumePendingPrompt() {
    const content = options.promptStore.consumePendingPrompt("image");
    if (content) {
      input.value = content;
      selectedStylePromptId.value = "";
      clearPromptEnhanceUndo();
    }
  }

  function applyStylePrompt(preset: AiPromptItem) {
    const subject = getPromptSubjectCandidate(input.value, stylePromptPresets.value);
    input.value = formatStylePromptContent(preset, subject);
    selectedStylePromptId.value = preset.id;
    promptStartersExpanded.value = false;
    stylePresetsExpanded.value = false;
    clearPromptEnhanceUndo();
    void options.focusImageInput();
  }

  function clearStylePrompt() {
    input.value = getPromptSubjectCandidate(input.value, stylePromptPresets.value);
    selectedStylePromptId.value = "";
    promptStartersExpanded.value = false;
    stylePresetsExpanded.value = false;
    clearPromptEnhanceUndo();
    void options.focusImageInput();
  }

  function clearPromptEnhanceUndo() {
    promptBeforeEnhance.value = "";
    stylePromptIdBeforeEnhance.value = "";
  }

  function enhancePrompt() {
    const subject = getPromptSubjectCandidate(input.value, stylePromptPresets.value);
    if (!subject) {
      return;
    }
    if (isEnhancedPrompt(subject, options.t("aiPage.image.enhancedPromptMarker"))) {
      input.value = subject;
      selectedStylePromptId.value = "";
      return;
    }
    promptBeforeEnhance.value = input.value;
    stylePromptIdBeforeEnhance.value = selectedStylePromptId.value;
    input.value = buildEnhancedPrompt(subject, options.t);
    selectedStylePromptId.value = "";
    promptStartersExpanded.value = false;
    stylePresetsExpanded.value = false;
    void options.focusImageInput();
  }

  function undoPromptEnhance() {
    if (!promptBeforeEnhance.value) {
      return;
    }
    input.value = promptBeforeEnhance.value;
    selectedStylePromptId.value = stylePromptIdBeforeEnhance.value;
    clearPromptEnhanceUndo();
    void options.focusImageInput();
  }

  function toggleStylePresets() {
    stylePresetsExpanded.value = !stylePresetsExpanded.value;
    if (stylePresetsExpanded.value) {
      promptStartersExpanded.value = false;
    }
  }

  function togglePromptStarters() {
    promptStartersExpanded.value = !promptStartersExpanded.value;
    if (promptStartersExpanded.value) {
      stylePresetsExpanded.value = false;
    }
  }

  function applyEmptyPromptStarter(starter: EmptyPromptStarter) {
    input.value = starter.prompt;
    options.setImageDraftSize(starter.size);
    selectedStylePromptId.value = "";
    promptStartersExpanded.value = false;
    stylePresetsExpanded.value = false;
    clearPromptEnhanceUndo();
    void options.focusImageInput();
  }

  function clearDraftPrompt() {
    input.value = "";
    selectedStylePromptId.value = "";
    promptStartersExpanded.value = false;
    stylePresetsExpanded.value = false;
    clearPromptEnhanceUndo();
    void options.focusImageInput();
  }

  watch(
    () => options.promptStore.pendingPrompt,
    () => consumePendingPrompt()
  );

  watch(input, (value) => {
    if (!selectedStylePrompt.value) {
      return;
    }
    if (!isStyledPrompt(value, selectedStylePrompt.value)) {
      selectedStylePromptId.value = "";
    }
  });

  return {
    input,
    selectedStylePromptId,
    stylePromptSearch,
    promptStartersExpanded,
    stylePresetsExpanded,
    stylePromptPresets,
    filteredStylePromptPresets,
    selectedStylePrompt,
    stylePickerLabel,
    stylePresetCountLabel,
    canEnhancePrompt,
    canUndoPromptEnhance,
    draftHasStyleSubjectPlaceholder,
    draftMetaItems,
    consumePendingPrompt,
    applyStylePrompt,
    clearStylePrompt,
    clearPromptEnhanceUndo,
    enhancePrompt,
    undoPromptEnhance,
    toggleStylePresets,
    togglePromptStarters,
    applyEmptyPromptStarter,
    clearDraftPrompt,
  };
}
