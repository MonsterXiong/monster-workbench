//! 运行时常量集中地：worker heartbeat / lease 巡检使用的所有时间窗口。
//!
//! 设计文档：`agent/worker-heartbeat-design.md`。
//!
//! 阶段 A 不接入 heartbeat 周期续租；这些常量先用于 janitor 与
//! lease 计算，A2/B 阶段才会接入心跳本身。

/// worker 续租周期。15s 一次心跳，落于 LEASE_INITIAL_MS / 4，丢失最多 3 次仍可活。
/// 阶段 A 不接入，仅作为后续阶段的设计基线。
#[allow(dead_code)]
pub(crate) const HEARTBEAT_INTERVAL_MS: u64 = 15_000;

/// claim 后的初始 lease 时长。60s 让进程崩溃在分钟级被回收。
/// 阶段 A2 暂不接入 heartbeat 续租，由 service 调用方在 claim 时传入。
#[allow(dead_code)]
pub(crate) const LEASE_INITIAL_MS: u64 = 60_000;

/// heartbeat 续租后新的 lease 到期时刻 = now + LEASE_RENEW_MS。
/// 与 LEASE_INITIAL_MS 保持一致，便于推理。
#[allow(dead_code)]
pub(crate) const LEASE_RENEW_MS: u64 = 60_000;

/// janitor 巡检周期。30s 一轮，足以在 LEASE_INITIAL + GRACE 内回收。
pub(crate) const JANITOR_INTERVAL_MS: u64 = 30_000;

/// janitor 判定 lease 过期时再多等 5s grace；防止心跳延迟造成误判。
pub(crate) const JANITOR_GRACE_MS: u64 = 5_000;

/// 真挂死兜底：claim 已超过 6 小时仍 running 视为挂死，标 failed。
/// 该值需要高于真实视频生成等长任务的最大耗时；2026-06-18 取 6h。
pub(crate) const STUCK_RUNNING_MAX_MS: u64 = 6 * 60 * 60 * 1000;
