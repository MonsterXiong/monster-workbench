use super::ai_provider_types::{
    AiBusinessGenerationRequest, AiGenerationOptions, AiGenerationRequest, AiGenerationResult,
    AiProviderConfig,
};
use super::ai_service::AiProviderService;
use crate::infra::ai_generation_repo::{AiGenerationRepo, NewPersistedAiGenerationTask};
use crate::infra::path::PathProvider;
use crate::services::ai_generation_task::ai_generation_task_registry;
use std::fs;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const PNG_B64: &str = concat!(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8AARQAFAgH/",
    "qk9lAAAAAElFTkSuQmCC"
);
const AUDIO_BYTES: &[u8] =
    b"RIFF$\0\0\0WAVEfmt \x10\0\0\0\x01\0\x01\0\x11+\0\0\"V\0\0\x02\0\x10\0data\0\0\0\0";
const VIDEO_BYTES: &[u8] = b"\0\0\0\x18ftypmp42\0\0\0\0mp42isom\0\0\0\x08mdat";

static TEST_ENV_LOCK: Mutex<()> = Mutex::new(());

#[derive(Default)]
struct MockProviderState {
    requests: Vec<String>,
    chat_body: String,
    image_body: String,
    audio_body: String,
    video_body: String,
    video_status_path: String,
    video_content_path: String,
}

struct MockProviderServer {
    addr: SocketAddr,
    stop: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
    state: Arc<Mutex<MockProviderState>>,
}

impl MockProviderServer {
    fn start() -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").expect("mock provider should bind");
        listener
            .set_nonblocking(true)
            .expect("mock provider should become nonblocking");
        let addr = listener
            .local_addr()
            .expect("mock provider addr should exist");
        let stop = Arc::new(AtomicBool::new(false));
        let state = Arc::new(Mutex::new(MockProviderState::default()));
        let thread_stop = Arc::clone(&stop);
        let thread_state = Arc::clone(&state);
        let handle = thread::spawn(move || {
            while !thread_stop.load(Ordering::SeqCst) {
                match listener.accept() {
                    Ok((mut stream, _)) => {
                        handle_connection(&mut stream, &thread_state);
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(10));
                    }
                    Err(_) => break,
                }
            }
        });

        Self {
            addr,
            stop,
            handle: Some(handle),
            state,
        }
    }

    fn base_url(&self) -> String {
        format!("http://{}/v1", self.addr)
    }

    fn state(&self) -> std::sync::MutexGuard<'_, MockProviderState> {
        self.state.lock().unwrap_or_else(|error| error.into_inner())
    }
}

impl Drop for MockProviderServer {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        let _ = TcpStream::connect(self.addr);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

struct TestOutputDir {
    path: PathBuf,
}

impl TestOutputDir {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!(
            "monster-ai-generation-service-{}",
            unique_test_id()
        ));
        if path.exists() {
            let _ = fs::remove_dir_all(&path);
        }
        fs::create_dir_all(&path).expect("test output dir should be created");
        Self { path }
    }
}

impl Drop for TestOutputDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

struct TestAppDir {
    path: PathBuf,
}

impl TestAppDir {
    fn new() -> Self {
        let path =
            std::env::temp_dir().join(format!("monster-ai-generation-app-{}", unique_test_id()));
        if path.exists() {
            let _ = fs::remove_dir_all(&path);
        }
        fs::create_dir_all(&path).expect("test app dir should be created");
        std::env::set_var("MONSTER_TOOLS_TEST_APP_DIR", &path);
        Self { path }
    }

    fn write_preferences(&self, preferences: serde_json::Value) {
        fs::write(
            self.path.join("config.json"),
            serde_json::to_string(&preferences).expect("preferences should serialize"),
        )
        .expect("preferences should be written");
    }
}

impl Drop for TestAppDir {
    fn drop(&mut self) {
        std::env::remove_var("MONSTER_TOOLS_TEST_APP_DIR");
        let _ = fs::remove_dir_all(&self.path);
    }
}

