function splitMockPromptTerms(prompt: string) {
  const terms = prompt
    .split(/[，,。、;；|/\\\s]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.slice(0, 32));
  return terms.length ? terms.slice(0, 8) : [prompt.trim()].filter(Boolean);
}

const MOCK_PROMPT_VARIATIONS = [
  "近景构图，强调主体质感和细节",
  "远景构图，强调环境层次和空间关系",
  "低角度视角，增强力量感和戏剧性",
  "高角度视角，强调整体布局和氛围",
  "柔和自然光，画面干净细腻",
  "电影感侧光，增强明暗对比",
  "浅景深，突出主体并弱化背景",
  "广角视角，增强场景规模和纵深",
];

export function buildMockExpandedPrompt(prompt: string, index: number) {
  const constraints = splitMockPromptTerms(prompt).join("、") || prompt;
  const variation = MOCK_PROMPT_VARIATIONS[index % MOCK_PROMPT_VARIATIONS.length];
  return `${prompt}。保持核心语义和高权重关键词不变：${constraints}。差异化方向：${variation}。画面要求：主体明确、细节丰富、构图完整、无文字水印。`;
}

export function mergeMockNegativePrompt(prompt: string, value: unknown) {
  const parts = [
    String(value || ""),
    "低质量，文字，水印，主体错误，构图混乱",
  ]
    .join("，")
    .split(/[，,、;；\n\r]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
  const lower = prompt.toLowerCase();
  if (prompt.includes("人") || prompt.includes("脸") || prompt.includes("美女") || lower.includes("portrait") || lower.includes("person")) {
    parts.push("未成年感", "过度暴露", "脸部畸形", "多余手指");
  }
  return Array.from(new Set(parts)).join("，");
}

export function buildMockFallbackPrompt(mode: string) {
  if (mode === "img2img") return "基于参考图生成不同版本";
  if (mode === "person_consistency") return "尽量保持同一人物身份感并生成新场景";
  if (mode === "upscale_2x") return "高清放大 2x";
  if (mode === "upscale_4x") return "高清放大 4x";
  return "图片工作台生成任务";
}

export function parseMockReferenceAssetIds(value: unknown) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
}
