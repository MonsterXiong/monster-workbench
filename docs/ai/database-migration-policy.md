# Database Migration Policy：数据库迁移策略

## 1. 总原则

- 沿用项目现有 SQLite / migration 机制。
- 优先新增表和字段，避免破坏性修改。
- 不删除旧表、旧字段，除非有明确迁移和备份方案。
- migration 必须幂等或可检测已执行状态。
- 不得破坏现有 AI Provider、导航、日志、设置等已有数据库能力。

## 2. 命名建议

如项目已有规范，必须沿用。

若无明确规范，建议：

```text
YYYYMMDDHHMM_add_creative_tasks.sql
YYYYMMDDHHMM_add_assets.sql
YYYYMMDDHHMM_add_batch_jobs.sql
```

## 3. 破坏性操作

以下操作默认禁止自动执行：

```sql
DROP TABLE
DROP COLUMN
DELETE FROM table
UPDATE table SET ... -- 无 WHERE
ALTER COLUMN 类型变更
```

如确实需要，必须生成 migration draft、说明风险、备份旧数据、人工批准，并记录事件。

## 4. 字段策略

- 新字段优先允许 NULL 或设置默认值；
- JSON 字段统一使用 `*_json`；
- 不在 migration 中写入大对象；
- 不在事务中等待模型 API；
- 不在事务中做图片下载或缩略图生成。

## 5. 索引策略

常用查询建议加索引：

```text
project_id
status
task_type
goal_id
batch_job_id
asset_type
source_task_id
created_at
```

## 6. Codex 要求

执行任何 DB Goal 前，必须先阅读现有 migration 机制并给出最小迁移计划。
