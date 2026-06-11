use crate::infra::creative_project_repo;
use crate::infra::creative_types::{
    CreativeProject, ListCreativeProjectsFilter, UpsertCreativeProjectInput,
};
use crate::infra::path::PathProvider;
use crate::infra::AppResult;

pub struct CreativeProjectService {
    path_provider: PathProvider,
}

impl CreativeProjectService {
    pub fn new(path_provider: PathProvider) -> Self {
        Self { path_provider }
    }

    pub fn upsert_project(&self, input: UpsertCreativeProjectInput) -> AppResult<CreativeProject> {
        creative_project_repo::upsert_project(&self.db_path()?, input)
    }

    pub fn get_project(&self, id: &str) -> AppResult<Option<CreativeProject>> {
        creative_project_repo::get_project(&self.db_path()?, id)
    }

    pub fn list_projects(
        &self,
        filter: ListCreativeProjectsFilter,
    ) -> AppResult<Vec<CreativeProject>> {
        creative_project_repo::list_projects(&self.db_path()?, filter)
    }

    fn db_path(&self) -> AppResult<std::path::PathBuf> {
        self.path_provider.get_db_file_path()
    }
}
