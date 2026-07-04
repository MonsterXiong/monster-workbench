use crate::infra::image_workbench_repo::ImageWorkbenchRepo;
use crate::infra::image_workbench_types::{
    ImageWorkbenchSnapshot, ImageWorkbenchTaskStatusPatch, NewImageWorkbenchAsset,
    NewImageWorkbenchGroup, NewImageWorkbenchJob, NewImageWorkbenchMetadata,
};
use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};
use crate::services::image_workbench_asset_policy::ImageWorkbenchAssetPathPolicy;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

const IMPORT_LIMIT_DEFAULT: u32 = 100;
const IMPORT_LIMIT_MAX: u32 = 200;
const IMPORT_OFFSET_MAX: u32 = 10_000;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportImageWorkbenchGeneratedAssetsRequest {
    pub directory_path: String,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportImageWorkbenchGeneratedAssetsResult {
    pub job_id: Option<String>,
    pub scanned: u32,
    pub imported: u32,
    pub duplicates: u32,
    pub missing: u32,
    pub corrupt: u32,
    pub failed: u32,
    pub items: Vec<ImportImageWorkbenchGeneratedAssetItem>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportImageWorkbenchGeneratedAssetItem {
    pub stem: String,
    pub json_path: Option<String>,
    pub image_path: Option<String>,
    pub status: String,
    pub asset_id: Option<String>,
    pub job_id: Option<String>,
    pub fingerprint: Option<String>,
    pub integrity_status: String,
    pub integrity_error: Option<String>,
}

#[derive(Default)]
struct AssetPair {
    json_path: Option<PathBuf>,
    image_path: Option<PathBuf>,
}

struct ImportCandidate {
    item_index: usize,
    stem: String,
    image_path: PathBuf,
    fingerprint: String,
    metadata: Option<GeneratedAssetMetadata>,
    metadata_error: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeneratedAssetMetadata {
    batch_id: Option<String>,
    task_id: Option<Value>,
    variant: Option<Value>,
    prompt: Option<String>,
    revised_prompt: Option<String>,
    model: Option<String>,
    size: Option<String>,
    group_id: Option<Value>,
    group_name: Option<String>,
    group_type: Option<String>,
    source_id: Option<Value>,
    agent: Option<GeneratedAssetAgent>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct GeneratedAssetAgent {
    id: Option<String>,
    name: Option<String>,
    focus: Option<String>,
    agent_ids: Option<Vec<String>>,
}

pub(crate) fn import_generated_assets(
    path_provider: PathProvider,
    request: ImportImageWorkbenchGeneratedAssetsRequest,
) -> AppResult<ImportImageWorkbenchGeneratedAssetsResult> {
    let directory = canonicalize_import_directory(&request.directory_path)?;
    let limit = request
        .limit
        .unwrap_or(IMPORT_LIMIT_DEFAULT)
        .clamp(1, IMPORT_LIMIT_MAX);
    let offset = request.offset.unwrap_or(0).min(IMPORT_OFFSET_MAX) as usize;
    let pairs = scan_generated_asset_pairs(&directory)?;
    let selected = pairs
        .into_iter()
        .skip(offset)
        .take(limit as usize)
        .collect::<Vec<_>>();

    let repo = ImageWorkbenchRepo::new(path_provider.get_db_file_path()?);
    let mut result = ImportImageWorkbenchGeneratedAssetsResult {
        job_id: None,
        scanned: selected.len() as u32,
        imported: 0,
        duplicates: 0,
        missing: 0,
        corrupt: 0,
        failed: 0,
        items: Vec::new(),
    };
    let mut candidates = Vec::new();

    for (stem, pair) in selected {
        let mut item = import_item(
            &stem,
            pair.json_path.as_ref(),
            pair.image_path.as_ref(),
            "pending",
            "ok",
            None,
        );
        let Some(image_path) = pair.image_path else {
            item.status = "failed".to_string();
            item.integrity_status = "missing".to_string();
            item.integrity_error = Some("缺少 PNG 图片文件".to_string());
            result.missing += 1;
            result.failed += 1;
            result.items.push(item);
            continue;
        };

        let image_path = image_path.canonicalize().map_err(|error| {
            AppError::Io(format!(
                "解析 generated-assets 图片失败 ({}): {}",
                image_path.display(),
                error
            ))
        })?;
        let image_metadata = fs::metadata(&image_path).map_err(|error| {
            AppError::Io(format!(
                "读取 generated-assets 图片元数据失败 ({}): {}",
                image_path.display(),
                error
            ))
        })?;
        if !image_metadata.is_file() || image_metadata.len() == 0 {
            item.status = "failed".to_string();
            item.integrity_status = "corrupt".to_string();
            item.integrity_error = Some("PNG 图片不是有效文件或为空".to_string());
            result.corrupt += 1;
            result.failed += 1;
            result.items.push(item);
            continue;
        }

        let (metadata, metadata_error) = read_generated_metadata(pair.json_path.as_ref())?;
        let fingerprint = build_import_fingerprint(&image_path, image_metadata.len(), &metadata);
        if let Some(existing) = repo.get_asset_by_import_fingerprint(&fingerprint)? {
            item.status = "duplicate".to_string();
            item.asset_id = Some(existing.id);
            item.job_id = Some(existing.job_id);
            item.fingerprint = Some(fingerprint);
            result.duplicates += 1;
            result.items.push(item);
            continue;
        }

        if metadata_error.is_some() {
            result.corrupt += 1;
        }
        item.fingerprint = Some(fingerprint.clone());
        let item_index = result.items.len();
        result.items.push(item);
        candidates.push(ImportCandidate {
            item_index,
            stem,
            image_path,
            fingerprint,
            metadata,
            metadata_error,
        });
    }

    if candidates.is_empty() {
        return Ok(result);
    }

    let snapshot = create_import_job(&repo, &directory, &candidates)?;
    let job_id = snapshot.job.id.clone();
    let group_map = create_import_groups(&repo, &job_id, &candidates)?;
    let policy = ImageWorkbenchAssetPathPolicy::new(path_provider);

    for (index, candidate) in candidates.iter().enumerate() {
        let task = snapshot.tasks.get(index).ok_or_else(|| {
            AppError::Database("图片工作台导入任务数量与候选资产不一致".to_string())
        })?;
        repo.update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id: task.id.clone(),
            status: "running".to_string(),
            error: None,
            failure_type: None,
            failure_hint: None,
            model_run: None,
        })?;
        let imported = policy.import_external_image_asset(
            "generated-assets 图片",
            &candidate.image_path.to_string_lossy(),
            &task.id,
        )?;
        let group_id = group_map
            .get(&group_key(candidate.metadata.as_ref()))
            .cloned();
        let metadata = build_import_metadata(candidate);
        let recorded = repo.record_asset(
            NewImageWorkbenchAsset {
                task_id: task.id.clone(),
                file_path: imported.file_path,
                thumbnail_path: None,
                width: candidate
                    .metadata
                    .as_ref()
                    .and_then(|metadata| parse_dimensions(metadata.size.as_deref()).0),
                height: candidate
                    .metadata
                    .as_ref()
                    .and_then(|metadata| parse_dimensions(metadata.size.as_deref()).1),
                mime_type: Some("image/png".to_string()),
                size_bytes: Some(imported.size_bytes),
                group_id,
                import_fingerprint: Some(candidate.fingerprint.clone()),
                import_source_path: Some(candidate.image_path.to_string_lossy().to_string()),
                ..Default::default()
            },
            metadata,
            None,
        )?;
        let asset_id = recorded
            .assets
            .iter()
            .find(|asset| asset.task_id == task.id)
            .map(|asset| asset.id.clone())
            .ok_or_else(|| AppError::Database("图片工作台导入资产写入后无法回读".to_string()))?;
        if let Some(error) = &candidate.metadata_error {
            repo.update_asset_integrity_many(&[(
                asset_id.clone(),
                "corrupt".to_string(),
                Some(error.clone()),
                now_ms(),
            )])?;
        }
        repo.update_task_status(ImageWorkbenchTaskStatusPatch {
            task_id: task.id.clone(),
            status: "succeeded".to_string(),
            error: None,
            failure_type: None,
            failure_hint: None,
            model_run: None,
        })?;

        let item = &mut result.items[candidate.item_index];
        item.status = "imported".to_string();
        item.asset_id = Some(asset_id);
        item.job_id = Some(job_id.clone());
        item.integrity_status = if candidate.metadata_error.is_some() {
            "corrupt".to_string()
        } else {
            "ok".to_string()
        };
        item.integrity_error = candidate.metadata_error.clone();
        result.imported += 1;
    }

    result.job_id = Some(job_id);
    Ok(result)
}

fn canonicalize_import_directory(value: &str) -> AppResult<PathBuf> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::Config(
            "generated-assets 导入目录不能为空".to_string(),
        ));
    }
    let path = PathBuf::from(trimmed);
    if !path.is_absolute() {
        return Err(AppError::Permission(
            "generated-assets 导入目录必须是绝对路径".to_string(),
        ));
    }
    let canonical = path.canonicalize().map_err(|error| {
        AppError::Io(format!(
            "解析 generated-assets 导入目录失败 ({}): {}",
            path.display(),
            error
        ))
    })?;
    if !canonical.is_dir() {
        return Err(AppError::Permission(
            "generated-assets 导入目录必须指向文件夹".to_string(),
        ));
    }
    Ok(canonical)
}

