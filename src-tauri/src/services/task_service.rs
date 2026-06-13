use crate::infra::AppResult;
use tauri::{AppHandle, Emitter, Runtime, Wry};

#[derive(serde::Serialize, Clone)]
pub struct TaskProgressPayload {
    pub task_id: String,
    pub task_name: String,
    pub progress: f32,
    pub status: String,
    pub message: String,
}

pub struct TaskService<R: Runtime = Wry> {
    app_handle: AppHandle<R>,
}

impl<R: Runtime> TaskService<R> {
    pub fn new(app_handle: AppHandle<R>) -> Self {
        Self { app_handle }
    }

    pub fn start_dummy_task(&self, task_id: String, task_name: String) -> AppResult<()> {
        let handle = self.app_handle.clone();
        std::thread::spawn(move || {
            let total_steps = 10;
            for i in 1..=total_steps {
                std::thread::sleep(std::time::Duration::from_millis(400));
                let progress = (i as f32 / total_steps as f32) * 100.0;
                let status = if i == total_steps {
                    "success".to_string()
                } else {
                    "running".to_string()
                };
                let message = if i == total_steps {
                    "任务执行完毕".to_string()
                } else {
                    format!("正在处理第 {}/{} 部分...", i, total_steps)
                };

                let payload = TaskProgressPayload {
                    task_id: task_id.clone(),
                    task_name: task_name.clone(),
                    progress,
                    status,
                    message,
                };
                let _ = handle.emit("task-progress", payload);
            }
        });
        Ok(())
    }
}
