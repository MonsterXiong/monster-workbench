pub struct ImageWorkbenchPromptBuildContext<'a> {
    pub mode: &'a str,
    pub reference_count: usize,
    pub has_source: bool,
    pub person_context_json: Option<&'a str>,
}

pub fn build_image_workbench_task_prompt(
    prompt: &str,
    index: u32,
    context: &ImageWorkbenchPromptBuildContext<'_>,
) -> String {
    let clean_prompt = prompt.trim();
    let analysis = analyze_prompt(clean_prompt);
    let variation = PROMPT_VARIATION_DIMENSIONS[index as usize % PROMPT_VARIATION_DIMENSIONS.len()];
    let mut requirements = vec!["主体明确、细节丰富、构图完整、无文字水印".to_string()];
    requirements.extend(reference_requirements(context));
    if needs_hand_guard(clean_prompt) {
        requirements.push("手部结构自然，只保留动作需要的手和手指，避免多余手、融合手、断指、畸形手；如果握持道具，手指需要自然包裹道具且边界清楚".to_string());
    }
    format!(
        "{clean_prompt}。保持核心语义和高权重关键词不变：{}。差异化方向：{}。画面要求：{}。",
        analysis.core_constraints.join("、"),
        variation,
        requirements.join("；")
    )
}

#[derive(Debug)]
struct PromptAnalysis {
    core_constraints: Vec<String>,
}

fn analyze_prompt(prompt: &str) -> PromptAnalysis {
    let mut core_constraints = split_prompt_terms(prompt);
    if core_constraints.is_empty() {
        core_constraints.push(prompt.trim().to_string());
    }
    PromptAnalysis { core_constraints }
}

fn split_prompt_terms(prompt: &str) -> Vec<String> {
    let separators = [
        '，', ',', '。', '.', '、', ';', '；', '|', '/', '\\', '\n', '\r', '\t', ' ',
    ];
    let mut terms = prompt
        .split(|ch| separators.contains(&ch))
        .map(str::trim)
        .filter(|term| !term.is_empty())
        .map(|term| term.chars().take(32).collect::<String>())
        .collect::<Vec<_>>();
    if terms.is_empty() && !prompt.trim().is_empty() {
        terms.push(prompt.trim().chars().take(32).collect());
    }
    terms.truncate(8);
    terms
}

fn reference_requirements(context: &ImageWorkbenchPromptBuildContext<'_>) -> Vec<String> {
    let mode = context.mode.trim();
    let reference_count = context.reference_count + usize::from(context.has_source);
    if !matches!(mode, "img2img" | "person_consistency") || reference_count == 0 {
        return Vec::new();
    }
    let role_requirements = reference_role_requirements(context.person_context_json);
    if !role_requirements.is_empty() {
        return role_requirements;
    }
    if mode == "person_consistency" {
        return vec![
            "参考图1优先用于人物身份锚点：骨相、脸型轮廓、五官间距与比例、发际线、发型、年龄感、肤色和整体气质；不锁定参考图原本的表情、眼神、头部角度和姿态，表情变化只能改变肌肉状态与情绪，不能改变身份锚点；其他参考图只作为道具、场景、服装或风格辅助，不替换人物主体".to_string(),
        ];
    }
    if reference_count >= 2 || context.person_context_json.is_some() {
        return vec![
            "按参考图顺序理解角色：参考图1为主体身份锚点，锁定骨相、脸型轮廓、五官比例、发型、年龄感和气质但不锁定表情、眼神、头部角度和姿态；参考图2为道具或动作辅助，参考图3及以后为场景、服装或风格辅助，镜头景别和拍摄手法优先服从当前分镜，避免互相替换".to_string(),
        ];
    }
    vec!["保持参考图主体身份锚点和主要结构，不复制固定表情和姿态，表情、眼神、服装、场景、景别和拍摄手法按提示词自然变化".to_string()]
}

fn reference_role_requirements(person_context_json: Option<&str>) -> Vec<String> {
    parse_reference_roles(person_context_json)
        .into_iter()
        .map(|item| match item.role {
            ReferenceRole::Person => format!(
                "参考图{}只用于人物身份锚点：骨相、脸型轮廓、五官间距与比例、发际线、发型、年龄感、肤色和气质；不锁定表情、眼神、头部角度、姿态、服装和背景，分镜需要的情绪变化不能改写身份锚点",
                item.index
            ),
            ReferenceRole::Prop => format!(
                "参考图{}只用于道具外观、材质、比例和细节，不替换人物主体",
                item.index
            ),
            ReferenceRole::Scene => format!(
                "参考图{}只用于场景空间、光线、背景和环境氛围，不改变人物身份",
                item.index
            ),
            ReferenceRole::Style => format!(
                "参考图{}只用于画面风格、色彩、构图和质感，不复制具体主体",
                item.index
            ),
        })
        .collect()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ReferenceRole {
    Person,
    Prop,
    Scene,
    Style,
}

#[derive(Debug, Clone, Copy)]
struct ReferenceRoleItem {
    index: usize,
    role: ReferenceRole,
}

fn parse_reference_roles(person_context_json: Option<&str>) -> Vec<ReferenceRoleItem> {
    let Some(raw) = person_context_json
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return Vec::new();
    };
    let Ok(value) = serde_json::from_str::<serde_json::Value>(raw) else {
        return Vec::new();
    };
    let Some(items) = value.get("referenceRoles").and_then(|item| item.as_array()) else {
        return Vec::new();
    };
    items
        .iter()
        .enumerate()
        .filter_map(|(fallback_index, item)| {
            let role = item
                .get("role")
                .and_then(|value| value.as_str())
                .and_then(parse_reference_role)?;
            let index = item
                .get("index")
                .and_then(|value| value.as_u64())
                .map(|value| value as usize)
                .filter(|value| *value > 0)
                .unwrap_or(fallback_index + 1);
            Some(ReferenceRoleItem { index, role })
        })
        .collect()
}