#[test]
fn generate_content_runs_chat_image_audio_and_video_through_sidecar() {
    let _env_guard = TEST_ENV_LOCK
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let server = MockProviderServer::start();
    let output_dir = TestOutputDir::new();
    std::env::set_var("MONSTER_TOOLS_TEST_OUTPUT_DIR", &output_dir.path);

    let app = tauri::test::mock_app();
    let service = AiProviderService::new(app.handle().clone());
    let config = provider_config(server.base_url());

    let chat = service
        .generate_content(generation_request(
            "chat",
            config.clone(),
            "atomic chat prompt",
            Some("chat-test"),
            AiGenerationOptions {
                max_tokens: Some(123),
                temperature: Some(0.7),
                ..Default::default()
            },
        ))
        .expect("chat generation should succeed");
    assert!(chat.ok, "{chat:?}");
    assert_eq!(chat.capability, "chat");
    assert_eq!(chat.text.as_deref(), Some("pong from rust service"));
    assert!(server.state().chat_body.contains("\"max_tokens\": 123"));
    assert!(server
        .state()
        .chat_body
        .contains("\"content\": \"atomic chat prompt\""));

    let image = service
        .generate_content(generation_request(
            "image",
            config.clone(),
            "atomic image prompt",
            Some("image-test"),
            AiGenerationOptions {
                size: Some("1024x1024".to_string()),
                count: 1,
                ..Default::default()
            },
        ))
        .expect("image generation should succeed");
    assert!(image.ok, "{image:?}");
    assert_eq!(image.capability, "image");
    assert_eq!(image.artifacts.len(), 1);
    assert_artifact_file(&image.artifacts[0].path, &output_dir.path, "image artifact");
    assert!(server
        .state()
        .image_body
        .contains("\"prompt\": \"atomic image prompt\""));

    let audio = service
        .generate_content(generation_request(
            "audio",
            config.clone(),
            "atomic audio prompt",
            Some("tts-test"),
            AiGenerationOptions {
                format: Some("wav".to_string()),
                voice: Some("nova".to_string()),
                ..Default::default()
            },
        ))
        .expect("audio generation should succeed");
    assert!(audio.ok, "{audio:?}");
    assert_eq!(audio.capability, "audio");
    assert_eq!(audio.artifacts.len(), 1);
    assert_eq!(audio.artifacts[0].mime_type.as_deref(), Some("audio/wav"));
    assert_artifact_file(&audio.artifacts[0].path, &output_dir.path, "audio artifact");
    assert!(server.state().audio_body.contains("\"voice\": \"nova\""));
    assert!(server
        .state()
        .audio_body
        .contains("\"response_format\": \"wav\""));

    let video = service
        .generate_content(generation_request(
            "video",
            config,
            "atomic video prompt",
            Some("sora-test"),
            AiGenerationOptions {
                size: Some("640x360".to_string()),
                duration_seconds: Some(3),
                ..Default::default()
            },
        ))
        .expect("video generation should succeed");
    assert!(
        video.ok,
        "{video:?}; requests={:?}",
        server.state().requests
    );
    assert_eq!(video.capability, "video");
    assert_eq!(video.artifacts.len(), 1);
    assert_eq!(video.artifacts[0].mime_type.as_deref(), Some("video/mp4"));
    assert_eq!(video.artifacts[0].duration_seconds, Some(3));
    assert_artifact_file(&video.artifacts[0].path, &output_dir.path, "video artifact");
    assert!(server.state().video_body.contains("\"size\": \"640x360\""));
    assert!(server.state().video_body.contains("\"seconds\": 3"));
    assert_eq!(server.state().video_status_path, "/v1/videos/video-rust");
    assert_eq!(
        server.state().video_content_path,
        "/v1/videos/video-rust/content"
    );

    std::env::remove_var("MONSTER_TOOLS_TEST_OUTPUT_DIR");
}

