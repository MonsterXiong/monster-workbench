use crate::infra::image_workbench_types::{
    ImageWorkbenchAsset, ImageWorkbenchGroup, ImageWorkbenchJob, ImageWorkbenchMetadata,
    ImageWorkbenchModelRun, ImageWorkbenchTask, ImageWorkbenchTemplate,
};
use crate::infra::AppResult;

/// 把 rusqlite 的行迭代器收敛成 Vec<T>，遇到错误立即返回。
/// 历史上散落在 repo 主文件，A1 拆分时统一沉到 row mapper 模块。
pub(crate) fn collect_rows<T>(
    rows: rusqlite::MappedRows<'_, impl FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>>,
) -> AppResult<Vec<T>> {
    let mut items = Vec::new();
    for row in rows {
        items.push(row?);
    }
    Ok(items)
}

pub(crate) fn map_job(row: &rusqlite::Row<'_>) -> rusqlite::Result<ImageWorkbenchJob> {
    Ok(ImageWorkbenchJob {
        id: row.get(0)?,
        mode: row.get(1)?,
        status: row.get(2)?,
        prompt: row.get(3)?,
        negative_prompt: row.get(4)?,
        quantity: row.get::<_, i64>(5)? as u32,
        provider_config_id: row.get(6)?,
        model: row.get(7)?,
        size: row.get(8)?,
        reference_asset_ids_json: row.get(9)?,
        source_asset_id: row.get(10)?,
        source_image_path: normalize_optional_storage_path(row.get(11)?),
        mask_path: normalize_optional_storage_path(row.get(12)?),
        person_context_json: row.get(13)?,
        upscale_scale: row.get::<_, Option<i64>>(14)?.map(|value| value as u32),
        fallback_policy: row.get(15)?,
        generation_options_json: row.get(16)?,
        created_at_ms: row.get(17)?,
        updated_at_ms: row.get(18)?,
        queued_at_ms: row.get(19)?,
        started_at_ms: row.get(20)?,
        finished_at_ms: row.get(21)?,
        error: row.get(22)?,
        archived_at_ms: row.get(23)?,
        deleted_at_ms: row.get(24)?,
    })
}

pub(crate) fn map_task(row: &rusqlite::Row<'_>) -> rusqlite::Result<ImageWorkbenchTask> {
    Ok(ImageWorkbenchTask {
        id: row.get(0)?,
        job_id: row.get(1)?,
        queue_index: row.get::<_, i64>(2)? as u32,
        status: row.get(3)?,
        retry_count: row.get::<_, i64>(4)? as u32,
        max_retries: row.get::<_, i64>(5)? as u32,
        claim_token: row.get(6)?,
        leased_until_ms: row.get(7)?,
        prompt: row.get(8)?,
        created_at_ms: row.get(9)?,
        updated_at_ms: row.get(10)?,
        started_at_ms: row.get(11)?,
        finished_at_ms: row.get(12)?,
        error: row.get(13)?,
        group_id: row.get(14)?,
        variant_index: row.get::<_, Option<i64>>(15)?.map(|value| value as u32),
        failure_type: row.get(16)?,
        failure_hint: row.get(17)?,
    })
}

pub(crate) fn map_asset(row: &rusqlite::Row<'_>) -> rusqlite::Result<ImageWorkbenchAsset> {
    Ok(ImageWorkbenchAsset {
        id: row.get(0)?,
        job_id: row.get(1)?,
        task_id: row.get(2)?,
        file_path: normalize_storage_path(row.get(3)?),
        thumbnail_path: normalize_optional_storage_path(row.get(4)?),
        width: row.get::<_, Option<i64>>(5)?.map(|value| value as u32),
        height: row.get::<_, Option<i64>>(6)?.map(|value| value as u32),
        mime_type: row.get(7)?,
        size_bytes: row.get::<_, Option<i64>>(8)?.map(|value| value as u64),
        favorite: row.get::<_, i64>(9)? == 1,
        created_at_ms: row.get(10)?,
        group_id: row.get(11)?,
        rating: row.get::<_, Option<i64>>(12)?.map(|value| value as u32),
        parent_asset_id: row.get(13)?,
        root_asset_id: row.get(14)?,
        version_index: row.get::<_, Option<i64>>(15)?.map(|value| value as u32),
        delivery_status: row.get(16)?,
        quality_issues: parse_quality_issues_json(row.get(17)?),
        integrity_status: row.get(18)?,
        integrity_error: row.get(19)?,
        integrity_checked_at_ms: row.get(20)?,
    })
}

