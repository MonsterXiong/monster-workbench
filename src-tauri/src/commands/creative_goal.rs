use crate::infra::creative_types::{
    CreateCreativeGoalInput, CreativeGoal, ListCreativeGoalsFilter,
};
use crate::services::goal_service::{
    CreateGoalMultiAgentStubInput, CreativeGoalStatusSnapshot, GoalService,
};
use std::sync::Mutex;
use tauri::State;

type GoalState<'a> = State<'a, Mutex<GoalService>>;

#[tauri::command]
pub fn create_creative_goal(
    input: CreateCreativeGoalInput,
    state: GoalState<'_>,
) -> Result<CreativeGoal, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.create_goal(input).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_creative_goals(
    filter: Option<ListCreativeGoalsFilter>,
    state: GoalState<'_>,
) -> Result<Vec<CreativeGoal>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .list_goals(filter.unwrap_or_default())
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn create_goal_multi_agent_stub(
    input: CreateGoalMultiAgentStubInput,
    state: GoalState<'_>,
) -> Result<crate::services::goal_service::GoalMultiAgentStubResult, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .create_goal_multi_agent_stub(input)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn get_goal_status(
    goal_id: i64,
    state: GoalState<'_>,
) -> Result<CreativeGoalStatusSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .get_goal_status(goal_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn stop_creative_goal(
    goal_id: i64,
    state: GoalState<'_>,
) -> Result<CreativeGoalStatusSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.stop_goal(goal_id).map_err(|e| e.to_json_string())
}