#[test]
fn business_generation_resolves_config_from_persisted_active_binding() {
    let _env_guard = TEST_ENV_LOCK
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let server = MockProviderServer::start();
    let output_dir = TestOutputDir::new();
    let app_dir = TestAppDir::new();
    std::env::set_var("MONSTER_TOOLS_TEST_OUTPUT_DIR", &output_dir.path);

    let active_config =
        model_config_json("business-image-config", provider_config(server.base_url()));
    let inactive_config = model_config_json(
        "inactive-image-config",
        provider_config("http://127.0.0.1:9/v1".to_string()),
    );
    app_dir.write_preferences(serde_json::json!({
        "aiModelConfigs": [inactive_config, active_config],
        "aiActiveModelConfigs": {
            "txt2img": "business-image-config",
            "image": "inactive-image-config"
        }
    }));

    let app = tauri::test::mock_app();
    let service = AiProviderService::new(app.handle().clone());
    let request_id = format!("business-image-request-{}", unique_test_id());
    let handle = service.spawn_business_generation(AiBusinessGenerationRequest {
        capability: "txt2img".to_string(),
        provider_config_id: None,
        prompt: "business image prompt".to_string(),
        model: Some("image-test".to_string()),
        request_id: Some(request_id.clone()),
        options: AiGenerationOptions {
            size: Some("1024x1024".to_string()),
            count: 1,
            ..Default::default()
        },
    });

    let result = tauri::async_runtime::block_on(handle)
        .expect("business generation task should join")
        .expect("business generation should use persisted config");
    assert!(result.ok, "{result:?}");
    assert_eq!(result.capability, "txt2img");
    assert_eq!(result.request_id.as_deref(), Some(request_id.as_str()));
    assert_eq!(result.artifacts.len(), 1);
    assert_artifact_file(
        &result.artifacts[0].path,
        &output_dir.path,
        "business image artifact",
    );
    assert!(server
        .state()
        .image_body
        .contains("\"prompt\": \"business image prompt\""));

    std::env::remove_var("MONSTER_TOOLS_TEST_OUTPUT_DIR");
}

#[test]
fn business_generation_preference_cache_invalidates_when_config_file_changes() {
    let _env_guard = TEST_ENV_LOCK
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let first_server = MockProviderServer::start();
    let second_server = MockProviderServer::start();
    let output_dir = TestOutputDir::new();
    let app_dir = TestAppDir::new();
    std::env::set_var("MONSTER_TOOLS_TEST_OUTPUT_DIR", &output_dir.path);

    app_dir.write_preferences(serde_json::json!({
        "aiModelConfigs": [
            model_config_json("cached-first-image-config", provider_config(first_server.base_url()))
        ],
        "aiActiveModelConfigs": {
            "txt2img": "cached-first-image-config"
        }
    }));

    let app = tauri::test::mock_app();
    let service = AiProviderService::new(app.handle().clone());
    let first_result = service
        .run_business_generation_blocking(AiBusinessGenerationRequest {
            capability: "txt2img".to_string(),
            provider_config_id: None,
            prompt: "first cached provider prompt".to_string(),
            model: Some("image-test".to_string()),
            request_id: Some(format!("cache-first-{}", unique_test_id())),
            options: AiGenerationOptions {
                size: Some("1024x1024".to_string()),
                count: 1,
                ..Default::default()
            },
        })
        .expect("first cached generation should use first provider");
    assert!(first_result.ok, "{first_result:?}");
    assert!(first_server
        .state()
        .image_body
        .contains("\"prompt\": \"first cached provider prompt\""));

    thread::sleep(Duration::from_millis(20));
    app_dir.write_preferences(serde_json::json!({
        "aiModelConfigs": [
            model_config_json("cached-second-image-config-longer", provider_config(second_server.base_url()))
        ],
        "aiActiveModelConfigs": {
            "txt2img": "cached-second-image-config-longer"
        }
    }));

    let second_result = service
        .run_business_generation_blocking(AiBusinessGenerationRequest {
            capability: "txt2img".to_string(),
            provider_config_id: None,
            prompt: "second cached provider prompt".to_string(),
            model: Some("image-test".to_string()),
            request_id: Some(format!("cache-second-{}", unique_test_id())),
            options: AiGenerationOptions {
                size: Some("1024x1024".to_string()),
                count: 1,
                ..Default::default()
            },
        })
        .expect("updated cached generation should use second provider");
    assert!(second_result.ok, "{second_result:?}");
    assert!(second_server
        .state()
        .image_body
        .contains("\"prompt\": \"second cached provider prompt\""));
    assert!(!first_server
        .state()
        .image_body
        .contains("\"prompt\": \"second cached provider prompt\""));

    std::env::remove_var("MONSTER_TOOLS_TEST_OUTPUT_DIR");
}

