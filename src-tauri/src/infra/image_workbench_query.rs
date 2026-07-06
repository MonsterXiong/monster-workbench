//! 图片工作台只读查询 helper。
//!
//! 这些函数原先是 `ImageWorkbenchRepo` 上的私有方法（仅借用 `&self.connect()`
//! 得到的 `Connection`，不依赖 `self` 的其它状态）。为给 `image_workbench_repo.rs`
//! 腾出体量预算（资产组 / 版本链 / 评分数据模型升级前置），统一抽成 `pub(crate)`
//! 自由函数，签名一律为 `fn xxx(conn: &Connection, ...) -> AppResult<...>`，
//! 行为与原方法逐字一致。

use crate::infra::image_workbench_row_mapper::{
    collect_rows, map_asset, map_group, map_job, map_metadata, map_model_run, map_task,
    map_template,
};
use crate::infra::image_workbench_types::{
    ImageWorkbenchAsset, ImageWorkbenchAssetQuery, ImageWorkbenchAssetSort, ImageWorkbenchGroup,
    ImageWorkbenchJob, ImageWorkbenchMetadata, ImageWorkbenchModelRun, ImageWorkbenchTask,
    ImageWorkbenchTemplate,
};
use crate::infra::{AppError, AppResult};
use rusqlite::{params, types::Value, Connection, OptionalExtension};

pub(crate) fn get_job(conn: &Connection, job_id: &str) -> AppResult<ImageWorkbenchJob> {
    conn.query_row(
        "SELECT id, mode, status, prompt, negative_prompt, quantity, provider_config_id, model, size,
                reference_asset_ids_json, source_asset_id, source_image_path, mask_path, person_context_json,
                upscale_scale, fallback_policy, generation_options_json, created_at_ms, updated_at_ms, queued_at_ms,
                started_at_ms, finished_at_ms, error, archived_at_ms, deleted_at_ms
         FROM image_workbench_jobs
         WHERE id = ?",
        params![job_id],
        map_job,
    )
    .optional()?
    .ok_or_else(|| AppError::Database(format!("未找到图片工作台作业: {}", job_id)))
}

pub(crate) fn get_task(conn: &Connection, task_id: &str) -> AppResult<ImageWorkbenchTask> {
    conn.query_row(
        "SELECT id, job_id, queue_index, status, retry_count, max_retries, claim_token, leased_until_ms,
                prompt, created_at_ms, updated_at_ms, started_at_ms, finished_at_ms, error,
                group_id, variant_index, failure_type, failure_hint
         FROM image_workbench_tasks
         WHERE id = ?
           AND removed_at_ms IS NULL",
        params![task_id],
        map_task,
    )
    .optional()?
    .ok_or_else(|| AppError::Database(format!("未找到图片工作台任务: {}", task_id)))
}

pub(crate) fn get_asset(conn: &Connection, asset_id: &str) -> AppResult<ImageWorkbenchAsset> {
    conn.query_row(
        "SELECT id, job_id, task_id, file_path, thumbnail_path, width, height, mime_type, size_bytes, favorite, created_at_ms,
                group_id, rating, parent_asset_id, root_asset_id, version_index, delivery_status,
                quality_issues_json, COALESCE(integrity_status, 'ok'), integrity_error, integrity_checked_at_ms
         FROM image_workbench_assets
         WHERE id = ?",
        params![asset_id],
        map_asset,
    )
    .optional()?
    .ok_or_else(|| AppError::Database(format!("未找到图片工作台资产: {}", asset_id)))
}

pub(crate) fn get_asset_by_import_fingerprint(
    conn: &Connection,
    fingerprint: &str,
) -> AppResult<Option<ImageWorkbenchAsset>> {
    conn.query_row(
        "SELECT id, job_id, task_id, file_path, thumbnail_path, width, height, mime_type, size_bytes, favorite, created_at_ms,
                group_id, rating, parent_asset_id, root_asset_id, version_index, delivery_status,
                quality_issues_json, COALESCE(integrity_status, 'ok'), integrity_error, integrity_checked_at_ms
         FROM image_workbench_assets
         WHERE import_fingerprint = ?",
        params![fingerprint],
        map_asset,
    )
    .optional()
    .map_err(AppError::from)
}