fn parse_reference_role(value: &str) -> Option<ReferenceRole> {
    match value.trim() {
        "person" => Some(ReferenceRole::Person),
        "prop" => Some(ReferenceRole::Prop),
        "scene" => Some(ReferenceRole::Scene),
        "style" => Some(ReferenceRole::Style),
        _ => None,
    }
}

fn needs_hand_guard(prompt: &str) -> bool {
    let lower = prompt.to_ascii_lowercase();
    let chinese_markers = [
        "手", "拿", "握", "持", "道具", "玩耍", "抱", "托", "举", "指", "人物", "人像", "角色",
    ];
    chinese_markers.iter().any(|marker| prompt.contains(marker))
        || lower.contains("hand")
        || lower.contains("hold")
        || lower.contains("holding")
        || lower.contains("prop")
        || lower.contains("person")
        || lower.contains("portrait")
        || lower.contains("character")
}

pub fn image_workbench_default_negative_constraints(prompt: &str) -> Vec<&'static str> {
    let mut values = vec!["低质量", "文字", "水印", "主体错误", "构图混乱"];
    let lower = prompt.to_ascii_lowercase();
    let is_person_prompt = prompt.contains("人")
        || prompt.contains("脸")
        || prompt.contains("美女")
        || lower.contains("portrait")
        || lower.contains("person")
        || lower.contains("character");
    if is_person_prompt {
        values.extend([
            "未成年感",
            "过度暴露",
            "换脸",
            "身份漂移",
            "脸部畸形",
            "五官比例漂移",
            "多余手指",
            "多余手臂",
            "畸形手",
        ]);
    }
    if needs_hand_guard(prompt) {
        values.extend(["多余的手", "融合手部", "断指", "错误握持", "手指粘连"]);
    }
    values
}

const PROMPT_VARIATION_DIMENSIONS: [&str; 8] = [
    "近景构图，强调主体质感和细节",
    "远景构图，强调环境层次和空间关系",
    "低角度视角，增强力量感和戏剧性",
    "高角度视角，强调整体布局和氛围",
    "柔和自然光，画面干净细腻",
    "电影感侧光，增强明暗对比",
    "浅景深，突出主体并弱化背景",
    "广角视角，增强场景规模和纵深",
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prompt_adds_person_reference_and_hand_guards() {
        let context = ImageWorkbenchPromptBuildContext {
            mode: "person_consistency",
            reference_count: 3,
            has_source: false,
            person_context_json: Some("{}"),
        };

        let prompt = build_image_workbench_task_prompt(
            "基于参考图1的人物，拿着参考图2的道具，在参考图3的场景下玩耍",
            0,
            &context,
        );

        assert!(prompt.contains("参考图1优先用于人物身份"));
        assert!(prompt.contains("骨相、脸型轮廓、五官间距与比例"));
        assert!(prompt.contains("不锁定参考图原本的表情"));
        assert!(prompt.contains("不能改变身份锚点"));
        assert!(prompt.contains("手部结构自然"));
        assert!(prompt.contains("避免多余手"));
    }

    #[test]
    fn prompt_adds_single_reference_guard_for_img2img() {
        let context = ImageWorkbenchPromptBuildContext {
            mode: "img2img",
            reference_count: 1,
            has_source: false,
            person_context_json: None,
        };

        let prompt = build_image_workbench_task_prompt("生成同风格变化", 1, &context);

        assert!(prompt.contains("保持参考图主体身份锚点和主要结构"));
        assert!(prompt.contains("不复制固定表情和姿态"));
        assert!(prompt.contains("景别和拍摄手法按提示词自然变化"));
    }

    #[test]
    fn prompt_uses_explicit_reference_roles() {
        let context_json = r#"{
            "referenceRoles": [
                {"index": 1, "role": "person"},
                {"index": 2, "role": "prop"},
                {"index": 3, "role": "scene"}
            ]
        }"#;
        let context = ImageWorkbenchPromptBuildContext {
            mode: "img2img",
            reference_count: 3,
            has_source: false,
            person_context_json: Some(context_json),
        };

        let prompt = build_image_workbench_task_prompt(
            "参考图1的人物拿着参考图2的道具，站在参考图3的场景里",
            0,
            &context,
        );

        assert!(prompt.contains("参考图1只用于人物身份"));
        assert!(prompt.contains("分镜需要的情绪变化不能改写身份锚点"));
        assert!(prompt.contains("不锁定表情"));
        assert!(prompt.contains("参考图2只用于道具外观"));
        assert!(prompt.contains("参考图3只用于场景空间"));
    }
}
