<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { Image, Send } from "lucide-vue-next";
import AiImageMessageList, { type AiImageMessageListActions, type ImageResultSummaryItem } from "./image/AiImageMessageList.vue";
import AiImageComposerPromptTools, { type EmptyPromptStarter } from "./image/AiImageComposerPromptTools.vue";
import AiImageComposerSettings from "./image/AiImageComposerSettings.vue";
import AiImagePreviewDialog, { type ImagePreviewInspectorItem } from "./image/AiImagePreviewDialog.vue";
import AiImageSessionList, { type ImageSessionStatusFilter } from "./image/AiImageSessionList.vue";
import { useAiStore } from "../../../stores/ai";
import { useAiPromptLibraryStore } from "../../../stores/ai-prompt-library";
import { useI18n } from "../../../composables/useI18n";
import type { ActionMenuItem } from "../../../components/common/BaseActionMenu.vue";
import type { AiConversationSession, AiPromptItem } from "../../../types/ai";
import {
  clearIntervalHandle,
  clampNumber,
  createInterval,
  extractTextBetween,
  findByValue,
  findIndexByValue,
  findLastItem,
  filterBySearchTextFields,
  firstItem,
  formatAspectRatio,
  formatDuration,
  formatPositiveDuration,
  formatReducedAspectRatio,
  formatTemplate,
  getDimensionsMaxSide,
  getDimensionsRatio,
  getCurrentTimestampMs,
  getErrorMessage,
  getElapsedMs,
  getItemAtOrOnly,
  includesAnyText,
  isBlank,
  hasMultipleItems,
  joinBy,
  joinLines,
  joinMappedNonEmptyLines,
  parseDimensionsText,
  replaceAllText,
  take,
  toTrimmedString,
  type IntervalHandle,
} from "../../../utils";

type ImageMessage = AiConversationSession["messages"][number];
const STYLE_PROMPT_CATEGORY_ID = "image-quality-styles";
const STYLE_PROMPT_SUBJECT_PLACEHOLDER = "{替换为你的主体}";
const VERIFIED_IMAGE_SIZE_VALUES = [
  "1008x1792",
  "1008x1344",
  "1536x864",
  "1344x1008",
  "1024x1024",
  "2048x2048",
  "1152x2048",
  "2048x1152",
  "1536x2048",
  "2048x1536",
  "1344x2016",
  "2016x1344",
  "2000x1600",
  "1600x2000",
  "2000x1200",
  "1200x2000",
  "2048x1024",
  "1024x2048",
  "2880x2880",
  "2160x3840",
  "3840x2160",
  "2160x2880",
  "2880x2160",
  "2304x3456",
  "3456x2304",
  "2880x2304",
  "2304x2880",
  "3600x2160",
  "2160x3600",
  "3840x1920",
  "1920x3840",
  "3840x1280",
  "1280x3840",
];
const EXPERIMENTAL_IMAGE_SIZE_VALUES = new Set<string>();
const IMAGE_SIZE_TIER_LABELS = new Map<string, string>([
  ["2048x2048", "2K"],
  ["1152x2048", "2K"],
  ["2048x1152", "2K"],
  ["1536x2048", "2K"],
  ["2048x1536", "2K"],
  ["2048x1024", "2K"],
  ["1024x2048", "2K"],
  ["2880x2880", "4K"],
  ["2160x3840", "4K"],
  ["3840x2160", "4K"],
  ["2160x2880", "4K"],
  ["2880x2160", "4K"],
  ["2304x3456", "4K"],
  ["3456x2304", "4K"],
  ["2880x2304", "4K"],
  ["2304x2880", "4K"],
  ["3600x2160", "4K"],
  ["2160x3600", "4K"],
  ["3840x1920", "4K"],
  ["1920x3840", "4K"],
  ["3840x1280", "4K"],
  ["1280x3840", "4K"],
]);

const aiStore = useAiStore();
const promptStore = useAiPromptLibraryStore();
const { t } = useI18n();
const input = ref("");
const imageDraftCount = ref(1);
const imageInputRef = ref<{ focus?: () => void } | null>(null);
const renameDialogVisible = ref(false);
const renameDraft = ref("");
const renamingSessionId = ref("");
const sessionSearch = ref("");
const previewDialogVisible = ref(false);
const previewImageIndex = ref(0);
const previewMessage = ref<ImageMessage | null>(null);
const selectedStylePromptId = ref("");
const stylePromptSearch = ref("");
const promptStartersExpanded = ref(false);
const stylePresetsExpanded = ref(false);
const sessionStatusFilter = ref<ImageSessionStatusFilter>("all");
const promptBeforeEnhance = ref("");
const stylePromptIdBeforeEnhance = ref("");
const nowMs = ref(getCurrentTimestampMs());
let clockTimer: IntervalHandle | null = null;

function getImageSizeTierLabel(size: string) {
  const mappedTier = IMAGE_SIZE_TIER_LABELS.get(size);
  if (mappedTier) {
    return mappedTier;
  }
  const dimensions = parseDimensionsText(size);
  if (!dimensions) {
    return "";
  }
  const maxSide = getDimensionsMaxSide(dimensions);
  if (maxSide >= 7680) {
    return "8K";
  }
  if (maxSide >= 3840) {
    return "4K";
  }
  if (maxSide >= 2048) {
    return "2K";
  }
  return "";
}

function getImageSizeKindLabel(size: string) {
  const dimensions = parseDimensionsText(size);
  if (!dimensions) {
    return t("aiPage.image.sizeKindCustom");
  }
  const ratio = getDimensionsRatio(dimensions);
  if (ratio === 1) {
    return t("aiPage.image.sizeKindSquare");
  }
  if (ratio >= 3) {
    return t("aiPage.image.sizeKindPanorama");
  }
  if (ratio <= 1 / 3) {
    return t("aiPage.image.sizeKindVerticalPanorama");
  }
  return ratio > 1 ? t("aiPage.image.sizeKindLandscape") : t("aiPage.image.sizeKindPortrait");
}

