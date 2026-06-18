# Worker Heartbeat / Worker 池设计提案

> **过渡文档**：本提案用于评审长任务（视频生成、高清放大）所需的 worker heartbeat 与 worker 池扩展。评审通过后，落地变更随实现合并；本文件随后从仓库删除，结论沉淀进 `docs/architecture-current-state.md` 与 `agent/open-loops.md`。

## 1. 目标 / 非目标

### 目标

- **G1**：`running` 状态下 worker 进程或 thread 死亡时，task 能在**分钟级**被识别并回收为 `queued`，不再依赖应用重启或 2 小时租约自然过期。
- **G2**：`ai_generation_tasks` 与 `image_workbench_tasks` 共用同一套 lease/heartbeat 语义，避免两边各搞一套。
- **G3**：长任务（视频、高清放大、未来更多 capability）能在执行期持续续租，不会因为单次执行超过初始租约就被 janitor 误判过期。
- **G4**：取消语义不退化——`cancel_generation_task` 仍然能在分钟级停掉 running worker，包括非本启动周期残留的 task。
- **G5**：跨 job 的 worker 数量受**统一全局上限**约束，不再随 job 数量线性膨胀。

### 非目标

- **NG1**：不引入跨进程 worker（始终在 Tauri 主进程内跑）。
- **NG2**：不把 Python sidecar 改成常驻 daemon（保留 single-shot subprocess 模型；超时与 cancel 仍按现有路径处理）。
- **NG3**：不重写 `ai_provider_test_queue` 的 Provider 维度并发 clamp；本提案与之串联，不替代。
- **NG4**：不把图片工作台和 AI generation 合并为同一张表；只让两者的 lease 语义对齐。

## 2. 现状摘要（设计前提）

| 维度 | image_workbench_tasks | ai_generation_tasks |
|---|---|---|
| Lease 字段 | `claim_token` + `leased_until_ms`（2h 固定，不续租） | 无 |
| 启动恢复 | `recover_interrupted_jobs` 整体回滚 running → queued | `recover_runnable_business_tasks` 同上 |
| 运行期 orphan 检测 | 无（依赖 lease 自然过期） | 无 |
| Worker 模型 | 每个 job 一条 `spawn_blocking` 串行循环 | 每个请求一条 `spawn_blocking` |
| 取消通道 | DB `cancel_job` + 通过 ai_service 走 cancel token | `ai_provider_cancel_registry` 翻 `Arc<AtomicBool>` |
| 超时 | sidecar `provider_sidecar_timeout_ms` 一刀切 | 同左 |

参考：`src-tauri/src/services/image_workbench_service.rs:32,346-362,769-790`；`src-tauri/src/infra/image_workbench_repo.rs:163-180,234-264,334-385`；`src-tauri/src/services/ai_service.rs:125-301,416-505,748-851`；`src-tauri/src/infra/ai_generation_repo.rs:192-223`；`src-tauri/src/services/ai_provider_task.rs:15-30`。

## 3. Schema 变更

### 3.1 `ai_generation_tasks` 新增列

```sql
ALTER TABLE ai_generation_tasks ADD COLUMN worker_id      TEXT;
ALTER TABLE ai_generation_tasks ADD COLUMN claim_token    TEXT;
ALTER TABLE ai_generation_tasks ADD COLUMN claimed_at_ms  INTEGER;
ALTER TABLE ai_generation_tasks ADD COLUMN leased_until_ms INTEGER;
ALTER TABLE ai_generation_tasks ADD COLUMN last_heartbeat_ms INTEGER;
CREATE INDEX IF NOT EXISTS idx_ai_generation_tasks_lease
  ON ai_generation_tasks(status, leased_until_ms);
```

### 3.2 `image_workbench_tasks` 新增列

已有 `claim_token` / `leased_until_ms`，**只补**：

```sql
ALTER TABLE image_workbench_tasks ADD COLUMN worker_id        TEXT;
ALTER TABLE image_workbench_tasks ADD COLUMN claimed_at_ms    INTEGER;
ALTER TABLE image_workbench_tasks ADD COLUMN last_heartbeat_ms INTEGER;
CREATE INDEX IF NOT EXISTS idx_image_workbench_tasks_lease
  ON image_workbench_tasks(status, leased_until_ms);
```

### 3.3 列语义