#[test]
fn queued_business_generation_task_publishes_result_snapshot() {
    let _env_guard = TEST_ENV_LOCK
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let server = MockProviderServer::start();
    let output_dir = TestOutputDir::new();
    let app_dir = TestAppDir::new();
    std::env::set_var("MONSTER_TOOLS_TEST_OUTPUT_DIR", &output_dir.path);

    app_dir.write_preferences(serde_json::json!({
        "aiModelConfigs": [model_config_json("task-image-config", provider_config(server.base_url()))],
        "aiActiveModelConfigs": {
            "txt2img": "task-image-config"
        }
    }));

    let app = tauri::test::mock_app();
    let service = AiProviderService::new(app.handle().clone());
    let request_id = format!("business-generation-task-{}", unique_test_id());
    let task = service
        .enqueue_business_generation(AiBusinessGenerationRequest {
            capability: "txt2img".to_string(),
            provider_config_id: Some("task-image-config".to_string()),
            prompt: "business task image prompt".to_string(),
            model: Some("image-test".to_string()),
            request_id: Some(request_id.clone()),
            options: AiGenerationOptions {
                size: Some("1024x1024".to_string()),
                count: 1,
                ..Default::default()
            },
        })
        .expect("business generation task should enqueue");

    assert_eq!(task.request_id, request_id);
    assert!(matches!(
        task.status.as_str(),
        "queued" | "running" | "success"
    ));

    let finished = wait_until_generation_task_finished(&service, &task.request_id);
    assert_eq!(finished.status, "success", "{finished:?}");
    let result = finished.result.expect("generation result should be stored");
    assert!(result.ok, "{result:?}");
    assert_eq!(result.capability, "txt2img");
    assert_artifact_file(
        &result.artifacts[0].path,
        &output_dir.path,
        "business generation task artifact",
    );

    std::env::remove_var("MONSTER_TOOLS_TEST_OUTPUT_DIR");
}

#[test]
fn queued_business_generation_does_not_requeue_persisted_terminal_task() {
    let _env_guard = TEST_ENV_LOCK
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let _app_dir = TestAppDir::new();
    let app = tauri::test::mock_app();
    let service = AiProviderService::new(app.handle().clone());
    let request_id = format!("business-generation-cancelled-{}", unique_test_id());
    let request = AiBusinessGenerationRequest {
        capability: "txt2img".to_string(),
        provider_config_id: Some("task-image-config".to_string()),
        prompt: "cancelled persisted business prompt".to_string(),
        model: Some("image-test".to_string()),
        request_id: Some(request_id.clone()),
        options: AiGenerationOptions {
            size: Some("1024x1024".to_string()),
            count: 1,
            ..Default::default()
        },
    };
    let db_path = PathProvider::new(app.handle().clone())
        .get_db_file_path()
        .expect("test DB path should resolve");
    let repo = AiGenerationRepo::new(db_path);
    repo.enqueue_business_task(NewPersistedAiGenerationTask {
        request_id: request_id.clone(),
        capability: "txt2img".to_string(),
        scope: "business".to_string(),
        provider_config_id: request.provider_config_id.clone(),
        model: request.model.clone(),
        request_json: Some(serde_json::to_string(&request).expect("request should serialize")),
    })
    .expect("persisted task should be seeded");
    repo.cancel(&request_id, "cancelled before replay".to_string())
        .expect("persisted task should cancel");

    let task = service
        .enqueue_business_generation(request)
        .expect("terminal persisted task should be returned");
    assert_eq!(task.status, "canceled");
    assert!(task
        .error
        .as_deref()
        .unwrap_or("")
        .contains("cancelled before replay"));

    thread::sleep(Duration::from_millis(100));
    let restored = service
        .get_generation_task(&request_id)
        .expect("terminal task should remain readable");
    assert_eq!(restored.status, "canceled");
    assert!(restored
        .error
        .as_deref()
        .unwrap_or("")
        .contains("cancelled before replay"));
}

