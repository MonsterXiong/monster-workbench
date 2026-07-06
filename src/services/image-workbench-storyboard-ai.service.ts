import { aiService } from "./ai.service";
import { createTimestampId, toTrimmedString, tryJsonParse } from "../utils";

export interface ImageWorkbenchStoryboardAiScene {
  index: number;
  title: string;
  picturePrompt: string;
  cameraPrompt: string;
  emotionKeywords: string;
  referencePrompt: string;
}

export interface ImageWorkbenchStoryboardAiResult {
  prefix: string;
  negativePrompt: string;
  scenes: ImageWorkbenchStoryboardAiScene[];
  rawText: string;
}

export interface RecognizeImageWorkbenchStoryboardOptions {
  rawText: string;
  providerConfigId: string;
  model?: string | null;
}

export interface GenerateImageWorkbenchStoryboardOptions {
  direction: string;
  providerConfigId: string;
  model?: string | null;
}

type AnyRecord = Record<string, unknown>;
const STORYBOARD_RECOGNITION_MARKER = "IMAGE_WORKBENCH_STORYBOARD_RECOGNITION_V1";
const STORYBOARD_GENERATION_MARKER = "IMAGE_WORKBENCH_STORYBOARD_GENERATION_V1";
const STORYBOARD_AI_DEFAULT_PREFIX =
  "参考图只用于主角身份识别：脸型、五官比例、发型、年龄感和整体气质保持一致，不复制参考图固定表情和姿态；古风美女，电影级画面，东方审美，高级古装摄影，真实光影，精致服饰纹理。";
const STORYBOARD_AI_DEFAULT_NEGATIVE_PROMPT =
  "不要改变参考图人物五官，不要换脸，不要现代妆容，不要欧美五官，不要夸张网红脸，不要塑料皮肤，不要过度磨皮，不要表情僵硬，不要所有分镜同一表情同一姿态，不要畸形手指，不要多手多脚，不要低清晰度，不要廉价影楼风，不要现代建筑，不要现代服饰，不要文字水印，不要模糊面部。";

export const imageWorkbenchStoryboardAiService = {
  async recognizeStoryboard(
    options: RecognizeImageWorkbenchStoryboardOptions
  ): Promise<ImageWorkbenchStoryboardAiResult> {
    const rawText = toTrimmedString(options.rawText);
    const result = await aiService.runBusinessGenerationTask({
      capability: "chat",
      providerConfigId: options.providerConfigId,
      model: options.model || undefined,
      requestId: createTimestampId("iw-storyboard-ai"),
      prompt: buildStoryboardRecognitionPrompt(rawText),
      options: {
        maxTokens: 8192,
        temperature: 0.1,
      },
    });
    const parsed = parseStoryboardRecognitionText(result.text || "", rawText);
    return {
      ...parsed,
      rawText: result.text || "",
    };
  },

  async generateStoryboard(
    options: GenerateImageWorkbenchStoryboardOptions
  ): Promise<ImageWorkbenchStoryboardAiResult> {
    const direction = toTrimmedString(options.direction);
    const result = await aiService.runBusinessGenerationTask({
      capability: "chat",
      providerConfigId: options.providerConfigId,
      model: options.model || undefined,
      requestId: createTimestampId("iw-storyboard-create"),
      prompt: buildStoryboardGenerationPrompt(direction),
      options: {
        maxTokens: 8192,
        temperature: 0.78,
      },
    });
    const parsed = parseStoryboardRecognitionText(result.text || "");
    const storyboard = parsed.scenes.length ? parsed : buildFallbackGeneratedStoryboard(direction);
    return {
      ...storyboard,
      rawText: result.text || "",
    };
  },
};