- `worker_id`：本启动周期生成的 UUID（`Tauri 启动时初始化一次`），用于区分跨重启的旧 worker。
- `claim_token`：每次 claim 生成的随机串，用于 CAS 续租与释放（避免 ABA）。
- `claimed_at_ms`：抢占时刻；用于 metrics 与超长 stuck-running 上限熔断。
- `leased_until_ms`：当前租约绝对到期时间；首次 claim 设为 `now + LEASE_INITIAL_MS`，每次 heartbeat 续到 `now + LEASE_RENEW_MS`。
- `last_heartbeat_ms`：最近一次心跳成功 UPDATE 的时刻；janitor 主要按 `leased_until_ms` 判断，`last_heartbeat_ms` 用于诊断与 metrics。

## 4. 心跳协议

### 4.1 时间常量（建议初值，可在配置里调整）

```rust
const HEARTBEAT_INTERVAL_MS: u64 = 15_000;     // worker 每 15s 续租一次
const LEASE_INITIAL_MS:      u64 = 60_000;     // claim 后初始 lease 60s
const LEASE_RENEW_MS:        u64 = 60_000;     // 每次心跳续到 now + 60s
const JANITOR_INTERVAL_MS:   u64 = 30_000;     // janitor 30s 扫一次
const JANITOR_GRACE_MS:      u64 = 5_000;      // 过期再宽限 5s 才回收
const STUCK_RUNNING_MAX_MS:  u64 = 6 * 60 * 60 * 1000; // 6h 兜底（非续租问题，是真挂死）
```

设计要点：
- `LEASE_INITIAL = 60s`（不再是 2h），让停电/崩溃场景在分钟级被回收。
- `HEARTBEAT_INTERVAL < LEASE_INITIAL / 3`：丢失最多 2 次心跳仍可活；网络/磁盘抖动不会误判。
- `STUCK_RUNNING_MAX_MS` 是**最终兜底**：哪怕心跳一直在跳，task 也不应该真的活 6 小时——超过即视为"看似在跑但已经挂死"，强行 cancel + 标 failed（错误码 `worker_stuck`）。

### 4.2 续租 SQL（CAS）

```sql
UPDATE <table>
   SET leased_until_ms = ?,
       last_heartbeat_ms = ?,
       updated_at_ms = ?
 WHERE id = ?
   AND worker_id = ?
   AND claim_token = ?
   AND status = 'running';
```

`affected_rows == 0` 即心跳失败，意味着：lease 被 janitor 抢回 / task 被 cancel / 已被另一个 worker 接手。worker **必须立刻终止当前执行**——典型做法：触发 `cancel_token`，让 sidecar 80ms 循环里的现有取消通道生效。

### 4.3 Heartbeat 任务生命周期

```rust
struct HeartbeatHandle {
    cancel: AbortHandle,        // tokio AbortHandle
    cancel_token: AiProviderCancelToken,
}

fn spawn_heartbeat(
    repo: TaskRepo,
    task: ClaimedTask,
    cancel_token: AiProviderCancelToken,
) -> HeartbeatHandle {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(HEARTBEAT_INTERVAL_MS);
        loop {
            interval.tick().await;
            match repo.renew_lease(&task).await {
                Ok(true)  => continue,
                Ok(false) => { cancel_token.cancel(); break; } // CAS 失败 → 自取消
                Err(_)    => continue,                          // 暂时 DB 错只重试，不立刻取消
            }
        }
    })
}
```

worker 在执行体（`run_business_generation_blocking` / `run_image_tasks_with_generator`）开始前 `spawn_heartbeat`，结束（成功/失败/取消）时 abort heartbeat 并写终态——**心跳必须先于终态被 abort**，避免心跳 race-condition 把已经 succeeded 的 task 续成 running。

### 4.4 Worker ID

`AppState` 启动时生成一次 `worker_id = format!("{}-{}", host_pid, uuid_v4())`，全程不变。重启即换。janitor 看到 `running` 但 `worker_id != current` 的 task 优先回收（必然是上个进程残留）。

## 5. Janitor（运行期巡检）

替代"只在启动时回收"的现状。