pub(crate) fn get_template(
    conn: &Connection,
    template_id: &str,
) -> AppResult<ImageWorkbenchTemplate> {
    get_template_optional(conn, template_id)?
        .ok_or_else(|| AppError::Database(format!("未找到图片工作台模板: {}", template_id)))
}

pub(crate) fn get_template_optional(
    conn: &Connection,
    template_id: &str,
) -> AppResult<Option<ImageWorkbenchTemplate>> {
    conn.query_row(
        "SELECT id, name, prompt, negative_prompt, mode, is_system, created_at_ms, updated_at_ms
         FROM image_workbench_templates
         WHERE id = ?",
        params![template_id],
        map_template,
    )
    .optional()
    .map_err(AppError::from)
}

pub(crate) fn list_tasks(conn: &Connection, job_id: &str) -> AppResult<Vec<ImageWorkbenchTask>> {
    let mut stmt = conn.prepare(
        "SELECT id, job_id, queue_index, status, retry_count, max_retries, claim_token, leased_until_ms,
                prompt, created_at_ms, updated_at_ms, started_at_ms, finished_at_ms, error,
                group_id, variant_index, failure_type, failure_hint
         FROM image_workbench_tasks
         WHERE job_id = ?
           AND removed_at_ms IS NULL
         ORDER BY queue_index ASC",
    )?;
    let rows = stmt.query_map(params![job_id], map_task)?;
    collect_rows(rows)
}

pub(crate) fn list_assets(conn: &Connection, job_id: &str) -> AppResult<Vec<ImageWorkbenchAsset>> {
    let mut stmt = conn.prepare(
        "SELECT id, job_id, task_id, file_path, thumbnail_path, width, height, mime_type, size_bytes, favorite, created_at_ms,
                group_id, rating, parent_asset_id, root_asset_id, version_index, delivery_status,
                quality_issues_json, COALESCE(integrity_status, 'ok'), integrity_error, integrity_checked_at_ms
         FROM image_workbench_assets
         WHERE job_id = ?
         ORDER BY created_at_ms ASC",
    )?;
    let rows = stmt.query_map(params![job_id], map_asset)?;
    collect_rows(rows)
}

pub(crate) fn list_metadata(
    conn: &Connection,
    job_id: &str,
) -> AppResult<Vec<ImageWorkbenchMetadata>> {
    let mut stmt = conn.prepare(
        "SELECT m.id, m.asset_id, m.task_id, m.original_prompt, m.expanded_prompt, m.negative_prompt,
                m.seed, m.model, m.mode, m.provider, m.reference_asset_ids_json, m.mask_path,
                m.person_context_json, m.created_at_ms
         FROM image_workbench_metadata m
         INNER JOIN image_workbench_assets a ON a.id = m.asset_id
         WHERE a.job_id = ?
         ORDER BY m.created_at_ms ASC",
    )?;
    let rows = stmt.query_map(params![job_id], map_metadata)?;
    collect_rows(rows)
}

pub(crate) fn list_model_runs(
    conn: &Connection,
    job_id: &str,
) -> AppResult<Vec<ImageWorkbenchModelRun>> {
    let mut stmt = conn.prepare(
        "SELECT id, job_id, task_id, provider, model, capability, status, latency_ms, request_json,
                response_preview, error, created_at_ms, finished_at_ms
         FROM image_workbench_model_runs
         WHERE job_id = ?
         ORDER BY created_at_ms ASC",
    )?;
    let rows = stmt.query_map(params![job_id], map_model_run)?;
    collect_rows(rows)
}

