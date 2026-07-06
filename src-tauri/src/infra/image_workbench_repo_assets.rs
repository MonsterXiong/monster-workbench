use super::*;

impl ImageWorkbenchRepo {
    pub fn list_recent_assets(&self, limit: u32) -> AppResult<Vec<ImageWorkbenchAsset>> {
        self.query_assets(ImageWorkbenchAssetQuery {
            limit,
            ..Default::default()
        })
    }

    pub fn list_deleted_job_assets(&self, limit: u32) -> AppResult<Vec<ImageWorkbenchAsset>> {
        let conn = self.connect()?;
        image_workbench_query::list_deleted_job_assets(&conn, limit)
    }

    pub fn query_assets(
        &self,
        query: ImageWorkbenchAssetQuery,
    ) -> AppResult<Vec<ImageWorkbenchAsset>> {
        let conn = self.connect()?;
        image_workbench_query::query_assets(&conn, &query)
    }

    pub fn get_asset_by_id(&self, asset_id: &str) -> AppResult<ImageWorkbenchAsset> {
        let conn = self.connect()?;
        image_workbench_query::get_asset(&conn, asset_id)
    }

    pub fn get_asset_by_import_fingerprint(
        &self,
        fingerprint: &str,
    ) -> AppResult<Option<ImageWorkbenchAsset>> {
        let conn = self.connect()?;
        image_workbench_query::get_asset_by_import_fingerprint(&conn, fingerprint)
    }

    pub fn update_asset_integrity_many(
        &self,
        patches: &[(String, String, Option<String>, i64)],
    ) -> AppResult<()> {
        if patches.is_empty() {
            return Ok(());
        }
        let mut conn = self.connect()?;
        let tx = conn.transaction()?;
        for (asset_id, status, error, checked_at_ms) in patches {
            tx.execute(
                "UPDATE image_workbench_assets
                 SET integrity_status = ?,
                     integrity_error = ?,
                     integrity_checked_at_ms = ?
                 WHERE id = ?",
                params![status, error, checked_at_ms, asset_id],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn delete_assets_by_ids(&self, asset_ids: &[String]) -> AppResult<u32> {
        if asset_ids.is_empty() {
            return Ok(0);
        }

        let mut conn = self.connect()?;
        let mut assets = Vec::new();
        for asset_id in asset_ids {
            if let Ok(asset) = image_workbench_query::get_asset(&conn, asset_id) {
                assets.push(asset);
            }
        }
        if assets.is_empty() {
            return Ok(0);
        }

        let now = now_ms();
        let tx = conn.transaction()?;
        for asset in &assets {
            tx.execute(
                "UPDATE image_workbench_assets
                 SET parent_asset_id = NULL,
                     root_asset_id = NULL,
                     delivery_status = NULL
                 WHERE parent_asset_id = ?
                    OR root_asset_id = ?",
                params![asset.id, asset.id],
            )?;
        }
        for asset in &assets {
            tx.execute(
                "DELETE FROM image_workbench_assets WHERE id = ?",
                params![asset.id],
            )?;
            tx.execute(
                "UPDATE image_workbench_jobs
                 SET updated_at_ms = ?
                 WHERE id = ?",
                params![now, asset.job_id],
            )?;
            if let Some(parent_asset_id) = &asset.parent_asset_id {
                refresh_asset_delivery_status(&tx, parent_asset_id)?;
            }
        }
        tx.commit()?;
        Ok(assets.len() as u32)
    }

    pub fn record_asset(
        &self,
        asset: NewImageWorkbenchAsset,
        metadata: Option<NewImageWorkbenchMetadata>,
        model_run: Option<NewImageWorkbenchModelRun>,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let mut conn = self.connect()?;
        let now = now_ms();
        let task = image_workbench_query::get_task(&conn, &asset.task_id)?;
        let asset_id = next_id("iw-asset");
        let job_id = task.job_id.clone();

        let job = image_workbench_query::get_job(&conn, &job_id)?;
        let lineage = image_workbench_query::resolve_lineage(&conn, &job)?;
        let group_id = asset.group_id.clone().or(task.group_id.clone());
        let parent_asset_id = asset.parent_asset_id.clone().or(lineage.parent_asset_id);
        let root_asset_id = asset.root_asset_id.clone().or(lineage.root_asset_id);
        let version_index = asset.version_index.or(lineage.version_index);
        let parent_asset_id_for_delivery = parent_asset_id.clone();

        let tx = conn.transaction()?;
        tx.execute(
            "INSERT INTO image_workbench_assets
                (id, job_id, task_id, file_path, thumbnail_path, width, height, mime_type, size_bytes, favorite, created_at_ms,
                 group_id, rating, parent_asset_id, root_asset_id, version_index, delivery_status, quality_issues_json, integrity_status, integrity_error, integrity_checked_at_ms,
                 import_fingerprint, import_source_path)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, NULL, NULL, 'ok', NULL, ?, ?, ?)",
            params![
                asset_id,
                job_id,
                asset.task_id,
                asset.file_path,
                asset.thumbnail_path,
                asset.width.map(|value| value as i64),
                asset.height.map(|value| value as i64),
                asset.mime_type,
                asset.size_bytes.map(|value| value as i64),
                now,
                group_id,
                asset.rating.map(|value| value as i64),
                parent_asset_id,
                root_asset_id,
                version_index.map(|value| value as i64),
                now,
                asset.import_fingerprint,
                asset.import_source_path
            ],
        )?;

        if let Some(parent_asset_id) = parent_asset_id_for_delivery {
            refresh_asset_delivery_status(&tx, &parent_asset_id)?;
        }

        if let Some(metadata) = metadata {
            tx.execute(
                "INSERT INTO image_workbench_metadata
                    (id, asset_id, task_id, original_prompt, expanded_prompt, negative_prompt, seed, model, mode, provider, reference_asset_ids_json, mask_path, person_context_json, created_at_ms)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    next_id("iw-meta"),
                    asset_id,
                    asset.task_id,
                    metadata.original_prompt,
                    metadata.expanded_prompt,
                    metadata.negative_prompt,
                    metadata.seed,
                    metadata.model,
                    metadata.mode,
                    metadata.provider,
                    metadata.reference_asset_ids_json,
                    metadata.mask_path,
                    metadata.person_context_json,
                    now
                ],
            )?;
        }

        if let Some(model_run) = model_run {
            tx.execute(
                "INSERT INTO image_workbench_model_runs
                    (id, job_id, task_id, provider, model, capability, status, latency_ms, request_json, response_preview, error, created_at_ms, finished_at_ms)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    next_id("iw-run"),
                    job_id,
                    asset.task_id,
                    model_run.provider,
                    model_run.model,
                    model_run.capability,
                    model_run.status.unwrap_or_else(|| "succeeded".to_string()),
                    model_run.latency_ms.map(|value| value as i64),
                    model_run.request_json,
                    model_run.response_preview,
                    model_run.error,
                    now,
                    Some(now)
                ],
            )?;
        }
        tx.commit()?;

        self.get_snapshot(&job_id)
    }

