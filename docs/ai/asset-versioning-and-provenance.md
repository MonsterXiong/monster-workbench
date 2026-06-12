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

## 5. 当前图片存储与 URL 映射

当前代码事实：

- AI Provider 生图测试由 `AiProviderService` 创建应用本地数据目录下的 `ai/generated` 输出目录，并在运行前做最大文件数和过期文件清理。
- Creative batch 真实生图同样使用应用本地数据目录下的 `ai/generated`，由 Rust 把授权输出目录传给 Python sidecar。
- Python sidecar 只返回文件引用；Rust 在 `settle_batch_image_sidecar_response` 中校验输出文件 canonical path 仍位于授权目录内，再复制 thumbnail、创建 `assets`、绑定 `model_runs`，并写 `task_events` / task status。
- `assets.file_path` / `assets.thumbnail_path` 只保存路径；大图不进入 DB，也不进入 task event payload。
- AI Provider 前端由 `ai.service.ts` 把 `imagePaths` 转成 `convertFileSrc()` 后展示。
- Creative batch 前端由 `creative-batch` store 从 task `resultJson.filePath` / `thumbnailPath` 解析路径，并经 `resolveDisplayImageSrc()` / `convertFileSrc()` 映射为可显示 URL。

当前边界：

- 不要假定存在 `tauri://localhost/assets/{assetId}/thumbnail.webp` 这类资产服务 URL，除非后续明确实现 Rust 侧 asset URL resolver。
- 不要把 `assetProtocol.scope` 放宽到 `$HOME/**/*` 来解决预览问题；预览应继续走受控路径和 `convertFileSrc()`。
- Creative batch 输出目录目前与 AI Provider 测试共用 `ai/generated`，但只有 AI Provider 路径有文件数和过期清理；正式资产库需要单独设计项目级目录、保留期、导出和归档策略。

## 6. 当前 creative_projects 归档边界

当前代码事实：

- `creative_projects` 已有 `status` 和 `archived_at` 字段，并支持 upsert、get、按 status list。
- `creative_tasks`、`assets`、`batch_jobs`、`creative_goals` 仍通过字符串 `project_id` 关联项目，没有 DB-level FK。
- 当前没有专门的 archive command，也没有项目归档时对 task、asset、batch、goal 或物理图片文件的级联传播。
- 前端项目 store 负责 seed bootstrap、项目列表、项目 index/history 聚合查询；归档项目是否隐藏、是否只读、是否允许继续创建任务还未形成统一契约。

后续实现项目归档前，必须先定义：

- `status = archived` 与 `archived_at` 是否必须同步写入和同步清除。
- 归档项目是否只影响列表过滤，还是同时阻止新增 task / asset / batch / goal。
- 归档是否保留物理图片文件，是否移动到项目目录，是否影响导入导出。
- 旧库中无 FK 的 `project_id` 字符串如何迁移到稳定项目键或 FK。
- 归档传播失败时的恢复和回滚规则。

在这些规则落地前，`creative_projects` 只能视为项目索引与聚合视图事实源的雏形，不能视为完整项目生命周期控制面。

## 7. Bible 特殊规则

locked Bible 不得被自动修改。修改 locked Bible 必须创建 revision draft 并人工审核。
