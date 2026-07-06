export const IMAGE_WORKBENCH_STORYBOARD_VARIANTS_PER_SCENE = 4;

export const IMAGE_WORKBENCH_STORYBOARD_DEFAULT_PREFIX =
  "参考图只用于主角身份识别：脸型、五官比例、发型、年龄感和整体气质保持一致，不复制参考图的固定表情和姿态；古风美女，电影级画面，东方审美，高级古装摄影，真实光影，精致服饰纹理，服装材质清晰，环境层次完整，叙事感强，画面完成度高。";

export const IMAGE_WORKBENCH_STORYBOARD_DEFAULT_NEGATIVE_PROMPT =
  "不要改变参考图人物五官，不要换脸，不要现代妆容，不要欧美五官，不要夸张网红脸，不要塑料皮肤，不要过度磨皮，不要表情僵硬，不要所有分镜同一表情同一姿态，不要畸形手指，不要多手多脚，不要低清晰度，不要廉价影楼风，不要现代建筑，不要现代服饰，不要文字水印，不要模糊面部，不要错误服装时代，不要道具穿帮，不要背景混乱，不要多人身份混淆。";

const IMAGE_WORKBENCH_STORYBOARD_IDENTITY_RULE =
  "人物一致性只锁定身份识别点：脸型、五官比例、发型、年龄感和整体气质保持参考图一致；不要复制参考图的固定表情、眼神和姿态，表情、神情、动作和身体状态必须跟随当前分镜情绪自然变化。";

const IMAGE_WORKBENCH_STORYBOARD_REFERENCE_RULE =
  "参考图使用原则：人物参考用于锁定主角身份，不锁定表演和构图；场景参考用于空间、建筑、天气和光线；道具参考用于关键物件形态与材质；服装/风格参考用于时代感、衣料、纹样和配色；其他人物只作为配角关系参考，不得覆盖主角五官。";

const IMAGE_WORKBENCH_STORYBOARD_DIRECTOR_RULE =
  "以影视分镜标准组织画面，明确主体调度、动作瞬间、空间层次、前中后景关系、主光方向、氛围色彩、镜头焦段、景别和拍摄手法，让每张图像像同一部古风电影中的连续剧照，而不是同一张表情照的换背景。";

const STORYBOARD_HEADING_PATTERN = /^[ \t]*(\d{1,3})[ \t]*[｜|][ \t]*(.+?)[ \t]*$/gm;
const STORYBOARD_LABELS = ["画面提示词", "镜头语言", "情绪关键词", "参考图要求", "参考素材", "参考要求"];
const STORYBOARD_TRAILING_SECTION_PATTERN =
  /\n[ \t]*(?:通用负面提示词|镜头角度可替换词|这些提示词可以直接|整体人物弧线)/;

export interface ImageWorkbenchStoryboardScene {
  index: number;
  title: string;
  picturePrompt: string;
  cameraPrompt: string;
  emotionKeywords: string;
  referencePrompt: string;
  prompt: string;
}

export interface ImageWorkbenchStoryboardBatch {
  prefix: string;
  negativePrompt: string;
  variantsPerScene: number;
  jobPrompt: string;
  scenes: ImageWorkbenchStoryboardScene[];
  taskPrompts: string[];
  taskMetas: ImageWorkbenchStoryboardTaskMeta[];
  generationOptions: ImageWorkbenchStoryboardGenerationOptions | null;
}

export interface ImageWorkbenchStoryboardSceneInput {
  index: number;
  title: string;
  picturePrompt: string;
  cameraPrompt?: string;
  emotionKeywords?: string;
  referencePrompt?: string;
}

export interface ImageWorkbenchStoryboardTaskMeta {
  taskIndex: number;
  sceneIndex: number;
  sceneTitle: string;
  variantIndex: number;
  referencePrompt: string;
}

export interface ImageWorkbenchStoryboardGenerationOptions {
  version: 1;
  type: "storyboard";
  variantsPerScene: number;
  sceneCount: number;
  scenes: Array<{
    index: number;
    title: string;
    taskStartIndex: number;
    taskCount: number;
    referencePrompt: string;
  }>;
}

export function parseImageWorkbenchStoryboardPrompt(
  rawText: string,
  variantsPerScene = IMAGE_WORKBENCH_STORYBOARD_VARIANTS_PER_SCENE
): ImageWorkbenchStoryboardBatch {
  const source = String(rawText || "");
  const variants = normalizeVariantsPerScene(variantsPerScene);
  const prefix = extractStoryboardPrefix(source);
  const negativePrompt = extractStoryboardNegativePrompt(source);
  return buildImageWorkbenchStoryboardBatch({
    prefix,
    negativePrompt,
    scenes: parseStoryboardScenes(source, prefix),
    variantsPerScene: variants,
  });
}

