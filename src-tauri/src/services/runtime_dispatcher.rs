//! 全局 worker permit pool（阶段 B2b）。
//!
//! 设计文档：`agent/worker-heartbeat-design.md` §6。
//!
//! 解决 G5："多个 image_workbench job 同时 running，叠加把本地 Provider
//! queue / sidecar 子进程压垮"的问题。同时 running 的 worker 数 <=
//! `GLOBAL_WORKER_LIMIT`（默认 4，跨 job 累加）。
//!
//! 与设计文档原始 dispatcher 方案的差异（折衷）：
//! - 不重写 image_workbench 的 worker 模型；保留 "每 job 一条
//!   spawn_blocking 串行循环" 的现状。
//! - dispatcher 退化为单一全局 Semaphore：spawn_blocking 进入循环前
//!   先 `acquire`，循环退出 / panic 时 permit 通过 RAII drop 自动释放。
//! - 这样达成 G5 的并发上限，但避免一次性重构 service worker 模型。
//!
//! 本模块只暴露 `acquire_global_worker_permit`；旧调用方只需要在 spawn
//! 入口加一行 `let _permit = acquire_global_worker_permit(...);`，
//! 后续工作不变。

use crate::services::runtime_constants::GLOBAL_WORKER_LIMIT;
use std::sync::{Condvar, Mutex, OnceLock};
use std::time::{Duration, Instant};

static GLOBAL_WORKER_POOL: OnceLock<GlobalWorkerPool> = OnceLock::new();

pub(crate) fn global_worker_pool() -> &'static GlobalWorkerPool {
    GLOBAL_WORKER_POOL.get_or_init(GlobalWorkerPool::new)
}

/// 跨 image_workbench job 累加的 worker permit 池。Mutex<usize> + Condvar
/// 实现的简易计数信号量；ergonomics 比 std::sync::Semaphore 直接、跨平台。
pub struct GlobalWorkerPool {
    state: Mutex<PoolState>,
    ready: Condvar,
    capacity: usize,
}

struct PoolState {
    in_use: usize,
}

impl GlobalWorkerPool {
    fn new() -> Self {
        Self {
            state: Mutex::new(PoolState { in_use: 0 }),
            ready: Condvar::new(),
            capacity: GLOBAL_WORKER_LIMIT,
        }
    }

    /// 阻塞 acquire；wait_timeout 控制最长等待，超时返回 None（调用方应跳过
    /// 本次 worker 启动而非崩溃）。仅 `'static` self（即从 OnceLock 取的全局唯一
    /// 池实例）能持有 permit；测试里要用独立池请走 `acquire_owned` 闭包路径。
    pub fn acquire(
        &'static self,
        owner_label: &str,
        wait_timeout: Duration,
    ) -> Option<WorkerPermit> {
        let deadline = Instant::now() + wait_timeout;
        let mut state = self.state.lock().ok()?;
        loop {
            if state.in_use < self.capacity {
                state.in_use += 1;
                eprintln!(
                    "[dispatcher] permit acquired ({}/{}, owner={})",
                    state.in_use, self.capacity, owner_label
                );
                return Some(WorkerPermit {
                    pool: self,
                    owner_label: owner_label.to_string(),
                });
            }
            let remaining = match deadline.checked_duration_since(Instant::now()) {
                Some(rem) => rem,
                None => {
                    eprintln!(
                        "[dispatcher] permit acquire 超时 (owner={})，本次跳过",
                        owner_label
                    );
                    return None;
                }
            };
            let (next_state, timeout) = self.ready.wait_timeout(state, remaining).ok()?;
            state = next_state;
            if timeout.timed_out() {
                eprintln!(
                    "[dispatcher] permit acquire 超时 (owner={})，本次跳过",
                    owner_label
                );
                return None;
            }
        }
    }

    fn release(&self, owner_label: &str) {
        if let Ok(mut state) = self.state.lock() {
            state.in_use = state.in_use.saturating_sub(1);
            eprintln!(
                "[dispatcher] permit released ({}/{}, owner={})",
                state.in_use, self.capacity, owner_label
            );
        }
        self.ready.notify_one();
    }

    #[cfg(test)]
    pub(crate) fn current_in_use(&self) -> usize {
        self.state.lock().map(|s| s.in_use).unwrap_or(0)
    }

    #[cfg(test)]
    pub(crate) fn capacity(&self) -> usize {
        self.capacity
    }
}

/// RAII permit；drop 自动释放回池。Worker 抛 panic 时也会被 unwind drop。
pub struct WorkerPermit {
    pool: &'static GlobalWorkerPool,
    owner_label: String,
}

impl Drop for WorkerPermit {
    fn drop(&mut self) {
        self.pool.release(&self.owner_label);
    }
}

/// 便捷入口：image_workbench `start_job_runner` 等调用方直接用。
/// `wait_timeout` 建议用 30s 量级——超过即跳过本次 worker 启动并由前端
/// /janitor 后续重试，避免无限阻塞 spawn_blocking 线程池。
pub fn acquire_global_worker_permit(
    owner_label: &str,
    wait_timeout: Duration,
) -> Option<WorkerPermit> {
    global_worker_pool().acquire(owner_label, wait_timeout)
}

#[cfg(test)]
#[path = "runtime_dispatcher_tests.rs"]
mod tests;
