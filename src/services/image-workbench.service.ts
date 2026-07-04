import { callTauri } from "./tauri";
import type {
  CleanupImageWorkbenchDeletedAssetsResult,
  CleanupImageWorkbenchInvalidAssetsResult,
  CreateImageWorkbenchJobRequest,
  ImageWorkbenchAsset,
  ImageWorkbenchContractSummary,
  ImageWorkbenchGroup,
  ImageWorkbenchJob,
  ImportImageWorkbenchGeneratedAssetsRequest,
  ImportImageWorkbenchGeneratedAssetsResult,
  ImportImageWorkbenchReferenceRequest,
  ImportImageWorkbenchReferenceResult,
  QueryImageWorkbenchAssetsRequest,
  SaveImageWorkbenchMaskRequest,
  SaveImageWorkbenchMaskResult,
  ImageWorkbenchSnapshot,
  ImageWorkbenchTemplate,
  RecordImageWorkbenchAssetRequest,
  SaveImageWorkbenchTemplateRequest,
  SetImageWorkbenchAssetFavoriteRequest,
  SetImageWorkbenchAssetQualityIssuesRequest,
  SetImageWorkbenchAssetRatingRequest,
  UpdateImageWorkbenchTaskStatusRequest,
} from "../types/image-workbench";

export const imageWorkbenchService = {
  async getContract(): Promise<ImageWorkbenchContractSummary> {
    return callTauri<ImageWorkbenchContractSummary>("get_image_workbench_contract");
  },

  async createJob(request: CreateImageWorkbenchJobRequest): Promise<ImageWorkbenchSnapshot> {
    return callTauri<ImageWorkbenchSnapshot>("create_image_workbench_job", { request });
  },

  async listJobs(limit = 50): Promise<ImageWorkbenchJob[]> {
    return callTauri<ImageWorkbenchJob[]>("list_image_workbench_jobs", { limit });
  },

  async listAssets(limit = 100): Promise<ImageWorkbenchAsset[]> {
    return callTauri<ImageWorkbenchAsset[]>("list_image_workbench_assets", { limit });
  },

  async queryAssets(request: QueryImageWorkbenchAssetsRequest): Promise<ImageWorkbenchAsset[]> {
    return callTauri<ImageWorkbenchAsset[]>("query_image_workbench_assets", { request });
  },

  async listGroups(jobId: string): Promise<ImageWorkbenchGroup[]> {
    return callTauri<ImageWorkbenchGroup[]>("list_image_workbench_groups", { jobId });
  },

  async importReference(
    request: ImportImageWorkbenchReferenceRequest
  ): Promise<ImportImageWorkbenchReferenceResult> {
    return callTauri<ImportImageWorkbenchReferenceResult>("import_image_workbench_reference", { request });
  },

  async importGeneratedAssets(
    request: ImportImageWorkbenchGeneratedAssetsRequest
  ): Promise<ImportImageWorkbenchGeneratedAssetsResult> {
    return callTauri<ImportImageWorkbenchGeneratedAssetsResult>("import_image_workbench_generated_assets", { request });
  },

  async recoverInterruptedJobs(): Promise<number> {
    return callTauri<number>("recover_image_workbench_interrupted_jobs");
  },

  async getJobSnapshot(jobId: string): Promise<ImageWorkbenchSnapshot> {
    return callTauri<ImageWorkbenchSnapshot>("get_image_workbench_job_snapshot", { jobId });
  },

  async updateTaskStatus(
    request: UpdateImageWorkbenchTaskStatusRequest
  ): Promise<ImageWorkbenchSnapshot> {
    return callTauri<ImageWorkbenchSnapshot>("update_image_workbench_task_status", { request });
  },

  async startJobRunner(jobId: string): Promise<ImageWorkbenchSnapshot> {
    return callTauri<ImageWorkbenchSnapshot>("start_image_workbench_job_runner", { jobId });
  },

  async recordTaskAsset(
    request: RecordImageWorkbenchAssetRequest
  ): Promise<ImageWorkbenchSnapshot> {
    return callTauri<ImageWorkbenchSnapshot>("record_image_workbench_task_asset", { request });
  },

  async cancelJob(jobId: string): Promise<ImageWorkbenchSnapshot> {
    return callTauri<ImageWorkbenchSnapshot>("cancel_image_workbench_job", { jobId });
  },

  async cancelTask(taskId: string): Promise<ImageWorkbenchSnapshot> {
    return callTauri<ImageWorkbenchSnapshot>("cancel_image_workbench_task", { taskId });
  },

  async retryFailedTasks(jobId: string): Promise<ImageWorkbenchSnapshot> {
    return callTauri<ImageWorkbenchSnapshot>("retry_image_workbench_failed_tasks", { jobId });
  },

  async deleteJob(jobId: string): Promise<void> {
    return callTauri<void>("delete_image_workbench_job", { jobId });
  },

  async exportJob(jobId: string): Promise<string> {
    return callTauri<string>("export_image_workbench_job", { jobId });
  },

  async exportAsset(assetId: string): Promise<string> {
    return callTauri<string>("export_image_workbench_asset", { assetId });
  },

  async cleanupDeletedAssets(): Promise<CleanupImageWorkbenchDeletedAssetsResult> {
    return callTauri<CleanupImageWorkbenchDeletedAssetsResult>("cleanup_image_workbench_deleted_assets");
  },

  async cleanupInvalidAssets(): Promise<CleanupImageWorkbenchInvalidAssetsResult> {
    return callTauri<CleanupImageWorkbenchInvalidAssetsResult>("cleanup_image_workbench_invalid_assets");
  },

  async saveMask(request: SaveImageWorkbenchMaskRequest): Promise<SaveImageWorkbenchMaskResult> {
    return callTauri<SaveImageWorkbenchMaskResult>("save_image_workbench_mask", { request });
  },

  async setAssetFavorite(
    request: SetImageWorkbenchAssetFavoriteRequest
  ): Promise<ImageWorkbenchSnapshot> {
    return callTauri<ImageWorkbenchSnapshot>("set_image_workbench_asset_favorite", { request });
  },

  async setAssetRating(
    request: SetImageWorkbenchAssetRatingRequest
  ): Promise<ImageWorkbenchSnapshot> {
    return callTauri<ImageWorkbenchSnapshot>("set_image_workbench_asset_rating", { request });
  },

  async setAssetQualityIssues(
    request: SetImageWorkbenchAssetQualityIssuesRequest
  ): Promise<ImageWorkbenchSnapshot> {
    return callTauri<ImageWorkbenchSnapshot>("set_image_workbench_asset_quality_issues", { request });
  },

  async listTemplates(): Promise<ImageWorkbenchTemplate[]> {
    return callTauri<ImageWorkbenchTemplate[]>("list_image_workbench_templates");
  },

  async saveTemplate(request: SaveImageWorkbenchTemplateRequest): Promise<ImageWorkbenchTemplate> {
    return callTauri<ImageWorkbenchTemplate>("save_image_workbench_template", { request });
  },

  async deleteTemplate(templateId: string): Promise<void> {
    return callTauri<void>("delete_image_workbench_template", { templateId });
  },
};