pub(crate) fn map_metadata(row: &rusqlite::Row<'_>) -> rusqlite::Result<ImageWorkbenchMetadata> {
    Ok(ImageWorkbenchMetadata {
        id: row.get(0)?,
        asset_id: row.get(1)?,
        task_id: row.get(2)?,
        original_prompt: row.get(3)?,
        expanded_prompt: row.get(4)?,
        negative_prompt: row.get(5)?,
        seed: row.get(6)?,
        model: row.get(7)?,
        mode: row.get(8)?,
        provider: row.get(9)?,
        reference_asset_ids_json: row.get(10)?,
        mask_path: normalize_optional_storage_path(row.get(11)?),
        person_context_json: row.get(12)?,
        created_at_ms: row.get(13)?,
    })
}

pub(crate) fn map_model_run(row: &rusqlite::Row<'_>) -> rusqlite::Result<ImageWorkbenchModelRun> {
    Ok(ImageWorkbenchModelRun {
        id: row.get(0)?,
        job_id: row.get(1)?,
        task_id: row.get(2)?,
        provider: row.get(3)?,
        model: row.get(4)?,
        capability: row.get(5)?,
        status: row.get(6)?,
        latency_ms: row.get::<_, Option<i64>>(7)?.map(|value| value as u64),
        request_json: row.get(8)?,
        response_preview: row.get(9)?,
        error: row.get(10)?,
        created_at_ms: row.get(11)?,
        finished_at_ms: row.get(12)?,
    })
}

pub(crate) fn map_template(row: &rusqlite::Row<'_>) -> rusqlite::Result<ImageWorkbenchTemplate> {
    Ok(ImageWorkbenchTemplate {
        id: row.get(0)?,
        name: row.get(1)?,
        prompt: row.get(2)?,
        negative_prompt: row.get(3)?,
        mode: row.get(4)?,
        is_system: row.get::<_, i64>(5)? == 1,
        created_at_ms: row.get(6)?,
        updated_at_ms: row.get(7)?,
    })
}

pub(crate) fn map_group(row: &rusqlite::Row<'_>) -> rusqlite::Result<ImageWorkbenchGroup> {
    Ok(ImageWorkbenchGroup {
        id: row.get(0)?,
        job_id: row.get(1)?,
        source_id: row.get(2)?,
        name: row.get(3)?,
        r#type: row.get(4)?,
        agent_preset: row.get(5)?,
        agent_ids_json: row.get(6)?,
        base_prompt: row.get(7)?,
        count: row.get::<_, i64>(8)? as u32,
        created_at_ms: row.get(9)?,
        updated_at_ms: row.get(10)?,
    })
}

fn normalize_storage_path(value: String) -> String {
    strip_windows_extended_path_prefix(&value)
}

fn normalize_optional_storage_path(value: Option<String>) -> Option<String> {
    value.map(normalize_storage_path)
}

fn strip_windows_extended_path_prefix(value: &str) -> String {
    const EXTENDED_PREFIX: &str = "\\\\?\\";
    const EXTENDED_UNC_PREFIX: &str = "\\\\?\\UNC\\";
    let upper = value.to_ascii_uppercase();
    if upper.starts_with(EXTENDED_UNC_PREFIX) {
        return format!("\\\\{}", &value[EXTENDED_UNC_PREFIX.len()..]);
    }
    if upper.starts_with(EXTENDED_PREFIX) {
        return value[EXTENDED_PREFIX.len()..].to_string();
    }
    value.to_string()
}

fn parse_quality_issues_json(value: Option<String>) -> Vec<String> {
    let Some(raw) = value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
    else {
        return Vec::new();
    };
    serde_json::from_str::<Vec<String>>(&raw)
        .unwrap_or_default()
        .into_iter()
        .filter(|issue| matches!(issue.as_str(), "hands" | "identity" | "prop" | "scene"))
        .fold(Vec::new(), |mut acc, issue| {
            if !acc.contains(&issue) {
                acc.push(issue);
            }
            acc
        })
}
