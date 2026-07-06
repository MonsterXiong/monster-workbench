use super::*;

impl ImageWorkbenchRepo {
    pub fn list_templates(&self) -> AppResult<Vec<ImageWorkbenchTemplate>> {
        let conn = self.connect()?;
        let mut stmt = conn.prepare(
            "SELECT id, name, prompt, negative_prompt, mode, is_system, created_at_ms, updated_at_ms
             FROM image_workbench_templates
             ORDER BY is_system DESC, updated_at_ms DESC, name ASC",
        )?;
        let rows = stmt.query_map([], map_template)?;
        collect_rows(rows)
    }

    pub fn save_template(
        &self,
        input: NewImageWorkbenchTemplate,
    ) -> AppResult<ImageWorkbenchTemplate> {
        let conn = self.connect()?;
        let now = now_ms();
        let id = input.id.unwrap_or_else(|| next_id("iw-template"));
        let existing = image_workbench_query::get_template_optional(&conn, &id)?;
        if existing.as_ref().is_some_and(|template| template.is_system) {
            return Err(AppError::Permission("系统模板不能被覆盖".to_string()));
        }

        if existing.is_some() {
            conn.execute(
                "UPDATE image_workbench_templates
                 SET name = ?, prompt = ?, negative_prompt = ?, mode = ?, updated_at_ms = ?
                 WHERE id = ?",
                params![
                    input.name,
                    input.prompt,
                    input.negative_prompt,
                    input.mode,
                    now,
                    id
                ],
            )?;
        } else {
            conn.execute(
                "INSERT INTO image_workbench_templates
                    (id, name, prompt, negative_prompt, mode, is_system, created_at_ms, updated_at_ms)
                 VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
                params![
                    id,
                    input.name,
                    input.prompt,
                    input.negative_prompt,
                    input.mode,
                    now,
                    now
                ],
            )?;
        }

        image_workbench_query::get_template(&conn, &id)
    }

    pub fn delete_template(&self, template_id: &str) -> AppResult<()> {
        let conn = self.connect()?;
        let template = image_workbench_query::get_template(&conn, template_id)?;
        if template.is_system {
            return Err(AppError::Permission("系统模板不能删除".to_string()));
        }
        conn.execute(
            "DELETE FROM image_workbench_templates WHERE id = ?",
            params![template_id],
        )?;
        Ok(())
    }
}