/// 跨作业资产库查询：支持 group_id / min_rating 筛选、分页与排序。
/// `limit` clamp 到 1..200（与历史 `list_recent_assets` 一致），`offset` 不限。
pub(crate) fn query_assets(
    conn: &Connection,
    query: &ImageWorkbenchAssetQuery,
) -> AppResult<Vec<ImageWorkbenchAsset>> {
    let limit = query.limit.clamp(1, 200) as i64;
    let offset = query.offset as i64;

    let mut sql = String::from(
        "SELECT id, job_id, task_id, file_path, thumbnail_path, width, height, mime_type, size_bytes, favorite, created_at_ms,
                group_id, rating, parent_asset_id, root_asset_id, version_index, delivery_status,
                quality_issues_json, COALESCE(integrity_status, 'ok'), integrity_error, integrity_checked_at_ms
         FROM image_workbench_assets
         WHERE job_id IN (
             SELECT id
             FROM image_workbench_jobs
             WHERE deleted_at_ms IS NULL
         )",
    );

    let mut conditions: Vec<&str> = Vec::new();
    let mut binds: Vec<Value> = Vec::new();
    if let Some(group_id) = &query.group_id {
        conditions.push("group_id = ?");
        binds.push(Value::Text(group_id.clone()));
    }
    if let Some(min_rating) = query.min_rating {
        conditions.push("rating IS NOT NULL AND rating >= ?");
        binds.push(Value::Integer(min_rating as i64));
    }
    if !conditions.is_empty() {
        sql.push_str(" AND ");
        sql.push_str(&conditions.join(" AND "));
    }

    sql.push_str(match query.sort {
        ImageWorkbenchAssetSort::FavoriteThenRecent => {
            " ORDER BY favorite DESC, created_at_ms DESC"
        }
        ImageWorkbenchAssetSort::RecentFirst => " ORDER BY created_at_ms DESC",
        ImageWorkbenchAssetSort::RatingDesc => {
            " ORDER BY rating DESC, favorite DESC, created_at_ms DESC"
        }
    });
    sql.push_str(" LIMIT ? OFFSET ?");
    binds.push(Value::Integer(limit));
    binds.push(Value::Integer(offset));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(rusqlite::params_from_iter(binds), map_asset)?;
    collect_rows(rows)
}

pub(crate) fn list_deleted_job_assets(
    conn: &Connection,
    limit: u32,
) -> AppResult<Vec<ImageWorkbenchAsset>> {
    let limit = limit.clamp(1, 1_000) as i64;
    let mut stmt = conn.prepare(
        "SELECT a.id, a.job_id, a.task_id, a.file_path, a.thumbnail_path, a.width, a.height,
                a.mime_type, a.size_bytes, a.favorite, a.created_at_ms,
                a.group_id, a.rating, a.parent_asset_id, a.root_asset_id, a.version_index,
                a.delivery_status, a.quality_issues_json, COALESCE(a.integrity_status, 'ok'),
                a.integrity_error, a.integrity_checked_at_ms
         FROM image_workbench_assets a
         INNER JOIN image_workbench_jobs j ON j.id = a.job_id
         WHERE j.deleted_at_ms IS NOT NULL
         ORDER BY j.deleted_at_ms ASC, a.created_at_ms ASC
         LIMIT ?",
    )?;
    let rows = stmt.query_map(params![limit], map_asset)?;
    collect_rows(rows)
}

pub(crate) fn list_groups(conn: &Connection, job_id: &str) -> AppResult<Vec<ImageWorkbenchGroup>> {
    let mut stmt = conn.prepare(
        "SELECT id, job_id, source_id, name, type, agent_preset, agent_ids_json, base_prompt,
                count, created_at_ms, updated_at_ms
         FROM image_workbench_groups
         WHERE job_id = ?
           AND removed_at_ms IS NULL
         ORDER BY created_at_ms ASC",
    )?;
    let rows = stmt.query_map(params![job_id], map_group)?;
    collect_rows(rows)
}

