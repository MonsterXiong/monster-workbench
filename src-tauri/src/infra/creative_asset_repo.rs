use crate::infra::creative_db_schema::init_schema;
use crate::infra::creative_db_support::{connect, map_asset_link, map_creative_asset};
use crate::infra::creative_types::{
    AssetLink, CreateAssetLinkInput, CreateCreativeAssetInput, CreativeAsset, ListAssetLinksFilter,
    ListCreativeAssetsFilter,
};
use crate::infra::{AppError, AppResult};
use rusqlite::{params, params_from_iter, types::Value, Connection, OptionalExtension};
use std::path::Path;

pub(crate) fn create_asset(
    db_path: &Path,
    input: CreateCreativeAssetInput,
) -> AppResult<CreativeAsset> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let status = input.status.unwrap_or_else(|| "draft".to_string());
    conn.execute(
        "INSERT INTO assets (
            project_id, asset_type, title, content, file_path,
            thumbnail_path, metadata_json, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            input.project_id,
            input.asset_type,
            input.title,
            input.content,
            input.file_path,
            input.thumbnail_path,
            input.metadata_json,
            status
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_asset_with_conn(&conn, id)?
        .ok_or_else(|| AppError::Database("璧勪骇宸插啓鍏ヤ絾鏃犳硶绔嬪嵆璇诲彇".to_string()))
}

pub(crate) fn get_asset(db_path: &Path, id: i64) -> AppResult<Option<CreativeAsset>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    get_asset_with_conn(&conn, id)
}

pub(crate) fn list_assets(
    db_path: &Path,
    filter: ListCreativeAssetsFilter,
) -> AppResult<Vec<CreativeAsset>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let mut sql = String::from(
        "SELECT id, project_id, asset_type, title, content, file_path,
            thumbnail_path, metadata_json, status, created_at, updated_at
         FROM assets
         WHERE 1 = 1",
    );
    let mut params = Vec::<Value>::new();

    if let Some(project_id) = non_empty_filter(filter.project_id) {
        sql.push_str(" AND project_id = ?");
        params.push(Value::Text(project_id));
    }
    if let Some(asset_type) = non_empty_filter(filter.asset_type) {
        sql.push_str(" AND asset_type = ?");
        params.push(Value::Text(asset_type));
    }
    if let Some(status) = non_empty_filter(filter.status) {
        sql.push_str(" AND status = ?");
        params.push(Value::Text(status));
    }

    sql.push_str(" ORDER BY id DESC LIMIT ? OFFSET ?");
    params.push(Value::Integer(filter.limit.unwrap_or(50).clamp(1, 200)));
    params.push(Value::Integer(filter.offset.unwrap_or(0).max(0)));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(params.iter()), map_creative_asset)?;
    let mut assets = Vec::new();
    for row in rows {
        assets.push(row?);
    }
    Ok(assets)
}

pub(crate) fn create_asset_link(
    db_path: &Path,
    input: CreateAssetLinkInput,
) -> AppResult<AssetLink> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    conn.execute(
        "INSERT INTO asset_links (source_asset_id, target_asset_id, link_type)
         VALUES (?, ?, ?)",
        params![
            input.source_asset_id,
            input.target_asset_id,
            input.link_type
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_asset_link_with_conn(&conn, id)?
        .ok_or_else(|| AppError::Database("璧勪骇鍏崇郴宸插啓鍏ヤ絾鏃犳硶绔嬪嵆璇诲彇".to_string()))
}

pub(crate) fn list_asset_links(
    db_path: &Path,
    filter: ListAssetLinksFilter,
) -> AppResult<Vec<AssetLink>> {
    init_schema(db_path)?;
    let conn = connect(db_path)?;
    let mut sql = String::from(
        "SELECT id, source_asset_id, target_asset_id, link_type, created_at
         FROM asset_links
         WHERE 1 = 1",
    );
    let mut params = Vec::<Value>::new();

    if let Some(source_asset_id) = filter.source_asset_id {
        sql.push_str(" AND source_asset_id = ?");
        params.push(Value::Integer(source_asset_id));
    }
    if let Some(target_asset_id) = filter.target_asset_id {
        sql.push_str(" AND target_asset_id = ?");
        params.push(Value::Integer(target_asset_id));
    }
    if let Some(link_type) = non_empty_filter(filter.link_type) {
        sql.push_str(" AND link_type = ?");
        params.push(Value::Text(link_type));
    }

    sql.push_str(" ORDER BY id DESC LIMIT ? OFFSET ?");
    params.push(Value::Integer(filter.limit.unwrap_or(50).clamp(1, 200)));
    params.push(Value::Integer(filter.offset.unwrap_or(0).max(0)));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(params.iter()), map_asset_link)?;
    let mut links = Vec::new();
    for row in rows {
        links.push(row?);
    }
    Ok(links)
}

