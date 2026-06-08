use crate::infra::logger::LoggerInfra;
use crate::infra::path::PathProvider;
use crate::infra::AppResult;

pub struct LogService {
    logger_infra: LoggerInfra,
}

impl LogService {
    pub fn new(path_provider: PathProvider) -> Self {
        Self {
            logger_infra: LoggerInfra::new(path_provider),
        }
    }

    pub fn write_log(&self, file_name: &str, line: &str) -> AppResult<()> {
        self.logger_infra.write_log(file_name, line)
    }

    pub fn read_log(&self, file_name: &str) -> AppResult<String> {
        self.logger_infra.read_log(file_name)
    }

    pub fn clear_logs(&self) -> AppResult<()> {
        self.logger_infra.clear_logs()
    }

    pub fn export_log(&self, file_name: &str, target_path: &str) -> AppResult<()> {
        self.logger_infra.export_log(file_name, target_path)
    }
}
