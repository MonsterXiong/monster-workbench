import type { AiPromptItem } from "../../../../types/ai";
import {
  extractTextBetween,
  formatTemplate,
  includesAnyText,
  joinLines,
  replaceAllText,
  toTrimmedString,
} from "../../../../utils";

type ImageTranslate = (key: string) => string;

export const STYLE_PROMPT_CATEGORY_ID = "image-quality-styles";
export const STYLE_PROMPT_SUBJECT_PLACEHOLDER = "{替换为你的主体}";

export function extractSubjectFromStylePrompt(content: string, preset: AiPromptItem) {
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

export function getPromptSubjectCandidate(content: string, stylePromptPresets: AiPromptItem[]) {
  const cleanContent = toTrimmedString(content);
  for (const preset of stylePromptPresets) {
    const subject = extractSubjectFromStylePrompt(cleanContent, preset);
    if (subject !== null) {
      return subject === STYLE_PROMPT_SUBJECT_PLACEHOLDER ? "" : subject;
    }
  }
  return cleanContent;
}

export function isEnhancedPrompt(content: string, enhancedPromptMarker: string) {
  const cleanContent = toTrimmedString(content);
  return includesAnyText(cleanContent, [enhancedPromptMarker, "质量控制：", "Quality control:"]);
}

export function isStyledPrompt(content: string, preset: AiPromptItem) {
  return extractSubjectFromStylePrompt(content, preset) !== null;
}

export function formatStylePromptContent(preset: AiPromptItem, subject: string) {
  const presetContent = toTrimmedString(preset.content);
  if (!presetContent) {
    return subject;
  }
  if (presetContent.includes(STYLE_PROMPT_SUBJECT_PLACEHOLDER)) {
    return replaceAllText(
      presetContent,
      STYLE_PROMPT_SUBJECT_PLACEHOLDER,
      subject || STYLE_PROMPT_SUBJECT_PLACEHOLDER
    );
  }
  return subject ? `${subject}\n\n${presetContent}` : presetContent;
}

export function buildEnhancedPrompt(subject: string, t: ImageTranslate) {
  return joinLines([
    formatTemplate(t("aiPage.image.enhancedPromptSubject"), { subject }),
    t("aiPage.image.enhancedPromptComposition"),
    t("aiPage.image.enhancedPromptLighting"),
    t("aiPage.image.enhancedPromptDetails"),
    t("aiPage.image.enhancedPromptQuality"),
  ]);
}
