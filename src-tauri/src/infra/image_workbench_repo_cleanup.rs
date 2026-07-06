use super::*;

impl ImageWorkbenchRepo {
    pub fn delete_invalid_assets_by_ids(&self, asset_ids: &[String]) -> AppResult<u32> {
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
                super::image_workbench_repo_assets::refresh_asset_delivery_status(
                    &tx,
                    parent_asset_id,
                )?;
            }
        }
        tx.commit()?;
        Ok(assets.len() as u32)
    }
}