fn scan_generated_asset_pairs(directory: &Path) -> AppResult<Vec<(String, AssetPair)>> {
    let mut pairs = BTreeMap::<String, AssetPair>::new();
    for entry in fs::read_dir(directory).map_err(|error| {
        AppError::Io(format!(
            "读取 generated-assets 导入目录失败 ({}): {}",
            directory.display(),
            error
        ))
    })? {
        let entry =
            entry.map_err(|error| AppError::Io(format!("读取导入目录项失败: {}", error)))?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .map(|value| value.to_ascii_lowercase());
        if !matches!(extension.as_deref(), Some("json" | "png")) {
            continue;
        }
        let Some(stem) = path.file_stem().and_then(|value| value.to_str()) else {
            continue;
        };
        let pair = pairs.entry(stem.to_string()).or_default();
        if extension.as_deref() == Some("json") {
            pair.json_path = Some(path);
        } else {
            pair.image_path = Some(path);
        }
    }
    Ok(pairs.into_iter().collect())
}

fn read_generated_metadata(
    path: Option<&PathBuf>,
) -> AppResult<(Option<GeneratedAssetMetadata>, Option<String>)> {
    let Some(path) = path else {
        return Ok((None, Some("缺少 JSON 元数据".to_string())));
    };
    let text = fs::read_to_string(path).map_err(|error| {
        AppError::Io(format!(
            "读取 generated-assets JSON 失败 ({}): {}",
            path.display(),
            error
        ))
    })?;
    match serde_json::from_str::<GeneratedAssetMetadata>(&text) {
        Ok(metadata) => Ok((Some(metadata), None)),
        Err(error) => Ok((
            None,
            Some(format!("generated-assets JSON 解析失败: {}", error)),
        )),
    }
}

