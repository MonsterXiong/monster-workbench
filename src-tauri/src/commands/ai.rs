use crate::services::ai_service::{
    AiBusinessGenerationRequest, AiGenerationRequest, AiGenerationResult, AiGenerationTask,
    AiProviderConfig, AiProviderQueueStatus, AiProviderService, AiProviderTestResult,
    AiProviderTestTask,
};
use std::sync::Mutex;
use tauri::State;

type AiProviderState<'a> = State<'a, Mutex<AiProviderService>>;

#[tauri::command]
pub async fn test_ai_provider(
    config: AiProviderConfig,
    action: String,
    state: AiProviderState<'_>,
) -> Result<AiProviderTestResult, String> {
    let handle = {
        let service = state.lock().unwrap_or_else(|e| e.into_inner());
        service.spawn_direct_provider_test(config, action)
    };

    handle
        .await
        .map_err(|error| format!("AI 模型连接测试任务异常: {}", error))?
}

#[tauri::command]
pub async fn generate_ai_content(
    request: AiGenerationRequest,
    state: AiProviderState<'_>,
) -> Result<AiGenerationResult, String> {
    let handle = {
        let service = state.lock().unwrap_or_else(|e| e.into_inner());
        service.spawn_direct_generation(request)
    };

    handle
        .await
        .map_err(|error| format!("AI 原子能力任务异常: {}", error))?
}

#[tauri::command]
pub async fn generate_ai_business_content(
    request: AiBusinessGenerationRequest,
    state: AiProviderState<'_>,
) -> Result<AiGenerationResult, String> {
    let handle = {
        let service = state.lock().unwrap_or_else(|e| e.into_inner());
        service.spawn_business_generation(request)
    };

    handle
        .await
        .map_err(|error| format!("AI 业务生成任务异常: {}", error))?
}

#[tauri::command]
pub fn enqueue_ai_business_generation(
    request: AiBusinessGenerationRequest,
    state: AiProviderState<'_>,
) -> Result<AiGenerationTask, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.enqueue_business_generation(request)
}

#[tauri::command]
pub fn get_ai_generation_task(
    request_id: String,
    state: AiProviderState<'_>,
) -> Result<AiGenerationTask, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.get_generation_task(&request_id)
}

#[tauri::command]
pub fn list_ai_generation_tasks(
    state: AiProviderState<'_>,
) -> Result<Vec<AiGenerationTask>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.list_generation_tasks()
}

#[tauri::command]
pub fn cancel_ai_generation_task(
    request_id: String,
    state: AiProviderState<'_>,
) -> Result<bool, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.cancel_generation_task(&request_id)
}

#[tauri::command]
pub fn enqueue_ai_provider_test(
    config: AiProviderConfig,
    action: String,
    state: AiProviderState<'_>,
) -> Result<AiProviderTestTask, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.enqueue_provider_test(config, action)
}

#[tauri::command]
pub fn get_ai_provider_test_task(
    request_id: String,
    state: AiProviderState<'_>,
) -> Result<AiProviderTestTask, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.get_provider_test_task(&request_id)
}

#[tauri::command]
pub fn list_ai_provider_test_tasks(
    state: AiProviderState<'_>,
) -> Result<Vec<AiProviderTestTask>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.list_provider_test_tasks()
}

#[tauri::command]
pub fn get_ai_provider_queue_status(
    state: AiProviderState<'_>,
) -> Result<AiProviderQueueStatus, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.get_provider_queue_status()
}

#[tauri::command]
pub fn cancel_ai_provider_queued_tests(state: AiProviderState<'_>) -> Result<usize, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.cancel_provider_queued_tests()
}

#[tauri::command]
pub fn cancel_ai_provider_test_task(
    request_id: String,
    state: AiProviderState<'_>,
) -> Result<bool, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.cancel_provider_test_task(&request_id)
}
