import { callTauri } from "./tauri";

export interface CreativeProject {
  id: string;
  title: string;
  description: string | null;
  status: string;
  settingsJson: string | null;
  budgetJson: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface UpsertCreativeProjectInput {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  settingsJson?: string | null;
  budgetJson?: string | null;
  archivedAt?: string | null;
}

export interface ListCreativeProjectsFilter {
  status?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export const creativeProjectService = {
  upsertProject: (input: UpsertCreativeProjectInput) =>
    callTauri<CreativeProject>("upsert_creative_project", { input }),
  getProject: (id: string) => callTauri<CreativeProject | null>("get_creative_project", { id }),
  listProjects: (filter: ListCreativeProjectsFilter = {}) =>
    callTauri<CreativeProject[]>("list_creative_projects", { filter }),
};