fn create_import_job(
    repo: &ImageWorkbenchRepo,
    directory: &Path,
    candidates: &[ImportCandidate],
) -> AppResult<ImageWorkbenchSnapshot> {
    repo.create_job(NewImageWorkbenchJob {
        mode: "txt2img".to_string(),
        prompt: format!("导入 generated-assets: {}", directory.display()),
        negative_prompt: None,
        task_prompts: candidates
            .iter()
            .map(|candidate| prompt_for_candidate(candidate))
            .collect(),
        quantity: candidates.len() as u32,
        provider_config_id: None,
        model: None,
        size: None,
        reference_asset_ids_json: None,
        source_asset_id: None,
        source_image_path: None,
        mask_path: None,
        person_context_json: None,
        upscale_scale: None,
        fallback_policy: Some("generated-assets-import".to_string()),
        generation_options_json: None,
    })
}

fn create_import_groups(
    repo: &ImageWorkbenchRepo,
    job_id: &str,
    candidates: &[ImportCandidate],
) -> AppResult<HashMap<String, String>> {
    let mut grouped = BTreeMap::<String, Vec<&ImportCandidate>>::new();
    for candidate in candidates {
        grouped
            .entry(group_key(candidate.metadata.as_ref()))
            .or_default()
            .push(candidate);
    }
    let mut map = HashMap::new();
    for (key, items) in grouped {
        let metadata = items.iter().find_map(|item| item.metadata.as_ref());
        let group = repo.create_group(NewImageWorkbenchGroup {
            job_id: job_id.to_string(),
            source_id: metadata.and_then(|item| value_to_string(item.source_id.as_ref())),
            name: metadata
                .and_then(|item| item.group_name.clone())
                .or_else(|| Some("未分组".to_string())),
            r#type: metadata
                .and_then(|item| item.group_type.clone())
                .or_else(|| Some("imported".to_string())),
            agent_preset: metadata
                .and_then(|item| item.agent.as_ref())
                .and_then(|agent| agent.name.clone().or_else(|| agent.id.clone())),
            agent_ids_json: metadata
                .and_then(|item| item.agent.as_ref())
                .and_then(|agent| agent.agent_ids.as_ref())
                .and_then(|ids| serde_json::to_string(ids).ok()),
            base_prompt: metadata.and_then(|item| item.prompt.clone()),
            count: items.len() as u32,
        })?;
        map.insert(key, group.id);
    }
    Ok(map)
}