export function buildImageWorkbenchStoryboardBatch(options: {
  prefix?: string;
  negativePrompt?: string;
  scenes: ImageWorkbenchStoryboardSceneInput[];
  variantsPerScene?: number;
}): ImageWorkbenchStoryboardBatch {
  const prefix = cleanPromptText(options.prefix || IMAGE_WORKBENCH_STORYBOARD_DEFAULT_PREFIX);
  const negativePrompt = cleanPromptText(options.negativePrompt || IMAGE_WORKBENCH_STORYBOARD_DEFAULT_NEGATIVE_PROMPT);
  const variants = normalizeVariantsPerScene(options.variantsPerScene || IMAGE_WORKBENCH_STORYBOARD_VARIANTS_PER_SCENE);
  const scenes = options.scenes
    .map((scene, index) => {
      const title = cleanPromptText(scene.title);
      const picturePrompt = cleanPromptText(scene.picturePrompt);
      const cameraPrompt = cleanPromptText(scene.cameraPrompt || "");
      const emotionKeywords = cleanPromptText(scene.emotionKeywords || "");
      const referencePrompt = cleanPromptText(scene.referencePrompt || "");
      const sceneIndex = Number(scene.index) || index + 1;
      return {
        index: sceneIndex,
        title,
        picturePrompt,
        cameraPrompt,
        emotionKeywords,
        referencePrompt,
        prompt: buildScenePrompt({
          prefix,
          index: sceneIndex,
          title,
          picturePrompt,
          cameraPrompt,
          emotionKeywords,
          referencePrompt,
        }),
      };
    })
    .filter((scene) => Boolean(scene.title && scene.picturePrompt && scene.prompt));
  const taskPrompts: string[] = [];
  const taskMetas: ImageWorkbenchStoryboardTaskMeta[] = [];
  const generationScenes: ImageWorkbenchStoryboardGenerationOptions["scenes"] = [];
  scenes.forEach((scene) => {
    const taskStartIndex = taskPrompts.length;
    generationScenes.push({
      index: scene.index,
      title: scene.title,
      taskStartIndex,
      taskCount: variants,
      referencePrompt: scene.referencePrompt,
    });
    Array.from({ length: variants }, (_, index) => {
      const taskIndex = taskPrompts.length;
      taskPrompts.push(
        `${scene.prompt} 候选图 ${index + 1}/${variants}：保持主角身份一致，但不要锁定参考图表情；根据本镜情绪关键词调整表情、眼神、姿态、服装细节、场景道具、景别、光影、景深和构图，输出可用于筛选的高质量候选。`
      );
      taskMetas.push({
        taskIndex,
        sceneIndex: scene.index,
        sceneTitle: scene.title,
        variantIndex: index + 1,
        referencePrompt: scene.referencePrompt,
      });
    });
  });

  return {
    prefix,
    negativePrompt,
    variantsPerScene: variants,
    jobPrompt: scenes.length
      ? `古风女主视觉分镜批量生成（${scenes.length} 个分镜，每个 ${variants} 张候选图）`
      : "",
    scenes,
    taskPrompts,
    taskMetas,
    generationOptions: scenes.length
      ? {
          version: 1,
          type: "storyboard",
          variantsPerScene: variants,
          sceneCount: scenes.length,
          scenes: generationScenes,
        }
      : null,
  };
}

export function hasImageWorkbenchStoryboardPrompt(rawText: string) {
  return parseImageWorkbenchStoryboardPrompt(rawText).scenes.length > 0;
}

function parseStoryboardScenes(source: string, prefix: string): ImageWorkbenchStoryboardScene[] {
  const matches = Array.from(source.matchAll(STORYBOARD_HEADING_PATTERN));
  return matches
    .map((match, matchIndex) => {
      const start = (match.index || 0) + match[0].length;
      const end = matches[matchIndex + 1]?.index ?? source.length;
      const block = trimStoryboardTrailingSections(source.slice(start, end));
      const index = Number(match[1]) || matchIndex + 1;
      const title = cleanPromptText(match[2]);
      const picturePrompt = extractLabeledBlock(block, "画面提示词");
      const cameraPrompt = extractLabeledBlock(block, "镜头语言");
      const emotionKeywords = extractLabeledBlock(block, "情绪关键词");
      const referencePrompt =
        extractLabeledBlock(block, "参考图要求") ||
        extractLabeledBlock(block, "参考素材") ||
        extractLabeledBlock(block, "参考要求");
      const fallbackPrompt = cleanPromptText(removeStoryboardLabels(block));
      const prompt = buildScenePrompt({
        prefix,
        index,
        title,
        picturePrompt: picturePrompt || fallbackPrompt,
        cameraPrompt,
        emotionKeywords,
        referencePrompt,
      });
      return {
        index,
        title,
        picturePrompt,
        cameraPrompt,
        emotionKeywords,
        referencePrompt,
        prompt,
      };
    })
    .filter((scene) => Boolean(scene.title && scene.prompt));
}

