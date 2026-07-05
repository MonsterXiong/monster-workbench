use crate::services::ai_generation_support::{
    provider_request_timeout_ms, provider_sidecar_timeout_ms,
};
use crate::services::ai_provider_config::AI_PROVIDER_TEST_MAX_CONFIG_CONCURRENCY;
use crate::services::ai_provider_task::now_ms;
use crate::services::ai_provider_types::AiProviderConfig;
use serde::Serialize;
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::{Condvar, Mutex, OnceLock};
use std::time::Duration;

static AI_PROVIDER_TEST_QUEUE: OnceLock<AiProviderTestQueue> = OnceLock::new();
const AI_PROVIDER_TEST_QUEUE_LIMIT: usize = 16;
const AI_PROVIDER_TEST_RUNNING_LIMIT: usize = 8;
const AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT: Duration = Duration::from_secs(90);

#[derive(Debug, Clone)]
pub(crate) struct AiProviderQueueConfig {
    queue_key: String,
    queue_mode: String,
    concurrency_limit: usize,
}

impl AiProviderQueueConfig {
    fn serial_global() -> Self {
        Self {
            queue_key: "__global__".to_string(),
            queue_mode: "serial".to_string(),
            concurrency_limit: 1,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderQueueItem {
    id: u64,
    request_id: String,
    action: String,
    created_at_ms: u128,
    started_at_ms: Option<u128>,
    wait_ms: u128,
    remaining_wait_ms: u128,
    wait_timeout_ms: u128,
    queue_mode: String,
    concurrency_limit: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderQueueStatus {
    running: Option<AiProviderQueueItem>,
    running_items: Vec<AiProviderQueueItem>,
    queued: Vec<AiProviderQueueItem>,
    pending_count: usize,
    queue_limit: usize,
    running_count: usize,
    running_limit: usize,
    available_running_slots: usize,
    available_slots: usize,
    is_saturated: bool,
    wait_timeout_ms: u128,
}

pub(crate) struct AiProviderTestQueue {
    state: Mutex<AiProviderQueueState>,
    ready: Condvar,
}

#[derive(Default)]
struct AiProviderQueueState {
    next_id: u64,
    running: Option<AiProviderQueueItem>,
    extra_running: Vec<AiProviderQueueItem>,
    queued: VecDeque<AiProviderQueueItem>,
    cancelled_ids: HashSet<u64>,
    metadata_by_id: HashMap<u64, AiProviderQueueConfig>,
}

#[derive(Debug)]
pub(crate) struct AiProviderQueuePermit {
    id: u64,
    created_at_ms: u128,
    started_at_ms: u128,
}

#[derive(Debug)]
pub(crate) struct AiProviderQueueTicket {
    id: u64,
    created_at_ms: u128,
    wait_timeout: Duration,
}

impl AiProviderQueuePermit {
    pub(crate) fn queue_wait_ms(&self) -> u64 {
        self.started_at_ms.saturating_sub(self.created_at_ms) as u64
    }
}

impl AiProviderTestQueue {
    pub(crate) fn new() -> Self {
        Self {
            state: Mutex::new(AiProviderQueueState {
                next_id: 1,
                running: None,
                extra_running: Vec::new(),
                queued: VecDeque::new(),
                cancelled_ids: HashSet::new(),
                metadata_by_id: HashMap::new(),
            }),
            ready: Condvar::new(),
        }
    }

    #[cfg(test)]
    fn enter(
        &self,
        action: String,
        request_id: String,
        wait_timeout: Duration,
    ) -> Result<AiProviderQueuePermit, String> {
        self.enter_with_config(
            action,
            request_id,
            wait_timeout,
            AiProviderQueueConfig::serial_global(),
        )
    }

    pub(crate) fn enter_with_config(
        &self,
        action: String,
        request_id: String,
        wait_timeout: Duration,
        queue_config: AiProviderQueueConfig,
    ) -> Result<AiProviderQueuePermit, String> {
        let ticket = self.enqueue_with_config(action, request_id, wait_timeout, queue_config)?;
        self.wait_for_turn(ticket)
    }

    #[cfg(test)]
    fn enqueue(
        &self,
        action: String,
        request_id: String,
        wait_timeout: Duration,
    ) -> Result<AiProviderQueueTicket, String> {
        self.enqueue_with_config(
            action,
            request_id,
            wait_timeout,
            AiProviderQueueConfig::serial_global(),
        )
    }

    pub(crate) fn enqueue_with_config(
        &self,
        action: String,
        request_id: String,
        wait_timeout: Duration,
        queue_config: AiProviderQueueConfig,
    ) -> Result<AiProviderQueueTicket, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试队列状态异常".to_string())?;
        let pending_count = state.queued.len() + running_items_len(&state);
        if pending_count >= AI_PROVIDER_TEST_QUEUE_LIMIT {
            return Err(format!(
                "AI 模型队列已满，最多允许 {} 个任务同时排队，请稍后再试",
                AI_PROVIDER_TEST_QUEUE_LIMIT
            ));
        }

        let id = state.next_id;
        state.next_id += 1;
        let created_at_ms = now_ms();
        state.queued.push_back(AiProviderQueueItem {
            id,
            request_id,
            action,
            created_at_ms,
            started_at_ms: None,
            wait_ms: 0,
            remaining_wait_ms: wait_timeout.as_millis(),
            wait_timeout_ms: wait_timeout.as_millis(),
            queue_mode: queue_config.queue_mode.clone(),
            concurrency_limit: queue_config.concurrency_limit,
        });
        state.metadata_by_id.insert(id, queue_config);

        self.ready.notify_all();
        Ok(AiProviderQueueTicket {
            id,
            created_at_ms,
            wait_timeout,
        })
    }

    pub(crate) fn wait_for_turn(
        &self,
        ticket: AiProviderQueueTicket,
    ) -> Result<AiProviderQueuePermit, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试队列状态异常".to_string())?;

        loop {
            if state.cancelled_ids.remove(&ticket.id) {
                return Err("AI 模型排队任务已取消".to_string());
            }

            if !ticket.wait_timeout.is_zero()
                && now_ms().saturating_sub(ticket.created_at_ms) > ticket.wait_timeout.as_millis()
            {
                if let Some(index) = state.queued.iter().position(|item| item.id == ticket.id) {
                    state.queued.remove(index);
                }
                state.metadata_by_id.remove(&ticket.id);
                self.ready.notify_all();
                return Err(format!(
                    "AI 模型排队超过 {} 秒，已自动取消，请稍后重试",
                    ticket.wait_timeout.as_secs()
                ));
            }

            let runnable_index = next_runnable_queue_index(&state);
            if runnable_index
                .and_then(|index| state.queued.get(index))
                .map(|item| item.id == ticket.id)
                .unwrap_or(false)
            {
                let index = runnable_index.ok_or_else(|| "AI 模型测试队列状态异常".to_string())?;
                let mut item = state
                    .queued
                    .remove(index)
                    .ok_or_else(|| "AI 模型测试队列状态异常".to_string())?;
                let started_at_ms = now_ms();
                item.started_at_ms = Some(started_at_ms);
                item.wait_ms = started_at_ms.saturating_sub(ticket.created_at_ms);
                item.remaining_wait_ms = 0;
                if state.running.is_none() {
                    state.running = Some(item);
                } else {
                    state.extra_running.push(item);
                }
                return Ok(AiProviderQueuePermit {
                    id: ticket.id,
                    created_at_ms: ticket.created_at_ms,
                    started_at_ms,
                });
            }

            let (next_state, _) = self
                .ready
                .wait_timeout(state, Duration::from_millis(250))
                .map_err(|_| "AI 模型测试队列等待异常".to_string())?;
            state = next_state;
        }
    }

    fn leave(&self, id: u64) {
        if let Ok(mut state) = self.state.lock() {
            if state
                .running
                .as_ref()
                .map(|item| item.id == id)
                .unwrap_or(false)
            {
                state.running = None;
            } else if let Some(index) = state.extra_running.iter().position(|item| item.id == id) {
                state.extra_running.remove(index);
            }
            state.metadata_by_id.remove(&id);
            self.ready.notify_all();
        }
    }

    pub(crate) fn status(&self) -> Result<AiProviderQueueStatus, String> {
        let state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试队列状态异常".to_string())?;
        let now = now_ms();
        let wait_timeout_ms = AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT.as_millis();
        let running_items = collect_running_items(&state)
            .into_iter()
            .map(|item| annotate_queue_item(item, now))
            .collect::<Vec<_>>();
        let running = running_items.first().cloned();
        let queued = state
            .queued
            .iter()
            .cloned()
            .map(|item| annotate_queue_item(item, now))
            .collect::<Vec<_>>();
        let running_count = running_items.len();
        let pending_count = queued.len() + running_count;
        let available_slots = AI_PROVIDER_TEST_QUEUE_LIMIT.saturating_sub(pending_count);
        let available_running_slots = AI_PROVIDER_TEST_RUNNING_LIMIT.saturating_sub(running_count);
        Ok(AiProviderQueueStatus {
            running,
            running_items,
            queued,
            pending_count,
            queue_limit: AI_PROVIDER_TEST_QUEUE_LIMIT,
            running_count,
            running_limit: AI_PROVIDER_TEST_RUNNING_LIMIT,
            available_running_slots,
            available_slots,
            is_saturated: available_slots == 0,
            wait_timeout_ms,
        })
    }

    pub(crate) fn cancel_queued(&self) -> Result<Vec<String>, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试队列状态异常".to_string())?;
        let cancelled_ids = state.queued.iter().map(|item| item.id).collect::<Vec<_>>();
        let cancelled_request_ids = state
            .queued
            .iter()
            .map(|item| item.request_id.clone())
            .collect::<Vec<_>>();
        state.queued.clear();
        for id in &cancelled_ids {
            state.metadata_by_id.remove(id);
        }
        state.cancelled_ids.extend(cancelled_ids);
        self.ready.notify_all();
        Ok(cancelled_request_ids)
    }

    pub(crate) fn cancel_queued_request(&self, request_id: &str) -> Result<bool, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "AI 模型测试队列状态异常".to_string())?;
        let Some(index) = state
            .queued
            .iter()
            .position(|item| item.request_id == request_id)
        else {
            return Ok(false);
        };
        let Some(item) = state.queued.remove(index) else {
            return Ok(false);
        };
        state.cancelled_ids.insert(item.id);
        state.metadata_by_id.remove(&item.id);
        self.ready.notify_all();
        Ok(true)
    }
}