fn build_import_metadata(candidate: &ImportCandidate) -> Option<NewImageWorkbenchMetadata> {
    let prompt = prompt_for_candidate(candidate);
    let metadata = candidate.metadata.as_ref();
    Some(NewImageWorkbenchMetadata {
        original_prompt: Some(prompt),
        expanded_prompt: metadata.and_then(|item| item.revised_prompt.clone()),
        negative_prompt: None,
        seed: metadata
            .and_then(|item| item.variant.as_ref())
            .and_then(|value| value_to_string(Some(value))),
        model: metadata.and_then(|item| item.model.clone()),
        mode: Some("txt2img".to_string()),
        provider: Some("generated-assets-import".to_string()),
        reference_asset_ids_json: metadata
            .and_then(|item| item.batch_id.as_ref())
            .and_then(|batch_id| serde_json::to_string(&vec![batch_id]).ok()),
        mask_path: None,
        person_context_json: metadata
            .and_then(|item| item.agent.as_ref())
            .and_then(|agent| serde_json::to_string(agent).ok()),
    })
}

fn prompt_for_candidate(candidate: &ImportCandidate) -> String {
    candidate
        .metadata
        .as_ref()
        .and_then(|metadata| metadata.prompt.clone())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| format!("导入资产 {}", candidate.stem))
}

fn group_key(metadata: Option<&GeneratedAssetMetadata>) -> String {
    metadata
        .and_then(|item| value_to_string(item.group_id.as_ref()))
        .or_else(|| metadata.and_then(|item| item.group_name.clone()))
        .unwrap_or_else(|| "ungrouped".to_string())
}

fn build_import_fingerprint(
    image_path: &Path,
    size_bytes: u64,
    metadata: &Option<GeneratedAssetMetadata>,
) -> String {
    if let Some(metadata_id) = metadata
        .as_ref()
        .and_then(|item| item.batch_id.as_ref())
        .map(|batch_id| {
            let task = value_to_string(item_task_id(metadata).as_ref()).unwrap_or_default();
            let variant = metadata
                .as_ref()
                .and_then(|item| item.variant.as_ref())
                .and_then(|value| value_to_string(Some(value)))
                .unwrap_or_default();
            format!("metadata:{batch_id}:{task}:{variant}")
        })
        .filter(|value| value.trim_matches(':') != "metadata")
    {
        return metadata_id;
    }
    let modified_ms = fs::metadata(image_path)
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!(
        "source:{}:{}:{}",
        image_path.to_string_lossy(),
        size_bytes,
        modified_ms
    )
}