function buildStoryboardRecognitionPrompt(rawText: string) {
  return `${STORYBOARD_RECOGNITION_MARKER}
你是 AI 图片工作台的“分镜提示词结构化助手”。你的任务不是生成图片，而是把用户粘贴的任意中文提示词、故事设定、分镜文本、段落说明，整理成图片生成可用的分镜 JSON。

核心规则：
1. 尽量智能识别场景，即使原文没有严格的“01｜标题 / 画面提示词 / 镜头语言 / 情绪关键词”格式，也要按语义拆分。
2. 分镜主体应围绕同一个参考图人物；人物一致性只锁定身份识别点（脸型、五官比例、发型、年龄感、整体气质），不要锁死参考图原本的表情、眼神和姿态。
3. picturePrompt 要像专业影视美术分镜：写清主体调度、动作瞬间、服饰材质、空间层次、光线、天气、前中后景、叙事细节；不要只写关键词。
4. referencePrompt 专门写本镜需要使用或补充的参考素材，例如人物主参考、场景参考、其他人物参考、道具参考、服装参考、风格参考；没有明确素材时写“人物参考图为主，其他参考按画面语义辅助”。
5. 每个分镜都要让表情、神情、姿态、服装、场景、道具、景别和拍摄手法符合本镜剧情，不要把所有分镜写成同一张脸同一表情的换背景。
6. 如果原文有统一正向提示词，放到 prefix；如果没有，保持空字符串。
7. 如果原文有通用负面提示词，放到 negativePrompt；如果没有，保持空字符串。
8. 如果原文有编号、标题或明显段落，请按原顺序逐条保留，不要合并、不要遗漏；标题尽量使用原文标题，例如“01｜初见：柳岸回眸”。
9. 每个 scene 必须有 title、picturePrompt、cameraPrompt、emotionKeywords、referencePrompt。缺失字段可根据上下文补短句，但不要扩写成另一篇文章。
10. scenes 必须是非空数组；至少输出 1 个分镜。
11. 不要输出 Markdown，不要解释，不要代码块，只输出一个 JSON 对象。

必须输出这个 JSON 结构：
{
  "prefix": "统一正向提示词，可为空",
  "negativePrompt": "通用负面提示词，可为空",
  "scenes": [
    {
      "index": 1,
      "title": "分镜标题",
      "picturePrompt": "画面提示词",
      "cameraPrompt": "镜头语言",
      "emotionKeywords": "情绪关键词",
      "referencePrompt": "参考素材要求"
    }
  ]
}

用户原文：
${rawText}`;
}

function buildStoryboardGenerationPrompt(direction: string) {
  return `${STORYBOARD_GENERATION_MARKER}
你是 AI 图片工作台的“短剧小说分镜策划 + 图片提示词导演”。用户会给一个方向、题材、人物设定或关键词，你要主动生成一组适合 AI 图片批量生成的短剧小说视觉分镜 JSON。

创作目标：
1. 生成 8-16 个分镜；如果用户指定数量，以用户指定为准，但最多 24 个。
2. 分镜围绕同一个参考图人物展开，默认主角是参考图人物；人物一致性只锁定身份识别点（脸型、五官比例、发型、年龄感、整体气质），不要锁死参考图原本的表情、眼神和姿态。
3. 故事要有短剧节奏：开场钩子、身份/关系冲突、误会或危机、反击、反转、情绪高潮、封面感收束。
4. 每条分镜都要能直接用于图片生成；表情、神情、动作、服装、场景、道具、景别、拍摄手法和故事氛围必须自然服务本镜剧情。
5. picturePrompt 要专业丰富：主体调度、动作瞬间、服饰材质、空间层次、前中后景、光线、天气、环境叙事细节都要明确。
6. cameraPrompt 要像导演分镜：景别、机位、焦段、构图、光线方向、运动感或前景遮挡。
7. referencePrompt 必须写清本镜需要参考或补充的素材：人物主参考、场景参考、其他人物参考、道具参考、服装参考、风格参考；没有明确素材时也要给出合理建议。
8. prefix 统一放“身份一致但表演随分镜变化”的正向前缀；negativePrompt 统一放避免换脸、现代元素、低质、畸形、表情僵硬、所有分镜同表情等负面词。
9. scenes 必须是非空数组；至少输出 8 个分镜。
10. 不要输出 Markdown，不要解释，不要代码块，只输出一个 JSON 对象。

必须输出这个 JSON 结构：
{
  "prefix": "统一正向提示词",
  "negativePrompt": "通用负面提示词",
  "scenes": [
    {
      "index": 1,
      "title": "短而有画面感的分镜标题",
      "picturePrompt": "画面提示词",
      "cameraPrompt": "镜头语言",
      "emotionKeywords": "情绪关键词",
      "referencePrompt": "参考素材要求"
    }
  ]
}

用户给的方向：
${direction}`;
}