fn running_items_len(state: &AiProviderQueueState) -> usize {
    usize::from(state.running.is_some()) + state.extra_running.len()
}

fn collect_running_items(state: &AiProviderQueueState) -> Vec<AiProviderQueueItem> {
    let mut items = Vec::with_capacity(running_items_len(state));
    if let Some(item) = &state.running {
        items.push(item.clone());
    }
    items.extend(state.extra_running.iter().cloned());
    items
}

fn queue_config_for_item(
    state: &AiProviderQueueState,
    item: &AiProviderQueueItem,
) -> AiProviderQueueConfig {
    state
        .metadata_by_id
        .get(&item.id)
        .cloned()
        .unwrap_or_else(AiProviderQueueConfig::serial_global)
}

fn running_count_for_queue_key(state: &AiProviderQueueState, queue_key: &str) -> usize {
    collect_running_items(state)
        .iter()
        .filter(|item| queue_config_for_item(state, item).queue_key == queue_key)
        .count()
}

fn can_run_queue_item(state: &AiProviderQueueState, item: &AiProviderQueueItem) -> bool {
    if running_items_len(state) >= AI_PROVIDER_TEST_RUNNING_LIMIT {
        return false;
    }

    let queue_config = queue_config_for_item(state, item);
    running_count_for_queue_key(state, &queue_config.queue_key) < queue_config.concurrency_limit
}