```rust
async fn janitor_loop(repo: TaskRepo, current_worker_id: String) {
    let mut tick = tokio::time::interval(JANITOR_INTERVAL_MS);
    loop {
        tick.tick().await;
        let now = now_ms();

        // 1) 旧 worker 残留：不属于当前 worker_id 的 running 直接回收
        repo.reset_running_by_other_worker(&current_worker_id).await;

        // 2) 租约过期：当前 worker 也可能 thread panic 没人续租
        repo.reset_running_with_expired_lease(now - JANITOR_GRACE_MS).await;

        // 3) 真正挂死的兜底：claim 已超过 STUCK_RUNNING_MAX_MS 但心跳还在跳
        repo.fail_stuck_running(now - STUCK_RUNNING_MAX_MS, "worker_stuck").await;
    }
}
```

回收语义：
- (1)(2) **回滚为 queued**：清 `worker_id / claim_token / leased_until_ms / last_heartbeat_ms / started_at_ms`，重建可被 claim 的状态；`retry_count` 不增（不算业务失败）。
- (3) **置 failed**：写入失败原因 `worker_stuck`，前端可识别并提示。retry_count++。

启动时只跑一次 (1)，因为 `current_worker_id` 是新生成的，所有上一次进程残留都符合 (1) 的条件——这就替代了今天 `recover_interrupted_jobs` / `recover_runnable_business_tasks` 的硬重置。

## 6. Worker 池（统一调度）

### 6.1 现状问题

今天的 worker 模型：
- 每个 image_workbench job 一条 `spawn_blocking` 串行循环。
- 每个 ai generation 请求一条 `spawn_blocking`。
- **没有跨业务的全局并发上限**；只在 Provider 维度由 `ai_provider_test_queue` 做 clamp。

### 6.2 调整

引入一个**单一 dispatcher** + **N worker permit**：

```rust
struct Dispatcher {
    permits: Arc<Semaphore>,        // GLOBAL_WORKER_LIMIT 比如 4
    repo_image: ImageWorkbenchRepo,
    repo_ai: AiGenerationRepo,
    worker_id: String,
}
```

dispatcher 主循环每 `DISPATCH_TICK_MS = 500ms`：
1. `acquire_permit()`（拿不到就 sleep 一拍）。
2. 优先按 `(priority, created_at_ms)` 从两表 `claim_next_runnable_task` 抢一个 task。
3. 抢到则 `tokio::spawn` 一个 worker：执行 + heartbeat + 终态写入 + 释放 permit。
4. 抢不到则释放 permit、sleep。

要点：
- **GLOBAL_WORKER_LIMIT** 默认 4，可配置；与 Provider 并发 clamp 串联（worker 拿到 task 后仍走 `ai_provider_test_queue` 的 Provider 槽位，前者控制系统总负载，后者控制单 Provider 速率）。
- 取消老的"每 job 一条 spawn_blocking 循环"——image_workbench 不再自己起循环，而是 dispatcher 把它的 task 也一起 claim。
- `start_image_workbench_job_runner` 退化为"通知 dispatcher 立即 wake"（避免等下一个 500ms tick）。

### 6.3 渐进迁移

允许两阶段：
- **阶段 A（最小变更）**：只补心跳和 janitor，不动 worker 池；图片工作台仍按 job 起循环，AI generation 仍按请求起线程。先解决 G1/G2/G3/G4。
- **阶段 B**：再引入 dispatcher + permit，解决 G5。

## 7. 取消语义对齐

不变：`cancel_generation_task` 仍走三段（队列层 / cancel token / 持久化标 cancelled）。

新增：worker 启动后第一次心跳前先**校验 task 是否已被标 cancelled**——避免"刚 claim 还没起 sidecar 就被取消"导致取消落空。校验方式：在 `claim_next_runnable_task` 的 SELECT 里同时返回 status，UPDATE 时 `WHERE status IN ('queued','retrying')`，CAS 失败就视为已取消。

worker 在 sidecar 阻塞循环（`ai_service.rs:803-833` 的 80ms try_wait）已经在检查 cancel_token，不需要改。

跨进程取消：上一次进程残留的 `running` task，在新进程启动后由 janitor (1) 直接回滚为 queued，自然实现"重启后取消"。如果用户在新进程里点取消，就走标准路径。

## 8. 测试矩阵

### 8.1 Rust 单测

