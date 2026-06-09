# Asset Versioning and Provenance：资产版本与来源追踪

## 1. 目的

小说、剧本、分镜、角色、场景、道具和图片资产必须可追溯。

## 2. 建议资产字段

在 assets 或 metadata_json 中支持：

```text
version
parent_asset_id
source_task_id
source_goal_id
prompt_version_id
model_run_id
review_status
provenance_json
```

## 3. asset_links

使用 asset_links 表示资产关系：

```text
derived_from
revision_of
review_of
summary_of
uses_character
uses_scene
uses_prop
part_of
depends_on
visualizes
describes
```

## 4. 版本策略

不要覆盖旧资产。返工或改写应创建新版本：

```text
asset v1
asset v2 revision_of v1
asset v3 revision_of v2
```

## 5. Bible 特殊规则

locked Bible 不得被自动修改。修改 locked Bible 必须创建 revision draft 并人工审核。
