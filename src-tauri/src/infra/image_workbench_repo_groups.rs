use super::*;
use rusqlite::OptionalExtension;

impl ImageWorkbenchRepo {
    /// 创建资产组。本轮仅落存储与读写，grouped job 业务编排留后续轮次。
    /// command 接入留后续轮次，本轮由 repo 单测覆盖。
    #[allow(dead_code)]
    pub fn create_group(&self, input: NewImageWorkbenchGroup) -> AppResult<ImageWorkbenchGroup> {
        let conn = self.connect()?;
        image_workbench_query::get_job(&conn, &input.job_id)?;
        let now = now_ms();
        let group_id = next_id("iw-group");
        conn.execute(
            "INSERT INTO image_workbench_groups
                (id, job_id, source_id, name, type, agent_preset, agent_ids_json, base_prompt,
                 count, created_at_ms, updated_at_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                group_id,
                input.job_id,
                input.source_id,
                input.name,
                input.r#type,
                input.agent_preset,
                input.agent_ids_json,
                input.base_prompt,
                input.count as i64,
                now,
                now
            ],
        )?;
        image_workbench_query::get_group(&conn, &group_id)
    }

    pub fn tag_assets_group(
        &self,
        input: TagImageWorkbenchAssetsGroupInput,
    ) -> AppResult<TagImageWorkbenchAssetsGroupResult> {
        if input.asset_ids.is_empty() {
            return Ok(TagImageWorkbenchAssetsGroupResult {
                tagged_assets: 0,
                groups: Vec::new(),
            });
        }

        let mut conn = self.connect()?;
        let mut assets = Vec::new();
        for asset_id in input.asset_ids {
            if assets
                .iter()
                .any(|asset: &ImageWorkbenchAsset| asset.id == asset_id)
            {
                continue;
            }
            if let Ok(asset) = image_workbench_query::get_asset(&conn, &asset_id) {
                assets.push(asset);
            }
        }
        if assets.is_empty() {
            return Ok(TagImageWorkbenchAssetsGroupResult {
                tagged_assets: 0,
                groups: Vec::new(),
            });
        }

        let now = now_ms();
        let tx = conn.transaction()?;
        let mut target_group_by_job = HashMap::<String, String>::new();
        let mut affected_group_ids = HashSet::<String>::new();
        assets
            .iter()
            .filter_map(|asset| asset.group_id.clone())
            .for_each(|group_id| {
                affected_group_ids.insert(group_id);
            });
        if let Some(group_id) = input.group_id.filter(|value| !value.trim().is_empty()) {
            let group = image_workbench_query::get_group(&tx, group_id.trim())?;
            for asset in &assets {
                if asset.job_id != group.job_id {
                    return Err(AppError::Config(
                        "Cannot move assets from different jobs into one existing group"
                            .to_string(),
                    ));
                }
            }
            target_group_by_job.insert(group.job_id, group.id);
        } else {
            let group_name = input
                .group_name
                .map(|value| truncate_chars(&value, 80))
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| AppError::Config("Image group name cannot be empty".to_string()))?;
            for asset in &assets {
                if target_group_by_job.contains_key(&asset.job_id) {
                    continue;
                }
                let existing_group_id = tx
                    .query_row(
                        "SELECT id
                         FROM image_workbench_groups
                         WHERE job_id = ?
                           AND name = ?
                           AND type = 'manual'
                         ORDER BY updated_at_ms DESC, created_at_ms DESC
                         LIMIT 1",
                        params![asset.job_id, group_name],
                        |row| row.get::<_, String>(0),
                    )
                    .optional()?;
                let group_id = if let Some(group_id) = existing_group_id {
                    group_id
                } else {
                    let group_id = next_id("iw-group");
                    tx.execute(
                        "INSERT INTO image_workbench_groups
                            (id, job_id, source_id, name, type, agent_preset, agent_ids_json, base_prompt,
                             count, created_at_ms, updated_at_ms)
                         VALUES (?, ?, NULL, ?, 'manual', NULL, NULL, NULL, 0, ?, ?)",
                        params![group_id, asset.job_id, group_name, now, now],
                    )?;
                    group_id
                };
                target_group_by_job.insert(asset.job_id.clone(), group_id);
            }
        }

        for asset in &assets {
            let Some(group_id) = target_group_by_job.get(&asset.job_id) else {
                continue;
            };
            tx.execute(
                "UPDATE image_workbench_assets
                 SET group_id = ?
                 WHERE id = ?",
                params![group_id, asset.id],
            )?;
            tx.execute(
                "UPDATE image_workbench_jobs
                 SET updated_at_ms = ?
                 WHERE id = ?",
                params![now, asset.job_id],
            )?;
        }

        target_group_by_job.values().for_each(|group_id| {
            affected_group_ids.insert(group_id.clone());
        });
        for group_id in &affected_group_ids {
            tx.execute(
                "UPDATE image_workbench_groups
                 SET count = (
                         SELECT COUNT(*)
                         FROM image_workbench_assets
                         WHERE group_id = ?
                     ),
                     updated_at_ms = ?
                 WHERE id = ?",
                params![group_id, now, group_id],
            )?;
        }

        let groups = target_group_by_job
            .values()
            .filter_map(|group_id| image_workbench_query::get_group(&tx, group_id).ok())
            .collect::<Vec<_>>();
        tx.commit()?;
        Ok(TagImageWorkbenchAssetsGroupResult {
            tagged_assets: assets.len() as u32,
            groups,
        })
    }

    #[allow(dead_code)]
    pub fn list_groups(&self, job_id: &str) -> AppResult<Vec<ImageWorkbenchGroup>> {
        let conn = self.connect()?;
        image_workbench_query::list_groups(&conn, job_id)
    }

    #[allow(dead_code)]
    pub fn get_group_by_id(&self, group_id: &str) -> AppResult<ImageWorkbenchGroup> {
        let conn = self.connect()?;
        image_workbench_query::get_group(&conn, group_id)
    }

    pub fn list_assets_by_group_marker(
        &self,
        group_id: Option<&str>,
        group_name: Option<&str>,
    ) -> AppResult<Vec<ImageWorkbenchAsset>> {
        let conn = self.connect()?;
        image_workbench_query::list_assets_by_group_marker(&conn, group_id, group_name)
    }

    pub fn list_groups_by_marker(
        &self,
        group_id: Option<&str>,
        group_name: Option<&str>,
    ) -> AppResult<Vec<ImageWorkbenchGroup>> {
        let conn = self.connect()?;
        image_workbench_query::list_groups_by_marker(&conn, group_id, group_name)
    }
}
