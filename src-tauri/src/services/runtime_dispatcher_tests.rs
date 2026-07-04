use super::{acquire_global_worker_permit, global_worker_pool};
use std::sync::{Arc, Barrier, Mutex};
use std::thread;
use std::time::Duration;

/// 全局 pool 是 process-wide 的，一并发跑测试就会互相干扰。所有 dispatcher 测试
/// 串行化，每个用例自己复位 baseline。
fn dispatcher_test_lock() -> &'static Mutex<()> {
    use std::sync::OnceLock;
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

#[test]
fn permit_acquire_release_round_trip() {
    let _guard = dispatcher_test_lock().lock().unwrap();
    let pool = global_worker_pool();
    let baseline = pool.current_in_use();

    let permit = acquire_global_worker_permit("test-1", Duration::from_secs(1))
        .expect("应能立即拿到 permit");
    assert_eq!(pool.current_in_use(), baseline + 1);

    drop(permit);
    assert_eq!(pool.current_in_use(), baseline);
}

#[test]
fn permit_acquire_blocks_until_capacity_frees_up() {
    let _guard = dispatcher_test_lock().lock().unwrap();
    let pool = global_worker_pool();
    let cap = pool.capacity();
    let baseline = pool.current_in_use();
    assert_eq!(baseline, 0, "测试启动时 pool 应为空");

    // 占满 capacity。
    let mut permits = Vec::with_capacity(cap);
    for i in 0..cap {
        permits.push(
            acquire_global_worker_permit(&format!("hold-{}", i), Duration::from_secs(1))
                .expect("占位 permit"),
        );
    }
    assert_eq!(pool.current_in_use(), cap);

    // 一个新线程尝试 acquire；应阻塞直到我们 drop 一个。
    let barrier = Arc::new(Barrier::new(2));
    let barrier_clone = barrier.clone();
    let handle = thread::spawn(move || {
        barrier_clone.wait();
        let permit =
            acquire_global_worker_permit("late", Duration::from_secs(2)).expect("被释放后应能拿到");
        // 立即归还，避免影响后续测试基线。
        drop(permit);
    });

    barrier.wait();
    // 短窗口内 late 线程应仍在等：pool 仍是 cap 个 in_use。
    thread::sleep(Duration::from_millis(120));
    assert_eq!(pool.current_in_use(), cap);

    // 释放一个，late 线程应能继续。
    permits.pop();
    handle.join().expect("late 线程完成");

    // 清理剩余，回到 baseline。
    drop(permits);
    assert_eq!(pool.current_in_use(), 0);
}

#[test]
fn permit_acquire_returns_none_on_timeout_when_full() {
    let _guard = dispatcher_test_lock().lock().unwrap();
    let pool = global_worker_pool();
    let cap = pool.capacity();
    assert_eq!(pool.current_in_use(), 0, "测试启动时 pool 应为空");

    let mut permits = Vec::new();
    for i in 0..cap {
        permits.push(
            acquire_global_worker_permit(&format!("hold-{}", i), Duration::from_secs(1))
                .expect("占位"),
        );
    }

    let start = std::time::Instant::now();
    let result = acquire_global_worker_permit("late", Duration::from_millis(80));
    assert!(result.is_none(), "超时应返回 None 而非 panic");
    assert!(start.elapsed() >= Duration::from_millis(50), "超时应有等待");

    drop(permits);
}