fn next_runnable_queue_index(state: &AiProviderQueueState) -> Option<usize> {
    state
        .queued
        .iter()
        .position(|item| can_run_queue_item(state, item))
}

fn annotate_queue_item(mut item: AiProviderQueueItem, now_ms: u128) -> AiProviderQueueItem {
    item.wait_ms = item
        .started_at_ms
        .unwrap_or(now_ms)
        .saturating_sub(item.created_at_ms);
    item.remaining_wait_ms = if item.started_at_ms.is_some() || item.wait_timeout_ms == 0 {
        0
    } else {
        item.wait_timeout_ms.saturating_sub(item.wait_ms)
    };
    item
}

pub(crate) fn provider_test_queue_config(
    action: &str,
    config: &AiProviderConfig,
) -> AiProviderQueueConfig {
    let queue_mode = if config.queue_mode == "concurrent" {
        "concurrent"
    } else {
        "serial"
    };
    let concurrency_limit = if queue_mode == "concurrent" {
        config
            .max_concurrency
            .clamp(2, AI_PROVIDER_TEST_MAX_CONFIG_CONCURRENCY)
    } else {
        1
    };
    let queue_key = normalize_queue_key(action, config);

    AiProviderQueueConfig {
        queue_key,
        queue_mode: queue_mode.to_string(),
        concurrency_limit,
    }
}

fn normalize_queue_key(action: &str, config: &AiProviderConfig) -> String {
    let candidate = config.queue_key.trim();
    if !candidate.is_empty() {
        return candidate.chars().take(128).collect();
    }

    let model = if action == "image" {
        config.image_model.trim()
    } else {
        config.model.trim()
    };

    format!(
        "{}:{}:{}",
        config.provider.trim(),
        config.base_url.trim(),
        model
    )
    .chars()
    .take(512)
    .collect()
}

pub(crate) fn provider_test_queue_wait_timeout(
    action: &str,
    config: &AiProviderConfig,
) -> Duration {
    if matches!(action, "image" | "video") {
        let request_timeout_ms = provider_request_timeout_ms(action, config);
        return Duration::from_millis(provider_sidecar_timeout_ms(action, request_timeout_ms));
    }

    AI_PROVIDER_TEST_QUEUE_WAIT_TIMEOUT
}

impl Drop for AiProviderQueuePermit {
    fn drop(&mut self) {
        ai_provider_test_queue().leave(self.id);
    }
}

pub(crate) fn ai_provider_test_queue() -> &'static AiProviderTestQueue {
    AI_PROVIDER_TEST_QUEUE.get_or_init(AiProviderTestQueue::new)
}

#[cfg(test)]
#[path = "ai_provider_queue_tests.rs"]
mod queue_tests;
