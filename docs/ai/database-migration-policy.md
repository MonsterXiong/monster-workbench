# Database Migration Policy：数据库迁移策略

## 1. 总原则

- 沿用项目现有 SQLite / migration 机制。
- 优先新增表和字段，避免破坏性修改。
- 不删除旧表、旧字段，除非有明确迁移和备份方案。
- migration 必须幂等或可检测已执行状态。
- 不得破坏现有 AI Provider、导航、日志、设置等已有数据库能力。

## 2. 当前实现与命名

当前 creative 主库迁移不是独立 SQL 文件目录，而是在 Rust 内维护：

- `src-tauri/src/infra/creative_db_schema.rs` 定义 `MIGRATIONS` 列表。
- 每个迁移包含递增 `version`、稳定 `name` 和 `apply_*` 函数。
- `schema_migrations(version, name, applied_at)` 记录已执行版本。
- 兼容旧库字段补齐通过 `creative_db_support::ensure_column()` 完成。
- `src-tauri/src/infra/creative_db_tests.rs` 只承载 schema / migration 回归。

新增 migration 时沿用当前 Rust 内联机制；只有在明确重构迁移框架时，才新增独立 SQL migration 文件目录。

当前已落地迁移：

| version | name |
|---|---|
| 1 | `bootstrap_creative_schema` |
| 2 | `add_creative_task_goal_batch_columns` |
| 3 | `add_creative_projects` |
| 4 | `add_creative_task_worker_lease_columns` |

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

涉及 worker ownership / lease、project FK 或 asset provenance 的 schema 变更时，必须同时给出旧库兼容矩阵，至少覆盖：

- 新库首次初始化。
- 只有早期 `creative_tasks` 的旧库。
- 当前完整 schema 但缺少新增字段的旧库。
- 已存在 `running` / `cancelling` task 的旧库。
- 已存在 project / asset / batch / goal 数据且 `project_id` 仍为字符串的旧库。