function parseStoryboardRecognitionText(
  text: string,
  fallbackText = ""
): Omit<ImageWorkbenchStoryboardAiResult, "rawText"> {
  const candidates = buildJsonCandidates(text);
  for (const candidate of candidates) {
    const parsed = tryJsonParse<unknown>(candidate);
    if (!parsed.ok) {
      continue;
    }
    const result = normalizeStoryboardRecognitionPayload(parsed.data);
    if (result.scenes.length) {
      return result;
    }
  }
  const textResult = parseStoryboardPlainText(text);
  if (textResult.scenes.length) {
    return textResult;
  }
  const fallbackResult = parseStoryboardPlainText(fallbackText);
  if (fallbackResult.scenes.length) {
    return fallbackResult;
  }
  return {
    prefix: "",
    negativePrompt: "",
    scenes: [],
  };
}

function buildJsonCandidates(text: string) {
  const source = String(text || "").trim();
  const candidates = new Set<string>();
  if (source) {
    candidates.add(source);
    candidates.add(normalizeLooseJsonText(source));
  }

  for (const match of source.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    candidates.add(match[1].trim());
    candidates.add(normalizeLooseJsonText(match[1].trim()));
  }

  const objectStart = source.indexOf("{");
  const objectEnd = source.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.add(source.slice(objectStart, objectEnd + 1));
    candidates.add(normalizeLooseJsonText(source.slice(objectStart, objectEnd + 1)));
  }

  const arrayStart = source.indexOf("[");
  const arrayEnd = source.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.add(source.slice(arrayStart, arrayEnd + 1));
    candidates.add(normalizeLooseJsonText(source.slice(arrayStart, arrayEnd + 1)));
  }

  return [...candidates].filter(Boolean);
}

