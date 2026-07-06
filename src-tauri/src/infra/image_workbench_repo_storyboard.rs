use crate::infra::image_workbench_types::NewImageWorkbenchJob;
use serde::Deserialize;

use super::{next_id, truncate_chars};

#[derive(Debug, Clone)]
pub(super) struct ResolvedImageWorkbenchTaskGroup {
    pub(super) id: String,
    pub(super) source_id: Option<String>,
    pub(super) name: Option<String>,
    pub(super) r#type: String,
    pub(super) agent_preset: Option<String>,
    pub(super) agent_ids_json: Option<String>,
    pub(super) base_prompt: String,
    pub(super) count: u32,
}

#[derive(Debug, Clone)]
pub(super) struct ResolvedImageWorkbenchTaskGroups {
    pub(super) groups: Vec<ResolvedImageWorkbenchTaskGroup>,
    task_group_ids: Vec<String>,
    task_variant_indexes: Vec<u32>,
}

impl ResolvedImageWorkbenchTaskGroups {
    pub(super) fn task_group_id(&self, index: u32) -> &str {
        self.task_group_ids
            .get(index as usize)
            .map(String::as_str)
            .unwrap_or_else(|| self.groups[0].id.as_str())
    }

    pub(super) fn task_variant_index(&self, index: u32) -> u32 {
        self.task_variant_indexes
            .get(index as usize)
            .copied()
            .unwrap_or(index)
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoryboardGenerationOptionsEnvelope {
    storyboard: Option<StoryboardGenerationOptions>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoryboardGenerationOptions {
    scenes: Vec<StoryboardGenerationScene>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoryboardGenerationScene {
    index: Option<u32>,
    title: Option<String>,
    task_start_index: Option<u32>,
    task_count: Option<u32>,
    reference_prompt: Option<String>,
}

pub(super) fn resolve_task_groups_for_job(
    input: &NewImageWorkbenchJob,
    job_id: &str,
) -> ResolvedImageWorkbenchTaskGroups {
    resolve_storyboard_task_groups(input, job_id)
        .unwrap_or_else(|| resolve_default_task_group(input))
}

fn resolve_default_task_group(input: &NewImageWorkbenchJob) -> ResolvedImageWorkbenchTaskGroups {
    let group_id = next_id("iw-group");
    let group_type = if input.source_asset_id.is_some() {
        "rerun"
    } else {
        "fresh"
    };
    ResolvedImageWorkbenchTaskGroups {
        groups: vec![ResolvedImageWorkbenchTaskGroup {
            id: group_id.clone(),
            source_id: input.source_asset_id.clone(),
            name: None,
            r#type: group_type.to_string(),
            agent_preset: None,
            agent_ids_json: None,
            base_prompt: input.prompt.clone(),
            count: input.quantity,
        }],
        task_group_ids: vec![group_id; input.quantity as usize],
        task_variant_indexes: (0..input.quantity).collect(),
    }
}

fn resolve_storyboard_task_groups(
    input: &NewImageWorkbenchJob,
    _job_id: &str,
) -> Option<ResolvedImageWorkbenchTaskGroups> {
    let raw_json = input.generation_options_json.as_deref()?.trim();
    if raw_json.is_empty() {
        return None;
    }
    let envelope = serde_json::from_str::<StoryboardGenerationOptionsEnvelope>(raw_json).ok()?;
    let storyboard = envelope.storyboard?;
    if storyboard.scenes.is_empty() || input.quantity == 0 {
        return None;
    }

    let mut groups = Vec::new();
    let mut task_group_ids = vec![String::new(); input.quantity as usize];
    let mut task_variant_indexes = vec![0; input.quantity as usize];

    let mut next_start_index = 0_u32;
    for (fallback_index, scene) in storyboard.scenes.iter().enumerate() {
        let start = scene
            .task_start_index
            .unwrap_or(next_start_index)
            .min(input.quantity);
        let count = scene.task_count.unwrap_or(1).clamp(1, input.quantity);
        if start >= input.quantity {
            continue;
        }
        let end = start.saturating_add(count).min(input.quantity);
        if end <= start {
            continue;
        }
        next_start_index = end;

        let scene_index = scene
            .index
            .unwrap_or((fallback_index + 1) as u32)
            .clamp(1, 999);
        let title = normalize_storyboard_group_title(scene.title.as_deref(), scene_index);
        let reference_prompt = truncate_chars(scene.reference_prompt.as_deref().unwrap_or(""), 256);
        let group_id = next_id("iw-group");
        let base_prompt = input
            .task_prompts
            .get(start as usize)
            .cloned()
            .unwrap_or_else(|| input.prompt.clone());
        let agent_ids_json = if reference_prompt.is_empty() {
            None
        } else {
            serde_json::to_string(&serde_json::json!({
                "referencePrompt": reference_prompt,
            }))
            .ok()
        };

        groups.push(ResolvedImageWorkbenchTaskGroup {
            id: group_id.clone(),
            source_id: Some(format!("storyboard-scene-{}", scene_index)),
            name: Some(title),
            r#type: "storyboard".to_string(),
            agent_preset: Some("storyboard".to_string()),
            agent_ids_json,
            base_prompt,
            count: end - start,
        });

        for task_index in start..end {
            task_group_ids[task_index as usize] = group_id.clone();
            task_variant_indexes[task_index as usize] = task_index - start;
        }
    }

    if groups.is_empty() {
        return None;
    }

    let fallback_group_id = groups[0].id.clone();
    for task_index in 0..input.quantity {
        if task_group_ids[task_index as usize].is_empty() {
            task_group_ids[task_index as usize] = fallback_group_id.clone();
            task_variant_indexes[task_index as usize] = task_index;
        }
    }

    Some(ResolvedImageWorkbenchTaskGroups {
        groups,
        task_group_ids,
        task_variant_indexes,
    })
}

fn normalize_storyboard_group_title(title: Option<&str>, index: u32) -> String {
    let clean = title
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("未命名分镜");
    format!("分镜 {:02}｜{}", index, truncate_chars(clean, 80))
}

pub(super) fn build_storyboard_replan_base_prompt(
    base_prompt: &str,
    scene_name: Option<&str>,
    batch_id: &str,
) -> String {
    let scene_label = scene_name
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("当前分镜");
    format!(
        "{} 分镜重规划批次：{}。基于「{}」重新规划该分镜，不复用上一轮失败的构图或随机细节；参考图人物只用于主角身份识别，脸型、五官比例、发型、年龄感和整体气质保持一致，但不要复制参考图或上一轮的固定表情、眼神和姿态；保留原分镜核心故事瞬间，重新组织表情神情、服装纹理、动作姿态、镜头景别、拍摄手法、光影层次、前中后景和场景道具；降低上游模型失败概率，避免一次塞入过多主体、密集小物或互相冲突的动作，优先使用主体清晰、动作瞬间明确、前中后景可执行的构图，输出新的高质量候选图。",
        base_prompt.trim(),
        batch_id,
        scene_label
    )
}

pub(super) fn build_storyboard_replan_group_name(name: Option<&str>) -> String {
    let mut base = name
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("分镜")
        .to_string();
    loop {
        let trimmed = base.trim_end();
        let Some(next) = trimmed
            .strip_suffix(" · 重新规划")
            .or_else(|| trimmed.strip_suffix("· 重新规划"))
            .or_else(|| trimmed.strip_suffix(" - Replan"))
            .or_else(|| trimmed.strip_suffix(" · Replan"))
        else {
            break;
        };
        base = next.trim_end().to_string();
    }
    format!("{} · 重新规划", base)
}

pub(super) fn build_storyboard_replan_task_prompt(
    base_prompt: &str,
    variant_index: u32,
    variants: u32,
) -> String {
    format!(
        "{} 新候选图 {}/{}：保持同一分镜设定与主角身份一致，但不要锁定参考图表情；根据本镜情绪调整表情、眼神、姿态、服装细节、场景道具、景别、光影、景深和构图；控制主体和道具数量，避免过密、矛盾或模型难以解析的画面，产生新的可筛选变化。",
        base_prompt.trim(),
        variant_index,
        variants
    )
}

pub(super) fn build_storyboard_replan_agent_ids_json(
    original: Option<&str>,
    source_group_id: &str,
    batch_id: &str,
    now: i64,
) -> Option<String> {
    let mut object = original
        .and_then(|value| serde_json::from_str::<serde_json::Value>(value).ok())
        .and_then(|value| value.as_object().cloned())
        .unwrap_or_default();
    object.insert(
        "sourceGroupId".to_string(),
        serde_json::Value::String(source_group_id.to_string()),
    );
    object.insert(
        "replanBatchId".to_string(),
        serde_json::Value::String(batch_id.to_string()),
    );
    object.insert(
        "replannedAtMs".to_string(),
        serde_json::Value::Number(now.into()),
    );
    serde_json::to_string(&object).ok()
}
