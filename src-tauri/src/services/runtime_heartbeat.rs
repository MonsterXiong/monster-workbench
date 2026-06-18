//! Worker 任务心跳续租。
//!
//! 设计文档：`agent/worker-heartbeat-design.md`（阶段 B1）。
//!
//! 在 worker 调用阻塞 `generate(request)` 期间，由独立 OS 线程每
//! `HEARTBEAT_INTERVAL_MS` 调一次 `repo.renew_*_lease`，让 lease 持续推进。
//! 任意一次 CAS 失败（task 被 janitor 抢回 / 被 cancel / status 已切走）
//! 立刻触发 `ai_provider_cancel_registry().cancel(request_id)`：
//! - 对图片工作台 task：request_id == task_id，让 ai_service.run_provider_sidecar
//!   的 80ms try_wait 循环看到 cancel_token 翻转，立即 terminate sidecar。
//! - 对 AI generation business task：request_id 即任务 request_id，同上。
//!
//! 终态写入前必须先 `stop()` heartbeat（join 线程），避免心跳竞争把
//! succeeded/failed 的 task 续成 running。

use crate::infra::ai_generation_repo::AiGenerationRepo;
use crate::infra::image_workbench_repo::ImageWorkbenchRepo;
use crate::services::ai_provider_task::ai_provider_cancel_registry;
use crate::services::runtime_constants::{HEARTBEAT_INTERVAL_MS, LEASE_RENEW_MS};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// heartbeat 在阻塞 worker 期间的句柄。Drop 不会自动 stop——必须显式调用
/// `stop()`，让心跳线程先退出再写终态，避免续租覆盖终态字段。
pub struct HeartbeatHandle {
    stop_flag: Arc<AtomicBool>,
    join_handle: Option<thread::JoinHandle<()>>,
}

impl HeartbeatHandle {
    /// 等待心跳线程退出。心跳线程会在下一次睡醒时看到 stop_flag 退出，
    /// 因此最坏 join 时间约等于 `HEARTBEAT_INTERVAL_MS`。
    pub fn stop(mut self) {
        self.stop_flag.store(true, Ordering::SeqCst);
        if let Some(handle) = self.join_handle.take() {
            // join 失败说明心跳线程 panic，已经事实上停止；忽略错误。
            let _ = handle.join();
        }
    }
}

/// 抽象一次续租调用：由具体 repo 适配器实现。返回 false 表示 CAS 不命中
/// （task 状态变了/lease 被抢/worker_id 已不匹配），心跳应立即停止并触发取消。
trait LeaseRenewer: Send + 'static {
    fn renew(&self, new_leased_until_ms: i64) -> Result<bool, String>;
}

struct ImageTaskRenewer {
    repo: ImageWorkbenchRepo,
    task_id: String,
    worker_id: String,
    claim_token: String,
}

impl LeaseRenewer for ImageTaskRenewer {
    fn renew(&self, new_leased_until_ms: i64) -> Result<bool, String> {
        self.repo
            .renew_image_task_lease(
                &self.task_id,
                &self.worker_id,
                &self.claim_token,
                new_leased_until_ms,
            )
            .map_err(|err| err.to_string())
    }
}

struct BusinessTaskRenewer {
    repo: AiGenerationRepo,
    request_id: String,
    worker_id: String,
    claim_token: String,
}

impl LeaseRenewer for BusinessTaskRenewer {
    fn renew(&self, new_leased_until_ms: i64) -> Result<bool, String> {
        self.repo
            .renew_business_task_lease(
                &self.request_id,
                &self.worker_id,
                &self.claim_token,
                new_leased_until_ms,
            )
            .map_err(|err| err.to_string())
    }
}

/// 给图片工作台 worker 用的入口：claim 后立刻调用，generate 返回后调
/// `handle.stop()`。`task_id` 同时作为 ai_provider 的 cancel registry key。
pub fn spawn_image_task_heartbeat(
    repo: ImageWorkbenchRepo,
    task_id: String,
    worker_id: String,
    claim_token: String,
) -> HeartbeatHandle {
    let cancel_request_id = task_id.clone();
    spawn_heartbeat_loop(
        ImageTaskRenewer {
            repo,
            task_id,
            worker_id,
            claim_token,
        },
        cancel_request_id,
    )
}

/// 给 AI generation business task 用的入口（B1 阶段保留接口，service 层
/// 实际接入随后阶段补；目前 image_workbench 是唯一直接走 worker 路径
/// 的业务）。
#[allow(dead_code)]
pub fn spawn_business_task_heartbeat(
    repo: AiGenerationRepo,
    request_id: String,
    worker_id: String,
    claim_token: String,
) -> HeartbeatHandle {
    let cancel_request_id = request_id.clone();
    spawn_heartbeat_loop(
        BusinessTaskRenewer {
            repo,
            request_id,
            worker_id,
            claim_token,
        },
        cancel_request_id,
    )
}

fn spawn_heartbeat_loop<R: LeaseRenewer>(renewer: R, cancel_request_id: String) -> HeartbeatHandle {
    let stop_flag = Arc::new(AtomicBool::new(false));
    let stop_clone = stop_flag.clone();
    let join_handle = thread::spawn(move || heartbeat_loop(renewer, cancel_request_id, stop_clone));
    HeartbeatHandle {
        stop_flag,
        join_handle: Some(join_handle),
    }
}

fn heartbeat_loop<R: LeaseRenewer>(
    renewer: R,
    cancel_request_id: String,
    stop_flag: Arc<AtomicBool>,
) {
    let interval = Duration::from_millis(HEARTBEAT_INTERVAL_MS);
    // 短粒度休眠，让 stop_flag 能在 ≤200ms 内被响应，避免 generate 已完成
    // 还要再等满一个完整 HEARTBEAT_INTERVAL 才退出。
    let tick = Duration::from_millis(200);
    let mut elapsed = Duration::ZERO;
    while !stop_flag.load(Ordering::SeqCst) {
        if elapsed < interval {
            thread::sleep(tick);
            elapsed += tick;
            continue;
        }
        elapsed = Duration::ZERO;

        let new_lease = now_ms() + LEASE_RENEW_MS as i64;
        match renewer.renew(new_lease) {
            Ok(true) => {
                // 续租成功，继续。
            }
            Ok(false) => {
                // CAS 失败：task 被 janitor 抢回 / 被 cancel / 状态已变。
                // 翻转 cancel_token 让 worker 内的 generate sidecar 80ms 循环看到。
                eprintln!(
                    "[heartbeat] lease 续租 CAS 失败，触发取消: request_id={}",
                    cancel_request_id
                );
                let _ = ai_provider_cancel_registry().cancel(&cancel_request_id);
                return;
            }
            Err(err) => {
                // 暂时性 DB 错误（busy / 短时锁）：只记录，不取消执行体；下一轮再试。
                eprintln!(
                    "[heartbeat] 续租出错（视为暂时错误，不取消）: request_id={}, err={}",
                    cancel_request_id, err
                );
            }
        }
    }
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
#[path = "runtime_heartbeat_tests.rs"]
mod tests;