function normalizeLooseJsonText(text: string) {
  return String(text || "")
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

function normalizeStoryboardRecognitionPayload(value: unknown): Omit<ImageWorkbenchStoryboardAiResult, "rawText"> {
  const root = findStoryboardPayloadRoot(value);
  const scenesValue = readSceneItems(root, [
    "scenes",
    "scene",
    "storyboards",
    "storyboardScenes",
    "storyboard_scenes",
    "shots",
    "items",
    "list",
    "分镜",
    "分镜列表",
    "镜头列表",
  ]);
  const scenes = scenesValue
    .map((item, index) => normalizeStoryboardRecognitionScene(item, index))
    .filter((scene): scene is ImageWorkbenchStoryboardAiScene =>
      Boolean(scene && scene.title && scene.picturePrompt)
    );

  return {
    prefix: readString(root, [
      "prefix",
      "commonPrefix",
      "common_prefix",
      "positivePrompt",
      "positive_prompt",
      "统一正向提示词",
      "通用正向提示词",
    ]),
    negativePrompt: readString(root, [
      "negativePrompt",
      "negative_prompt",
      "commonNegativePrompt",
      "common_negative_prompt",
      "negative",
      "通用负面提示词",
      "负面提示词",
    ]),
    scenes,
  };
}

function findStoryboardPayloadRoot(value: unknown): AnyRecord {
  if (Array.isArray(value)) {
    return { scenes: value };
  }
  if (!isRecord(value)) {
    return {};
  }
  if (readSceneItems(value, ["scenes", "scene", "storyboards", "shots", "items", "分镜", "分镜列表"]).length) {
    return value;
  }

  for (const key of ["storyboard", "result", "data", "payload", "content", "response"]) {
    const child = value[key];
    if (!child) {
      continue;
    }
    const root = findStoryboardPayloadRoot(child);
    if (readSceneItems(root, ["scenes", "scene", "storyboards", "shots", "items", "分镜", "分镜列表"]).length) {
      return {
        ...value,
        ...root,
      };
    }
  }

  if (recordLooksLikeSceneMap(value)) {
    return { scenes: Object.values(value) };
  }

  return value;
}

function normalizeStoryboardRecognitionScene(
  value: unknown,
  index: number
): ImageWorkbenchStoryboardAiScene | null {
  const record = isRecord(value) ? value : {};
  const title = readString(record, ["title", "name", "sceneTitle", "scene_title", "caption", "标题", "分镜标题"]);
  const picturePrompt = readString(record, [
    "picturePrompt",
    "picture_prompt",
    "imagePrompt",
    "image_prompt",
    "visualPrompt",
    "visual_prompt",
    "prompt",
    "description",
    "画面提示词",
    "画面提示",
    "画面",
    "提示词",
  ]);
  const cameraPrompt = readString(record, [
    "cameraPrompt",
    "camera_prompt",
    "cameraLanguage",
    "camera_language",
    "camera",
    "lens",
    "shot",
    "镜头语言",
    "镜头",
  ]);
  const emotionKeywords = readString(record, [
    "emotionKeywords",
    "emotion_keywords",
    "emotion",
    "mood",
    "keywords",
    "情绪关键词",
    "情绪",
  ]);
  const referencePrompt = readString(record, [
    "referencePrompt",
    "reference_prompt",
    "referenceRequirements",
    "reference_requirements",
    "reference",
    "materials",
    "参考素材要求",
    "参考图要求",
    "参考素材",
    "参考要求",
  ]);
  const sceneIndex = Number(readValue(record, ["index", "sceneIndex", "序号"])) || index + 1;

  if (!title && !picturePrompt) {
    return null;
  }

  return {
    index: sceneIndex,
    title: title || `分镜 ${String(sceneIndex).padStart(2, "0")}`,
    picturePrompt,
    cameraPrompt,
    emotionKeywords,
    referencePrompt,
  };
}

function parseStoryboardPlainText(text: string): Omit<ImageWorkbenchStoryboardAiResult, "rawText"> {
  const source = String(text || "").trim();
  if (!source) {
    return emptyStoryboardResult();
  }

  const prefix = extractPlainTextPrefix(source);
  const negativePrompt = extractPlainTextNegativePrompt(source);
  const scenes = splitPlainTextScenes(source)
    .map((block, index) => normalizePlainTextScene(block, index))
    .filter((scene): scene is ImageWorkbenchStoryboardAiScene =>
      Boolean(scene && scene.title && scene.picturePrompt)
    );

  return {
    prefix,
    negativePrompt,
    scenes,
  };
}

function emptyStoryboardResult(): Omit<ImageWorkbenchStoryboardAiResult, "rawText"> {
  return {
    prefix: "",
    negativePrompt: "",
    scenes: [],
  };
}

function buildFallbackGeneratedStoryboard(direction: string): Omit<ImageWorkbenchStoryboardAiResult, "rawText"> {
  const theme = toTrimmedString(direction, "古风女主短剧分镜");
  const beats = [
    ["初见钩子", "主角在命运转折的场景中首次登场，衣袂被风吹起，眼神带着克制与警惕，环境细节暗示她即将卷入一场关系与身份冲突。", "中近景，三分之二侧脸，前景遮挡，柔焦背景，人物眼神为视觉中心。", "初见、悬念、清冷、命运感"],
    ["身份暗线", "主角独自面对一件能揭开身份秘密的关键道具，服装更精致但姿态压低，画面里有信笺、玉佩、烛火或旧物作为叙事线索。", "俯拍与近景结合，道具占据前景，烛火侧光勾勒脸部轮廓。", "隐忍、秘密、试探、暗流"],
    ["关系冲突", "主角置身人群或权力场，保持端正姿态却被周围关系压迫，服饰、站位和背景层次体现身份落差与情绪张力。", "长焦压缩空间，人物清晰突出，远处人群虚化形成压迫感。", "克制、对峙、误会、压迫"],
    ["雨夜危机", "主角在雨夜或冷色场景中被迫行动，衣摆沾湿，手中握着关键物件，表情紧张但坚定，背景有追逐、灯影或危险暗示。", "低机位跟拍，全身动态镜头，雨滴前景虚化，街灯反射在地面。", "危机、逃亡、决绝、孤身"],
    ["反击前夜", "主角回到安静室内或书房，展开地图、密信或证物，神情逐渐冷静，服装从柔弱转向利落，画面表现她开始掌控局势。", "俯拍构图，桌面道具作为前景引导线，人物低眸但气场稳定。", "清醒、谋略、反击、掌控"],
    ["高光觉醒", "主角在风雪、战场、宫阶或庭院中完成气质转变，服饰更有力量感，动作利落，光影形成强轮廓，背景带有故事高潮元素。", "广角史诗感，低机位轻微仰拍，风吹衣袂动态抓拍。", "觉醒、孤勇、锋芒、悲壮"],
    ["反转胜局", "主角面对曾经压迫她的人或象征权力的空间，神情冷静，动作极少但压迫感强，画面突出胜利后的克制与代价。", "正面近景或背影远景，中心构图，强明暗对比，背景虚实交叠。", "反转、权力、冷静、代价"],
    ["封面收束", "主角立于象征整段故事的场景中，手持关键道具，身后隐约出现故事中的地点、情绪和冲突元素，形成小说封面般的最终定格。", "正面半身大特写，强轮廓光，人物居中封面构图，背景叙事元素虚化。", "传奇、宿命、封面感、新生"],
  ];

  return {
    prefix: STORYBOARD_AI_DEFAULT_PREFIX,
    negativePrompt: STORYBOARD_AI_DEFAULT_NEGATIVE_PROMPT,
    scenes: beats.map(([title, picturePrompt, cameraPrompt, emotionKeywords], index) => ({
      index: index + 1,
      title: `${String(index + 1).padStart(2, "0")}｜${title}`,
      picturePrompt: `围绕“${theme}”：${picturePrompt}`,
      cameraPrompt,
      emotionKeywords,
      referencePrompt: "人物参考图为主，按本镜语义补充场景、服装、道具、氛围和其他人物关系参考。",
    })),
  };
}

function splitPlainTextScenes(source: string) {
  const headingPattern =
    /(?:^|\n)[ \t]*(?:#{1,6}[ \t]*)?(?:分镜|场景|镜头|Scene|Shot)?[ \t]*(\d{1,3})[ \t]*(?:[｜|、.．:：-]|$)[ \t]*([^\n]*)/gi;
  const matches = [...source.matchAll(headingPattern)].filter((match) =>
    isUsablePlainTextSceneHeading(match[0])
  );
  if (matches.length) {
    return matches.map((match, index) => {
      const start = match.index || 0;
      const end = matches[index + 1]?.index ?? source.length;
      return source.slice(start, end);
    });
  }

  const paragraphBlocks = source
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter((block) => block.length >= 24);
  if (paragraphBlocks.length > 1) {
    return paragraphBlocks;
  }

  return [];
}

function isUsablePlainTextSceneHeading(value: string) {
  const clean = value.trim();
  return !/^(?:\d{1,3})[）)]?$/.test(clean) && !/^\d{4}[-/年]/.test(clean);
}

function normalizePlainTextScene(block: string, index: number): ImageWorkbenchStoryboardAiScene | null {
  const cleanBlock = stripNonSceneSections(block);
  const heading = readPlainTextHeading(cleanBlock, index);
  const body = heading.body;
  const picturePrompt =
    readPlainTextLabel(body, ["画面提示词", "画面提示", "画面", "图片提示词", "视觉提示", "视觉画面"]) ||
    cleanSceneBody(removePlainTextLabels(body));
  const cameraPrompt = readPlainTextLabel(body, ["镜头语言", "镜头", "机位", "导演词", "镜头角度"]);
  const emotionKeywords = readPlainTextLabel(body, ["情绪关键词", "情绪", "氛围关键词", "关键词"]);
  const referencePrompt = readPlainTextLabel(body, [
    "参考素材要求",
    "参考图要求",
    "参考要求",
    "参考素材",
    "参考图",
  ]);

  if (!heading.title && !picturePrompt) {
    return null;
  }

  return {
    index: heading.index,
    title: heading.title || `分镜 ${String(heading.index).padStart(2, "0")}`,
    picturePrompt,
    cameraPrompt,
    emotionKeywords,
    referencePrompt,
  };
}

function readPlainTextHeading(block: string, fallbackIndex: number) {
  const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const firstLine = lines[0] || "";
  const match = firstLine.match(
    /^(?:#{1,6}\s*)?(?:分镜|场景|镜头|Scene|Shot)?\s*(\d{1,3})\s*(?:[｜|、.．:：-])?\s*(.*)$/i
  );
  const index = Number(match?.[1]) || fallbackIndex + 1;
  const title = cleanSceneText(match?.[2] || firstLine.replace(/^#{1,6}\s*/, ""));
  const body = match ? lines.slice(1).join("\n") : lines.join("\n");
  return {
    index,
    title: title || `分镜 ${String(index).padStart(2, "0")}`,
    body,
  };
}

function readPlainTextLabel(block: string, labels: string[]) {
  for (const label of labels) {
    const value = readPlainTextLabelValue(block, label);
    if (value) {
      return value;
    }
  }
  return "";
}

function readPlainTextLabelValue(block: string, label: string) {
  const labelAlternation = [
    "画面提示词",
    "画面提示",
    "画面",
    "图片提示词",
    "视觉提示",
    "视觉画面",
    "镜头语言",
    "镜头",
    "机位",
    "导演词",
    "镜头角度",
    "情绪关键词",
    "情绪",
    "氛围关键词",
    "关键词",
    "参考素材要求",
    "参考图要求",
    "参考要求",
    "参考素材",
    "参考图",
  ]
    .map(escapeRegExp)
    .join("|");
  const pattern = new RegExp(
    `(?:^|\\n)[ \\t]*(?:[-*]\\s*)?${escapeRegExp(label)}[ \\t]*[：:][ \\t]*([\\s\\S]*?)(?=\\n[ \\t]*(?:[-*]\\s*)?(?:${labelAlternation})[ \\t]*[：:]|$)`,
    "i"
  );
  const match = block.match(pattern);
  return cleanSceneBody(match?.[1] || "");
}

function removePlainTextLabels(block: string) {
  return block.replace(
    /(?:^|\n)[ \t]*(?:[-*]\s*)?(?:画面提示词|画面提示|画面|图片提示词|视觉提示|视觉画面|镜头语言|镜头|机位|导演词|镜头角度|情绪关键词|情绪|氛围关键词|关键词|参考素材要求|参考图要求|参考要求|参考素材|参考图)[ \t]*[：:][ \t]*/g,
    "\n"
  );
}

function stripNonSceneSections(block: string) {
  const match = block.match(
    /\n[ \t]*(?:通用负面提示词|负面提示词|镜头角度可替换词|统一正向提示词|通用正向提示词|整体人物弧线|拆分规则|使用方式)[ \t]*[：:]?/
  );
  return match?.index === undefined ? block : block.slice(0, match.index);
}

function extractPlainTextPrefix(source: string) {
  const match = source.match(
    /(?:统一正向提示词|通用正向提示词|统一前缀|前缀词|每条提示词前统一加上)[\s\S]{0,80}?[：:]\s*(?:\n\s*)?[“"']?([\s\S]{12,600}?)(?=\n\s*(?:通用负面提示词|负面提示词|\d{1,3}\s*[｜|、.．:：-]|分镜\s*\d{1,3}|场景\s*\d{1,3}|镜头\s*\d{1,3})|$)/
  );
  return cleanSceneBody(match?.[1] || "");
}

function extractPlainTextNegativePrompt(source: string) {
  const match = source.match(
    /(?:通用负面提示词|负面提示词|通用反向提示词|反向提示词)[\s\S]{0,80}?[：:]\s*(?:\n\s*)?([\s\S]{8,800}?)(?=\n\s*(?:镜头角度可替换词|\d{1,3}\s*[｜|、.．:：-]|分镜\s*\d{1,3}|场景\s*\d{1,3}|镜头\s*\d{1,3})|$)/
  );
  return cleanSceneBody(match?.[1] || "");
}

function cleanSceneBody(value: string) {
  return cleanSceneText(value)
    .replace(/^可以加在每条后面[：:]?/i, "")
    .replace(/^画面提示词[：:]?/i, "")
    .trim();
}

function cleanSceneText(value: string) {
  return String(value || "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/[“”]/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function readString(record: AnyRecord, keys: string[]) {
  const value = readValue(record, keys);
  if (Array.isArray(value)) {
    return value.map((item) => toTrimmedString(item)).filter(Boolean).join("，");
  }
  return toTrimmedString(value);
}

function readSceneItems(record: AnyRecord, keys: string[]) {
  const value = readValue(record, keys);
  if (Array.isArray(value)) {
    return value;
  }
  if (isRecord(value)) {
    return Object.values(value);
  }
  if (!value && recordLooksLikeSceneMap(record)) {
    return Object.values(record);
  }
  return [];
}

function readValue(record: AnyRecord, keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function recordLooksLikeSceneMap(record: AnyRecord) {
  const values = Object.values(record);
  if (!values.length) {
    return false;
  }
  return values.some((value) => {
    if (!isRecord(value)) {
      return false;
    }
    return Boolean(
      readString(value, ["picturePrompt", "imagePrompt", "prompt", "画面提示词", "画面", "提示词"]) ||
        readString(value, ["title", "name", "标题", "分镜标题"])
    );
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
