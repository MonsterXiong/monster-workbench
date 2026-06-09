<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { AlertTriangle, Bot, ChevronDown, ChevronLeft, ChevronRight, Image, Maximize2, Plus, RotateCcw, Send, Sparkles, UserRound, XCircle } from "lucide-vue-next";
import { useAiStore } from "../../../stores/ai";
import { useI18n } from "../../../composables/useI18n";
import type { ActionMenuItem } from "../../../components/common/BaseActionMenu.vue";
import type { AiConversationSession, AiPromptItem } from "../../../types/ai";
import {
  clearIntervalHandle,
  clampNumber,
  countWhere,
  createInterval,
  createTimeout,
  addDomEventListener,
  extractTextBetween,
  findByValue,
  findIndexByValue,
  findLastMapped,
  findLastItem,
  filterBySearchTextFields,
  firstItem,
  formatAspectRatio,
  formatBytes,
  formatDuration,
  formatPositiveDuration,
  formatReducedAspectRatio,
  formatShortIdentifier,
  formatTemplate,
  getDimensionsMaxSide,
  getDimensionsRatio,
  getKeyboardNavigationDirection,
  getNextCircularIndex,
  getCurrentTimestampMs,
  getErrorMessage,
  getElapsedMs,
  getSafeFileName,
  getItemAtOrOnly,
  getLastIndex,
  getScrollDistanceToBottom,
  includesAnyText,
  isEditableEventTarget,
  isPlainKeyboardEvent,
  isBlank,
  hasMultipleItems,
  joinBy,
  joinLines,
  joinMappedNonEmptyLines,
  joinNonEmptyLines,
  normalizeWhitespace,
  parseDimensionsText,
  pickItemsByValues,
  preventAndStopDomEvent,
  replaceAllText,
  removeAnyPrefix,
  splitLines,
  scrollElementToBottom,
  startsWithAnyText,
  take,
  toTrimmedString,
  truncateText,
  type DomEventCleanup,
  type IntervalHandle,
} from "../../../utils";