function buildImageSizeOption(size: string) {
  const dimensions = parseDimensionsText(size);
  const ratio = dimensions ? formatReducedAspectRatio(dimensions, ":") : size;
  const tier = getImageSizeTierLabel(size);
  const kind = getImageSizeKindLabel(size);
  const selectedLabel = ratio;
  const description = joinBy([kind, size], (item) => item, " · ");
  return {
    label: ratio,
    selectedLabel,
    description,
    filterText: joinBy([tier, kind, ratio, size], (item) => item, " "),
    meta: tier,
    value: size,
  };
}

const imageSizeOptions = computed(() => VERIFIED_IMAGE_SIZE_VALUES.map(buildImageSizeOption));

const emit = defineEmits<{
  (e: "tested", ok: boolean, message: string): void;
  (e: "failed", message: string): void;
}>();

const session = computed(() => aiStore.activeImageSession);
const messages = computed(() => session.value?.messages || []);
const isBusy = computed(() => aiStore.isActionBusy("image", aiStore.activeModelConfigIds.image));
const imageSupported = computed(() => aiStore.modelConfigSupportsCapability(aiStore.activeModelConfigIds.image, "image"));
const imageUnavailableTitle = computed(() =>
  formatTemplate(t("settings.aiProvider.capabilityUnsupported"), {
    capability: t("settings.aiProvider.capabilityImage"),
  })
);
const imageModelConfigOptions = computed(() =>
  aiStore.modelConfigs.map((item) => {
    const supported = aiStore.modelConfigSupportsCapability(item.id, "image");
    return {
      label: item.name || item.displayName || item.imageModel || item.model,
      selectedLabel: item.name || item.displayName || item.imageModel || item.model,
      value: item.id,
      description: item.imageModel || item.model,
      meta: supported ? t("settings.aiProvider.capabilityImage") : t("common.disabled"),
      disabled: !supported,
    };
  })
);
const queueStatus = computed(() => aiStore.getActionQueueStatus("image"));
const activeSizeOption = computed(() => findByValue(imageSizeOptions.value, (item) => item.value, aiStore.imageDraftSize) ?? firstItem(imageSizeOptions.value));
const activeSizeLabel = computed(() => activeSizeOption.value?.selectedLabel || aiStore.imageDraftSize);
const activeSizeDetail = computed(() => {
  const option = activeSizeOption.value;
  if (!option) {
    return aiStore.imageDraftSize;
  }
  return [option.description, option.meta].filter(Boolean).join(" · ");
});
const activeSizeNotice = computed(() => {
  if (!EXPERIMENTAL_IMAGE_SIZE_VALUES.has(aiStore.imageDraftSize)) {
    return "";
  }
  return formatTemplate(t("aiPage.image.experimentalSizeNotice"), { size: activeSizeLabel.value });
});
const imageCountOptions = computed(() =>
  [1, 2, 3, 4].map((count) => ({
    label: `x${count}`,
    selectedLabel: `x${count}`,
    description: formatTemplate(t("aiPage.image.resultImageCount"), { count }),
    filterText: `${count} ${formatTemplate(t("aiPage.image.resultImageCount"), { count })} x${count}`,
    value: count,
  }))
);
const activeImageModelName = computed(() => aiStore.activeImageConfig?.imageModel || aiStore.activeImageConfig?.model || "-");
const stylePromptPresets = computed(() => promptStore.getPrompts("image", STYLE_PROMPT_CATEGORY_ID));
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
const selectedStylePrompt = computed(() => findByValue(stylePromptPresets.value, (item) => item.id, selectedStylePromptId.value) ?? null);
const stylePickerLabel = computed(() => selectedStylePrompt.value?.title || t("aiPage.image.stylePresetLabel"));
const stylePresetCountLabel = computed(() => formatTemplate(t("aiPage.image.stylePresetCount"), {
  count: filteredStylePromptPresets.value.length,
  total: stylePromptPresets.value.length,
}));
const canEnhancePrompt = computed(() => !isBlank(input.value));
const canUndoPromptEnhance = computed(() => !isBlank(promptBeforeEnhance.value));
const draftPromptLength = computed(() => toTrimmedString(input.value).length);
const draftHasStyleSubjectPlaceholder = computed(() => toTrimmedString(input.value).includes(STYLE_PROMPT_SUBJECT_PLACEHOLDER));
const canGenerateImage = computed(() => imageSupported.value && !isBlank(input.value) && !isBusy.value && !draftHasStyleSubjectPlaceholder.value);
const imageGenerateButtonTitle = computed(() => {
  if (!imageSupported.value) {
    return imageUnavailableTitle.value;
  }
  if (draftHasStyleSubjectPlaceholder.value) {
    return t("aiPage.image.subjectPlaceholderButtonTitle");
  }
  return undefined;
});
const draftMetaItems = computed(() => {
  if (!draftPromptLength.value) {
    return [];
  }
  const items = [
    formatTemplate(t("aiPage.image.draftLength"), { count: draftPromptLength.value }),
    activeSizeLabel.value,
  ];
  if (selectedStylePrompt.value) {
    items.push(formatTemplate(t("aiPage.image.draftStyle"), { style: selectedStylePrompt.value.title }));
  } else if (isEnhancedPrompt(input.value)) {
    items.push(t("aiPage.image.draftEnhanced"));
  }
  if (draftHasStyleSubjectPlaceholder.value) {
    items.push(t("aiPage.image.draftSubjectMissing"));
  }
  return items;
});
const emptyPromptStarters = computed<EmptyPromptStarter[]>(() => [
  {
    key: "product-poster",
    title: t("aiPage.image.starterProductPoster"),
    prompt: t("aiPage.image.starterProductPosterPrompt"),
    size: "1008x1792",
    sizeLabel: "9:16",
  },
  {
    key: "launch-cover",
    title: t("aiPage.image.starterLaunchCover"),
    prompt: t("aiPage.image.starterLaunchCoverPrompt"),
    size: "1536x864",
    sizeLabel: "16:9",
  },
  {
    key: "character-sheet",
    title: t("aiPage.image.starterCharacterSheet"),
    prompt: t("aiPage.image.starterCharacterSheetPrompt"),
    size: "1008x1344",
    sizeLabel: "3:4",
  },
  {
    key: "interior-mood",
    title: t("aiPage.image.starterInteriorMood"),
    prompt: t("aiPage.image.starterInteriorMoodPrompt"),
    size: "1344x1008",
    sizeLabel: "4:3",
  },
]);
const imageStatusLabel = computed(() => {
  if (queueStatus.value === "queued") {
    return t("aiPage.image.queued");
  }
  return isBusy.value ? t("aiPage.image.generating") : t("aiPage.image.ready");
});
const sessionActions = computed<ActionMenuItem[]>(() => [
  { key: "rename", label: t("aiPage.sessions.rename"), icon: "Pencil" },
  { key: "duplicate", label: t("aiPage.sessions.duplicate"), icon: "Copy" },
  { key: "delete", label: t("common.delete"), icon: "Trash2", type: "danger", divided: true },
]);
const activeImageHeaderMeta = computed(() => [
  aiStore.activeImageConfig?.name || aiStore.activeImageConfig?.displayName,
  activeImageModelName.value,
  isBusy.value ? imageStatusLabel.value : "",
].filter(Boolean).join(" · "));

