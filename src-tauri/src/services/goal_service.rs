use crate::infra::creative_goal_repo;
use crate::infra::creative_task_repo;
use crate::infra::creative_types::{
    CreateCreativeGoalInput, CreateCreativeGoalRoleInput, CreateCreativeTaskInput,
    CreateTaskEventInput, CreativeGoal, CreativeGoalRole, CreativeTask,
    ListCreativeGoalRolesFilter, ListCreativeGoalsFilter, UpdateCreativeGoalStatusInput,
    UpdateCreativeTaskStatusInput,
};
use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalAgentRoleSpecInput {
    pub role_key: String,
    pub task_type: String,
    pub description: Option<String>,
    pub task_count: Option<i64>,
    pub budget_json: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGoalMultiAgentStubInput {
    pub project_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub budget_json: Option<String>,
    pub role_specs: Vec<GoalAgentRoleSpecInput>,
    pub merge_task_type: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalMultiAgentStubResult {
    pub goal: CreativeGoal,
    pub roles: Vec<CreativeGoalRole>,
    pub tasks: Vec<CreativeTask>,
    pub merge_task: Option<CreativeTask>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreativeGoalStatusSnapshot {
    pub goal: CreativeGoal,
    pub roles: Vec<CreativeGoalRole>,
    pub tasks: Vec<CreativeTask>,
    pub total_tasks: usize,
    pub queued_tasks: usize,
    pub running_tasks: usize,
    pub succeeded_tasks: usize,
    pub failed_tasks: usize,
    pub cancelled_tasks: usize,
}

pub struct GoalService {
    path_provider: PathProvider,
}

impl GoalService {
    pub fn new(path_provider: PathProvider) -> Self {
        Self { path_provider }
    }

    pub fn create_goal(&self, input: CreateCreativeGoalInput) -> AppResult<CreativeGoal> {
        validate_goal_input(&input)?;
        creative_goal_repo::create_goal(&self.db_path()?, input)
    }

    pub fn list_goals(&self, filter: ListCreativeGoalsFilter) -> AppResult<Vec<CreativeGoal>> {
        creative_goal_repo::list_goals(&self.db_path()?, filter)
    }

    pub fn create_goal_multi_agent_stub(
        &self,
        input: CreateGoalMultiAgentStubInput,
    ) -> AppResult<GoalMultiAgentStubResult> {
        validate_multi_agent_stub_input(&input)?;
        let db_path = self.db_path()?;
        let goal = creative_goal_repo::create_goal(
            &db_path,
            CreateCreativeGoalInput {
                project_id: input.project_id.clone(),
                title: input.title.clone(),
                description: input.description.clone(),
                status: Some("running".to_string()),
                budget_json: input.budget_json.clone(),
            },
        )?;

        let mut roles = Vec::new();
        let mut tasks = Vec::new();
        for spec in input.role_specs {
            let role = creative_goal_repo::create_goal_role(
                &db_path,
                CreateCreativeGoalRoleInput {
                    goal_id: goal.id,
                    role_key: spec.role_key.clone(),
                    task_type: spec.task_type.clone(),
                    description: spec.description.clone(),
                    task_count: spec.task_count,
                    budget_json: spec.budget_json.clone(),
                },
            )?;
            let task_count = role.task_count.max(1);
            for index in 0..task_count {
                let payload_json = serde_json::json!({
                    "goalId": goal.id,
                    "roleKey": role.role_key,
                    "taskType": role.task_type,
                    "sequence": index + 1,
                    "description": role.description,
                })
                .to_string();
                let task = creative_task_repo::create_task(
                    &db_path,
                    CreateCreativeTaskInput {
                        project_id: goal.project_id.clone(),
                        goal_id: Some(goal.id),
                        batch_job_id: None,
                        task_type: role.task_type.clone(),
                        status: Some("queued".to_string()),
                        priority: Some(0),
                        payload_json: Some(payload_json),
                        max_retries: Some(0),
                        parent_task_id: None,
                        asset_id: None,
                        sequence_no: None,
                    },
                )?;
                let _ = creative_task_repo::append_task_event(
                    &db_path,
                    CreateTaskEventInput {
                        task_id: task.id,
                        event_type: "goal_fanout_created".to_string(),
                        message: Some(format!("goal {} fan-out task created", goal.id)),
                        payload_json: Some(
                            serde_json::json!({
                                "goalId": goal.id,
                                "roleKey": role.role_key,
                                "sequence": index + 1
                            })
                            .to_string(),
                        ),
                    },
                );
                tasks.push(task);
            }
            roles.push(role);
        }

        let merge_task = Some(creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: goal.project_id.clone(),
                goal_id: Some(goal.id),
                batch_job_id: None,
                task_type: input
                    .merge_task_type
                    .unwrap_or_else(|| "merge_review_stub".to_string()),
                status: Some("draft".to_string()),
                priority: Some(0),
                payload_json: Some(
                    serde_json::json!({
                        "goalId": goal.id,
                        "mergeStrategy": "serial_review_stub",
                    })
                    .to_string(),
                ),
                max_retries: Some(0),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )?);

        Ok(GoalMultiAgentStubResult {
            goal,
            roles,
            tasks,
            merge_task,
        })
    }

    pub fn get_goal_status(&self, goal_id: i64) -> AppResult<CreativeGoalStatusSnapshot> {
        if goal_id <= 0 {
            return Err(AppError::Config("goal id must be positive".to_string()));
        }
        let db_path = self.db_path()?;
        let goal = creative_goal_repo::get_goal(&db_path, goal_id)?
            .ok_or_else(|| AppError::Database("goal not found".to_string()))?;
        let roles = creative_goal_repo::list_goal_roles(
            &db_path,
            ListCreativeGoalRolesFilter {
                goal_id: Some(goal_id),
                ..Default::default()
            },
        )?;
        let tasks = creative_goal_repo::list_goal_tasks(&db_path, goal_id)?;
        Ok(CreativeGoalStatusSnapshot {
            total_tasks: tasks.len(),
            queued_tasks: tasks.iter().filter(|task| task.status == "queued").count(),
            running_tasks: tasks.iter().filter(|task| task.status == "running").count(),
            succeeded_tasks: tasks
                .iter()
                .filter(|task| task.status == "succeeded")
                .count(),
            failed_tasks: tasks.iter().filter(|task| task.status == "failed").count(),
            cancelled_tasks: tasks
                .iter()
                .filter(|task| task.status == "cancelled")
                .count(),
            goal,
            roles,
            tasks,
        })
    }

    pub fn stop_goal(&self, goal_id: i64) -> AppResult<CreativeGoalStatusSnapshot> {
        if goal_id <= 0 {
            return Err(AppError::Config("goal id must be positive".to_string()));
        }
        let db_path = self.db_path()?;
        let tasks = creative_goal_repo::list_goal_tasks(&db_path, goal_id)?;
        for task in tasks {
            if task.status == "queued" {
                let _ = creative_task_repo::update_task_status(
                    &db_path,
                    UpdateCreativeTaskStatusInput {
                        id: task.id,
                        status: "cancelled".to_string(),
                        result_json: None,
                        error_message: Some("goal manually stopped".to_string()),
                        asset_id: task.asset_id,
                        retry_count_increment: None,
                    },
                );
            } else if task.status == "running" {
                let _ = creative_task_repo::update_task_status(
                    &db_path,
                    UpdateCreativeTaskStatusInput {
                        id: task.id,
                        status: "cancelling".to_string(),
                        result_json: None,
                        error_message: Some("goal manually stopped".to_string()),
                        asset_id: task.asset_id,
                        retry_count_increment: None,
                    },
                );
            }
        }
        let _ = creative_goal_repo::update_goal_status(
            &db_path,
            UpdateCreativeGoalStatusInput {
                id: goal_id,
                status: "cancelled".to_string(),
                stopped_at: Some("manual_stop".to_string()),
            },
        )?;
        self.get_goal_status(goal_id)
    }

    fn db_path(&self) -> AppResult<std::path::PathBuf> {
        self.path_provider.get_db_file_path()
    }
}

fn validate_goal_input(input: &CreateCreativeGoalInput) -> AppResult<()> {
    if input.title.trim().is_empty() {
        return Err(AppError::Config("goal title is required".to_string()));
    }
    Ok(())
}

fn validate_multi_agent_stub_input(input: &CreateGoalMultiAgentStubInput) -> AppResult<()> {
    if input.title.trim().is_empty() {
        return Err(AppError::Config("goal title is required".to_string()));
    }
    if input.role_specs.is_empty() {
        return Err(AppError::Config(
            "at least one role spec is required".to_string(),
        ));
    }
    let total_tasks: i64 = input
        .role_specs
        .iter()
        .map(|spec| spec.task_count.unwrap_or(1).max(1))
        .sum();
    if total_tasks > 24 {
        return Err(AppError::Config(
            "goal fan-out exceeds current stub max_tasks limit (24)".to_string(),
        ));
    }
    Ok(())
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
            "monster-workbench-goal-{name}-{}-{nanos}",
            std::process::id()
        ))
    }

    fn service_for(app_dir: PathBuf) -> GoalService {
        let db_path = app_dir.join("monster_workbench.db");
        GoalService::new(PathProvider::new_for_test(app_dir, db_path))
    }

    #[test]
    fn can_create_goal_and_fan_out_tasks() {
        let root = temp_root("fanout");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());

        let result = service
            .create_goal_multi_agent_stub(CreateGoalMultiAgentStubInput {
                project_id: Some("goal-project".to_string()),
                title: "Goal Multi Agent Stub".to_string(),
                description: Some("Split into stub tasks".to_string()),
                budget_json: Some(r#"{"maxTasks":8,"maxRunningTasks":2}"#.to_string()),
                role_specs: vec![
                    GoalAgentRoleSpecInput {
                        role_key: "character".to_string(),
                        task_type: "goal.character.stub".to_string(),
                        description: Some("Character stub".to_string()),
                        task_count: Some(2),
                        budget_json: None,
                    },
                    GoalAgentRoleSpecInput {
                        role_key: "scene".to_string(),
                        task_type: "goal.scene.stub".to_string(),
                        description: Some("Scene stub".to_string()),
                        task_count: Some(1),
                        budget_json: None,
                    },
                ],
                merge_task_type: Some("goal.merge.stub".to_string()),
            })
            .expect("goal stub should create");

        assert_eq!(result.goal.status, "running");
        assert_eq!(result.roles.len(), 2);
        assert_eq!(result.tasks.len(), 3);
        assert!(result.merge_task.is_some());

        let status = service
            .get_goal_status(result.goal.id)
            .expect("goal status should load");
        assert_eq!(status.total_tasks, 4);
        assert_eq!(status.queued_tasks, 3);
        assert_eq!(status.goal.id, result.goal.id);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn can_stop_goal() {
        let root = temp_root("stop");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());

        let result = service
            .create_goal_multi_agent_stub(CreateGoalMultiAgentStubInput {
                project_id: Some("goal-project".to_string()),
                title: "Goal Stop Stub".to_string(),
                description: Some("Stop goal".to_string()),
                budget_json: None,
                role_specs: vec![GoalAgentRoleSpecInput {
                    role_key: "character".to_string(),
                    task_type: "goal.character.stub".to_string(),
                    description: None,
                    task_count: Some(1),
                    budget_json: None,
                }],
                merge_task_type: None,
            })
            .expect("goal stub should create");

        let status = service
            .stop_goal(result.goal.id)
            .expect("goal stop should pass");
        assert_eq!(status.goal.status, "cancelled");
        assert!(status.cancelled_tasks >= 1);

        let _ = std::fs::remove_dir_all(&root);
    }
}
