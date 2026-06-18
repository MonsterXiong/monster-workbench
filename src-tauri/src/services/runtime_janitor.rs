//! 运行时 janitor：周期性回收挂死的 worker 任务。
//!
//! 设计文档：`agent/worker-heartbeat-design.md`。
//!
//! 三段语义（每轮巡检都执行一次）：
//! 1. **跨进程残留**：`worker_id` 不属于当前进程的 running task → 回滚为 queued。
//!    这同时替代了旧的 startup 硬重置（重启时新 `worker_id` ≠ 上次进程的 ID）。
//! 2. **当前进程内 lease 过期**：thread panic 等场景下心跳停了，lease 自然过期 →
//!    回滚为 queued，retry_count 不变。
//! 3. **真挂死兜底**：claim 已超过 `STUCK_RUNNING_MAX_MS` (6h) 仍 running → 标 failed，
//!    `retry_count++`（image_workbench），error 写入 `worker_stuck`。
//!
//! 阶段 A2 不接入 heartbeat 续租，因此 (2) 在本进程内的回收只在 lease 自然到期 (60s)
//! 后生效；想要"长任务持续续租"需要进入设计文档的阶段 B。

use crate::infra::ai_generation_repo::AiGenerationRepo;
use crate::infra::image_workbench_repo::ImageWorkbenchRepo;
use crate::infra::path::PathProvider;
use crate::services::runtime_constants::{
    JANITOR_GRACE_MS, JANITOR_INTERVAL_MS, STUCK_RUNNING_MAX_MS,
};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Runtime};

static WORKER_ID_SEQUENCE: AtomicU64 = AtomicU64::new(1);

/// 当前进程的 worker_id；进程启动时生成，全程不变。重启即换。
/// 形如 `mw-<启动毫秒>-<计数>`，无需引入新依赖。
#[derive(Debug, Clone)]
pub struct WorkerIdentity {
    pub worker_id: String,
}

impl WorkerIdentity {
    pub fn new() -> Self {
        let seq = WORKER_ID_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        Self {
            worker_id: format!("mw-{}-{}", now_ms(), seq),
        }
    }
}

impl Default for WorkerIdentity {
    fn default() -> Self {
        Self::new()
    }
}

/// 单次巡检的回收计数（用于日志/排查，不上 UI）。
#[derive(Debug, Default, Clone, Copy)]
pub(crate) struct JanitorSweepCounts {
    pub iw_other_worker: u32,
    pub iw_expired_lease: u32,
    pub iw_stuck: u32,
    pub ai_other_worker: u32,
    pub ai_expired_lease: u32,
    pub ai_stuck: u32,
}

impl JanitorSweepCounts {
    fn total(&self) -> u32 {
        self.iw_other_worker
            + self.iw_expired_lease
            + self.iw_stuck
            + self.ai_other_worker
            + self.ai_expired_lease
            + self.ai_stuck
    }
}

/// 单次巡检逻辑。失败的子步骤只记录日志、不阻塞后续步骤；返回累计计数便于日志输出。
pub(crate) fn run_janitor_sweep(
    image_repo: &ImageWorkbenchRepo,
    ai_repo: &AiGenerationRepo,
    worker_id: &str,
) -> JanitorSweepCounts {
    let now = now_ms();
    let lease_cutoff = now - JANITOR_GRACE_MS as i64;
    let stuck_cutoff = now - STUCK_RUNNING_MAX_MS as i64;
    let mut counts = JanitorSweepCounts::default();

    // 图片工作台
    match image_repo.reset_running_image_tasks_by_other_worker(worker_id) {
        Ok(n) => counts.iw_other_worker = n,
        Err(err) => eprintln!("[janitor] iw other_worker reset 失败: {}", err),
    }
    match image_repo.reset_running_image_tasks_with_expired_lease(worker_id, lease_cutoff) {
        Ok(n) => counts.iw_expired_lease = n,
        Err(err) => eprintln!("[janitor] iw expired_lease reset 失败: {}", err),
    }
    match image_repo.fail_stuck_running_image_tasks(stuck_cutoff, "worker_stuck") {
        Ok(n) => counts.iw_stuck = n,
        Err(err) => eprintln!("[janitor] iw stuck mark failed: {}", err),
    }

    // AI generation business task
    match ai_repo.reset_running_business_tasks_by_other_worker(worker_id) {
        Ok(n) => counts.ai_other_worker = n,
        Err(err) => eprintln!("[janitor] ai other_worker reset 失败: {}", err),
    }
    match ai_repo.reset_running_business_tasks_with_expired_lease(worker_id, lease_cutoff) {
        Ok(n) => counts.ai_expired_lease = n,
        Err(err) => eprintln!("[janitor] ai expired_lease reset 失败: {}", err),
    }
    match ai_repo.fail_stuck_running_business_tasks(stuck_cutoff, "worker_stuck") {
        Ok(n) => counts.ai_stuck = n,
        Err(err) => eprintln!("[janitor] ai stuck mark failed: {}", err),
    }

    if counts.total() > 0 {
        eprintln!(
            "[janitor] sweep recovered: iw(other={}, expired={}, stuck={}) ai(other={}, expired={}, stuck={})",
            counts.iw_other_worker,
            counts.iw_expired_lease,
            counts.iw_stuck,
            counts.ai_other_worker,
            counts.ai_expired_lease,
            counts.ai_stuck,
        );
    }
    counts
}

/// 启动时立即跑一次（替代旧的 startup 硬重置），然后每 30s 跑一次。
/// 失败只记日志，不退出循环，保证 janitor 始终在跑。
pub fn spawn_runtime_janitor<R: Runtime>(app_handle: AppHandle<R>, worker_id: String) {
    tauri::async_runtime::spawn_blocking(move || {
        let db_path = match PathProvider::new(app_handle.clone()).get_db_file_path() {
            Ok(path) => path,
            Err(err) => {
                eprintln!("[janitor] 启动失败：无法解析 DB 路径: {}", err);
                return;
            }
        };

        // 立即跑一次，等价于旧 startup 硬重置（worker_id 是新生成的，跨进程残留全部回收）。
        sweep_with(&db_path, &worker_id);

        let interval = Duration::from_millis(JANITOR_INTERVAL_MS);
        loop {
            std::thread::sleep(interval);
            sweep_with(&db_path, &worker_id);
        }
    });
}

fn sweep_with(db_path: &PathBuf, worker_id: &str) {
    let image_repo = ImageWorkbenchRepo::new(db_path.clone());
    let ai_repo = AiGenerationRepo::new(db_path.clone());
    run_janitor_sweep(&image_repo, &ai_repo, worker_id);
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
#[path = "runtime_janitor_tests.rs"]
mod tests;