#[test]
fn blocking_business_generation_returns_persisted_success_without_replay() {
    let _env_guard = TEST_ENV_LOCK
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let _app_dir = TestAppDir::new();
    let app = tauri::test::mock_app();
    let service = AiProviderService::new(app.handle().clone());
    let request_id = format!("business-generation-success-{}", unique_test_id());
    let request = AiBusinessGenerationRequest {
        capability: "chat".to_string(),
        provider_config_id: Some("chat-config".to_string()),
        prompt: "persisted success prompt".to_string(),
        model: Some("chat-test".to_string()),
        request_id: Some(request_id.clone()),
        options: AiGenerationOptions {
            max_tokens: Some(128),
            temperature: Some(0.2),
            ..Default::default()
        },
    };
    let result = AiGenerationResult {
        request_id: Some(request_id.clone()),
        ok: true,
        capability: "chat".to_string(),
        provider: "mock".to_string(),
        model: "chat-test".to_string(),
        base_url: "http://127.0.0.1/mock".to_string(),
        latency_ms: 7,
        queue_wait_ms: Some(0),
        total_latency_ms: Some(7),
        message: "ok".to_string(),
        status_code: Some(200),
        text: Some("cached success".to_string()),
        artifacts: Vec::new(),
        failure_kind: None,
        raw_preview: None,
    };
    let db_path = PathProvider::new(app.handle().clone())
        .get_db_file_path()
        .expect("test DB path should resolve");
    let repo = AiGenerationRepo::new(db_path);
    repo.enqueue_business_task(NewPersistedAiGenerationTask {
        request_id: request_id.clone(),
        capability: "chat".to_string(),
        scope: "business".to_string(),
        provider_config_id: request.provider_config_id.clone(),
        model: request.model.clone(),
        request_json: Some(serde_json::to_string(&request).expect("request should serialize")),
    })
    .expect("persisted task should be seeded");
    repo.complete(
        &request_id,
        true,
        serde_json::to_string(&result).expect("result should serialize"),
        None,
        7,
    )
    .expect("persisted task should complete");

    let replayed = service
        .run_business_generation_blocking(request)
        .expect("persisted success should be returned without config lookup");
    assert_eq!(replayed.request_id.as_deref(), Some(request_id.as_str()));
    assert_eq!(replayed.text.as_deref(), Some("cached success"));
}

#[test]
fn resume_persisted_business_generation_restarts_queued_task() {
    let _env_guard = TEST_ENV_LOCK
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let server = MockProviderServer::start();
    let output_dir = TestOutputDir::new();
    let app_dir = TestAppDir::new();
    std::env::set_var("MONSTER_TOOLS_TEST_OUTPUT_DIR", &output_dir.path);

    app_dir.write_preferences(serde_json::json!({
        "aiModelConfigs": [model_config_json("recovered-image-config", provider_config(server.base_url()))],
        "aiActiveModelConfigs": {
            "txt2img": "recovered-image-config"
        }
    }));

    let app = tauri::test::mock_app();
    let service = AiProviderService::new(app.handle().clone());
    let request_id = format!("business-generation-recovered-{}", unique_test_id());
    let request = AiBusinessGenerationRequest {
        capability: "txt2img".to_string(),
        provider_config_id: None,
        prompt: "recovered business image prompt".to_string(),
        model: Some("image-test".to_string()),
        request_id: Some(request_id.clone()),
        options: AiGenerationOptions {
            size: Some("1024x1024".to_string()),
            count: 1,
            ..Default::default()
        },
    };
    let db_path = PathProvider::new(app.handle().clone())
        .get_db_file_path()
        .expect("test DB path should resolve");
    let repo = AiGenerationRepo::new(db_path);
    repo.enqueue_business_task(NewPersistedAiGenerationTask {
        request_id: request_id.clone(),
        capability: "txt2img".to_string(),
        scope: "business".to_string(),
        provider_config_id: None,
        model: request.model.clone(),
        request_json: Some(serde_json::to_string(&request).expect("request should serialize")),
    })
    .expect("persisted task should be seeded");

    let resumed = service
        .resume_persisted_business_generations()
        .expect("persisted business task should resume");
    assert_eq!(resumed, 1);

    let finished = wait_until_generation_task_finished(&service, &request_id);
    assert_eq!(finished.status, "success", "{finished:?}");
    let result = finished.result.expect("generation result should be stored");
    assert!(result.ok, "{result:?}");
    assert_eq!(result.capability, "txt2img");
    assert_artifact_file(
        &result.artifacts[0].path,
        &output_dir.path,
        "recovered business generation artifact",
    );
    assert!(server
        .state()
        .image_body
        .contains("\"prompt\": \"recovered business image prompt\""));

    let restored = repo
        .get(&request_id)
        .expect("persisted recovered task should be readable");
    assert_eq!(restored.status, "success");
    assert!(restored
        .result_json
        .as_deref()
        .unwrap_or("")
        .contains("txt2img"));

    std::env::remove_var("MONSTER_TOOLS_TEST_OUTPUT_DIR");
}

