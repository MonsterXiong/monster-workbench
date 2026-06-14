use super::*;
use std::sync::{mpsc, Arc};
use std::thread;

fn test_config(timeout_ms: u64) -> AiProviderConfig {
    AiProviderConfig {
        provider: "custom".to_string(),
        adapter_id: "openai-compatible".to_string(),
        display_name: "Mock".to_string(),
        base_url: "https://example.com/v1".to_string(),
        api_key: "secret".to_string(),
        remember_api_key: false,
        model: "chat-test".to_string(),
        test_prompt: "ping".to_string(),
        image_model: "image-test".to_string(),
        image_prompt: "blue robot".to_string(),
        image_size: "1024x1024".to_string(),
        image_count: 1,
        timeout_ms,
        queue_mode: "serial".to_string(),
        max_concurrency: 3,
        queue_key: String::new(),
    }
}

fn test_queue_config(key: &str, concurrency_limit: usize) -> AiProviderQueueConfig {
    AiProviderQueueConfig {
        queue_key: key.to_string(),
        queue_mode: if concurrency_limit > 1 {
            "concurrent".to_string()
        } else {
            "serial".to_string()
        },
        concurrency_limit,
    }
}

#[test]
fn image_queue_wait_timeout_does_not_auto_cancel_queueing() {
    let config = test_config(720_000);
    let wait_timeout = provider_test_queue_wait_timeout("image", &config);

    assert_eq!(wait_timeout, Duration::ZERO);
}

#[test]
fn non_image_queue_wait_timeout_uses_short_default() {
    let config = test_config(180_000);

    assert_eq!(
        provider_test_queue_wait_timeout("models", &config),
        AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT
    );
    assert_eq!(
        provider_test_queue_wait_timeout("chat", &config),
        AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT
    );
}

#[test]
fn queue_allows_different_serial_configs_to_run_together() {
    let queue = AiProviderTestQueue::new();
    let first = queue
        .enter_with_config(
            "image".to_string(),
            "image-a".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            test_queue_config("config-a", 1),
        )
        .expect("first config should run");
    let second = queue
        .enter_with_config(
            "image".to_string(),
            "image-b".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            test_queue_config("config-b", 1),
        )
        .expect("different serial config should run in another slot");

    let status = queue.status().expect("queue status should be readable");
    assert_eq!(status.running_count, 2);
    assert_eq!(status.running_items.len(), 2);
    assert_eq!(
        status.available_running_slots,
        AI_PROVIDER_TEST_RUNNING_LIMIT - 2
    );

    queue.leave(first.id);
    queue.leave(second.id);
}

#[test]
fn queue_allows_same_config_when_concurrency_limit_has_capacity() {
    let queue = AiProviderTestQueue::new();
    let first = queue
        .enter_with_config(
            "image".to_string(),
            "image-a".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            test_queue_config("config-a", 2),
        )
        .expect("first high-concurrency item should run");
    let second = queue
        .enter_with_config(
            "image".to_string(),
            "image-b".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            test_queue_config("config-a", 2),
        )
        .expect("same config should use second high-concurrency slot");

    let status = queue.status().expect("queue status should be readable");
    assert_eq!(status.running_count, 2);
    assert!(status.queued.is_empty());
    assert!(status
        .running_items
        .iter()
        .all(|item| item.concurrency_limit == 2));

    queue.leave(first.id);
    queue.leave(second.id);
}

#[test]
fn queue_keeps_same_serial_config_waiting_until_slot_leaves() {
    let queue = Arc::new(AiProviderTestQueue::new());
    let running = queue
        .enter_with_config(
            "image".to_string(),
            "image-a".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            test_queue_config("config-a", 1),
        )
        .expect("first serial config item should run");
    let waiting_queue = Arc::clone(&queue);
    let (ready_tx, ready_rx) = mpsc::channel();
    let (result_tx, result_rx) = mpsc::channel();

    let handle = thread::spawn(move || {
        ready_tx.send(()).expect("ready signal should send");
        let result = waiting_queue.enter_with_config(
            "image".to_string(),
            "image-b".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            test_queue_config("config-a", 1),
        );
        result_tx
            .send(result.map(|permit| permit.id))
            .expect("queue result should send");
    });

    ready_rx.recv().expect("waiting thread should start");
    for _ in 0..20 {
        if queue.status().expect("queue status").queued.len() == 1 {
            break;
        }
        thread::sleep(Duration::from_millis(10));
    }
    assert_eq!(
        queue
            .status()
            .expect("queue status should be readable")
            .queued
            .len(),
        1
    );

    queue.leave(running.id);
    let next_id = result_rx
        .recv_timeout(Duration::from_secs(1))
        .expect("waiting request should wake after running leaves")
        .expect("queued request should enter running slot");

    queue.leave(next_id);
    handle.join().expect("waiting thread should join");
    assert!(queue
        .status()
        .expect("queue status should be readable")
        .queued
        .is_empty());
}