onMounted(async () => {
  clockTimer = createInterval(() => {
    nowMs.value = getCurrentTimestampMs();
  }, 1000);
  if (!aiStore.isLoaded) {
    await aiStore.loadConfig();
  }
  if (!aiStore.activeImageSession) {
    aiStore.createSession("image");
  }
  try {
    await aiStore.refreshBackendQueueStatus();
    await aiStore.reconcilePendingImageMessages({ checkBackend: true });
  } catch (err) {
    console.error("[ERR_AI_IMAGE_RECOVER] AI 生图会话恢复失败", err);
  }
  consumePendingPrompt();
});

onUnmounted(() => {
  clearIntervalHandle(clockTimer);
  clockTimer = null;
});

watch(
  () => promptStore.pendingPrompt,
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

function consumePendingPrompt() {
  const content = promptStore.consumePendingPrompt("image");
  if (content) {
    input.value = content;
    selectedStylePromptId.value = "";
    clearPromptEnhanceUndo();
  }
}

function extractSubjectFromStylePrompt(content: string, preset: AiPromptItem) {
  const presetContent = toTrimmedString(preset.content);
  if (!presetContent.includes(STYLE_PROMPT_SUBJECT_PLACEHOLDER)) {
    return null;
  }
  const subjectIndex = presetContent.indexOf(STYLE_PROMPT_SUBJECT_PLACEHOLDER);
  const prefix = presetContent.slice(0, subjectIndex);
  const suffix = presetContent.slice(subjectIndex + STYLE_PROMPT_SUBJECT_PLACEHOLDER.length);
  const cleanContent = toTrimmedString(content);
  const subject = extractTextBetween(cleanContent, prefix, suffix);
  if (!subject.found) {
    return null;
  }
  return subject.value.trim();
}

function getPromptSubjectCandidate(content: string) {
  const cleanContent = toTrimmedString(content);
  for (const preset of stylePromptPresets.value) {
    const subject = extractSubjectFromStylePrompt(cleanContent, preset);
    if (subject !== null) {
      return subject === STYLE_PROMPT_SUBJECT_PLACEHOLDER ? "" : subject;
    }
  }
  return cleanContent;
}

function isEnhancedPrompt(content: string) {
  const cleanContent = toTrimmedString(content);
  return includesAnyText(cleanContent, [t("aiPage.image.enhancedPromptMarker"), "质量控制：", "Quality control:"]);
}

function isStyledPrompt(content: string, preset: AiPromptItem) {
  return extractSubjectFromStylePrompt(content, preset) !== null;
}

function formatStylePromptContent(preset: AiPromptItem, subject: string) {
  const presetContent = toTrimmedString(preset.content);
  if (!presetContent) {
    return subject;
  }
  if (presetContent.includes(STYLE_PROMPT_SUBJECT_PLACEHOLDER)) {
    return replaceAllText(presetContent, STYLE_PROMPT_SUBJECT_PLACEHOLDER, subject || STYLE_PROMPT_SUBJECT_PLACEHOLDER);
  }
  return subject ? `${subject}\n\n${presetContent}` : presetContent;
}

function applyStylePrompt(preset: AiPromptItem) {
  const subject = getPromptSubjectCandidate(input.value);
  input.value = formatStylePromptContent(preset, subject);
  selectedStylePromptId.value = preset.id;
  promptStartersExpanded.value = false;
  stylePresetsExpanded.value = false;
  clearPromptEnhanceUndo();
  void focusImageInput();
}

function clearStylePrompt() {
  input.value = getPromptSubjectCandidate(input.value);
  selectedStylePromptId.value = "";
  promptStartersExpanded.value = false;
  stylePresetsExpanded.value = false;
  clearPromptEnhanceUndo();
  void focusImageInput();
}

function clearPromptEnhanceUndo() {
  promptBeforeEnhance.value = "";
  stylePromptIdBeforeEnhance.value = "";
}

function enhancePrompt() {
  const subject = getPromptSubjectCandidate(input.value);
  if (!subject) {
    return;
  }
  if (isEnhancedPrompt(subject)) {
    input.value = subject;
    selectedStylePromptId.value = "";
    return;
  }
  promptBeforeEnhance.value = input.value;
  stylePromptIdBeforeEnhance.value = selectedStylePromptId.value;
  input.value = joinLines([
    formatTemplate(t("aiPage.image.enhancedPromptSubject"), { subject }),
    t("aiPage.image.enhancedPromptComposition"),
    t("aiPage.image.enhancedPromptLighting"),
    t("aiPage.image.enhancedPromptDetails"),
    t("aiPage.image.enhancedPromptQuality"),
  ]);
  selectedStylePromptId.value = "";
  promptStartersExpanded.value = false;
  stylePresetsExpanded.value = false;
  void focusImageInput();
}

function undoPromptEnhance() {
  if (!promptBeforeEnhance.value) {
    return;
  }
  input.value = promptBeforeEnhance.value;
  selectedStylePromptId.value = stylePromptIdBeforeEnhance.value;
  clearPromptEnhanceUndo();
  void focusImageInput();
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

async function focusImageInput() {
  await nextTick();
  imageInputRef.value?.focus?.();
}

function applyEmptyPromptStarter(starter: EmptyPromptStarter) {
  input.value = starter.prompt;
  aiStore.imageDraftSize = starter.size;
  selectedStylePromptId.value = "";
  promptStartersExpanded.value = false;
  stylePresetsExpanded.value = false;
  clearPromptEnhanceUndo();
  void focusImageInput();
}

function clearDraftPrompt() {
  input.value = "";
  selectedStylePromptId.value = "";
  promptStartersExpanded.value = false;
  stylePresetsExpanded.value = false;
  clearPromptEnhanceUndo();
  void focusImageInput();
}

function handleImageModelConfigChange(value: unknown) {
  const configId = String(value);
  if (!aiStore.modelConfigSupportsCapability(configId, "image")) {
    emit("failed", imageUnavailableTitle.value);
    return;
  }
  aiStore.setActiveModelConfig("image", configId);
}

async function handleGenerate() {
  const content = toTrimmedString(input.value);
  if (!content || isBusy.value) {
    return;
  }
  if (!imageSupported.value) {
    emit("failed", imageUnavailableTitle.value);
    return;
  }
  if (draftHasStyleSubjectPlaceholder.value) {
    void focusImageInput();
    return;
  }
  input.value = "";
  selectedStylePromptId.value = "";
  promptStartersExpanded.value = false;
  stylePresetsExpanded.value = false;
  clearPromptEnhanceUndo();
  try {
    await aiStore.generateImageMessage(
      content,
      aiStore.activeModelConfigIds.image,
      aiStore.imageDraftSize,
      imageDraftCount.value
    );
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.testFailed")));
  }
}

function findRetryPrompt(messageId: string) {
  const index = findIndexByValue(messages.value, (message) => message.id, messageId);
  if (index <= 0) {
    return "";
  }
  return findLastItem(take(messages.value, index), (message) => message.role === "user")?.content || "";
}

function canRetryImageMessage(message: AiConversationSession["messages"][number]) {
  const configId = message.modelConfigId || aiStore.activeModelConfigIds.image;
  return (
    message.role !== "user" &&
    (message.status === "failed" || message.status === "canceled") &&
    Boolean(findRetryPrompt(message.id)) &&
    !isBusy.value &&
    aiStore.modelConfigSupportsCapability(configId, "image")
  );
}

function canUsePromptFromMessage(message: ImageMessage) {
  return message.role !== "user" && message.status !== "pending" && Boolean(findRetryPrompt(message.id));
}

function canRegenerateImageMessage(message: ImageMessage) {
  const configId = message.modelConfigId || aiStore.activeModelConfigIds.image;
  return (
    message.role !== "user" &&
    message.status === "success" &&
    Boolean(findRetryPrompt(message.id)) &&
    !isBusy.value &&
    aiStore.modelConfigSupportsCapability(configId, "image")
  );
}

function canCancelImageMessage(message: ImageMessage) {
  return message.role !== "user" && message.status === "pending" && Boolean(message.requestId);
}

function getMessageRegenerateSize(message: ImageMessage) {
  return message.requestedImageSize || message.imageSize || aiStore.imageDraftSize;
}

function usePromptFromMessage(message: ImageMessage) {
  const prompt = findRetryPrompt(message.id);
  if (!prompt) {
    return;
  }
  input.value = prompt;
  aiStore.imageDraftSize = getMessageRegenerateSize(message);
  imageDraftCount.value = getMessageImageCount(message);
  selectedStylePromptId.value = "";
  promptStartersExpanded.value = false;
  stylePresetsExpanded.value = false;
  clearPromptEnhanceUndo();
  void focusImageInput();
}

async function retryImageMessage(message: AiConversationSession["messages"][number]) {
  const prompt = findRetryPrompt(message.id);
  if (!prompt || isBusy.value) {
    return;
  }
  const configId = message.modelConfigId || aiStore.activeModelConfigIds.image;
  if (!aiStore.modelConfigSupportsCapability(configId, "image")) {
    emit("failed", imageUnavailableTitle.value);
    return;
  }
  try {
    await aiStore.generateImageMessage(
      prompt,
      configId,
      getMessageRegenerateSize(message),
      getMessageImageCount(message)
    );
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.testFailed")));
  }
}

async function regenerateImageMessage(message: ImageMessage) {
  const prompt = findRetryPrompt(message.id);
  if (!prompt || isBusy.value) {
    return;
  }
  const configId = message.modelConfigId || aiStore.activeModelConfigIds.image;
  if (!aiStore.modelConfigSupportsCapability(configId, "image")) {
    emit("failed", imageUnavailableTitle.value);
    return;
  }
  try {
    await aiStore.generateImageMessage(
      prompt,
      configId,
      getMessageRegenerateSize(message),
      getMessageImageCount(message)
    );
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.testFailed")));
  }
}

async function cancelImageMessage(message: ImageMessage) {
  if (!canCancelImageMessage(message)) {
    return;
  }
  try {
    await aiStore.cancelImageMessage(message.id);
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.testFailed")));
  }
}

async function handleDeleteSession(sessionId: string) {
  try {
    await aiStore.deleteSession(sessionId);
    if (!aiStore.activeImageSession) {
      aiStore.createSession("image");
    }
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.saveFailed")));
  }
}

function openRenameSession(target: AiConversationSession) {
  renamingSessionId.value = target.id;
  renameDraft.value = target.title;
  renameDialogVisible.value = true;
}

async function saveSessionName() {
  try {
    await aiStore.renameSession(renamingSessionId.value, renameDraft.value);
    renameDialogVisible.value = false;
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.saveFailed")));
  }
}

async function handleSessionAction(action: ActionMenuItem, target: AiConversationSession) {
  try {
    if (action.key === "rename") {
      openRenameSession(target);
      return;
    }
    if (action.key === "duplicate") {
      await aiStore.duplicateSession(target.id);
      return;
    }
    if (action.key === "delete") {
      await handleDeleteSession(target.id);
    }
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.saveFailed")));
  }
}

function parseImageSize(size: string | undefined) {
  return parseDimensionsText(size || aiStore.imageDraftSize, { width: 1, height: 1 }) ?? { width: 1, height: 1 };
}

function getImagePreviewStyle(message: ImageMessage) {
  const dimensions = parseImageSize(message.imageSize);
  const ratio = getDimensionsRatio(dimensions);
  if (ratio >= 3) {
    return { aspectRatio: "auto", height: "168px" };
  }
  if (ratio <= 1 / 3) {
    return { aspectRatio: "auto", height: "320px" };
  }
  return { aspectRatio: formatAspectRatio(dimensions) };
}

function getPreviewItems(message: ImageMessage) {
  return message.imageUrls || [];
}

function hasMultiplePreviewItems(message: ImageMessage) {
  return hasMultipleItems(getPreviewItems(message));
}

function hasMultipleSavedFiles(message: ImageMessage) {
  return hasMultipleItems(message.savedFiles || []);
}

function getGeneratedImageUrlsText(message: ImageMessage) {
  return joinLines(getPreviewItems(message));
}

function getGeneratedImageSavedFilePathsText(message: ImageMessage) {
  return joinMappedNonEmptyLines(message.savedFiles || [], (file) => file.path);
}

function getGeneratedImageSavedFile(message: ImageMessage, index: number) {
  const files = message.savedFiles || [];
  return getItemAtOrOnly(files, index) ?? null;
}

function getGeneratedImageSavedFilePath(message: ImageMessage, index: number) {
  return getGeneratedImageSavedFile(message, index)?.path || "";
}

function hasGeneratedImageSavedFile(message: ImageMessage, index: number) {
  return Boolean(getGeneratedImageSavedFilePath(message, index));
}

async function openGeneratedImageLocation(message: ImageMessage, index: number) {
  const path = getGeneratedImageSavedFilePath(message, index);
  if (!path) {
    return;
  }
  try {
    await aiStore.openImageSavedFileLocation(path);
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.saveFailed")));
  }
}

async function openPreviewSavedFileLocation() {
  const files = previewMessage.value?.savedFiles || [];
  const path = getItemAtOrOnly(files, previewImageIndex.value)?.path || "";
  if (!path) {
    return;
  }
  try {
    await aiStore.openImageSavedFileLocation(path);
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.saveFailed")));
  }
}

function hasGeneratedImages(message: ImageMessage) {
  return getPreviewItems(message).length > 0;
}

const previewPrompt = computed(() => (previewMessage.value ? getMessagePrompt(previewMessage.value) : ""));
const previewImageTitle = computed(() => (previewMessage.value ? getImagePreviewTitle(previewMessage.value) : ""));
const previewActualSize = computed(() => (previewMessage.value ? getMessageActualSize(previewMessage.value) : ""));
const previewRequestedSize = computed(() => (previewMessage.value ? getMessageRequestedSize(previewMessage.value) : ""));
const previewLatencyLabel = computed(() => (previewMessage.value ? getMessageLatencyLabel(previewMessage.value) : ""));
const previewIsSizeFallback = computed(() => Boolean(previewMessage.value && isImageSizeFallback(previewMessage.value)));
const previewIsSizeCompatibility = computed(() => Boolean(previewMessage.value && isImageSizeCompatibility(previewMessage.value)));
const previewFallbackNotice = computed(() => (previewMessage.value ? getFallbackNotice(previewMessage.value) : ""));
const previewCompatibilityNotice = computed(() => (previewMessage.value ? getCompatibilityNotice(previewMessage.value) : ""));
const previewCanUsePrompt = computed(() => Boolean(previewMessage.value && canUsePromptFromMessage(previewMessage.value)));
const previewCanRegenerate = computed(() => Boolean(previewMessage.value && canRegenerateImageMessage(previewMessage.value)));
const previewInspectorItems = computed<ImagePreviewInspectorItem[]>(() => {
  const message = previewMessage.value;
  if (!message) {
    return [];
  }

  const previewItems = getPreviewItems(message);
  const items: ImagePreviewInspectorItem[] = [];
  if (previewItems.length) {
    items.push({
      key: "image-index",
      label: t("aiPage.image.previewImage"),
      value: formatTemplate(t("aiPage.image.previewCount"), {
        current: previewImageIndex.value + 1,
        total: previewItems.length,
      }),
      tone: hasMultipleItems(previewItems) ? "info" : undefined,
    });
  }

  const actualSize = getMessageActualSize(message);
  if (actualSize) {
    items.push({
      key: "actual-size",
      label: t("aiPage.image.actualSize"),
      value: actualSize,
    });
  }

  const requestedSize = getMessageRequestedSize(message);
  const apiSize = getMessageApiSize(message);
  if (requestedSize && apiSize && requestedSize !== apiSize) {
    items.push({
      key: "api-size",
      label: t("aiPage.image.previewApiSize"),
      value: apiSize,
      tone: "info",
    });
  }

  return items;
});

function openImagePreview(_url: string, message: ImageMessage, index = 0) {
  previewImageIndex.value = index;
  previewMessage.value = message;
  previewDialogVisible.value = true;
}

async function usePromptFromPreview() {
  const message = previewMessage.value;
  if (!message || !canUsePromptFromMessage(message)) {
    return;
  }
  previewDialogVisible.value = false;
  await nextTick();
  usePromptFromMessage(message);
}

async function regeneratePreviewImage() {
  const message = previewMessage.value;
  if (!message || !canRegenerateImageMessage(message)) {
    return;
  }
  previewDialogVisible.value = false;
  await nextTick();
  await regenerateImageMessage(message);
}

function findImageTaskItem(message: ImageMessage) {
  if (!message.requestId) {
    return null;
  }
  const localItem = findByValue(aiStore.testQueue, (item) => item.id, message.requestId);
  if (localItem) {
    return localItem;
  }
  return (
    findByValue(aiStore.backendQueueStatus.runningItems || [], (item) => item.requestId, message.requestId) ??
    findByValue(aiStore.backendQueueStatus.queued, (item) => item.requestId, message.requestId) ??
    null
  );
}

function getImageTaskValue(task: ReturnType<typeof findImageTaskItem>, key: string) {
  return task ? (task as Record<string, unknown>)[key] : undefined;
}

function getPendingImageStatusLabel(message: ImageMessage) {
  const task = findImageTaskItem(message);
  if (!task && message.requestId && getElapsedMs(message.createdAt, nowMs.value) > 30_000) {
    return t("aiPage.image.recovering");
  }
  const status = getImageTaskValue(task, "status");
  const startedAt = Number(getImageTaskValue(task, "startedAt") ?? getImageTaskValue(task, "startedAtMs") ?? 0);
  if (status === "queued" || (task && !startedAt)) {
    return t("aiPage.image.queued");
  }
  return t("aiPage.image.generating");
}

function getPendingImageElapsedLabel(message: ImageMessage) {
  const task = findImageTaskItem(message);
  const createdAt = Number(getImageTaskValue(task, "createdAt") ?? getImageTaskValue(task, "createdAtMs") ?? message.createdAt);
  const startedAt = Number(getImageTaskValue(task, "startedAt") ?? getImageTaskValue(task, "startedAtMs") ?? 0);
  const baseTime = startedAt || createdAt || message.createdAt;
  const elapsed = getElapsedMs(baseTime, nowMs.value);
  const labelKey = startedAt ? "elapsed" : "queueElapsed";
  return formatTemplate(t(`aiPage.image.${labelKey}`), { time: formatDuration(elapsed, { maxUnits: 2 }) });
}

function getMessageRequestedSize(message: ImageMessage) {
  return message.requestedImageSize || message.imageSize || "";
}

function getMessageImageCount(message: ImageMessage) {
  return clampNumber(Number(message.imageCount || getPreviewItems(message).length || 1), 1, 4, 1, 0);
}

function getMessageActualSize(message: ImageMessage) {
  return message.actualImageSize || message.imageSize || "";
}

function getMessageApiSize(message: ImageMessage) {
  return message.apiImageSize || "";
}

function isImageSizeFallback(message: ImageMessage) {
  const requestedSize = getMessageRequestedSize(message);
  const actualSize = getMessageActualSize(message);
  return Boolean(message.fallbackImageSize) || Boolean(requestedSize && actualSize && requestedSize !== actualSize);
}

function isImageSizeCompatibility(message: ImageMessage) {
  const requestedSize = getMessageRequestedSize(message);
  const apiSize = getMessageApiSize(message);
  return Boolean(apiSize && requestedSize && apiSize !== requestedSize && !isImageSizeFallback(message));
}

function getMessageSizeMeta(message: ImageMessage) {
  const requestedSize = getMessageRequestedSize(message);
  const actualSize = getMessageActualSize(message);
  if (!requestedSize && !actualSize) {
    return "";
  }
  if (message.role !== "user" && isImageSizeFallback(message)) {
    return `${t("aiPage.image.requestedSize")} ${requestedSize} -> ${t("aiPage.image.actualSize")} ${actualSize}`;
  }
  return actualSize || requestedSize;
}

function getImagePreviewTitle(message: ImageMessage) {
  const requestedSize = getMessageRequestedSize(message);
  const actualSize = getMessageActualSize(message);
  if (isImageSizeFallback(message)) {
    return `${actualSize} (${t("aiPage.image.requestedSize")} ${requestedSize})`;
  }
  return actualSize || activeSizeLabel.value;
}

function getFallbackNotice(message: ImageMessage) {
  const requestedSize = getMessageRequestedSize(message);
  const actualSize = getMessageActualSize(message);
  let text = formatTemplate(t("aiPage.image.sizeFallback"), {
    requested: requestedSize,
    actual: actualSize,
  });
  if (message.imageAttempts && message.imageAttempts > 1) {
    text += ` · ${formatTemplate(t("aiPage.image.attempts"), { count: message.imageAttempts })}`;
  }
  return text;
}

function getCompatibilityNotice(message: ImageMessage) {
  return formatTemplate(t("aiPage.image.sizeCompatibility"), {
    requested: getMessageRequestedSize(message),
    api: getMessageApiSize(message),
  });
}

function formatMessageDuration(value: unknown) {
  return formatPositiveDuration(value, { maxUnits: 2 });
}

function getMessageLatencyLabel(message: ImageMessage) {
  return formatMessageDuration(message.totalLatencyMs || message.latencyMs);
}

function getMessageQueueWaitLabel(message: ImageMessage) {
  return formatMessageDuration(message.queueWaitMs);
}

function getImageFailureText(message: ImageMessage) {
  if (isCanceledImageMessage(message)) {
    return t("aiPage.image.canceledMessage");
  }
  return message.error || message.content || t("aiPage.image.failureUnknown");
}

function isCanceledImageMessage(message: ImageMessage) {
  return message.status === "canceled" || message.failureKind === "canceled";
}

function getImageMessageText(message: ImageMessage) {
  if (isCanceledImageMessage(message)) {
    return t("aiPage.image.canceledMessage");
  }
  return message.content;
}

function getImageFailureTitle(message: ImageMessage) {
  return isCanceledImageMessage(message)
    ? t("aiPage.image.canceled")
    : t("aiPage.image.failureTitle");
}

function getFailureKindLabel(message: ImageMessage) {
  if (!message.failureKind) {
    return "";
  }
  return t(`aiPage.image.failureKind.${message.failureKind}`) || message.failureKind;
}

function getFailureHint(message: ImageMessage) {
  if (isCanceledImageMessage(message)) {
    return t("aiPage.image.failureHintCanceled");
  }
  if (message.failureKind === "unsupported_size") {
    return t("aiPage.image.failureHintUnsupportedSize");
  }
  if (message.failureKind === "timeout") {
    return t("aiPage.image.failureHintTimeout");
  }
  if (message.failureKind === "connection") {
    return t("aiPage.image.failureHintConnection");
  }
  return t("aiPage.image.failureHint");
}

function getImageResultSummaryItems(message: ImageMessage): ImageResultSummaryItem[] {
  if (message.role === "user" || message.status === "pending") {
    return [];
  }

  const items: ImageResultSummaryItem[] = [];
  const imageCount = getPreviewItems(message).length;
  const latency = getMessageLatencyLabel(message);
  const queueWait = getMessageQueueWaitLabel(message);
  const apiSize = getMessageApiSize(message);
  const requestedSize = getMessageRequestedSize(message);

  if ((message.status === "failed" || message.status === "canceled") && message.failureKind) {
    items.push({
      key: "failure-kind",
      label: getFailureKindLabel(message),
      tone: message.failureKind === "unsupported_size" ? "danger" : "warning",
    });
  }
  if (imageCount > 0) {
    items.push({
      key: "images",
      label: formatTemplate(t("aiPage.image.resultImageCount"), { count: imageCount }),
      tone: "success",
    });
  }
  if (latency) {
    items.push({
      key: "latency",
      label: `${t("aiPage.image.latency")} ${latency}`,
      tone: "info",
    });
  }
  if (queueWait) {
    items.push({
      key: "queue",
      label: `${t("aiPage.image.queueWait")} ${queueWait}`,
      tone: "info",
    });
  }
  if (message.imageAttempts && message.imageAttempts > 1) {
    items.push({
      key: "attempts",
      label: formatTemplate(t("aiPage.image.attempts"), { count: message.imageAttempts }),
      tone: "warning",
    });
  }
  if (apiSize && requestedSize && apiSize !== requestedSize) {
    items.push({
      key: "api-size",
      label: formatTemplate(t("aiPage.image.sizeApiTag"), { size: apiSize }),
      tone: "info",
    });
  }

  return items;
}

function getMessagePrompt(message: ImageMessage) {
  if (message.role === "user") {
    return message.content;
  }
  return findRetryPrompt(message.id);
}

const messageListActions: AiImageMessageListActions = {
  parseImageSize,
  applyEmptyPromptStarter,
  getMessageSizeMeta,
  getMessageLatencyLabel,
  getImagePreviewStyle,
  getPendingImageStatusLabel,
  getPendingImageElapsedLabel,
  getMessageRequestedSize,
  cancelImageMessage,
  getImageMessageText,
  isImageSizeFallback,
  getFallbackNotice,
  isImageSizeCompatibility,
  getCompatibilityNotice,
  getImageFailureTitle,
  getFailureHint,
  canUsePromptFromMessage,
  usePromptFromMessage,
  canRetryImageMessage,
  retryImageMessage,
  getImageFailureText,
  getImageResultSummaryItems,
  getPreviewItems,
  hasMultiplePreviewItems,
  hasMultipleSavedFiles,
  getGeneratedImageUrlsText,
  getGeneratedImageSavedFilePathsText,
  openImagePreview,
  canRegenerateImageMessage,
  regenerateImageMessage,
  hasGeneratedImageSavedFile,
  getGeneratedImageSavedFilePath,
  openGeneratedImageLocation,
  hasGeneratedImages,
};

</script>

<template>
  <section class="image-panel">
    <AiImageSessionList
      v-model:search-text="sessionSearch"
      v-model:status-filter="sessionStatusFilter"
      :sessions="aiStore.imageSessions"
      :active-session-id="aiStore.activeSessionIds.image"
      :actions="sessionActions"
      @create="aiStore.createSession('image')"
      @select="aiStore.selectSession('image', $event)"
      @action="handleSessionAction"
    />

    <div class="image-workspace">
      <header class="image-header">
        <div class="image-header__icon">
          <Image class="h-4.5 w-4.5" />
        </div>
        <div class="min-w-0 flex-1">
          <h3>{{ t("aiPage.image.title") }}</h3>
          <p>{{ activeImageHeaderMeta }}</p>
        </div>
      </header>

      <AiImageMessageList
        :messages="messages"
        :image-draft-size="aiStore.imageDraftSize"
        :active-size-label="activeSizeLabel"
        :active-size-detail="activeSizeDetail"
        :active-image-model-name="activeImageModelName"
        :empty-prompt-starters="emptyPromptStarters"
        :actions="messageListActions"
      />

      <footer class="image-composer">
        <div class="composer-shell">
          <AiImageComposerSettings
            :model-config-id="aiStore.activeModelConfigIds.image"
            :model-config-options="imageModelConfigOptions"
            :image-draft-size="aiStore.imageDraftSize"
            :image-size-options="imageSizeOptions"
            :image-draft-count="imageDraftCount"
            :image-count-options="imageCountOptions"
            :active-size-label="activeSizeLabel"
            :active-size-detail="activeSizeDetail"
            @update:model-config-id="handleImageModelConfigChange"
            @update:image-draft-size="aiStore.imageDraftSize = $event"
            @update:image-draft-count="imageDraftCount = $event"
          />
          <AiImageComposerPromptTools
            v-model:style-prompt-search="stylePromptSearch"
            :empty-prompt-starters="emptyPromptStarters"
            :style-prompt-presets="stylePromptPresets"
            :filtered-style-prompt-presets="filteredStylePromptPresets"
            :selected-style-prompt="selectedStylePrompt"
            :selected-style-prompt-id="selectedStylePromptId"
            :style-picker-label="stylePickerLabel"
            :style-preset-count-label="stylePresetCountLabel"
            :prompt-starters-expanded="promptStartersExpanded"
            :style-presets-expanded="stylePresetsExpanded"
            :can-enhance-prompt="canEnhancePrompt"
            :can-undo-prompt-enhance="canUndoPromptEnhance"
            :active-size-notice="activeSizeNotice"
            :draft-meta-items="draftMetaItems"
            :draft-has-style-subject-placeholder="draftHasStyleSubjectPlaceholder"
            @toggle-prompt-starters="togglePromptStarters"
            @toggle-style-presets="toggleStylePresets"
            @enhance-prompt="enhancePrompt"
            @undo-prompt-enhance="undoPromptEnhance"
            @clear-style-prompt="clearStylePrompt"
            @apply-style-prompt="applyStylePrompt"
            @apply-empty-prompt-starter="applyEmptyPromptStarter"
            @clear-draft-prompt="clearDraftPrompt"
          />
          <div class="composer-bottom">
            <el-input
              ref="imageInputRef"
              v-model="input"
              class="image-textarea"
              type="textarea"
              :rows="2"
              resize="none"
              :disabled="!imageSupported"
              :placeholder="t('aiPage.image.inputPlaceholder')"
              :title="imageSupported ? undefined : imageUnavailableTitle"
              @keydown.enter.exact.prevent="handleGenerate"
            />
            <BaseButton
              type="success"
              size="sm"
              class="generate-btn"
              :loading="Boolean(isBusy)"
              :disabled="!canGenerateImage"
              :title="imageGenerateButtonTitle"
              @click="handleGenerate"
            >
              <template #icon><Send class="h-3.5 w-3.5" /></template>
              {{ isBusy ? t("aiPage.image.generating") : t("aiPage.image.run") }}
            </BaseButton>
          </div>
        </div>
      </footer>
    </div>

    <BaseDialog v-model="renameDialogVisible" :title="t('aiPage.sessions.renameTitle')" width="420px">
      <div class="rename-form">
        <span class="rename-label">{{ t("aiPage.sessions.nameLabel") }}</span>
        <BaseInput
          v-model="renameDraft"
          :placeholder="t('aiPage.sessions.namePlaceholder')"
          maxlength="48"
          clearable
          @enter="saveSessionName"
        />
      </div>
      <template #footer>
        <BaseButton type="neutral" outline size="sm" @click="renameDialogVisible = false">
          {{ t("common.cancel") }}
        </BaseButton>
        <BaseButton type="primary" size="sm" @click="saveSessionName">
          {{ t("common.save") }}
        </BaseButton>
      </template>
    </BaseDialog>

    <AiImagePreviewDialog
      v-model:visible="previewDialogVisible"
      v-model:image-index="previewImageIndex"
      :message="previewMessage"
      :title="previewImageTitle"
      :prompt="previewPrompt"
      :inspector-items="previewInspectorItems"
      :actual-size="previewActualSize"
      :requested-size="previewRequestedSize"
      :latency-label="previewLatencyLabel"
      :is-size-fallback="previewIsSizeFallback"
      :is-size-compatibility="previewIsSizeCompatibility"
      :fallback-notice="previewFallbackNotice"
      :compatibility-notice="previewCompatibilityNotice"
      :can-use-prompt="previewCanUsePrompt"
      :can-regenerate="previewCanRegenerate"
      @use-prompt="usePromptFromPreview"
      @regenerate="regeneratePreviewImage"
      @open-saved-file-location="openPreviewSavedFileLocation"
    />
  </section>
</template>

<style scoped>
.image-panel {
  @apply grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)];
}
.image-workspace {
  @apply flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950;
}
.image-header {
  @apply flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800;
}
.image-header__icon {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300;
}
.image-header h3 {
  @apply text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200;
}
.image-header p {
  @apply mt-0.5 truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400;
}
.image-composer {
  @apply shrink-0 border-t border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950;
}
.composer-shell {
  @apply flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm transition-colors focus-within:border-emerald-500 focus-within:bg-white focus-within:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:focus-within:bg-slate-950;
}
.composer-bottom {
  @apply flex items-end gap-2 border-t border-slate-200 pt-1.5 dark:border-slate-800;
}
.image-textarea {
  @apply min-w-0 flex-1 overflow-hidden rounded-xl;
}
.image-textarea :deep(.el-textarea__inner) {
  @apply border-0 bg-transparent px-2 py-2 text-[13px] leading-relaxed shadow-none focus:shadow-none dark:bg-transparent;
  min-height: 56px;
}
.generate-btn.el-button {
  min-width: 112px;
  height: 36px !important;
  border-radius: 12px !important;
  border-color: #059669 !important;
  background-color: #059669 !important;
  color: #ffffff !important;
  font-size: 12px !important;
  font-weight: 900 !important;
  box-shadow: 0 8px 18px rgba(5, 150, 105, 0.22) !important;
}
.generate-btn.el-button :deep(.el-icon),
.generate-btn.el-button :deep(span) {
  color: inherit !important;
}
.generate-btn.el-button:hover,
.generate-btn.el-button:focus {
  border-color: #047857 !important;
  background-color: #047857 !important;
  color: #ffffff !important;
}
.generate-btn.el-button.is-disabled,
.generate-btn.el-button.is-disabled:hover,
.generate-btn.el-button.is-disabled:focus {
  border-color: #cbd5e1 !important;
  background-color: #e2e8f0 !important;
  color: #475569 !important;
  opacity: 1 !important;
  box-shadow: none !important;
}
.dark .generate-btn.el-button.is-disabled,
.dark .generate-btn.el-button.is-disabled:hover,
.dark .generate-btn.el-button.is-disabled:focus {
  border-color: #334155 !important;
  background-color: #1e293b !important;
  color: #cbd5e1 !important;
}
.rename-form {
  @apply flex flex-col gap-2;
}
.rename-label {
  @apply text-xs font-black text-slate-700 dark:text-slate-200;
}
@media (max-width: 1400px) {
  .image-panel {
    @apply gap-3 lg:grid-cols-[236px_minmax(0,1fr)];
  }

  .image-composer {
    @apply p-2;
  }
}

@media (max-width: 1024px) {
  .image-panel {
    @apply grid-cols-1;
  }

}

@media (max-width: 520px) {
  .composer-bottom {
    @apply flex-col items-stretch;
  }

  .generate-btn.el-button {
    align-self: flex-end;
  }
}
</style>