fn item_task_id(metadata: &Option<GeneratedAssetMetadata>) -> Option<Value> {
    metadata.as_ref().and_then(|item| item.task_id.clone())
}

fn parse_dimensions(value: Option<&str>) -> (Option<u32>, Option<u32>) {
    let Some(value) = value else {
        return (None, None);
    };
    let normalized = value.replace('×', "x");
    let mut parts = normalized.split('x').map(str::trim);
    let width = parts.next().and_then(|item| item.parse::<u32>().ok());
    let height = parts.next().and_then(|item| item.parse::<u32>().ok());
    (width, height)
}

fn value_to_string(value: Option<&Value>) -> Option<String> {
    match value? {
        Value::String(value) => Some(value.clone()),
        Value::Number(value) => Some(value.to_string()),
        Value::Bool(value) => Some(value.to_string()),
        _ => None,
    }
    .filter(|value| !value.trim().is_empty())
}

fn import_item(
    stem: &str,
    json_path: Option<&PathBuf>,
    image_path: Option<&PathBuf>,
    status: &str,
    integrity_status: &str,
    integrity_error: Option<String>,
) -> ImportImageWorkbenchGeneratedAssetItem {
    ImportImageWorkbenchGeneratedAssetItem {
        stem: stem.to_string(),
        json_path: json_path.map(|path| path.to_string_lossy().to_string()),
        image_path: image_path.map(|path| path.to_string_lossy().to_string()),
        status: status.to_string(),
        asset_id: None,
        job_id: None,
        fingerprint: None,
        integrity_status: integrity_status.to_string(),
        integrity_error,
    }
}

