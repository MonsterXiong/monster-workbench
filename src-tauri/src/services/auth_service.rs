use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};

pub struct AuthService {
    path_provider: PathProvider,
}

impl AuthService {
    pub fn new(path_provider: PathProvider) -> Self {
        Self { path_provider }
    }

    /// 校验管理员管理口令是否正确。
    ///
    /// 必须显式配置 `admin_password`，避免固定默认口令成为管理入口。
    pub fn verify_admin_password(&self, input: &str) -> AppResult<bool> {
        let app_dir = self.path_provider.get_app_local_data_dir()?;
        let cfg_path = app_dir.join("config.json");
        if cfg_path.exists() {
            let content = std::fs::read_to_string(&cfg_path)
                .map_err(|e| AppError::Config(format!("读取管理员配置失败: {}", e)))?;
            return verify_admin_password_config(&content, input);
        }
        Ok(false)
    }
}

fn verify_admin_password_config(content: &str, input: &str) -> AppResult<bool> {
    let json = serde_json::from_str::<serde_json::Value>(content)
        .map_err(|e| AppError::Config(format!("管理员配置 JSON 格式不合法: {}", e)))?;
    if let Some(pwd) = json.get("admin_password").and_then(|v| v.as_str()) {
        return Ok(is_configured_password_match(pwd, input));
    }
    Ok(false)
}

fn is_configured_password_match(configured: &str, input: &str) -> bool {
    let configured = configured.trim();
    !configured.is_empty() && input == configured
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_root(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be valid")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "monster-workbench-auth-{name}-{}-{nanos}",
            std::process::id()
        ))
    }

    fn service_for(app_dir: PathBuf) -> AuthService {
        AuthService::new(PathProvider::new_for_test(
            app_dir.clone(),
            app_dir.join("monster_workbench.db"),
        ))
    }

    #[test]
    fn configured_password_matches_exact_input() {
        assert!(is_configured_password_match("custom-pass", "custom-pass"));
        assert!(!is_configured_password_match("custom-pass", "wrong-pass"));
    }

    #[test]
    fn configured_password_rejects_empty_values() {
        assert!(!is_configured_password_match("", ""));
        assert!(!is_configured_password_match("   ", "   "));
    }

    #[test]
    fn missing_configured_password_rejects_any_input() {
        assert!(!is_configured_password_match("", "any-input"));
    }

    #[test]
    fn config_without_admin_password_rejects_legacy_default() {
        let result = verify_admin_password_config(r#"{"theme":"dark"}"#, "admin888")
            .expect("valid config should parse");

        assert!(!result);
    }

    #[test]
    fn config_blank_admin_password_rejects_any_input() {
        let result = verify_admin_password_config(r#"{"admin_password":"   "}"#, "admin888")
            .expect("valid config should parse");

        assert!(!result);
    }

    #[test]
    fn config_invalid_json_returns_config_error() {
        let err =
            verify_admin_password_config("{", "admin888").expect_err("invalid config should fail");

        assert!(matches!(err, AppError::Config(_)));
    }

    #[test]
    fn service_without_config_rejects_legacy_default_password() {
        let root = temp_root("missing-config");
        let app_dir = root.join("app-data");
        let service = service_for(app_dir);

        let _ = std::fs::remove_dir_all(&root);
        let verified = service
            .verify_admin_password("admin888")
            .expect("missing config should not error");

        assert!(!verified);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn service_reads_explicit_admin_password_exactly() {
        let root = temp_root("explicit-config");
        let app_dir = root.join("app-data");
        let service = service_for(app_dir.clone());

        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        std::fs::write(
            app_dir.join("config.json"),
            r#"{"admin_password":"custom-pass"}"#,
        )
        .expect("config should write");

        assert!(service
            .verify_admin_password("custom-pass")
            .expect("configured password should verify"));
        assert!(!service
            .verify_admin_password("admin888")
            .expect("legacy default should not verify"));

        let _ = std::fs::remove_dir_all(&root);
    }
}