#[test]
fn generation_cancel_covers_memory_only_queued_task() {
    let _env_guard = TEST_ENV_LOCK
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let app = tauri::test::mock_app();
    let service = AiProviderService::new(app.handle().clone());
    let request_id = format!("memory-only-cancel-{}", unique_test_id());

    ai_generation_task_registry()
        .enqueue(
            request_id.clone(),
            "image".to_string(),
            "business".to_string(),
            Some("model-config-1".to_string()),
            Some("image-test".to_string()),
        )
        .expect("memory generation task should enqueue");

    assert!(
        service
            .cancel_generation_task(&request_id)
            .expect("memory-only generation task should cancel"),
        "memory-only queued task should be cancellable before provider queue registration"
    );
    let cancelled = ai_generation_task_registry()
        .get(&request_id)
        .expect("cancelled task should remain readable");
    assert_eq!(cancelled.status, "canceled");
}

#[test]
fn direct_generation_can_cancel_running_sidecar() {
    let _env_guard = TEST_ENV_LOCK
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let server = MockProviderServer::start();
    let output_dir = TestOutputDir::new();
    std::env::set_var("MONSTER_TOOLS_TEST_OUTPUT_DIR", &output_dir.path);

    let app = tauri::test::mock_app();
    let service = AiProviderService::new(app.handle().clone());
    let request_id = "cancel-generation-image";
    let mut request = generation_request(
        "image",
        provider_config(server.base_url()),
        "slow image prompt",
        Some("image-test"),
        AiGenerationOptions {
            size: Some("1024x1024".to_string()),
            count: 1,
            ..Default::default()
        },
    );
    request.request_id = Some(request_id.to_string());
    let handle = service.spawn_direct_generation(request);

    wait_until_queue_has_running(&service, request_id);
    assert!(
        service
            .cancel_generation_task(request_id)
            .expect("running generation should accept cancellation"),
        "running direct generation should be cancellable by request id"
    );

    let result = tauri::async_runtime::block_on(handle)
        .expect("generation task should join")
        .expect_err("generation should be cancelled");
    assert!(result.contains("中止"), "{result}");
    assert!(
        !service
            .cancel_generation_task(request_id)
            .expect("finished generation should not remain registered"),
        "cancel token should be removed after generation exits"
    );

    std::env::remove_var("MONSTER_TOOLS_TEST_OUTPUT_DIR");
}

#[test]
fn direct_generation_can_cancel_queued_request() {
    let _env_guard = TEST_ENV_LOCK
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let server = MockProviderServer::start();
    let output_dir = TestOutputDir::new();
    std::env::set_var("MONSTER_TOOLS_TEST_OUTPUT_DIR", &output_dir.path);

    let app = tauri::test::mock_app();
    let service = AiProviderService::new(app.handle().clone());
    let mut running_request = generation_request(
        "image",
        provider_config(server.base_url()),
        "slow image prompt",
        Some("image-test"),
        AiGenerationOptions {
            size: Some("1024x1024".to_string()),
            count: 1,
            ..Default::default()
        },
    );
    running_request.request_id = Some("running-generation-image".to_string());
    let running_handle = service.spawn_direct_generation(running_request);

    wait_until_queue_has_running(&service, "running-generation-image");

    let queued_request_id = "queued-generation-image";
    let mut queued_request = generation_request(
        "image",
        provider_config(server.base_url()),
        "queued image prompt",
        Some("image-test"),
        AiGenerationOptions {
            size: Some("1024x1024".to_string()),
            count: 1,
            ..Default::default()
        },
    );
    queued_request.request_id = Some(queued_request_id.to_string());
    let queued_handle = service.spawn_direct_generation(queued_request);

    wait_until_queue_has_queued(&service, queued_request_id);
    assert!(
        service
            .cancel_generation_task(queued_request_id)
            .expect("queued generation should accept cancellation"),
        "queued direct generation should be cancellable by request id"
    );

    let queued_result = tauri::async_runtime::block_on(queued_handle)
        .expect("queued generation task should join")
        .expect_err("queued generation should be cancelled");
    assert!(
        queued_result.contains("排队任务已被取消"),
        "{queued_result}"
    );
    assert!(
        !service
            .cancel_generation_task(queued_request_id)
            .expect("finished queued generation should not remain registered"),
        "queued cancel token should be removed after generation exits"
    );

    let _ = service.cancel_generation_task("running-generation-image");
    let _ = tauri::async_runtime::block_on(running_handle);
    std::env::remove_var("MONSTER_TOOLS_TEST_OUTPUT_DIR");
}