pub(crate) fn list_assets_by_group_marker(
    conn: &Connection,
    group_id: Option<&str>,
    group_name: Option<&str>,
) -> AppResult<Vec<ImageWorkbenchAsset>> {
    let mut sql = String::from(
        "SELECT a.id, a.job_id, a.task_id, a.file_path, a.thumbnail_path, a.width, a.height,
                a.mime_type, a.size_bytes, a.favorite, a.created_at_ms,
                a.group_id, a.rating, a.parent_asset_id, a.root_asset_id, a.version_index,
                a.delivery_status, a.quality_issues_json, COALESCE(a.integrity_status, 'ok'),
                a.integrity_error, a.integrity_checked_at_ms
         FROM image_workbench_assets a
         INNER JOIN image_workbench_groups g ON g.id = a.group_id
         INNER JOIN image_workbench_jobs j ON j.id = a.job_id
         WHERE j.deleted_at_ms IS NULL
           AND g.removed_at_ms IS NULL",
    );
    let mut binds: Vec<Value> = Vec::new();
    if let Some(group_id) = group_id.map(str::trim).filter(|value| !value.is_empty()) {
        sql.push_str(" AND a.group_id = ?");
        binds.push(Value::Text(group_id.to_string()));
    } else if let Some(group_name) = group_name.map(str::trim).filter(|value| !value.is_empty()) {
        sql.push_str(" AND g.name = ?");
        binds.push(Value::Text(group_name.to_string()));
    } else {
        return Ok(Vec::new());
    }
    sql.push_str(" ORDER BY g.updated_at_ms DESC, a.created_at_ms ASC");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(rusqlite::params_from_iter(binds), map_asset)?;
    collect_rows(rows)
}

pub(crate) fn list_groups_by_marker(
    conn: &Connection,
    group_id: Option<&str>,
    group_name: Option<&str>,
) -> AppResult<Vec<ImageWorkbenchGroup>> {
    let mut sql = String::from(
        "SELECT g.id, g.job_id, g.source_id, g.name, g.type, g.agent_preset, g.agent_ids_json,
                g.base_prompt, g.count, g.created_at_ms, g.updated_at_ms
         FROM image_workbench_groups g
         INNER JOIN image_workbench_jobs j ON j.id = g.job_id
         WHERE j.deleted_at_ms IS NULL
           AND g.removed_at_ms IS NULL",
    );
    let mut binds: Vec<Value> = Vec::new();
    if let Some(group_id) = group_id.map(str::trim).filter(|value| !value.is_empty()) {
        sql.push_str(" AND g.id = ?");
        binds.push(Value::Text(group_id.to_string()));
    } else if let Some(group_name) = group_name.map(str::trim).filter(|value| !value.is_empty()) {
        sql.push_str(" AND g.name = ?");
        binds.push(Value::Text(group_name.to_string()));
    } else {
        return Ok(Vec::new());
    }
    sql.push_str(" ORDER BY g.updated_at_ms DESC, g.created_at_ms DESC");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(rusqlite::params_from_iter(binds), map_group)?;
    collect_rows(rows)
}

pub(crate) fn get_group(conn: &Connection, group_id: &str) -> AppResult<ImageWorkbenchGroup> {
    conn.query_row(
        "SELECT id, job_id, source_id, name, type, agent_preset, agent_ids_json, base_prompt,
                count, created_at_ms, updated_at_ms
         FROM image_workbench_groups
         WHERE id = ?",
        params![group_id],
        map_group,
    )
    .optional()?
    .ok_or_else(|| AppError::Database(format!("未找到图片工作台资产组: {}", group_id)))
}

/// 资产版本链：复跑 job 产出的资产相对其源资产的父 / 链根 / 版本号。
#[derive(Debug, Clone, Default)]
pub(crate) struct AssetLineage {
    pub parent_asset_id: Option<String>,
    pub root_asset_id: Option<String>,
    pub version_index: Option<u32>,
}

/// 根据 job 的 `source_asset_id` 派生版本链：
/// - parent = 源资产 id
/// - root = 源资产自身的 root（若有）否则源资产 id —— 让链根稳定向上收敛，
///   与前端 `resolveRootAssetId` 语义一致
/// - version = 源资产 version + 1（源无 version 视为 0）
///
/// 源资产不存在或 job 无 source_asset_id 时返回空版本链（全新生成）。
pub(crate) fn resolve_lineage(
    conn: &Connection,
    job: &ImageWorkbenchJob,
) -> AppResult<AssetLineage> {
    let Some(source_id) = job.source_asset_id.as_deref() else {
        return Ok(AssetLineage::default());
    };
    let Some(source) = get_asset(conn, source_id).ok() else {
        return Ok(AssetLineage::default());
    };
    Ok(AssetLineage {
        parent_asset_id: Some(source.id.clone()),
        root_asset_id: Some(source.root_asset_id.unwrap_or(source.id)),
        version_index: Some(source.version_index.unwrap_or(0) + 1),
    })
}