#[test]
fn queue_limits_pending_items() {
    let queue = AiProviderTestQueue::new();
    let _running = queue
        .enter(
            "image".to_string(),
            "test-image".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
        )
        .expect("first item should run");
    for _ in 1..AI_PROVIDER_TEST_QUEUE_LIMIT {
        let mut state = queue.state.lock().expect("queue state should lock");
        let id = state.next_id;
        state.next_id += 1;
        state.queued.push_back(AiProviderQueueItem {
            id,
            request_id: format!("queued-image-{id}"),
            action: "image".to_string(),
            created_at_ms: now_ms(),
            started_at_ms: None,
            wait_ms: 0,
            remaining_wait_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
            wait_timeout_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
            queue_mode: "serial".to_string(),
            concurrency_limit: 1,
        });
    }

    let error = queue
        .enter(
            "image".to_string(),
            "test-image".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
        )
        .expect_err("queue should reject items over limit");
    assert!(error.contains("队列已满"));
}

#[test]
fn queue_enqueue_reserves_capacity_before_worker_waits() {
    let queue = AiProviderTestQueue::new();
    for index in 0..AI_PROVIDER_TEST_QUEUE_LIMIT {
        queue
            .enqueue(
                "image".to_string(),
                format!("queued-before-worker-{index}"),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            )
            .expect("queue slot should reserve");
    }

    let error = queue
        .enqueue(
            "image".to_string(),
            "overflow-before-worker".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
        )
        .expect_err("reserved queue should reject overflow before workers wait");

    assert!(error.contains("队列已满"));
    assert_eq!(
        queue.status().expect("queue status").pending_count,
        AI_PROVIDER_TEST_QUEUE_LIMIT
    );
}

#[test]
fn queue_status_reports_running_and_queued_items() {
    let queue = AiProviderTestQueue::new();
    let running = queue
        .enter(
            "models".to_string(),
            "test-models".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
        )
        .expect("first item should run");
    {
        let mut state = queue.state.lock().expect("queue state should lock");
        let id = state.next_id;
        state.next_id += 1;
        state.queued.push_back(AiProviderQueueItem {
            id,
            request_id: format!("queued-chat-{id}"),
            action: "chat".to_string(),
            created_at_ms: now_ms(),
            started_at_ms: None,
            wait_ms: 0,
            remaining_wait_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
            wait_timeout_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
            queue_mode: "serial".to_string(),
            concurrency_limit: 1,
        });
    }

    let status = queue.status().expect("queue status should be readable");
    assert_eq!(status.pending_count, 2);
    assert_eq!(status.queue_limit, AI_PROVIDER_TEST_QUEUE_LIMIT);
    assert_eq!(status.available_slots, AI_PROVIDER_TEST_QUEUE_LIMIT - 2);
    assert_eq!(
        status.wait_timeout_ms,
        AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis()
    );
    assert!(!status.is_saturated);
    assert_eq!(status.running.expect("running item").action, "models");
    assert_eq!(status.queued.len(), 1);
    assert_eq!(status.queued[0].action, "chat");
    assert!(status.queued[0].remaining_wait_ms <= status.wait_timeout_ms);

    queue.leave(running.id);
    let status = queue.status().expect("queue status should be readable");
    assert_eq!(status.pending_count, 1);
    assert_eq!(status.available_slots, AI_PROVIDER_TEST_QUEUE_LIMIT - 1);
    assert!(status.running.is_none());
}