fn get_asset_with_conn(conn: &Connection, id: i64) -> AppResult<Option<CreativeAsset>> {
    conn.query_row(
        "SELECT id, project_id, asset_type, title, content, file_path,
            thumbnail_path, metadata_json, status, created_at, updated_at
         FROM assets
         WHERE id = ?",
        params![id],
        map_creative_asset,
    )
    .optional()
    .map_err(Into::into)
}

fn get_asset_link_with_conn(conn: &Connection, id: i64) -> AppResult<Option<AssetLink>> {
    conn.query_row(
        "SELECT id, source_asset_id, target_asset_id, link_type, created_at
         FROM asset_links
         WHERE id = ?",
        params![id],
        map_asset_link,
    )
    .optional()
    .map_err(Into::into)
}

fn non_empty_filter(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_db_path(name: &str) -> std::path::PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "monster_workbench_{}_{}_{}.db",
            name,
            std::process::id(),
            stamp
        ))
    }

    #[test]
    fn can_list_domain_assets_and_links() {
        let db_path = temp_db_path("creative_assets");
        init_schema(&db_path).expect("schema should init");

        let prompt_asset = create_asset(
            &db_path,
            CreateCreativeAssetInput {
                project_id: Some("story-assets".to_string()),
                asset_type: "image_prompt".to_string(),
                title: Some("Poster prompt".to_string()),
                content: Some("A clean product poster".to_string()),
                file_path: None,
                thumbnail_path: None,
                metadata_json: Some(r#"{"source":"test"}"#.to_string()),
                status: Some("draft".to_string()),
            },
        )
        .expect("prompt asset should be created");
        let character_asset = create_asset(
            &db_path,
            CreateCreativeAssetInput {
                project_id: Some("story-assets".to_string()),
                asset_type: "character".to_string(),
                title: Some("Lead character".to_string()),
                content: Some("A determined protagonist".to_string()),
                file_path: None,
                thumbnail_path: None,
                metadata_json: None,
                status: Some("ready".to_string()),
            },
        )
        .expect("character asset should be created");
        let image_asset = create_asset(
            &db_path,
            CreateCreativeAssetInput {
                project_id: Some("story-assets".to_string()),
                asset_type: "demo_image".to_string(),
                title: Some("Generated image".to_string()),
                content: None,
                file_path: Some("generated/image.png".to_string()),
                thumbnail_path: Some("generated/thumb.png".to_string()),
                metadata_json: None,
                status: Some("ready".to_string()),
            },
        )
        .expect("image asset should be created");

        let prompt_assets = list_assets(
            &db_path,
            ListCreativeAssetsFilter {
                project_id: Some("story-assets".to_string()),
                asset_type: Some("image_prompt".to_string()),
                ..Default::default()
            },
        )
        .expect("prompt assets should list");
        assert_eq!(prompt_assets.len(), 1);
        assert_eq!(prompt_assets[0].id, prompt_asset.id);

        let derived_link = create_asset_link(
            &db_path,
            CreateAssetLinkInput {
                source_asset_id: image_asset.id,
                target_asset_id: prompt_asset.id,
                link_type: "derived_from".to_string(),
            },
        )
        .expect("derived link should create");
        let character_link = create_asset_link(
            &db_path,
            CreateAssetLinkInput {
                source_asset_id: image_asset.id,
                target_asset_id: character_asset.id,
                link_type: "uses_character".to_string(),
            },
        )
        .expect("character link should create");

        let image_links = list_asset_links(
            &db_path,
            ListAssetLinksFilter {
                source_asset_id: Some(image_asset.id),
                ..Default::default()
            },
        )
        .expect("links should list");
        assert_eq!(image_links.len(), 2);
        assert!(image_links.iter().any(|link| link.id == derived_link.id));
        assert!(image_links.iter().any(|link| link.id == character_link.id));

        let _ = std::fs::remove_file(db_path);
    }
}
