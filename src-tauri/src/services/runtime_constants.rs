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

/// 阶段 B2b：全局并发 worker 数上限。同时 running 的 worker（无论属于
/// 哪个 image_workbench job）累加不超过该值，避免多 job 同跑把本地 Provider
/// queue / sidecar 子进程压垮。中转站支持高并发时允许更快推进批量生图。
pub(crate) const GLOBAL_WORKER_LIMIT: usize = 8;

/// 图片工作台单个 job 默认最多占用的 worker 数。保留 job 内 task 并发，
/// 同时避免一个大 job 吃满 GLOBAL_WORKER_LIMIT，让后续 job 有机会并行推进。
pub(crate) const IMAGE_WORKBENCH_JOB_WORKER_LIMIT: usize = 4;

/// dispatcher 主循环节拍。500ms 内能响应 wake notify 也能在没事时低 CPU 自旋。
/// B2b 简化方案没有真主循环（直接靠 spawn_blocking + permit 阻塞），保留常量
/// 给后续若回归"中央 dispatcher"模型使用。
#[allow(dead_code)]
pub(crate) const DISPATCH_TICK_MS: u64 = 500;