#[test]
fn queue_cancel_queued_items_keeps_running_item() {
    let queue = AiProviderTestQueue::new();
    let running = queue
        .enter(
            "models".to_string(),
            "test-models".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
        )
        .expect("first item should run");
    {
        let mut state = queue.state.lock().expect("queue state should lock");
        for action in ["chat", "image"] {
            let id = state.next_id;
            state.next_id += 1;
            state.queued.push_back(AiProviderQueueItem {
                id,
                request_id: format!("queued-{id}"),
                action: action.to_string(),
                created_at_ms: now_ms(),
                started_at_ms: None,
                wait_ms: 0,
                remaining_wait_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                wait_timeout_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                queue_mode: "serial".to_string(),
                concurrency_limit: 1,
            });
        }
    }

    let cancelled = queue.cancel_queued().expect("queued items should cancel");
    assert_eq!(cancelled.len(), 2);

    let status = queue.status().expect("queue status should be readable");
    assert_eq!(status.pending_count, 1);
    assert_eq!(status.available_slots, AI_PROVIDER_TEST_QUEUE_LIMIT - 1);
    assert!(!status.is_saturated);
    assert_eq!(status.running.expect("running item").id, running.id);
    assert!(status.queued.is_empty());
}

#[test]
fn queue_leave_wakes_next_waiting_request() {
    let queue = Arc::new(AiProviderTestQueue::new());
    let running = queue
        .enter(
            "models".to_string(),
            "running-request".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
        )
        .expect("first item should run");
    let waiting_queue = Arc::clone(&queue);
    let (ready_tx, ready_rx) = mpsc::channel();
    let (result_tx, result_rx) = mpsc::channel();

    let handle = thread::spawn(move || {
        let ticket = waiting_queue
            .enqueue(
                "chat".to_string(),
                "queued-request".to_string(),
                AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
            )
            .expect("queued item should enqueue");
        ready_tx.send(()).expect("ready signal should send");
        let result = waiting_queue.wait_for_turn(ticket).map(|permit| {
            let status = waiting_queue
                .status()
                .expect("queue status should be readable");
            let running_request_id = status
                .running
                .expect("queued item should become running")
                .request_id;
            (permit.id, running_request_id)
        });
        result_tx.send(result).expect("queue result should send");
    });

    ready_rx.recv().expect("waiting thread should start");
    for _ in 0..20 {
        if queue.status().expect("queue status").queued.len() == 1 {
            break;
        }
        thread::sleep(Duration::from_millis(10));
    }

    queue.leave(running.id);
    let (next_id, running_request_id) = result_rx
        .recv_timeout(Duration::from_secs(1))
        .expect("waiting request should wake after running leaves")
        .expect("queued request should enter running slot");

    assert_eq!(running_request_id, "queued-request");
    queue.leave(next_id);
    handle.join().expect("waiting thread should join");

    let status = queue.status().expect("queue status should be readable");
    assert!(status.running.is_none());
    assert!(status.queued.is_empty());
    assert_eq!(status.pending_count, 0);
}

#[test]
fn queue_cancel_returns_only_queued_request_ids() {
    let queue = AiProviderTestQueue::new();
    let _running = queue
        .enter(
            "models".to_string(),
            "running-request".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
        )
        .expect("first item should run");
    {
        let mut state = queue.state.lock().expect("queue state should lock");
        let id = state.next_id;
        state.next_id += 1;
        state.queued.push_back(AiProviderQueueItem {
            id,
            request_id: "queued-request".to_string(),
            action: "image".to_string(),
            created_at_ms: now_ms(),
            started_at_ms: None,
            wait_ms: 0,
            remaining_wait_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
            wait_timeout_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
            queue_mode: "serial".to_string(),
            concurrency_limit: 1,
        });
    }

    let cancelled = queue.cancel_queued().expect("queued item should cancel");

    assert_eq!(cancelled, vec!["queued-request".to_string()]);
}

#[test]
fn queue_cancel_single_queued_request_keeps_others() {
    let queue = AiProviderTestQueue::new();
    let _running = queue
        .enter(
            "models".to_string(),
            "running-request".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
        )
        .expect("first item should run");
    {
        let mut state = queue.state.lock().expect("queue state should lock");
        for request_id in ["queued-one", "queued-two"] {
            let id = state.next_id;
            state.next_id += 1;
            state.queued.push_back(AiProviderQueueItem {
                id,
                request_id: request_id.to_string(),
                action: "image".to_string(),
                created_at_ms: now_ms(),
                started_at_ms: None,
                wait_ms: 0,
                remaining_wait_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                wait_timeout_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                queue_mode: "serial".to_string(),
                concurrency_limit: 1,
            });
        }
    }

    let cancelled = queue
        .cancel_queued_request("queued-one")
        .expect("queued request should cancel");
    let status = queue.status().expect("queue status should be readable");

    assert!(cancelled);
    assert_eq!(status.pending_count, 2);
    assert_eq!(
        status.running.expect("running item").request_id,
        "running-request"
    );
    assert_eq!(status.queued.len(), 1);
    assert_eq!(status.queued[0].request_id, "queued-two");
    assert!(!queue
        .cancel_queued_request("running-request")
        .expect("running request should not cancel as queued"));
}