    pub fn set_asset_favorite(
        &self,
        asset_id: &str,
        favorite: bool,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let mut conn = self.connect()?;
        let asset = image_workbench_query::get_asset(&conn, asset_id)?;
        let now = now_ms();
        let tx = conn.transaction()?;
        tx.execute(
            "UPDATE image_workbench_assets
             SET favorite = ?
             WHERE id = ?",
            params![if favorite { 1 } else { 0 }, asset_id],
        )?;
        refresh_asset_delivery_status(&tx, asset_id)?;
        tx.execute(
            "UPDATE image_workbench_jobs
             SET updated_at_ms = ?
             WHERE id = ?",
            params![now, asset.job_id],
        )?;
        tx.commit()?;
        self.get_snapshot(&asset.job_id)
    }

    #[allow(dead_code)]
    pub fn set_asset_rating(
        &self,
        asset_id: &str,
        rating: Option<u32>,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let conn = self.connect()?;
        let asset = image_workbench_query::get_asset(&conn, asset_id)?;
        let now = now_ms();
        conn.execute(
            "UPDATE image_workbench_assets
             SET rating = ?
             WHERE id = ?",
            params![rating.map(|value| value as i64), asset_id],
        )?;
        conn.execute(
            "UPDATE image_workbench_jobs
             SET updated_at_ms = ?
             WHERE id = ?",
            params![now, asset.job_id],
        )?;
        self.get_snapshot(&asset.job_id)
    }

    pub fn set_asset_quality_issues(
        &self,
        asset_id: &str,
        quality_issues: &[String],
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let conn = self.connect()?;
        let asset = image_workbench_query::get_asset(&conn, asset_id)?;
        let now = now_ms();
        let quality_issues_json = if quality_issues.is_empty() {
            None
        } else {
            Some(serde_json::to_string(quality_issues).map_err(|error| {
                AppError::Database(format!("图片质检标签序列化失败: {}", error))
            })?)
        };
        conn.execute(
            "UPDATE image_workbench_assets
             SET quality_issues_json = ?
             WHERE id = ?",
            params![quality_issues_json, asset_id],
        )?;
        conn.execute(
            "UPDATE image_workbench_jobs
             SET updated_at_ms = ?
             WHERE id = ?",
            params![now, asset.job_id],
        )?;
        self.get_snapshot(&asset.job_id)
    }
}

pub(super) fn refresh_asset_delivery_status(conn: &Connection, asset_id: &str) -> AppResult<()> {
    conn.execute(
        "UPDATE image_workbench_assets
         SET delivery_status = CASE
             WHEN favorite = 1
                  AND parent_asset_id IS NOT NULL
                  AND EXISTS (
                      SELECT 1
                      FROM image_workbench_assets parent
                      WHERE parent.id = image_workbench_assets.parent_asset_id
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM image_workbench_assets child
                      WHERE child.parent_asset_id = image_workbench_assets.id
                  )
             THEN 'ready'
             ELSE NULL
         END
         WHERE id = ?",
        params![asset_id],
    )?;
    Ok(())
}