type ImageMessage = AiConversationSession["messages"][number];
type ImageSessionStatusKey = "empty" | "pending" | "canceled" | "failed" | "completed";
type ImageSessionStatusFilter = "all" | "pending" | "failed" | "completed";
type ImageResultSummaryItem = {
  key: string;
  label: string;
  tone?: "success" | "info" | "warning" | "danger";
};
type PreviewInspectorItem = {
  key: string;
  label: string;
  value: string;
  tone?: "success" | "info" | "warning";
};
type EmptyPromptStarter = {
  key: string;
  title: string;
  prompt: string;
  size: string;
  sizeLabel: string;
};

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
const QUICK_IMAGE_SIZE_VALUES = [
  "1008x1792",
  "1008x1344",
  "1536x864",
  "1344x1008",
  "1024x1024",
  "2048x2048",
  "2160x3840",
  "3840x2160",
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
const { t } = useI18n();
const input = ref("");
const imageInputRef = ref<{ focus?: () => void } | null>(null);
const messageListRef = ref<HTMLElement | null>(null);
const isHistoryAwayFromBottom = ref(false);
const hasHistoryUpdateBelow = ref(false);
const renameDialogVisible = ref(false);
const renameDraft = ref("");
const renamingSessionId = ref("");
const sessionSearch = ref("");
const previewDialogVisible = ref(false);
const previewImageUrl = ref("");
const previewImageTitle = ref("");
const previewImageIndex = ref(0);
const previewMessage = ref<ImageMessage | null>(null);
const previewThumbnailRefs = ref<Array<HTMLElement | null>>([]);
const selectedStylePromptId = ref("");
const stylePromptSearch = ref("");
const promptStartersExpanded = ref(false);
const stylePresetsExpanded = ref(false);
const sessionStatusFilter = ref<ImageSessionStatusFilter>("all");
const promptBeforeEnhance = ref("");
const stylePromptIdBeforeEnhance = ref("");
const nowMs = ref(getCurrentTimestampMs());
let clockTimer: IntervalHandle | null = null;
let stopPreviewKeydown: DomEventCleanup | null = null;
let lastPreviewPointerActionAt = 0;
let lastPreviewPointerActionKey = "";

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
const queueStatus = computed(() => aiStore.getActionQueueStatus("image"));
const activeSizeOption = computed(() => findByValue(imageSizeOptions.value, (item) => item.value, aiStore.imageDraftSize) ?? firstItem(imageSizeOptions.value));
const activeSizeLabel = computed(() => activeSizeOption.value?.selectedLabel || aiStore.imageDraftSize);
const activeSizeDetail = computed(() => {
  const option = activeSizeOption.value;
  if (!option) {
    return aiStore.imageDraftSize;
  }
  return joinBy([option.description, option.meta], (item) => item, " · ");
});
const activeSizeNotice = computed(() => {
  if (!EXPERIMENTAL_IMAGE_SIZE_VALUES.has(aiStore.imageDraftSize)) {
    return "";
  }
  return formatTemplate(t("aiPage.image.experimentalSizeNotice"), { size: activeSizeLabel.value });
});
const quickImageSizeOptions = computed(() => {
  return pickItemsByValues(imageSizeOptions.value, (item) => item.value, QUICK_IMAGE_SIZE_VALUES);
});
const hasQuickImageSizePresets = computed(() => hasMultipleItems(quickImageSizeOptions.value));
const activeImageModelName = computed(() => aiStore.activeImageConfig?.imageModel || aiStore.activeImageConfig?.model || "-");
const stylePromptPresets = computed(() => aiStore.getPrompts("image", STYLE_PROMPT_CATEGORY_ID));
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
const canGenerateImage = computed(() => !isBlank(input.value) && !isBusy.value && !draftHasStyleSubjectPlaceholder.value);
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
const scrollAnchor = computed(() => joinBy(messages.value, (message) => `${message.id}:${message.status}`, "|"));
const sessionActions = computed<ActionMenuItem[]>(() => [
  { key: "rename", label: t("aiPage.sessions.rename"), icon: "Pencil" },
  { key: "duplicate", label: t("aiPage.sessions.duplicate"), icon: "Copy" },
  { key: "delete", label: t("common.delete"), icon: "Trash2", type: "danger", divided: true },
]);
const searchableImageSessions = computed(() => {
  return filterBySearchTextFields(aiStore.imageSessions, sessionSearch.value, [
    (target) => target.title,
    (target) => target.modelConfigId,
    (target) => target.imageSize || "",
    (target) => getSessionSizeLabel(target),
    (target) => getSessionStatusLabel(target),
    (target) => target.messages.map((message) => [message.content, message.model, message.imageSize || ""]),
  ]);
});
const sessionStatusFilterOptions = computed(() => {
  const sessions = searchableImageSessions.value;
  const countByFilter = (filter: ImageSessionStatusFilter) =>
    countWhere(sessions, (item) => matchesSessionStatusFilter(item, filter));
  return [
    { key: "all" as const, label: t("aiPage.image.filterAll"), count: sessions.length },
    { key: "pending" as const, label: t("aiPage.image.filterGenerating"), count: countByFilter("pending") },
    { key: "failed" as const, label: t("aiPage.image.filterFailed"), count: countByFilter("failed") },
    { key: "completed" as const, label: t("aiPage.image.filterCompleted"), count: countByFilter("completed") },
  ];
});
const filteredImageSessions = computed(() => {
  return searchableImageSessions.value.filter((item) => matchesSessionStatusFilter(item, sessionStatusFilter.value));
});
const filteredImageSessionEmptyText = computed(() => {
  if (sessionSearch.value) {
    return t("aiPage.image.sessionSearchEmpty");
  }
  if (sessionStatusFilter.value !== "all") {
    return t("aiPage.image.sessionFilterEmpty");
  }
  return t("aiPage.image.sessionListEmpty");
});

onMounted(async () => {
  stopPreviewKeydown = addDomEventListener(window, "keydown", handlePreviewKeydown);
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
  stopPreviewKeydown?.();
  stopPreviewKeydown = null;
});

watch(
  () => aiStore.pendingPrompt,
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

watch(
  () => scrollAnchor.value,
  async () => {
    const shouldFollow = !isHistoryAwayFromBottom.value || isHistoryNearBottom();
    await nextTick();
    if (shouldFollow) {
      scrollHistoryToBottom("auto");
      return;
    }
    hasHistoryUpdateBelow.value = true;
    updateHistoryScrollState();
  }
);

function isHistoryNearBottom() {
  return getScrollDistanceToBottom(messageListRef.value) < 96;
}

function updateHistoryScrollState() {
  const awayFromBottom = !isHistoryNearBottom();
  isHistoryAwayFromBottom.value = awayFromBottom;
  if (!awayFromBottom) {
    hasHistoryUpdateBelow.value = false;
  }
}

function scrollHistoryToBottom(behavior: ScrollBehavior = "smooth") {
  const target = messageListRef.value;
  if (!target) {
    return;
  }
  scrollElementToBottom(target, behavior);
  if (behavior === "auto") {
    updateHistoryScrollState();
    return;
  }
  createTimeout(updateHistoryScrollState, 220);
}

function consumePendingPrompt() {
  const content = aiStore.consumePendingPrompt("image");
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

function getStylePromptSummary(preset: AiPromptItem) {
  const lines = splitLines(preset.content, { trim: true, keepEmpty: false });
  const styleLine = lines.find((line) => startsWithAnyText(line, ["风格：", "Style:"])) ?? lines[1] ?? firstItem(lines);
  if (!styleLine) {
    return "";
  }
  return truncateText(removeAnyPrefix(styleLine, ["风格：", "Style:"], { trimStart: true }), 54, "");
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

function selectImageSize(size: string) {
  aiStore.imageDraftSize = size;
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

async function handleGenerate() {
  const content = toTrimmedString(input.value);
  if (!content || isBusy.value || draftHasStyleSubjectPlaceholder.value) {
    if (draftHasStyleSubjectPlaceholder.value) {
      void focusImageInput();
    }
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
      aiStore.imageDraftSize
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
  return message.role !== "user" && message.status === "failed" && Boolean(findRetryPrompt(message.id)) && !isBusy.value;
}

function canUsePromptFromMessage(message: ImageMessage) {
  return message.role !== "user" && message.status !== "pending" && Boolean(findRetryPrompt(message.id));
}

function canRegenerateImageMessage(message: ImageMessage) {
  return message.role !== "user" && message.status === "success" && Boolean(findRetryPrompt(message.id)) && !isBusy.value;
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
  try {
    await aiStore.generateImageMessage(
      prompt,
      message.modelConfigId || aiStore.activeModelConfigIds.image,
      getMessageRegenerateSize(message)
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
  try {
    await aiStore.generateImageMessage(
      prompt,
      message.modelConfigId || aiStore.activeModelConfigIds.image,
      getMessageRegenerateSize(message)
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

function getGeneratedImageSavedFileName(message: ImageMessage, index: number) {
  const path = getGeneratedImageSavedFilePath(message, index);
  return path ? getSavedFileName(path) : "";
}

function getGeneratedImageSavedFileMeta(message: ImageMessage, index: number) {
  const file = getGeneratedImageSavedFile(message, index);
  return file ? `${file.mimeType} · ${formatBytes(file.sizeBytes)}` : "";
}

function hasGeneratedImages(message: ImageMessage) {
  return getPreviewItems(message).length > 0;
}

const previewPrompt = computed(() => (previewMessage.value ? getMessagePrompt(previewMessage.value) : ""));
const previewItems = computed(() => (previewMessage.value ? getPreviewItems(previewMessage.value) : []));
const previewSavedFile = computed(() => {
  const files = previewMessage.value?.savedFiles || [];
  return getItemAtOrOnly(files, previewImageIndex.value) ?? null;
});
const previewHasMultipleImages = computed(() => hasMultipleItems(previewItems.value));
const previewInspectorItems = computed<PreviewInspectorItem[]>(() => {
  const message = previewMessage.value;
  if (!message) {
    return [];
  }

  const items: PreviewInspectorItem[] = [];
  if (previewItems.value.length) {
    items.push({
      key: "image-index",
      label: t("aiPage.image.previewImage"),
      value: formatTemplate(t("aiPage.image.previewCount"), {
        current: previewImageIndex.value + 1,
        total: previewItems.value.length,
      }),
      tone: previewHasMultipleImages.value ? "info" : undefined,
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

  if (previewSavedFile.value) {
    items.push({
      key: "saved-file",
      label: t("aiPage.image.previewSavedFile"),
      value: joinBy([getSavedFileName(previewSavedFile.value.path), formatBytes(previewSavedFile.value.sizeBytes)], (item) => item, " · "),
      tone: "success",
    });
  } else if (previewItems.value.length) {
    items.push({
      key: "saved-file",
      label: t("aiPage.image.previewSavedFile"),
      value: t("aiPage.image.previewNotSaved"),
      tone: "warning",
    });
  }

  return items;
});
const previewInfoText = computed(() => {
  const message = previewMessage.value;
  if (!message) {
    return "";
  }
  const lines = [
    `${t("aiPage.image.previewTitle")}: ${previewImageTitle.value || "-"}`,
    `${t("aiPage.image.previewModel")}: ${message.model || "-"}`,
    getMessageLatencyLabel(message) ? `${t("aiPage.image.latency")}: ${getMessageLatencyLabel(message)}` : "",
    getMessageQueueWaitLabel(message) ? `${t("aiPage.image.queueWait")}: ${getMessageQueueWaitLabel(message)}` : "",
    `${t("aiPage.image.actualSize")}: ${getMessageActualSize(message) || "-"}`,
    `${t("aiPage.image.requestedSize")}: ${getMessageRequestedSize(message) || "-"}`,
    message.requestId ? `${t("aiPage.image.requestId")}: ${message.requestId}` : "",
    previewSavedFile.value?.path ? `${t("aiPage.image.previewSavedFile")}: ${previewSavedFile.value.path}` : "",
    previewImageUrl.value ? `${t("aiPage.image.previewImageUrl")}: ${previewImageUrl.value}` : "",
    previewPrompt.value ? `${t("aiPage.image.previewPrompt")}:\n${previewPrompt.value}` : "",
  ];
  return joinNonEmptyLines(lines);
});

function openImagePreview(url: string, message: ImageMessage, index = 0) {
  previewImageUrl.value = url;
  previewImageTitle.value = getImagePreviewTitle(message);
  previewImageIndex.value = index;
  previewMessage.value = message;
  previewDialogVisible.value = true;
  scrollPreviewThumbnailIntoView(index);
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

function selectPreviewImage(index: number) {
  if (!previewMessage.value || !previewItems.value.length) {
    return;
  }
  const nextIndex = clampNumber(index, 0, getLastIndex(previewItems.value), 0, 0);
  previewImageIndex.value = nextIndex;
  previewImageUrl.value = previewItems.value[nextIndex] || previewImageUrl.value;
  previewImageTitle.value = getImagePreviewTitle(previewMessage.value);
  scrollPreviewThumbnailIntoView(nextIndex);
}

function switchPreviewImage(offset: number) {
  if (!previewItems.value.length) {
    return;
  }
  const nextIndex = getNextCircularIndex(previewItems.value.length, previewImageIndex.value, offset);
  selectPreviewImage(nextIndex);
}

function handlePreviewKeydown(event: KeyboardEvent) {
  if (!previewDialogVisible.value || !previewHasMultipleImages.value || event.defaultPrevented || !isPlainKeyboardEvent(event)) {
    return;
  }
  if (isEditableEventTarget(event.target)) {
    return;
  }
  if (event.key === "Home") {
    preventAndStopDomEvent(event);
    selectPreviewImage(0);
    return;
  }
  if (event.key === "End") {
    preventAndStopDomEvent(event);
    selectPreviewImage(getLastIndex(previewItems.value));
    return;
  }
  const direction = getKeyboardNavigationDirection(event, {
    forwardKeys: ["ArrowRight"],
    backwardKeys: ["ArrowLeft"],
  });
  if (!direction) {
    return;
  }
  preventAndStopDomEvent(event);
  switchPreviewImage(direction);
}

function markPreviewPointerAction(actionKey: string) {
  lastPreviewPointerActionAt = getCurrentTimestampMs();
  lastPreviewPointerActionKey = actionKey;
}

function shouldSkipPreviewClickAction(actionKey: string) {
  return lastPreviewPointerActionKey === actionKey && getCurrentTimestampMs() - lastPreviewPointerActionAt < 450;
}

function handlePreviewNavPointer(offset: number) {
  markPreviewPointerAction(`nav:${offset}`);
  switchPreviewImage(offset);
}

function handlePreviewNavClick(offset: number) {
  if (shouldSkipPreviewClickAction(`nav:${offset}`)) {
    return;
  }
  switchPreviewImage(offset);
}

function handlePreviewThumbnailPointer(index: number) {
  markPreviewPointerAction(`thumb:${index}`);
  selectPreviewImage(index);
}

function handlePreviewThumbnailClick(index: number) {
  if (shouldSkipPreviewClickAction(`thumb:${index}`)) {
    return;
  }
  selectPreviewImage(index);
}

function setPreviewThumbnailRef(element: unknown, index: number) {
  previewThumbnailRefs.value[index] = element instanceof HTMLElement ? element : null;
}

function scrollPreviewThumbnailIntoView(index = previewImageIndex.value) {
  void nextTick(() => {
    previewThumbnailRefs.value[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  });
}

function getSavedFileName(path: string) {
  return getSafeFileName(path, path);
}

function getShortRequestId(requestId: string | undefined) {
  return formatShortIdentifier(requestId, 18);
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
  return message.error || message.content || t("aiPage.image.failureUnknown");
}

function getFailureKindLabel(message: ImageMessage) {
  if (!message.failureKind) {
    return "";
  }
  return t(`aiPage.image.failureKind.${message.failureKind}`) || message.failureKind;
}

function getFailureHint(message: ImageMessage) {
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
  const savedCount = message.savedFiles?.length || 0;
  const latency = getMessageLatencyLabel(message);
  const queueWait = getMessageQueueWaitLabel(message);
  const apiSize = getMessageApiSize(message);
  const requestedSize = getMessageRequestedSize(message);

  if (message.status === "failed" && message.failureKind) {
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
  if (savedCount > 0) {
    items.push({
      key: "saved",
      label: formatTemplate(t("aiPage.image.resultSavedCount"), { count: savedCount }),
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

function getSessionPreviewUrl(target: AiConversationSession) {
  return findLastMapped(target.messages, (message) => firstItem(message.imageUrls || [])) || "";
}

function getSessionPreviewCount(target: AiConversationSession) {
  return findLastMapped(target.messages, (message) => message.imageUrls?.length || undefined) || 0;
}

function getSessionStatusKey(target: AiConversationSession): ImageSessionStatusKey {
  const latestResult = findLastItem(target.messages, (message) => message.role !== "user");
  if (!latestResult) {
    return "empty";
  }
  if (latestResult.status === "pending") {
    return "pending";
  }
  if (latestResult.error === "图片生成已取消") {
    return "canceled";
  }
  if (latestResult.status === "failed") {
    return "failed";
  }
  return "completed";
}

function matchesSessionStatusFilter(target: AiConversationSession, filter: ImageSessionStatusFilter) {
  if (filter === "all") {
    return true;
  }
  const status = getSessionStatusKey(target);
  if (filter === "failed") {
    return status === "failed" || status === "canceled";
  }
  return status === filter;
}

function getSessionStatusLabel(target: AiConversationSession) {
  const status = getSessionStatusKey(target);
  if (status === "empty") {
    return t("aiPage.image.emptyShort");
  }
  if (status === "pending") {
    return t("aiPage.image.generating");
  }
  if (status === "canceled") {
    return t("aiPage.image.canceled");
  }
  if (status === "failed") {
    return t("aiPage.image.failed");
  }
  return t("aiPage.image.completed");
}

function getSessionStatusClass(target: AiConversationSession) {
  const status = getSessionStatusKey(target);
  if (status === "empty") {
    return "session-status--idle";
  }
  if (status === "pending") {
    return "session-status--pending";
  }
  if (status === "canceled") {
    return "session-status--canceled";
  }
  if (status === "failed") {
    return "session-status--failed";
  }
  return "session-status--success";
}

function getSessionSizeLabel(target: AiConversationSession) {
  const latestSizeMessage = findLastItem(target.messages, (message) => Boolean(getMessageActualSize(message)));
  if (!latestSizeMessage) {
    return target.imageSize || "";
  }
  if (isImageSizeFallback(latestSizeMessage)) {
    return `${getMessageRequestedSize(latestSizeMessage)} -> ${getMessageActualSize(latestSizeMessage)}`;
  }
  return getMessageActualSize(latestSizeMessage);
}

function getSessionPromptSummary(target: AiConversationSession) {
  const latestPrompt = findLastItem(target.messages, (message) => message.role === "user" && Boolean(toTrimmedString(message.content)))?.content || "";
  return latestPrompt ? truncateText(normalizeWhitespace(latestPrompt), 44) : t("aiPage.image.sessionPromptEmpty");
}

</script>

<template>
  <section class="image-panel">
    <aside class="session-list">
      <div class="session-list__head">
        <span>{{ t("aiPage.image.sessions") }}</span>
        <button type="button" class="icon-btn" @click="aiStore.createSession('image')">
          <Plus class="h-4 w-4" />
        </button>
      </div>
      <BaseSearchInput
        v-model="sessionSearch"
        size="sm"
        surface="muted"
        class="session-search"
        :placeholder="t('aiPage.image.sessionSearchPlaceholder')"
        search-on-input
      />
      <div class="session-filters" :aria-label="t('aiPage.image.sessionFilterLabel')">
        <button
          v-for="option in sessionStatusFilterOptions"
          :key="option.key"
          type="button"
          class="session-filter-chip"
          :class="{ 'session-filter-chip--active': sessionStatusFilter === option.key }"
          :aria-pressed="sessionStatusFilter === option.key"
          @click="sessionStatusFilter = option.key"
        >
          <span>{{ option.label }}</span>
          <strong>{{ option.count }}</strong>
        </button>
      </div>
      <div
        v-for="item in filteredImageSessions"
        :key="item.id"
        role="button"
        tabindex="0"
        class="session-item"
        :class="{ 'session-item--active': item.id === aiStore.activeSessionIds.image }"
        @click="aiStore.selectSession('image', item.id)"
        @keydown.enter.prevent="aiStore.selectSession('image', item.id)"
      >
        <div class="session-thumb">
          <img v-if="getSessionPreviewUrl(item)" :src="getSessionPreviewUrl(item)" alt="" />
          <Image v-else class="h-4 w-4" />
          <span v-if="getSessionPreviewCount(item) > 1" class="session-thumb__badge" aria-hidden="true">
            {{ getSessionPreviewCount(item) }}
          </span>
        </div>
        <div class="session-item__content">
          <span class="session-item__title">{{ item.title }}</span>
          <span class="session-item__prompt">{{ getSessionPromptSummary(item) }}</span>
          <span class="session-item__meta">
            {{ item.messages.length }} {{ t("aiPage.image.messageUnit") }}
            <span v-if="getSessionSizeLabel(item)">· {{ getSessionSizeLabel(item) }}</span>
          </span>
        </div>
        <span class="session-status" :class="getSessionStatusClass(item)">{{ getSessionStatusLabel(item) }}</span>
        <BaseActionMenu
          :actions="sessionActions"
          icon="MoreHorizontal"
          :aria-label="t('common.moreActions')"
          @click.stop
          @select="handleSessionAction($event, item)"
        />
      </div>
      <div v-if="!filteredImageSessions.length" class="session-list__empty">
        {{ filteredImageSessionEmptyText }}
      </div>
    </aside>

    <div class="image-workspace">
      <header class="image-header">
        <div class="image-header__icon">
          <Image class="h-4.5 w-4.5" />
        </div>
        <div class="min-w-0 flex-1">
          <h3>{{ t("aiPage.image.title") }}</h3>
          <p>{{ aiStore.activeImageConfig?.name || aiStore.activeImageConfig?.displayName }} · {{ activeImageModelName }}</p>
        </div>
        <div class="image-header__status">
          <span class="status-pill" :class="{ 'status-pill--busy': Boolean(isBusy) }">{{ imageStatusLabel }}</span>
          <span class="status-size">{{ activeSizeLabel }}</span>
        </div>
      </header>

      <div class="image-history-shell">
        <div ref="messageListRef" class="image-history" @scroll.passive="updateHistoryScrollState">
        <div v-if="!messages.length" class="empty-state">
          <div class="empty-state__preview" :style="{ aspectRatio: parseImageSize(aiStore.imageDraftSize).width + ' / ' + parseImageSize(aiStore.imageDraftSize).height }">
            <Sparkles class="h-6 w-6" />
            <span>{{ activeSizeLabel }}</span>
          </div>
          <div class="empty-state__title">{{ t("aiPage.image.empty") }}</div>
          <div class="empty-state__hint">{{ activeImageModelName }} · {{ activeSizeDetail }}</div>
          <div class="empty-state__starters" :aria-label="t('aiPage.image.starterLabel')">
            <button
              v-for="starter in emptyPromptStarters"
              :key="starter.key"
              type="button"
              class="empty-starter"
              :title="starter.prompt"
              @click="applyEmptyPromptStarter(starter)"
            >
              <span>{{ starter.title }}</span>
              <small>{{ starter.sizeLabel }}</small>
            </button>
          </div>
        </div>
        <div
          v-for="message in messages"
          :key="message.id"
          class="image-row"
          :class="[`image-row--${message.role}`, { 'image-row--failed': message.status === 'failed' }]"
        >
          <div class="image-avatar">
            <UserRound v-if="message.role === 'user'" class="h-4 w-4" />
            <AlertTriangle v-else-if="message.role === 'error'" class="h-4 w-4" />
            <Bot v-else class="h-4 w-4" />
          </div>
          <div class="image-message">
            <div class="image-message__meta">
              <span>{{ message.role === "user" ? t("aiPage.image.user") : message.role === "error" ? t("aiPage.image.error") : t("aiPage.image.assistant") }}</span>
              <span>{{ message.model }}</span>
              <span v-if="getMessageSizeMeta(message)">{{ getMessageSizeMeta(message) }}</span>
              <span v-if="message.role !== 'user' && getMessageLatencyLabel(message)">
                {{ t("aiPage.image.latency") }} {{ getMessageLatencyLabel(message) }}
              </span>
              <span v-if="message.requestId" :title="message.requestId">
                {{ t("aiPage.image.requestId") }} {{ getShortRequestId(message.requestId) }}
              </span>
            </div>
            <div class="image-bubble">
              <div v-if="message.status === 'pending' && !message.content" class="image-loading">
                <div class="image-loading__preview" :style="getImagePreviewStyle(message)">
                  <div class="image-loading__shine"></div>
                  <Image class="h-7 w-7" />
                </div>
                <div class="image-loading__text">
                  <div class="image-loading__head">
                    <span class="image-loading__title">{{ getPendingImageStatusLabel(message) }}</span>
                    <span class="image-loading__elapsed">{{ getPendingImageElapsedLabel(message) }}</span>
                  </div>
                  <div class="image-loading__meta-grid">
                    <span>
                      <strong>{{ t("aiPage.image.previewModel") }}</strong>
                      <em>{{ message.model || activeImageModelName }}</em>
                    </span>
                    <span>
                      <strong>{{ t("aiPage.image.requestedSize") }}</strong>
                      <em>{{ getMessageRequestedSize(message) || message.imageSize || aiStore.imageDraftSize }}</em>
                    </span>
                    <span v-if="message.requestId">
                      <strong>{{ t("aiPage.image.requestId") }}</strong>
                      <em :title="message.requestId">{{ getShortRequestId(message.requestId) }}</em>
                    </span>
                  </div>
                  <div class="image-loading__progress" aria-hidden="true">
                    <span></span>
                  </div>
                  <div class="image-loading__footer">
                    <span class="image-loading__dots" aria-label="loading">
                      <i></i>
                      <i></i>
                      <i></i>
                    </span>
                    <BaseButton
                      v-if="message.requestId"
                      type="neutral"
                      outline
                      size="sm"
                      class="cancel-generate-btn"
                      @click="cancelImageMessage(message)"
                    >
                      <template #icon><XCircle class="h-3.5 w-3.5" /></template>
                      {{ t("aiPage.image.cancel") }}
                    </BaseButton>
                  </div>
                </div>
              </div>
              <pre v-else>{{ message.content }}</pre>
              <div v-if="message.role !== 'user' && isImageSizeFallback(message)" class="image-size-notice">
                <AlertTriangle class="h-3.5 w-3.5" />
                <span>{{ getFallbackNotice(message) }}</span>
              </div>
              <div v-else-if="message.role !== 'user' && isImageSizeCompatibility(message)" class="image-size-notice image-size-notice--info">
                <Image class="h-3.5 w-3.5" />
                <span>{{ getCompatibilityNotice(message) }}</span>
              </div>
              <div v-if="message.role !== 'user' && message.status === 'failed'" class="image-failure-card">
                <div class="image-failure-card__head">
                  <AlertTriangle class="h-4 w-4" />
                  <div>
                    <strong>{{ t("aiPage.image.failureTitle") }}</strong>
                    <span>{{ getFailureHint(message) }}</span>
                  </div>
                </div>
                <div class="image-failure-card__actions">
                  <BaseButton
                    v-if="canUsePromptFromMessage(message)"
                    type="neutral"
                    outline
                    size="sm"
                    @click="usePromptFromMessage(message)"
                  >
                    <template #icon><Sparkles class="h-3.5 w-3.5" /></template>
                    {{ t("aiPage.image.usePrompt") }}
                  </BaseButton>
                  <BaseButton v-if="canRetryImageMessage(message)" type="success" size="sm" @click="retryImageMessage(message)">
                    <template #icon><RotateCcw class="h-3.5 w-3.5" /></template>
                    {{ t("aiPage.image.retry") }}
                  </BaseButton>
                  <BaseCopyButton :text="getImageFailureText(message)" :label="t('aiPage.image.copyError')" size="xs" />
                </div>
              </div>
              <div v-if="getImageResultSummaryItems(message).length" class="image-result-summary">
                <span
                  v-for="item in getImageResultSummaryItems(message)"
                  :key="item.key"
                  class="image-result-summary__item"
                  :class="item.tone ? `image-result-summary__item--${item.tone}` : undefined"
                >
                  {{ item.label }}
                </span>
              </div>
              <div v-if="getMessagePrompt(message) || message.requestId" class="image-message__tools">
                <BaseCopyButton
                  v-if="getMessagePrompt(message)"
                  :text="getMessagePrompt(message)"
                  :label="t('aiPage.image.copyPrompt')"
                  size="xs"
                />
                <BaseCopyButton
                  v-if="message.requestId"
                  :text="message.requestId"
                  :label="t('aiPage.image.copyRequestId')"
                  size="xs"
                />
              </div>
              <div v-if="getPreviewItems(message).length" class="generated-gallery">
                <div v-if="hasMultiplePreviewItems(message) || hasMultipleSavedFiles(message)" class="generated-gallery__toolbar">
                  <strong>{{ formatTemplate(t("aiPage.image.gallerySummary"), { count: getPreviewItems(message).length }) }}</strong>
                  <div class="generated-gallery__toolbar-actions">
                    <BaseCopyButton
                      v-if="hasMultiplePreviewItems(message)"
                      :text="getGeneratedImageUrlsText(message)"
                      :label="t('aiPage.image.copyAllImageUrls')"
                      size="xs"
                    />
                    <BaseCopyButton
                      v-if="(message.savedFiles?.length || 0) > 1"
                      :text="getGeneratedImageSavedFilePathsText(message)"
                      :label="t('aiPage.image.copyAllPaths')"
                      size="xs"
                    />
                  </div>
                </div>
                <div
                  v-for="(url, index) in getPreviewItems(message)"
                  :key="url"
                  class="generated-frame"
                  :style="getImagePreviewStyle(message)"
                >
                  <button
                    type="button"
                    class="generated-preview-button"
                    @click="openImagePreview(url, message, index)"
                  >
                    <img :src="url" alt="AI generated preview" class="generated-image" />
                    <span v-if="hasMultiplePreviewItems(message)" class="generated-frame__index">
                      {{ formatTemplate(t("aiPage.image.previewCount"), { current: index + 1, total: getPreviewItems(message).length }) }}
                    </span>
                    <span class="generated-frame__action">
                      <Maximize2 class="h-3.5 w-3.5" />
                      {{ t("aiPage.image.preview") }}
                    </span>
                  </button>
                  <div class="generated-frame__tools">
                    <div class="generated-frame__quick-actions">
                      <BaseButton
                        v-if="canUsePromptFromMessage(message)"
                        type="neutral"
                        outline
                        size="xs"
                        :title="t('aiPage.image.usePrompt')"
                        @click.stop="usePromptFromMessage(message)"
                      >
                        <template #icon><Sparkles class="h-3 w-3" /></template>
                        {{ t("aiPage.image.usePrompt") }}
                      </BaseButton>
                      <BaseButton
                        v-if="canRegenerateImageMessage(message)"
                        type="success"
                        size="xs"
                        :title="t('aiPage.image.regenerate')"
                        @click.stop="regenerateImageMessage(message)"
                      >
                        <template #icon><RotateCcw class="h-3 w-3" /></template>
                        {{ t("aiPage.image.regenerate") }}
                      </BaseButton>
                    </div>
                    <div class="generated-frame__copy-tools">
                      <BaseCopyButton :text="url" :label="t('aiPage.image.copyImageUrl')" size="xs" />
                      <BaseCopyButton
                        v-if="getGeneratedImageSavedFilePath(message, index)"
                        :text="getGeneratedImageSavedFilePath(message, index)"
                        :label="t('aiPage.image.copyPath')"
                        size="xs"
                      />
                    </div>
                  </div>
                  <div
                    v-if="getGeneratedImageSavedFilePath(message, index)"
                    class="generated-frame__file-badge"
                    :title="getGeneratedImageSavedFilePath(message, index)"
                  >
                    <strong>{{ t("aiPage.image.savedFileBadge") }}</strong>
                    <span>{{ getGeneratedImageSavedFileName(message, index) }}</span>
                    <small>{{ getGeneratedImageSavedFileMeta(message, index) }}</small>
                  </div>
                </div>
              </div>
              <div v-if="message.savedFiles?.length" class="saved-file-list">
                <div v-for="file in message.savedFiles" :key="file.path" class="saved-file-item" :title="file.path">
                  <div class="saved-file-item__info">
                    <span>{{ getSavedFileName(file.path) }}</span>
                    <strong>{{ file.mimeType }} · {{ formatBytes(file.sizeBytes) }}</strong>
                  </div>
                  <BaseCopyButton :text="file.path" :label="t('aiPage.image.copyPath')" size="xs" />
                </div>
              </div>
              <div
                v-if="message.status !== 'failed' && (!hasGeneratedImages(message) && (canRegenerateImageMessage(message) || canUsePromptFromMessage(message)))"
                class="image-message__actions"
              >
                <BaseButton
                  v-if="!hasGeneratedImages(message) && canUsePromptFromMessage(message)"
                  type="neutral"
                  outline
                  size="sm"
                  @click="usePromptFromMessage(message)"
                >
                  <template #icon><Sparkles class="h-3.5 w-3.5" /></template>
                  {{ t("aiPage.image.usePrompt") }}
                </BaseButton>
                <BaseButton
                  v-if="!hasGeneratedImages(message) && canRegenerateImageMessage(message)"
                  type="success"
                  size="sm"
                  @click="regenerateImageMessage(message)"
                >
                  <template #icon><RotateCcw class="h-3.5 w-3.5" /></template>
                  {{ t("aiPage.image.regenerate") }}
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
        </div>
        <button
          v-if="messages.length && (isHistoryAwayFromBottom || hasHistoryUpdateBelow)"
          type="button"
          class="history-jump-button"
          @click="scrollHistoryToBottom()"
        >
          <ChevronDown class="h-3.5 w-3.5" />
          {{ hasHistoryUpdateBelow ? t("aiPage.image.historyNewUpdate") : t("aiPage.image.historyJumpLatest") }}
        </button>
      </div>

      <footer class="image-composer">
        <div class="composer-shell">
          <div class="composer-top">
            <div class="composer-controls">
              <BaseSelect
                :model-value="aiStore.activeModelConfigIds.image"
                :options="aiStore.modelConfigOptions"
                size="sm"
                class="model-select"
                @update:model-value="aiStore.setActiveModelConfig('image', String($event))"
              />
              <BaseSelect
                :model-value="aiStore.imageDraftSize"
                :options="imageSizeOptions"
                size="sm"
                class="size-select"
                :fit-input-width="false"
                @update:model-value="aiStore.imageDraftSize = String($event)"
              />
            </div>
            <div
              class="composer-size-detail"
              :title="activeSizeDetail"
            >
              <strong>{{ activeSizeLabel }}</strong>
              <span>{{ activeSizeDetail }}</span>
            </div>
          </div>
          <div
            v-if="hasQuickImageSizePresets || emptyPromptStarters.length || stylePromptPresets.length"
            class="composer-size-presets"
            :aria-label="t('aiPage.image.sizePresetLabel')"
          >
            <div v-if="hasQuickImageSizePresets" class="composer-size-presets__scroll">
              <span class="composer-size-presets__label">{{ t("aiPage.image.sizePresetLabel") }}</span>
              <button
                v-for="option in quickImageSizeOptions"
                :key="option.value"
                type="button"
                class="size-preset-chip"
                :class="{ 'size-preset-chip--active': option.value === aiStore.imageDraftSize }"
                :aria-pressed="option.value === aiStore.imageDraftSize"
                :title="option.description"
                @click="selectImageSize(option.value)"
              >
                <strong>{{ option.selectedLabel }}</strong>
                <span>{{ option.meta || option.description }}</span>
              </button>
            </div>
            <div v-if="emptyPromptStarters.length || stylePromptPresets.length" class="composer-tools">
              <template v-if="emptyPromptStarters.length">
                <button
                  type="button"
                  class="starter-toggle-chip"
                  :class="{ 'starter-toggle-chip--active': promptStartersExpanded }"
                  :aria-expanded="promptStartersExpanded"
                  :title="t('aiPage.image.starterLabel')"
                  @click="togglePromptStarters"
                >
                  <Sparkles class="h-3 w-3" />
                  {{ t("aiPage.image.starterToggle") }}
                </button>
              </template>
              <span v-if="emptyPromptStarters.length && stylePromptPresets.length" class="composer-tools-divider"></span>
              <template v-if="stylePromptPresets.length">
                <button
                  type="button"
                  class="style-toggle-chip"
                  :class="{ 'style-toggle-chip--active': stylePresetsExpanded || selectedStylePrompt }"
                  :aria-expanded="stylePresetsExpanded"
                  :title="selectedStylePrompt?.content || t('aiPage.image.stylePresetLabel')"
                  @click="toggleStylePresets"
                >
                  <Sparkles class="h-3 w-3" />
                  {{ stylePickerLabel }}
                </button>
                <button
                  type="button"
                  class="style-tool-chip"
                  :disabled="!canEnhancePrompt"
                  @click="enhancePrompt"
                >
                  {{ t("aiPage.image.promptEnhance") }}
                </button>
                <button
                  v-if="canUndoPromptEnhance"
                  type="button"
                  class="style-undo-chip"
                  @click="undoPromptEnhance"
                >
                  {{ t("aiPage.image.promptEnhanceUndo") }}
                </button>
                <button
                  v-if="selectedStylePrompt"
                  type="button"
                  class="style-clear-chip"
                  @click="clearStylePrompt"
                >
                  {{ t("aiPage.image.stylePresetClear") }}
                </button>
              </template>
            </div>
          </div>
          <div v-if="stylePromptPresets.length && stylePresetsExpanded" class="composer-presets" :aria-label="t('aiPage.image.stylePresetLabel')">
            <div class="composer-presets__head">
              <div class="composer-presets__title">
                <Sparkles class="h-3.5 w-3.5" />
                <span>{{ t("aiPage.image.stylePresetLabel") }}</span>
                <strong>{{ stylePresetCountLabel }}</strong>
              </div>
              <BaseSearchInput
                v-model="stylePromptSearch"
                size="sm"
                surface="muted"
                class="composer-presets__search"
                :placeholder="t('aiPage.image.styleSearchPlaceholder')"
                search-on-input
              />
            </div>
            <div v-if="filteredStylePromptPresets.length" class="composer-presets__grid">
              <button
                v-for="preset in filteredStylePromptPresets"
                :key="preset.id"
                type="button"
                class="style-preset-chip"
                :class="{ 'style-preset-chip--active': preset.id === selectedStylePromptId }"
                :aria-pressed="preset.id === selectedStylePromptId"
                :title="preset.content"
                @click="applyStylePrompt(preset)"
              >
                <span>{{ preset.title }}</span>
                <small>{{ getStylePromptSummary(preset) }}</small>
              </button>
            </div>
            <div v-else class="composer-presets__empty">
              {{ t("aiPage.image.styleSearchEmpty") }}
            </div>
          </div>
          <div v-if="promptStartersExpanded" class="composer-starters" :aria-label="t('aiPage.image.starterLabel')">
            <button
              v-for="starter in emptyPromptStarters"
              :key="starter.key"
              type="button"
              class="starter-preset-chip"
              :title="starter.prompt"
              @click="applyEmptyPromptStarter(starter)"
            >
              <span>{{ starter.title }}</span>
              <small>{{ starter.sizeLabel }}</small>
            </button>
          </div>
          <div
            v-if="activeSizeNotice"
            class="composer-size-warning"
            role="status"
          >
            <AlertTriangle class="h-3.5 w-3.5" />
            <span>{{ activeSizeNotice }}</span>
          </div>
          <div v-if="draftMetaItems.length" class="composer-draft-bar">
            <div class="composer-draft-tags">
              <span v-for="item in draftMetaItems" :key="item">{{ item }}</span>
            </div>
            <button type="button" class="composer-draft-clear" @click="clearDraftPrompt">
              <XCircle class="h-3 w-3" />
              {{ t("aiPage.image.clearDraft") }}
            </button>
          </div>
          <div v-if="draftHasStyleSubjectPlaceholder" class="composer-subject-warning" role="status">
            <AlertTriangle class="h-3.5 w-3.5" />
            <span>{{ t("aiPage.image.subjectPlaceholderWarning") }}</span>
          </div>
          <div class="composer-bottom">
            <el-input
              ref="imageInputRef"
              v-model="input"
              class="image-textarea"
              type="textarea"
              :rows="2"
              resize="none"
              :placeholder="t('aiPage.image.inputPlaceholder')"
              @keydown.enter.exact.prevent="handleGenerate"
            />
            <BaseButton
              type="success"
              size="sm"
              class="generate-btn"
              :loading="Boolean(isBusy)"
              :disabled="!canGenerateImage"
              :title="draftHasStyleSubjectPlaceholder ? t('aiPage.image.subjectPlaceholderButtonTitle') : undefined"
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

    <BaseDialog v-model="previewDialogVisible" :title="t('aiPage.image.previewTitle')" width="min(1120px, 94vw)">
      <div class="preview-dialog">
        <div class="preview-dialog__media">
          <div class="preview-dialog__image-stage">
            <img v-if="previewImageUrl" :src="previewImageUrl" :alt="previewImageTitle" />
            <span v-if="previewHasMultipleImages" class="preview-image-counter">
              {{ formatTemplate(t("aiPage.image.previewCount"), { current: previewImageIndex + 1, total: previewItems.length }) }}
            </span>
            <button
              v-if="previewHasMultipleImages"
              type="button"
              class="preview-nav-button preview-nav-button--prev"
              :aria-label="t('aiPage.image.previewPrevious')"
              aria-keyshortcuts="ArrowLeft"
              @pointerdown.stop.prevent="handlePreviewNavPointer(-1)"
              @click.stop.prevent="handlePreviewNavClick(-1)"
            >
              <ChevronLeft class="h-4 w-4" />
            </button>
            <button
              v-if="previewHasMultipleImages"
              type="button"
              class="preview-nav-button preview-nav-button--next"
              :aria-label="t('aiPage.image.previewNext')"
              aria-keyshortcuts="ArrowRight"
              @pointerdown.stop.prevent="handlePreviewNavPointer(1)"
              @click.stop.prevent="handlePreviewNavClick(1)"
            >
              <ChevronRight class="h-4 w-4" />
            </button>
          </div>
          <div v-if="previewInspectorItems.length" class="preview-inspector">
            <span
              v-for="item in previewInspectorItems"
              :key="item.key"
              class="preview-inspector__item"
              :class="item.tone ? `preview-inspector__item--${item.tone}` : undefined"
            >
              <strong>{{ item.label }}</strong>
              <em :title="item.value">{{ item.value }}</em>
            </span>
          </div>
          <div v-if="previewHasMultipleImages" class="preview-thumbnails">
            <button
              v-for="(url, index) in previewItems"
              :key="url"
              :ref="(element) => setPreviewThumbnailRef(element, index)"
              type="button"
              class="preview-thumbnail"
              :class="{ 'preview-thumbnail--active': index === previewImageIndex }"
              :aria-label="formatTemplate(t('aiPage.image.previewSelect'), { index: index + 1 })"
              :aria-current="index === previewImageIndex ? 'true' : undefined"
              @pointerdown.stop.prevent="handlePreviewThumbnailPointer(index)"
              @click.stop.prevent="handlePreviewThumbnailClick(index)"
            >
              <img :src="url" alt="" />
            </button>
          </div>
        </div>
        <aside v-if="previewMessage" class="preview-dialog__details">
          <div class="preview-dialog__head">
            <div class="min-w-0">
              <span class="preview-dialog__eyebrow">{{ t("aiPage.image.previewTitle") }}</span>
              <strong>{{ previewImageTitle }}</strong>
            </div>
            <div class="preview-dialog__actions">
              <BaseButton
                v-if="canUsePromptFromMessage(previewMessage)"
                type="neutral"
                outline
                size="xs"
                @click="usePromptFromPreview"
              >
                <template #icon><Sparkles class="h-3 w-3" /></template>
                {{ t("aiPage.image.usePrompt") }}
              </BaseButton>
              <BaseButton
                v-if="canRegenerateImageMessage(previewMessage)"
                type="success"
                size="xs"
                @click="regeneratePreviewImage"
              >
                <template #icon><RotateCcw class="h-3 w-3" /></template>
                {{ t("aiPage.image.regenerate") }}
              </BaseButton>
              <BaseCopyButton
                :text="previewImageUrl"
                :label="t('aiPage.image.copyImageUrl')"
                size="xs"
              />
              <BaseCopyButton
                :text="previewInfoText"
                :label="t('aiPage.image.copyImageInfo')"
                size="xs"
              />
            </div>
          </div>

          <div class="preview-meta-grid">
            <div class="preview-meta-item">
              <span>{{ t("aiPage.image.previewModel") }}</span>
              <strong>{{ previewMessage.model }}</strong>
            </div>
            <div class="preview-meta-item">
              <span>{{ t("aiPage.image.latency") }}</span>
              <strong>{{ getMessageLatencyLabel(previewMessage) || "-" }}</strong>
            </div>
            <div class="preview-meta-item">
              <span>{{ t("aiPage.image.queueWait") }}</span>
              <strong>{{ getMessageQueueWaitLabel(previewMessage) || "-" }}</strong>
            </div>
            <div class="preview-meta-item">
              <span>{{ t("aiPage.image.actualSize") }}</span>
              <strong>{{ getMessageActualSize(previewMessage) || "-" }}</strong>
            </div>
            <div class="preview-meta-item">
              <span>{{ t("aiPage.image.requestedSize") }}</span>
              <strong>{{ getMessageRequestedSize(previewMessage) || "-" }}</strong>
            </div>
            <div class="preview-meta-item">
              <span>{{ t("aiPage.image.requestId") }}</span>
              <strong :title="previewMessage.requestId">{{ getShortRequestId(previewMessage.requestId) || "-" }}</strong>
            </div>
          </div>

          <div v-if="isImageSizeFallback(previewMessage)" class="image-size-notice preview-size-notice">
            <AlertTriangle class="h-3.5 w-3.5" />
            <span>{{ getFallbackNotice(previewMessage) }}</span>
          </div>
          <div v-else-if="isImageSizeCompatibility(previewMessage)" class="image-size-notice image-size-notice--info preview-size-notice">
            <Image class="h-3.5 w-3.5" />
            <span>{{ getCompatibilityNotice(previewMessage) }}</span>
          </div>

          <div v-if="previewPrompt" class="preview-section">
            <div class="preview-section__head">
              <span>{{ t("aiPage.image.previewPrompt") }}</span>
              <BaseCopyButton :text="previewPrompt" :label="t('aiPage.image.copyPrompt')" size="xs" />
            </div>
            <p>{{ previewPrompt }}</p>
          </div>

          <div v-if="previewMessage.requestId" class="preview-section preview-section--compact">
            <div class="preview-section__head">
              <span>{{ t("aiPage.image.requestId") }}</span>
              <BaseCopyButton :text="previewMessage.requestId" :label="t('aiPage.image.copyRequestId')" size="xs" />
            </div>
            <code>{{ previewMessage.requestId }}</code>
          </div>

          <div v-if="previewSavedFile" class="preview-section preview-section--compact">
            <div class="preview-section__head">
              <span>{{ t("aiPage.image.previewSavedFile") }}</span>
              <BaseCopyButton :text="previewSavedFile.path" :label="t('aiPage.image.copyPath')" size="xs" />
            </div>
            <code :title="previewSavedFile.path">{{ getSavedFileName(previewSavedFile.path) }}</code>
            <small>{{ previewSavedFile.mimeType }} · {{ formatBytes(previewSavedFile.sizeBytes) }}</small>
          </div>
        </aside>
      </div>
    </BaseDialog>
  </section>
</template>

<style scoped>
.image-panel {
  @apply grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)];
}
.session-list {
  @apply flex min-h-0 flex-col gap-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30;
}
.session-list__head {
  @apply flex h-8 items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300;
}
.session-search {
  @apply shrink-0;
}
.session-filters {
  @apply grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950;
}
.session-filter-chip {
  @apply flex h-7 min-w-0 items-center justify-center gap-1 rounded-lg text-[10px] font-black text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}
.session-filter-chip span {
  @apply min-w-0 truncate;
}
.session-filter-chip strong {
  @apply inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 px-1 text-[9px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300;
}
.session-filter-chip--active {
  @apply bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200;
}
.session-filter-chip--active strong {
  @apply bg-emerald-600 text-white dark:bg-emerald-400 dark:text-emerald-950;
}
.session-list__empty {
  @apply flex min-h-16 items-center justify-center rounded-xl border border-dashed border-slate-200 px-3 text-center text-[11px] font-bold text-slate-400 dark:border-slate-800 dark:text-slate-500;
}
.icon-btn {
  @apply flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-800 dark:bg-slate-950;
}
.session-item {
  @apply flex min-h-20 items-center gap-2 rounded-xl border border-transparent px-2 py-2 text-left transition-colors hover:border-slate-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:hover:border-slate-800 dark:hover:bg-slate-950;
}
.session-item--active {
  @apply border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300;
}
.session-thumb {
  @apply relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500;
}
.session-thumb img {
  @apply h-full w-full object-cover;
}
.session-thumb__badge {
  @apply absolute bottom-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-950 px-1 text-[9px] font-black leading-none text-white shadow-sm ring-1 ring-white/80 dark:bg-white dark:text-slate-950 dark:ring-slate-950/80;
}
.session-item__title {
  @apply truncate text-xs font-black text-slate-800 dark:text-slate-100;
}
.session-item__content {
  @apply flex min-w-0 flex-1 flex-col justify-center gap-1;
}
.session-item__prompt {
  @apply min-w-0 truncate text-[10px] font-semibold leading-4 text-slate-400 dark:text-slate-500;
}
.session-item__meta {
  @apply text-[10px] font-bold text-slate-500 dark:text-slate-400;
}
.session-status {
  @apply ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black;
}
.session-status--idle {
  @apply bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400;
}
.session-status--pending {
  @apply bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300;
}
.session-status--success {
  @apply bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300;
}
.session-status--failed {
  @apply bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300;
}
.session-status--canceled {
  @apply bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300;
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
.image-header__status {
  @apply flex shrink-0 items-center gap-2;
}
.status-pill {
  @apply inline-flex h-7 items-center rounded-full border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300;
}
.status-pill--busy {
  border-color: rgba(5, 150, 105, 0.35);
  background: rgba(5, 150, 105, 0.08);
  color: #047857;
}
.dark .status-pill--busy {
  border-color: rgba(52, 211, 153, 0.3);
  background: rgba(6, 78, 59, 0.35);
  color: #6ee7b7;
}
.status-size {
  @apply inline-flex h-7 items-center rounded-full bg-slate-900 px-3 text-[11px] font-black text-white dark:bg-slate-100 dark:text-slate-900;
}
.image-history-shell {
  @apply relative flex min-h-0 flex-1;
}
.image-history {
  @apply flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-5 py-5 dark:bg-slate-900;
  background: #f8fafc;
}
.history-jump-button {
  @apply absolute bottom-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-emerald-200 bg-white/95 px-3 py-1.5 text-[11px] font-black text-emerald-700 shadow-lg shadow-slate-900/10 backdrop-blur transition hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-900 dark:bg-slate-950/95 dark:text-emerald-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/40;
}
.history-jump-button svg {
  @apply shrink-0;
}
.empty-state {
  @apply m-auto flex w-full max-w-lg flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950;
}
.empty-state__preview {
  @apply mb-4 flex w-full max-w-52 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 text-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:text-emerald-300;
  min-height: 132px;
}
.empty-state__preview span {
  @apply rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200;
}
.empty-state__title {
  @apply text-sm font-black text-slate-700 dark:text-slate-200;
}
.empty-state__hint {
  @apply mt-1 max-w-full truncate text-[11px] font-bold text-slate-400 dark:text-slate-500;
}
.empty-state__starters {
  @apply mt-4 grid w-full grid-cols-2 gap-2;
}
.empty-starter {
  @apply flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30;
}
.empty-starter span {
  @apply min-w-0 truncate text-[11px] font-black text-slate-700 dark:text-slate-200;
}
.empty-starter small {
  @apply shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-emerald-700 shadow-sm dark:bg-slate-950 dark:text-emerald-300;
}
.image-row {
  @apply flex items-start gap-3;
}
.image-row--user {
  @apply flex-row-reverse;
}
.image-row--assistant,
.image-row--error {
  @apply justify-start;
}
.image-avatar {
  @apply mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400;
}
.image-row--assistant .image-avatar {
  @apply border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300;
}
.image-row--user .image-avatar {
  @apply border-slate-300 bg-slate-900 text-white dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900;
}
.image-row--failed .image-avatar {
  @apply border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300;
}
.image-message {
  @apply flex max-w-[82%] min-w-0 flex-col gap-1.5;
}
.image-row--assistant .image-message,
.image-row--error .image-message {
  @apply w-full;
}
.image-row--user .image-message {
  @apply items-end;
}
.image-message__meta {
  @apply flex max-w-full flex-wrap items-center gap-2 px-1 text-[10px] font-black text-slate-500 dark:text-slate-400;
}
.image-row--user .image-message__meta {
  @apply flex-row-reverse;
}
.image-bubble {
  @apply min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950;
}
.image-row--user .image-bubble {
  @apply border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/10;
}
.image-row--failed .image-bubble {
  @apply border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300;
}
.image-message pre {
  @apply whitespace-pre-wrap break-words text-[12px] font-medium leading-relaxed text-slate-800 dark:text-slate-200;
}
.image-row--user .image-message pre {
  @apply text-white;
}
.image-size-notice {
  @apply mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200;
}
.image-size-notice--info {
  @apply border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200;
}
.image-size-notice svg {
  @apply mt-0.5 shrink-0;
}
.image-failure-card {
  @apply mt-3 flex min-w-0 flex-col gap-3 rounded-xl border border-rose-200 bg-white px-3 py-3 shadow-sm dark:border-rose-900 dark:bg-slate-950;
}
.image-failure-card__head {
  @apply flex min-w-0 items-start gap-2.5;
}
.image-failure-card__head svg {
  @apply mt-0.5 shrink-0 text-rose-600 dark:text-rose-300;
}
.image-failure-card__head div {
  @apply flex min-w-0 flex-col gap-0.5;
}
.image-failure-card__head strong {
  @apply text-xs font-black text-rose-700 dark:text-rose-200;
}
.image-failure-card__head span {
  @apply text-[11px] font-bold leading-relaxed text-rose-600 dark:text-rose-300;
}
.image-failure-card__actions {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}
.image-result-summary {
  @apply mt-3 flex min-w-0 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/70;
}
.image-result-summary__item {
  @apply inline-flex h-6 min-w-0 max-w-full items-center rounded-full border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300;
}
.image-result-summary__item--success {
  @apply border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200;
}
.image-result-summary__item--info {
  @apply border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200;
}
.image-result-summary__item--warning {
  @apply border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200;
}
.image-result-summary__item--danger {
  @apply border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200;
}
.image-message__tools {
  @apply mt-3 flex flex-wrap items-center gap-2;
}
.image-row--user .image-message__tools {
  @apply justify-end;
}
.image-row--user .image-message__tools :deep(.base-copy-button) {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  box-shadow: none;
}
.image-row--user .image-message__tools :deep(.base-copy-button:hover) {
  background: rgba(255, 255, 255, 0.18);
}
.image-loading {
  @apply flex min-w-0 items-center gap-3;
}
.image-loading__preview {
  @apply relative flex h-28 max-w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-200 bg-white text-emerald-500 dark:border-emerald-900 dark:bg-slate-950 dark:text-emerald-300;
  width: min(176px, 42vw);
}
.image-loading__shine {
  @apply absolute inset-0;
  background: linear-gradient(110deg, transparent 0%, rgba(16, 185, 129, 0.16) 45%, transparent 70%);
  animation: image-shine 1.2s ease-in-out infinite;
}
.image-loading__text {
  @apply flex min-w-0 flex-1 flex-col gap-2;
}
.image-loading__head {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2;
}
.image-loading__title {
  @apply text-sm font-black text-emerald-700 dark:text-emerald-200;
}
.image-loading__elapsed {
  @apply rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300;
}
.image-loading__meta-grid {
  @apply grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-3;
}
.image-loading__meta-grid span {
  @apply min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900;
}
.image-loading__meta-grid strong {
  @apply block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500;
}
.image-loading__meta-grid em {
  @apply mt-0.5 block truncate text-[11px] not-italic font-black text-slate-700 dark:text-slate-200;
}
.image-loading__progress {
  @apply h-1.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950;
}
.image-loading__progress span {
  @apply block h-full w-1/3 rounded-full bg-emerald-500;
  animation: image-progress 1.35s ease-in-out infinite;
}
.image-loading__footer {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2;
}
.image-loading__dots {
  @apply flex h-4 items-center gap-1;
}
.image-loading__dots i {
  @apply h-1.5 w-1.5 rounded-full bg-emerald-400;
  animation: image-dot 1s infinite ease-in-out;
}
.image-loading__dots i:nth-child(2) {
  animation-delay: 0.15s;
}
.image-loading__dots i:nth-child(3) {
  animation-delay: 0.3s;
}
.cancel-generate-btn.el-button {
  @apply shrink-0;
}
@keyframes image-shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
@keyframes image-dot {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  40% {
    transform: translateY(-3px);
    opacity: 1;
  }
}
@keyframes image-progress {
  0% {
    transform: translateX(-110%);
  }
  50% {
    transform: translateX(115%);
  }
  100% {
    transform: translateX(260%);
  }
}
.generated-gallery {
  @apply mt-3 grid grid-cols-1 gap-3 md:grid-cols-2;
}
.generated-gallery__toolbar {
  @apply col-span-full flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950;
}
.generated-gallery__toolbar strong {
  @apply min-w-0 truncate text-[11px] font-black text-slate-600 dark:text-slate-300;
}
.generated-gallery__toolbar-actions {
  @apply flex shrink-0 flex-wrap items-center justify-end gap-1.5;
}
.generated-frame {
  @apply relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md focus-within:ring-2 focus-within:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900;
  width: 100%;
  max-height: min(320px, 42vh);
}
.generated-preview-button {
  @apply flex h-full w-full items-center justify-center bg-slate-50 p-0 text-left dark:bg-slate-950;
  min-height: 164px;
}
.generated-image {
  @apply h-full w-full object-contain;
}
.generated-frame__action {
  @apply absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-slate-950/90 px-2.5 py-1 text-[10px] font-black text-white opacity-0 shadow-sm backdrop-blur transition;
}
.generated-frame__index {
  @apply pointer-events-none absolute left-1/2 top-2 z-10 inline-flex -translate-x-1/2 items-center rounded-full border border-white/20 bg-slate-950/85 px-2.5 py-1 text-[10px] font-black text-white shadow-lg backdrop-blur;
}
.generated-frame__tools {
  @apply pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent p-2 pt-10 opacity-0 transition;
}
.generated-frame__quick-actions,
.generated-frame__copy-tools {
  @apply flex max-w-full flex-wrap gap-1;
  pointer-events: auto;
}
.generated-frame__copy-tools {
  @apply justify-end;
}
.generated-frame__quick-actions :deep(.el-button) {
  height: 24px !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
  background: rgba(15, 23, 42, 0.86) !important;
  color: #ffffff !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.24) !important;
}
.generated-frame__quick-actions :deep(.el-button:hover),
.generated-frame__quick-actions :deep(.el-button:focus) {
  border-color: rgba(255, 255, 255, 0.42) !important;
  background: rgba(4, 120, 87, 0.92) !important;
  color: #ffffff !important;
}
.generated-frame__copy-tools :deep(.base-copy-button) {
  @apply border-white/25 bg-slate-950/85 text-white shadow-lg hover:border-white/40 hover:bg-slate-900 hover:text-white dark:border-white/20 dark:bg-slate-950/90 dark:text-white dark:hover:border-white/40 dark:hover:bg-slate-900;
}
.generated-frame__file-badge {
  @apply absolute left-2 top-2 z-10 flex max-w-[calc(100%-72px)] min-w-0 items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm backdrop-blur dark:bg-slate-950/90 dark:text-slate-200;
}
.generated-frame__file-badge strong {
  @apply shrink-0 text-emerald-700 dark:text-emerald-300;
}
.generated-frame__file-badge span {
  @apply min-w-0 truncate;
}
.generated-frame__file-badge small {
  @apply hidden shrink-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400 md:inline;
}
.generated-frame:hover .generated-frame__action,
.generated-frame:focus-within .generated-frame__action {
  opacity: 1;
}
.generated-frame:hover .generated-frame__tools,
.generated-frame:focus-within .generated-frame__tools {
  opacity: 1;
}
.saved-file-list {
  @apply mt-3 flex flex-col gap-2;
}
.saved-file-item {
  @apply flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900;
}
.saved-file-item__info {
  @apply flex min-w-0 flex-1 flex-col gap-1;
}
.saved-file-item__info span {
  @apply truncate text-[11px] font-bold text-slate-700 dark:text-slate-300;
}
.saved-file-item__info strong {
  @apply text-[10px] font-semibold text-slate-500 dark:text-slate-400;
}
.image-message__actions {
  @apply mt-3 flex flex-wrap justify-end gap-2;
}
.image-composer {
  @apply shrink-0 border-t border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950;
}
.composer-shell {
  @apply flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm transition-colors focus-within:border-emerald-500 focus-within:bg-white focus-within:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:focus-within:bg-slate-950;
}
.composer-top {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2;
}
.composer-controls {
  @apply flex min-w-[220px] flex-1 items-center gap-2;
}
.model-select {
  @apply min-w-0 flex-1 shrink;
}
.size-select {
  @apply w-20 shrink-0;
}
.size-select :deep(.base-select__selected-label) {
  @apply w-full text-center font-black;
}
.composer-size-detail {
  @apply flex min-w-0 max-w-64 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400;
}
.composer-size-detail strong {
  @apply shrink-0 text-[12px] font-black text-slate-800 dark:text-slate-100;
}
.composer-size-detail span {
  @apply min-w-0 truncate;
}
.composer-size-presets {
  @apply grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-slate-200 pt-1.5 dark:border-slate-800;
}
.composer-size-presets__scroll {
  @apply flex min-w-0 items-center gap-1.5 overflow-x-auto pr-1;
  scrollbar-width: none;
}
.composer-size-presets__scroll::-webkit-scrollbar {
  display: none;
}
.composer-size-presets__label {
  @apply inline-flex shrink-0 text-[11px] font-black text-slate-500 dark:text-slate-400;
}
.composer-tools {
  @apply flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1.5;
}
.composer-tools-divider {
  @apply h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700;
}
.size-preset-chip {
  @apply inline-flex h-9 min-w-[62px] shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-2 text-center shadow-sm transition hover:border-emerald-500 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300;
}
.size-preset-chip strong {
  @apply text-[11px] font-black leading-4 text-slate-800 dark:text-slate-100;
}
.size-preset-chip span {
  @apply max-w-[54px] truncate text-[9px] font-black leading-3 text-slate-400 dark:text-slate-500;
  margin-top: 1px;
}
.size-preset-chip--active {
  @apply border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-200;
}
.size-preset-chip--active strong {
  @apply text-emerald-800 dark:text-emerald-100;
}
.size-preset-chip--active span {
  @apply text-emerald-600 dark:text-emerald-300;
}
.style-toggle-chip {
  @apply inline-flex h-6 max-w-28 shrink-0 items-center justify-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-black text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:border-emerald-500 dark:hover:text-emerald-200;
}
.style-toggle-chip svg {
  @apply shrink-0;
}
.style-toggle-chip--active {
  @apply border-emerald-500 bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500 dark:border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-100;
}
.starter-toggle-chip {
  @apply inline-flex h-6 max-w-24 shrink-0 items-center justify-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-2.5 text-[10px] font-black text-sky-700 shadow-sm transition hover:border-sky-400 hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:border-sky-500 dark:hover:text-sky-200;
}
.starter-toggle-chip svg {
  @apply shrink-0;
}
.starter-toggle-chip--active {
  @apply border-sky-500 bg-sky-100 text-sky-800 ring-1 ring-sky-500 dark:border-sky-400 dark:bg-sky-950/50 dark:text-sky-100;
}
.composer-presets {
  @apply flex max-h-48 min-w-0 flex-col gap-2 overflow-hidden border-t border-slate-200 pt-2 dark:border-slate-800;
}
.composer-presets__head {
  @apply flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-2;
}
.composer-presets__title {
  @apply flex min-w-0 items-center gap-1.5 text-[11px] font-black text-emerald-700 dark:text-emerald-300;
}
.composer-presets__title svg {
  @apply shrink-0;
}
.composer-presets__title span {
  @apply shrink-0;
}
.composer-presets__title strong {
  @apply min-w-0 truncate rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200;
}
.composer-presets__search {
  @apply min-w-36 max-w-56 flex-1;
}
.composer-presets__grid {
  @apply grid min-h-0 flex-1 grid-cols-2 gap-1.5 overflow-y-auto pr-1;
  scrollbar-width: thin;
}
.composer-presets__label {
  @apply inline-flex shrink-0 items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300;
}
.composer-presets__empty {
  @apply rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-[11px] font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500;
}
.style-preset-chip {
  @apply flex min-h-11 min-w-0 flex-col items-start justify-center gap-0.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-emerald-400 dark:hover:bg-emerald-950/30;
}
.style-preset-chip span {
  @apply max-w-full truncate text-[11px] font-black text-slate-800 dark:text-slate-100;
}
.style-preset-chip small {
  @apply max-w-full truncate text-[10px] font-bold leading-4 text-slate-500 dark:text-slate-400;
}
.style-preset-chip--active {
  @apply border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 dark:border-emerald-400 dark:bg-emerald-950/40;
}
.style-preset-chip--active span {
  @apply text-emerald-800 dark:text-emerald-100;
}
.style-preset-chip--active small {
  @apply text-emerald-700 dark:text-emerald-200;
}
.composer-starters {
  @apply grid grid-cols-2 gap-1.5 border-t border-slate-200 pt-1.5 dark:border-slate-800;
}
.starter-preset-chip {
  @apply flex h-7 min-w-0 items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-3 text-left shadow-sm transition hover:border-sky-400 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-sky-500 dark:hover:bg-sky-950/30;
}
.starter-preset-chip span {
  @apply min-w-0 truncate text-[10px] font-black text-slate-700 dark:text-slate-200;
}
.starter-preset-chip small {
  @apply shrink-0 text-[10px] font-black text-sky-700 dark:text-sky-300;
}
.style-tool-chip,
.style-undo-chip,
.style-clear-chip {
  @apply inline-flex h-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-2.5 text-[10px] font-black text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-slate-100;
}
.style-tool-chip {
  @apply border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:border-emerald-500 dark:hover:text-emerald-200;
}
.style-tool-chip:disabled {
  @apply cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600 dark:hover:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-slate-600;
}
.style-undo-chip {
  @apply border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 hover:text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:border-amber-500 dark:hover:text-amber-200;
}
.composer-size-warning {
  @apply flex min-w-0 items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200;
}
.composer-size-warning svg {
  @apply mt-0.5 shrink-0;
}
.composer-size-warning span {
  @apply min-w-0 break-words;
}
.composer-draft-bar {
  @apply flex min-w-0 items-center justify-between gap-2 border-t border-slate-200 pt-1.5 dark:border-slate-800;
}
.composer-draft-tags {
  @apply flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto;
  scrollbar-width: thin;
}
.composer-draft-tags span {
  @apply inline-flex h-5 shrink-0 items-center rounded-full border border-slate-200 bg-white px-2 text-[10px] font-black text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300;
}
.composer-draft-clear {
  @apply inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-500 shadow-sm transition hover:border-rose-300 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-rose-700 dark:hover:text-rose-300;
}
.composer-draft-clear svg {
  @apply shrink-0;
}
.composer-subject-warning {
  @apply flex min-w-0 items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200;
}
.composer-subject-warning svg {
  @apply mt-0.5 shrink-0;
}
.composer-subject-warning span {
  @apply min-w-0 break-words;
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

  .session-list {
    @apply p-2.5;
  }

  .session-filter-chip {
    @apply text-[9px];
  }

  .session-item {
    @apply min-h-16 px-2;
  }

  .session-thumb {
    @apply h-9 w-9 rounded-lg;
  }

  .session-status {
    @apply px-1.5 text-[9px];
  }

  .image-history {
    @apply px-4 py-4;
  }

  .image-composer {
    @apply p-2;
  }
}

@media (max-width: 1024px) {
  .image-panel {
    @apply grid-cols-1;
  }

  .session-list {
    @apply max-h-36;
  }

  .session-item {
    @apply min-h-12;
  }

  .session-search {
    @apply hidden;
  }

  .session-list__head {
    @apply h-7;
  }

  .composer-size-detail {
    @apply max-w-36;
  }

  .composer-size-presets {
    @apply grid-cols-1 overflow-visible;
  }

  .composer-size-presets__scroll {
    @apply flex-wrap overflow-visible pr-0;
  }

  .composer-tools {
    @apply justify-start;
  }

  .generated-gallery {
    @apply grid-cols-1;
  }

  .generated-frame {
    max-height: min(300px, 38vh);
  }

  .generated-frame__tools,
  .generated-frame__action {
    opacity: 1;
  }
}

@media (max-width: 520px) {
  .composer-top,
  .composer-bottom {
    @apply flex-col items-stretch;
  }

  .composer-size-detail {
    @apply max-w-full;
  }

  .composer-presets__head {
    @apply flex-col items-stretch;
  }

  .composer-presets__search {
    @apply max-w-full;
  }

  .composer-presets__grid {
    @apply grid-cols-1 overflow-y-auto;
  }

  .composer-starters {
    @apply grid-cols-1;
  }

  .composer-size-presets {
    @apply grid-cols-1 overflow-visible;
  }

  .composer-size-presets__scroll {
    @apply flex-wrap overflow-visible pr-0;
  }

  .composer-tools {
    @apply justify-start;
  }

  .composer-draft-bar {
    @apply flex-col items-stretch;
  }

  .composer-draft-tags {
    @apply flex-wrap overflow-visible;
  }

  .composer-draft-clear {
    align-self: flex-end;
  }

  .generate-btn.el-button {
    align-self: flex-end;
  }

  .saved-file-item {
    @apply flex-col items-stretch;
  }

  .image-loading {
    @apply flex-col items-stretch;
  }

  .image-loading__preview {
    @apply max-w-none;
    width: 100%;
  }

  .image-loading__meta-grid {
    @apply grid-cols-1;
  }

  .empty-state__starters {
    @apply grid-cols-1;
  }
}
.preview-dialog {
  @apply grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px];
}
.preview-dialog__media {
  @apply flex min-h-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900;
  max-height: 74vh;
}
.preview-dialog__image-stage {
  @apply relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-xl;
}
.preview-dialog__image-stage img {
  @apply max-h-[70vh] max-w-full rounded-xl object-contain;
  pointer-events: none;
}
.preview-image-counter {
  @apply absolute right-3 top-3 z-10 rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white shadow-sm;
}
.preview-nav-button {
  @apply absolute top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-slate-950/85 text-white shadow-lg transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400;
  pointer-events: auto;
}
.preview-nav-button--prev {
  @apply left-5;
}
.preview-nav-button--next {
  @apply right-5;
}
.preview-inspector {
  @apply flex max-w-full shrink-0 flex-wrap items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950;
}
.preview-inspector__item {
  @apply inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300;
}
.preview-inspector__item strong {
  @apply shrink-0 text-slate-400 dark:text-slate-500;
}
.preview-inspector__item em {
  @apply min-w-0 truncate not-italic;
}
.preview-inspector__item--success {
  @apply border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200;
}
.preview-inspector__item--info {
  @apply border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200;
}
.preview-inspector__item--warning {
  @apply border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200;
}
.preview-thumbnails {
  @apply flex max-w-full shrink-0 gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950;
}
.preview-thumbnail {
  @apply h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-0.5 transition hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900;
}
.preview-thumbnail--active {
  @apply border-emerald-500 ring-2 ring-emerald-500;
}
.preview-thumbnail img {
  @apply h-full w-full rounded-md object-cover;
}
.preview-dialog__details {
  @apply flex min-h-0 flex-col gap-3 overflow-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950;
  max-height: 74vh;
}
.preview-dialog__head {
  @apply flex items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800;
}
.preview-dialog__head strong {
  @apply block truncate text-sm font-black text-slate-800 dark:text-slate-100;
}
.preview-dialog__actions {
  @apply flex shrink-0 flex-wrap items-center justify-end gap-2;
}
.preview-dialog__actions :deep(.el-button) {
  height: 26px !important;
  font-size: 11px !important;
  font-weight: 900 !important;
}
.preview-dialog__eyebrow {
  @apply mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500;
}
.preview-meta-grid {
  @apply grid grid-cols-2 gap-2;
}
.preview-meta-item {
  @apply min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900;
}
.preview-meta-item span {
  @apply block text-[10px] font-black text-slate-400 dark:text-slate-500;
}
.preview-meta-item strong {
  @apply mt-1 block truncate text-[12px] font-black text-slate-700 dark:text-slate-200;
}
.preview-size-notice {
  @apply mt-0;
}
.preview-section {
  @apply min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900;
}
.preview-section__head {
  @apply mb-2 flex items-center justify-between gap-2;
}
.preview-section__head span {
  @apply text-[11px] font-black text-slate-500 dark:text-slate-400;
}
.preview-section p {
  @apply max-h-40 overflow-auto whitespace-pre-wrap break-words text-[12px] font-medium leading-relaxed text-slate-700 dark:text-slate-200;
}
.preview-section code {
  @apply block truncate rounded-lg bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300;
}
.preview-section small {
  @apply mt-1 block text-[10px] font-bold text-slate-400 dark:text-slate-500;
}
.preview-section--compact {
  @apply py-2.5;
}

@media (max-width: 1024px) {
  .preview-dialog {
    @apply grid-cols-1;
    max-height: 78vh;
    overflow: auto;
  }

  .preview-dialog__media,
  .preview-dialog__details {
    max-height: none;
  }

  .preview-dialog__image-stage img {
    max-height: min(44vh, 420px);
  }

  .preview-dialog__details {
    @apply overflow-auto;
    max-height: 34vh;
  }
}

@media (max-width: 640px) {
  .preview-dialog {
    max-height: none;
    overflow: visible;
  }

  .preview-dialog__media {
    @apply p-2;
    max-height: none;
  }

  .preview-dialog__image-stage img {
    max-height: min(52vh, 420px);
  }

  .preview-dialog__head {
    @apply flex-col;
  }

  .preview-dialog__actions {
    @apply justify-start;
  }

  .preview-meta-grid {
    @apply grid-cols-1;
  }

  .preview-dialog__details {
    max-height: none;
    overflow: visible;
  }
}
</style>