#[test]
fn queue_status_marks_saturated_when_full() {
    let queue = AiProviderTestQueue::new();
    let _running = queue
        .enter(
            "models".to_string(),
            "test-models".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
        )
        .expect("first item should run");
    {
        let mut state = queue.state.lock().expect("queue state should lock");
        while state.queued.len() + 1 < AI_PROVIDER_TEST_QUEUE_LIMIT {
            let id = state.next_id;
            state.next_id += 1;
            state.queued.push_back(AiProviderQueueItem {
                id,
                request_id: format!("queued-chat-{id}"),
                action: "chat".to_string(),
                created_at_ms: now_ms(),
                started_at_ms: None,
                wait_ms: 0,
                remaining_wait_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                wait_timeout_ms: AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis(),
                queue_mode: "serial".to_string(),
                concurrency_limit: 1,
            });
        }
    }

    let status = queue.status().expect("queue status should be readable");
    assert_eq!(status.pending_count, AI_PROVIDER_TEST_QUEUE_LIMIT);
    assert_eq!(status.available_slots, 0);
    assert!(status.is_saturated);
}

#[test]
fn queue_cancel_wakes_waiting_request() {
    let queue = Arc::new(AiProviderTestQueue::new());
    let _running = queue
        .enter(
            "models".to_string(),
            "test-models".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
        )
        .expect("first item should run");
    let waiting_queue = Arc::clone(&queue);
    let (ready_tx, ready_rx) = mpsc::channel();
    let (result_tx, result_rx) = mpsc::channel();

    let handle = thread::spawn(move || {
        ready_tx.send(()).expect("ready signal should send");
        let result = waiting_queue.enter(
            "image".to_string(),
            "test-image".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
        );
        result_tx
            .send(result.map(|permit| permit.id))
            .expect("queue result should send");
    });

    ready_rx.recv().expect("waiting thread should start");
    for _ in 0..20 {
        if queue.status().expect("queue status").queued.len() == 1 {
            break;
        }
        thread::sleep(Duration::from_millis(10));
    }

    let cancelled = queue.cancel_queued().expect("queued item should cancel");
    assert_eq!(cancelled.len(), 1);
    let result = result_rx
        .recv_timeout(Duration::from_secs(1))
        .expect("waiting request should wake after cancellation");
    assert!(result
        .expect_err("waiting request should be cancelled")
        .contains("已被取消"));
    handle.join().expect("waiting thread should join");
}

#[test]
fn queue_wait_timeout_removes_stale_request() {
    let queue = Arc::new(AiProviderTestQueue::new());
    let _running = queue
        .enter(
            "models".to_string(),
            "test-models".to_string(),
            AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT,
        )
        .expect("first item should run");
    let waiting_queue = Arc::clone(&queue);
    let (ready_tx, ready_rx) = mpsc::channel();
    let (result_tx, result_rx) = mpsc::channel();

    let handle = thread::spawn(move || {
        ready_tx.send(()).expect("ready signal should send");
        let result = waiting_queue
            .enqueue(
                "image".to_string(),
                "test-timeout-image".to_string(),
                Duration::from_millis(50),
            )
            .and_then(|ticket| waiting_queue.wait_for_turn(ticket));
        result_tx
            .send(result.map(|permit| permit.id))
            .expect("queue result should send");
    });

    ready_rx.recv().expect("waiting thread should start");
    for _ in 0..20 {
        if queue.status().expect("queue status").queued.len() == 1 {
            break;
        }
        thread::sleep(Duration::from_millis(10));
    }

    let result = result_rx
        .recv_timeout(Duration::from_secs(2))
        .expect("waiting request should wake after timeout");
    assert!(result
        .expect_err("waiting request should time out")
        .contains("自动取消"));

    let status = queue.status().expect("queue status should be readable");
    assert!(status.queued.is_empty());
    handle.join().expect("waiting thread should join");
}