| 用例 | 期望 |
|---|---|
| `claim_next_runnable_task` 抢到 lease 后 worker_id/claim_token/leased_until 正确写入 | ✓ |
| `renew_lease` CAS 成功路径：lease 推进，last_heartbeat 更新 | ✓ |
| `renew_lease` CAS 失败路径：worker_id 不匹配 / status 已变 → affected_rows=0 | ✓ |
| janitor (1) 只回收 `worker_id != current` 的 running | ✓ |
| janitor (2) 回收 lease 已过期 + grace 的 running | ✓ |
| janitor (3) `claimed_at_ms < now - STUCK_RUNNING_MAX_MS` 标 failed 且 retry_count++ | ✓ |
| 心跳 abort 先于终态写入：终态不会被心跳回滚 | ✓（race 测试） |
| cancel 在 claim 与 spawn sidecar 之间生效 | ✓ |

### 8.2 集成测

- 启动恢复：种入旧 `worker_id` 的 running task，启动后 janitor 一轮回收为 queued。
- 长任务模拟：mock sidecar sleep 90s，期间心跳应至少跳 5 次，task 不会被 janitor 误回收。
- worker 死亡模拟：claim 后立刻 abort heartbeat，不释放 permit；janitor 应在 `LEASE_INITIAL_MS + GRACE` 内回收。

### 8.3 真机验收

跑一个真实视频生成 capability（待 capability adapter 落地后），观察：
- DB `last_heartbeat_ms` 在执行期间稳定推进。
- 中途 kill -9 主进程后重启，task 在 30s 内回到 queued 并被重新 claim。

## 9. 落地步骤

按阶段 A 推进：

1. **迁移**：`infra/migrations/` 增 `ai_generation_tasks` 与 `image_workbench_tasks` 的 ALTER + INDEX；`ai_generation_schema.rs` / `image_workbench_schema.rs` 同步字段；写迁移测试。
2. **Repo**：两个 repo 增 `claim_next_runnable_task`（携带 worker_id）、`renew_lease`、`reset_running_by_other_worker`、`reset_running_with_expired_lease`、`fail_stuck_running`；旧的 startup 硬重置改为 (1) 路径。
3. **Service**：`ai_service` 与 `image_workbench_service` 在执行体外侧 spawn heartbeat；终态写入前先 abort heartbeat；`worker_id` 从 AppState 注入。
4. **Janitor**：`main.rs` 启动时 `tokio::spawn` 一条 janitor_loop（与 image_workbench job runner 同级别，但不依赖具体 service）。
5. **观测**：`metrics.rs` 添加 `worker_heartbeat_failed_total / lease_expired_recovered_total / worker_stuck_total` 计数；前端不暴露，只走日志/排查。
6. **配置**：常量集中放一个 `runtime_constants.rs`，配 env override（开发/测试可缩短）。

阶段 B（worker 池）作为后续条目落进 open-loops，不阻塞阶段 A。

## 10. 风险与回滚

- **风险 1：心跳给 SQLite 带来写压力**。每个 running task 每 15s 一次 UPDATE。同时跑 4 个 task 也只有 ~0.27 写/秒，完全在 SQLite 写吞吐内。
- **风险 2：CAS 失败导致 worker 频繁自取消**。已通过 `affected_rows=0` 退出循环 + 立刻取消执行体保证不会脏写终态；但要注意网络/磁盘短暂错误**不要**直接 cancel——见 §4.3 `Err(_) => continue`。
- **风险 3：janitor 误回收正在续租的 task**。janitor 只看 `leased_until_ms < now - GRACE`；只要 worker `HEARTBEAT_INTERVAL_MS < LEASE_RENEW_MS` 即安全。
- **回滚**：阶段 A 的所有 ALTER 都是新增列，不改既有列语义；万一线上有问题，可临时让 `renew_lease` 直接写 `now + 24h`、把 janitor 关掉，退化为现状行为。

## 11. 待用户决定

- [ ] **Q1**：先做阶段 A（心跳 + janitor）还是直接做阶段 A+B（含 worker 池）？建议 A 先行。
- [ ] **Q2**：`STUCK_RUNNING_MAX_MS` 6h 是否合理？真实视频生成最长可能多久？这个值低于真实长任务会把好任务标 failed。
- [ ] **Q3**：worker 池阶段 B 的 `GLOBAL_WORKER_LIMIT` 默认 4 是否合适？取决于本机 CPU 与典型 Provider 并发。
- [ ] **Q4**：是否要让 `metrics.rs` 暴露 heartbeat/lease 计数到 `/system-diagnostics` 视图？还是只走日志？