fn now_ms() -> i64 {
    UNIX_EPOCH
        .elapsed()
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infra::path::PathProvider;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_root(name: &str) -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("monster-iw-import-{name}-{stamp}"));
        fs::create_dir_all(&root).expect("temp root");
        root
    }

    fn import_request(dir: &Path) -> ImportImageWorkbenchGeneratedAssetsRequest {
        ImportImageWorkbenchGeneratedAssetsRequest {
            directory_path: dir.to_string_lossy().to_string(),
            limit: None,
            offset: None,
        }
    }

    fn write_pair(dir: &Path, stem: &str, json: &str) {
        fs::write(dir.join(format!("{stem}.json")), json).expect("json");
        fs::write(dir.join(format!("{stem}.png")), b"png").expect("png");
    }

    fn path_provider(root: &Path) -> PathProvider {
        PathProvider::new_for_test(root.to_path_buf(), root.join("monster_workbench.db"))
    }

    #[test]
    fn image_workbench_generated_import_imports_old_schema_and_deduplicates() {
        let root = temp_root("old");
        let dir = root.join("generated-assets");
        fs::create_dir_all(&dir).expect("dir");
        write_pair(
            &dir,
            "old_1",
            r#"{"batchId":"批次一","taskId":"1","variant":1,"prompt":"中文提示","model":"gpt-image-2","size":"1024x1792","revisedPrompt":"扩展中文提示"}"#,
        );

        let first = import_generated_assets(path_provider(&root), import_request(&dir))
            .expect("first import");
        assert_eq!(first.imported, 1);
        assert_eq!(first.duplicates, 0);
        let job_id = first.job_id.expect("job id");
        let repo = ImageWorkbenchRepo::new(root.join("monster_workbench.db"));
        let snapshot = repo.get_snapshot(&job_id).expect("snapshot");
        assert_eq!(snapshot.assets.len(), 1);
        assert_eq!(snapshot.assets[0].integrity_status, "ok");
        assert!(snapshot.metadata[0]
            .original_prompt
            .as_deref()
            .unwrap_or_default()
            .contains("中文提示"));

        let second = import_generated_assets(path_provider(&root), import_request(&dir))
            .expect("second import");
        assert_eq!(second.imported, 0);
        assert_eq!(second.duplicates, 1);
    }

    #[test]
    fn image_workbench_generated_import_preserves_group_metadata() {
        let root = temp_root("group");
        let dir = root.join("generated-assets");
        fs::create_dir_all(&dir).expect("dir");
        write_pair(
            &dir,
            "group_1",
            r#"{"batchId":"b","taskId":"1","variant":2,"groupId":7,"groupName":"废土美女","groupType":"人物资产","sourceId":"theme","agent":{"id":"group-theme","name":"人物资产组 Agent","agentIds":["style","detail"]},"prompt":"废土美女","model":"gpt-image-2","size":"1024x1792"}"#,
        );

        let result =
            import_generated_assets(path_provider(&root), import_request(&dir)).expect("import");
        let job_id = result.job_id.expect("job");
        let repo = ImageWorkbenchRepo::new(root.join("monster_workbench.db"));
        let groups = repo.list_groups(&job_id).expect("groups");
        let imported_group = groups
            .iter()
            .find(|group| group.name.as_deref() == Some("废土美女"))
            .expect("imported group");
        assert_eq!(imported_group.r#type.as_deref(), Some("人物资产"));
        assert_eq!(imported_group.source_id.as_deref(), Some("theme"));
        assert_eq!(
            imported_group.agent_preset.as_deref(),
            Some("人物资产组 Agent")
        );
        let snapshot = repo.get_snapshot(&job_id).expect("snapshot");
        assert_eq!(
            snapshot.assets[0].group_id.as_deref(),
            Some(imported_group.id.as_str())
        );
    }

    #[test]
    fn image_workbench_generated_import_reports_missing_and_corrupt_pairs() {
        let root = temp_root("corrupt");
        let dir = root.join("generated-assets");
        fs::create_dir_all(&dir).expect("dir");
        fs::write(dir.join("json_only.json"), r#"{"prompt":"缺图"}"#).expect("json only");
        fs::write(dir.join("png_only.png"), b"png").expect("png only");
        fs::write(dir.join("bad.json"), "{bad").expect("bad json");
        fs::write(dir.join("bad.png"), b"png").expect("bad png");

        let result =
            import_generated_assets(path_provider(&root), import_request(&dir)).expect("import");
        assert_eq!(result.imported, 2);
        assert_eq!(result.missing, 1);
        assert_eq!(result.corrupt, 2);
        assert_eq!(result.failed, 1);
        assert!(result
            .items
            .iter()
            .any(|item| item.stem == "json_only" && item.integrity_status == "missing"));
        let job_id = result.job_id.expect("job");
        let repo = ImageWorkbenchRepo::new(root.join("monster_workbench.db"));
        let snapshot = repo.get_snapshot(&job_id).expect("snapshot");
        assert_eq!(snapshot.assets.len(), 2);
        assert!(snapshot
            .assets
            .iter()
            .all(|asset| asset.integrity_status == "corrupt"));
    }

    #[test]
    fn image_workbench_generated_import_paginates_scan_results() {
        let root = temp_root("page");
        let dir = root.join("generated-assets");
        fs::create_dir_all(&dir).expect("dir");
        write_pair(&dir, "a", r#"{"prompt":"A","size":"512x512"}"#);
        write_pair(&dir, "b", r#"{"prompt":"B","size":"512x512"}"#);
        write_pair(&dir, "c", r#"{"prompt":"C","size":"512x512"}"#);

        let mut request = import_request(&dir);
        request.offset = Some(1);
        request.limit = Some(2);
        let result = import_generated_assets(path_provider(&root), request).expect("import");
        assert_eq!(result.scanned, 2);
        assert_eq!(result.imported, 2);
        assert!(result.items.iter().any(|item| item.stem == "b"));
        assert!(result.items.iter().any(|item| item.stem == "c"));
    }
}
