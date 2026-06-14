import { callTauri } from "./tauri";
import type {
  CreateImageWorkbenchJobRequest,
  ImageWorkbenchAsset,
  ImageWorkbenchContractSummary,
  ImageWorkbenchJob,
  ImageWorkbenchSnapshot,
  ImageWorkbenchTemplate,
  RecordImageWorkbenchAssetRequest,
  SaveImageWorkbenchTemplateRequest,
  SetImageWorkbenchAssetFavoriteRequest,
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

  async setAssetFavorite(
    request: SetImageWorkbenchAssetFavoriteRequest
  ): Promise<ImageWorkbenchSnapshot> {
    return callTauri<ImageWorkbenchSnapshot>("set_image_workbench_asset_favorite", { request });
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