function buildScenePrompt(scene: {
  prefix: string;
  index: number;
  title: string;
  picturePrompt: string;
  cameraPrompt: string;
  emotionKeywords: string;
  referencePrompt: string;
}) {
  return [
    `统一正向提示词：${scene.prefix}`,
    `分镜编号与标题：${String(scene.index).padStart(2, "0")}｜${scene.title}`,
    `画面设计：${scene.picturePrompt}`,
    scene.referencePrompt ? `参考素材要求：${scene.referencePrompt}` : "",
    scene.cameraPrompt ? `镜头语言：${scene.cameraPrompt}` : "",
    scene.emotionKeywords ? `情绪关键词：${scene.emotionKeywords}` : "",
    IMAGE_WORKBENCH_STORYBOARD_IDENTITY_RULE,
    IMAGE_WORKBENCH_STORYBOARD_REFERENCE_RULE,
    IMAGE_WORKBENCH_STORYBOARD_DIRECTOR_RULE,
  ]
    .map(cleanPromptText)
    .filter(Boolean)
    .join(" ");
}

function extractLabeledBlock(block: string, label: string) {
  const labelAlternation = STORYBOARD_LABELS.map(escapeRegExp).join("|");
  const pattern = new RegExp(
    `(?:^|\\n)[ \\t]*${escapeRegExp(label)}[ \\t]*[：:][ \\t]*([\\s\\S]*?)(?=\\n[ \\t]*(?:${labelAlternation})[ \\t]*[：:]|\\n[ \\t]*(?:通用负面提示词|镜头角度可替换词|这些提示词可以直接|整体人物弧线)|$)`,
    "i"
  );
  const match = block.match(pattern);
  return cleanPromptText(match?.[1] || "");
}

function removeStoryboardLabels(block: string) {
  return STORYBOARD_LABELS.reduce(
    (value, label) => value.replace(new RegExp(`${escapeRegExp(label)}\\s*[：:]`, "g"), ""),
    block
  );
}

function trimStoryboardTrailingSections(block: string) {
  const match = block.match(STORYBOARD_TRAILING_SECTION_PATTERN);
  return match?.index === undefined ? block : block.slice(0, match.index);
}

function extractStoryboardPrefix(source: string) {
  const inlineMatch = source.match(
    /(?:每条提示词前统一加上|统一正向提示词|通用正向提示词|统一提示词|正向前缀)[\s\S]{0,60}?[：:]\s*\n?\s*[“"']?([^\n“”"']{12,})[”"']?/
  );
  const value = cleanPromptText(inlineMatch?.[1] || "");
  return value || IMAGE_WORKBENCH_STORYBOARD_DEFAULT_PREFIX;
}

function extractStoryboardNegativePrompt(source: string) {
  const sectionMatch = source.match(/通用负面提示词([\s\S]*?)(?=\n\s*镜头角度|\n\s*\d{1,3}\s*[｜|]|$)/);
  if (sectionMatch) {
    const lines = sectionMatch[1]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const startIndex = lines.findIndex((line) => line.includes("不要"));
    if (startIndex >= 0) {
      const value = cleanPromptText(lines.slice(startIndex).join(" "));
      if (value) {
        return value;
      }
    }
  }

  const inlineMatch = source.match(/(?:通用负面提示词|负面提示词|通用反向提示词|反向提示词)\s*[：:]\s*([^\n]+)/);
  const value = cleanPromptText(inlineMatch?.[1] || "");
  return value || IMAGE_WORKBENCH_STORYBOARD_DEFAULT_NEGATIVE_PROMPT;
}

function cleanPromptText(value: string) {
  return String(value || "")
    .replace(/[“”]/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeVariantsPerScene(value: number) {
  const normalized = Math.floor(Number(value) || IMAGE_WORKBENCH_STORYBOARD_VARIANTS_PER_SCENE);
  return Math.max(1, Math.min(8, normalized));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
