use crate::infra::AppResult;
use crate::infra::image_workbench_types::{
    ImageWorkbenchAsset, ImageWorkbenchJob, ImageWorkbenchMetadata, ImageWorkbenchModelRun,
    ImageWorkbenchTask, ImageWorkbenchTemplate,
};

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
        source_image_path: row.get(11)?,
        mask_path: row.get(12)?,
        person_context_json: row.get(13)?,
        upscale_scale: row.get::<_, Option<i64>>(14)?.map(|value| value as u32),
        fallback_policy: row.get(15)?,
        created_at_ms: row.get(16)?,
        updated_at_ms: row.get(17)?,
        queued_at_ms: row.get(18)?,
        started_at_ms: row.get(19)?,
        finished_at_ms: row.get(20)?,
        error: row.get(21)?,
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
    })
}

pub(crate) fn map_asset(row: &rusqlite::Row<'_>) -> rusqlite::Result<ImageWorkbenchAsset> {
    Ok(ImageWorkbenchAsset {
        id: row.get(0)?,
        job_id: row.get(1)?,
        task_id: row.get(2)?,
        file_path: row.get(3)?,
        thumbnail_path: row.get(4)?,
        width: row.get::<_, Option<i64>>(5)?.map(|value| value as u32),
        height: row.get::<_, Option<i64>>(6)?.map(|value| value as u32),
        mime_type: row.get(7)?,
        size_bytes: row.get::<_, Option<i64>>(8)?.map(|value| value as u64),
        favorite: row.get::<_, i64>(9)? == 1,
        created_at_ms: row.get(10)?,
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
        mask_path: row.get(11)?,
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