fn handle_connection(stream: &mut TcpStream, state: &Arc<Mutex<MockProviderState>>) {
    stream
        .set_nonblocking(false)
        .expect("mock provider stream should be blocking");
    let request = match read_http_request(stream) {
        Some(request) => request,
        None => return,
    };

    let mut parts = request
        .header
        .lines()
        .next()
        .unwrap_or_default()
        .split_whitespace();
    let method = parts.next().unwrap_or_default();
    let path = parts.next().unwrap_or_default();
    state
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .requests
        .push(format!("{method} {path}"));

    match (method, path) {
        ("POST", "/v1/chat/completions") => {
            state
                .lock()
                .unwrap_or_else(|error| error.into_inner())
                .chat_body = request.body.clone();
            write_json(
                stream,
                r#"{"choices":[{"message":{"content":"pong from rust service"}}]}"#,
            );
        }
        ("POST", "/v1/images/generations") => {
            state
                .lock()
                .unwrap_or_else(|error| error.into_inner())
                .image_body = request.body.clone();
            if request.body.contains("slow image prompt") {
                thread::sleep(Duration::from_secs(3));
            }
            write_json(
                stream,
                &format!(r#"{{"data":[{{"b64_json":"{}"}}]}}"#, PNG_B64),
            );
        }
        ("POST", "/v1/audio/speech") => {
            state
                .lock()
                .unwrap_or_else(|error| error.into_inner())
                .audio_body = request.body.clone();
            write_binary(stream, "audio/wav", AUDIO_BYTES);
        }
        ("POST", "/v1/videos") => {
            state
                .lock()
                .unwrap_or_else(|error| error.into_inner())
                .video_body = request.body.clone();
            write_json(stream, r#"{"id":"video-rust","status":"queued"}"#);
        }
        ("GET", "/v1/videos/video-rust") => {
            state
                .lock()
                .unwrap_or_else(|error| error.into_inner())
                .video_status_path = path.to_string();
            write_json(stream, r#"{"id":"video-rust","status":"completed"}"#);
        }
        ("GET", "/v1/videos/video-rust/content") => {
            state
                .lock()
                .unwrap_or_else(|error| error.into_inner())
                .video_content_path = path.to_string();
            write_binary(stream, "video/mp4", VIDEO_BYTES);
        }
        _ => write_response(stream, 404, "application/json", br#"{"error":"not found"}"#),
    }
}

fn wait_until_queue_has_running<R: tauri::Runtime>(
    service: &AiProviderService<R>,
    request_id: &str,
) {
    for _ in 0..100 {
        let status = service
            .get_provider_queue_status()
            .expect("queue status should be readable");
        let status_value =
            serde_json::to_value(status).expect("queue status should serialize for test");
        let is_running = status_value
            .get("runningItems")
            .and_then(|value| value.as_array())
            .map(|items| {
                items.iter().any(|item| {
                    item.get("requestId").and_then(|value| value.as_str()) == Some(request_id)
                })
            })
            .unwrap_or(false);
        if is_running {
            return;
        }
        thread::sleep(Duration::from_millis(20));
    }
    panic!("request {request_id} did not enter running state");
}

fn wait_until_queue_has_queued<R: tauri::Runtime>(
    service: &AiProviderService<R>,
    request_id: &str,
) {
    for _ in 0..100 {
        let status = service
            .get_provider_queue_status()
            .expect("queue status should be readable");
        let status_value =
            serde_json::to_value(status).expect("queue status should serialize for test");
        let is_queued = status_value
            .get("queued")
            .and_then(|value| value.as_array())
            .map(|items| {
                items.iter().any(|item| {
                    item.get("requestId").and_then(|value| value.as_str()) == Some(request_id)
                })
            })
            .unwrap_or(false);
        if is_queued {
            return;
        }
        thread::sleep(Duration::from_millis(20));
    }
    panic!("request {request_id} did not enter queued state");
}

fn wait_until_generation_task_finished<R: tauri::Runtime>(
    service: &AiProviderService<R>,
    request_id: &str,
) -> super::ai_service::AiGenerationTask {
    for _ in 0..200 {
        if let Ok(task) = service.get_generation_task(request_id) {
            if task.finished_at_ms.is_some() {
                return task;
            }
        }
        thread::sleep(Duration::from_millis(20));
    }
    panic!("generation task {request_id} did not finish");
}

struct HttpRequest {
    header: String,
    body: String,
}

fn read_http_request(stream: &mut TcpStream) -> Option<HttpRequest> {
    stream
        .set_read_timeout(Some(Duration::from_secs(2)))
        .expect("read timeout should be set");
    let mut raw = Vec::new();
    let mut buffer = [0_u8; 512];
    let header_end = loop {
        let read = stream.read(&mut buffer).ok()?;
        if read == 0 {
            return None;
        }
        raw.extend_from_slice(&buffer[..read]);
        if let Some(index) = find_header_end(&raw) {
            break index;
        }
    };

    let header_bytes = raw[..header_end].to_vec();
    let header = String::from_utf8_lossy(&header_bytes).to_string();
    let content_length = content_length(&header);
    let body_start = header_end + 4;
    while raw.len() < body_start + content_length {
        let read = stream.read(&mut buffer).ok()?;
        if read == 0 {
            break;
        }
        raw.extend_from_slice(&buffer[..read]);
    }
    let body =
        String::from_utf8_lossy(&raw[body_start..raw.len().min(body_start + content_length)])
            .to_string();

    Some(HttpRequest { header, body })
}

fn find_header_end(raw: &[u8]) -> Option<usize> {
    raw.windows(4).position(|item| item == b"\r\n\r\n")
}

fn content_length(header: &str) -> usize {
    header
        .lines()
        .find_map(|line| {
            let (name, value) = line.split_once(':')?;
            if name.trim().eq_ignore_ascii_case("content-length") {
                value.trim().parse().ok()
            } else {
                None
            }
        })
        .unwrap_or(0)
}

fn write_json(stream: &mut TcpStream, body: &str) {
    write_response(stream, 200, "application/json", body.as_bytes());
}

fn write_binary(stream: &mut TcpStream, content_type: &str, body: &[u8]) {
    write_response(stream, 200, content_type, body);
}

fn write_response(stream: &mut TcpStream, status: u16, content_type: &str, body: &[u8]) {
    let status_text = if status == 200 { "OK" } else { "Not Found" };
    let header = format!(
        "HTTP/1.0 {} {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        status,
        status_text,
        content_type,
        body.len()
    );
    let _ = stream.write_all(header.as_bytes());
    let _ = stream.write_all(body);
    let _ = stream.flush();
}

fn provider_config(base_url: String) -> AiProviderConfig {
    AiProviderConfig {
        provider: "custom".to_string(),
        adapter_id: "openai-compatible".to_string(),
        display_name: "Rust Mock Provider".to_string(),
        base_url,
        api_key: String::new(),
        remember_api_key: false,
        model: "chat-test".to_string(),
        test_prompt: "ping".to_string(),
        image_model: "image-test".to_string(),
        image_prompt: "mock image".to_string(),
        image_size: "1024x1024".to_string(),
        image_count: 1,
        timeout_ms: 5_000,
        queue_mode: "serial".to_string(),
        max_concurrency: 3,
        capabilities: Vec::new(),
        queue_key: String::new(),
    }
}

fn model_config_json(id: &str, config: AiProviderConfig) -> serde_json::Value {
    let mut value = serde_json::to_value(config).expect("model config should serialize");
    value
        .as_object_mut()
        .expect("model config should serialize as object")
        .insert("id".to_string(), serde_json::json!(id));
    value
}

fn generation_request(
    capability: &str,
    config: AiProviderConfig,
    prompt: &str,
    model: Option<&str>,
    options: AiGenerationOptions,
) -> AiGenerationRequest {
    AiGenerationRequest {
        capability: capability.to_string(),
        config,
        prompt: prompt.to_string(),
        model: model.map(str::to_string),
        request_id: Some(format!("rust-generation-{}", capability)),
        options,
    }
}

fn assert_artifact_file(path: &Option<String>, output_dir: &Path, label: &str) {
    let path = path
        .as_ref()
        .map(PathBuf::from)
        .unwrap_or_else(|| panic!("{label} should include a local path"));
    let checked_path = path.canonicalize().unwrap_or_else(|_| path.clone());
    let checked_output_dir = output_dir
        .canonicalize()
        .unwrap_or_else(|_| output_dir.to_path_buf());
    assert!(
        checked_path.starts_with(&checked_output_dir),
        "{label} should stay inside test output dir: path={checked_path:?}, output_dir={checked_output_dir:?}"
    );
    assert!(path.exists(), "{label} should exist: {path:?}");
    assert!(
        path.metadata()
            .expect("artifact metadata should exist")
            .len()
            > 0,
        "{label} should not be empty"
    );
}

fn unique_test_id() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after epoch")
        .as_nanos()
}
