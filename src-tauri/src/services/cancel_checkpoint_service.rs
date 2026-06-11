use crate::infra::creative_task_repo;
use crate::infra::{AppError, AppResult};
use serde_json::json;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::thread::{self, JoinHandle};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub(crate) struct CancelCheckpointServer {
    pub(crate) url: String,
    pub(crate) token: String,
    stop: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

impl Drop for CancelCheckpointServer {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

pub(crate) fn start_cancel_checkpoint_server(
    db_path: std::path::PathBuf,
    task_id: i64,
) -> AppResult<CancelCheckpointServer> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| AppError::Process(format!("failed to bind cancel checkpoint: {error}")))?;
    listener.set_nonblocking(true).map_err(|error| {
        AppError::Process(format!("failed to configure cancel checkpoint: {error}"))
    })?;
    let port = listener
        .local_addr()
        .map_err(|error| {
            AppError::Process(format!(
                "failed to read cancel checkpoint endpoint: {error}"
            ))
        })?
        .port();
    let token = format!("monster-cancel-{}-{}", task_id, now_millis());
    let expected_token = token.clone();
    let stop = Arc::new(AtomicBool::new(false));
    let stop_for_thread = stop.clone();
    let handle = thread::spawn(move || {
        while !stop_for_thread.load(Ordering::SeqCst) {
            match listener.accept() {
                Ok((mut stream, _)) => {
                    let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
                    let _ = stream.set_write_timeout(Some(Duration::from_millis(500)));
                    let cancel_requested =
                        task_cancel_requested(&db_path, task_id).unwrap_or(false);
                    let authorized = read_checkpoint_token(&mut stream)
                        .map(|value| value == expected_token)
                        .unwrap_or(false);
                    let _ = write_checkpoint_response(&mut stream, authorized, cancel_requested);
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(20));
                }
                Err(_) => break,
            }
        }
    });

    Ok(CancelCheckpointServer {
        url: format!("http://127.0.0.1:{port}/cancel-checkpoint"),
        token,
        stop,
        handle: Some(handle),
    })
}

fn task_cancel_requested(db_path: &std::path::Path, task_id: i64) -> AppResult<bool> {
    let task = creative_task_repo::get_task(db_path, task_id)?
        .ok_or_else(|| AppError::Database("task not found for cancel checkpoint".to_string()))?;
    Ok(matches!(task.status.as_str(), "cancelling" | "cancelled"))
}

fn read_checkpoint_token(stream: &mut TcpStream) -> Option<String> {
    let mut buffer = [0_u8; 2048];
    let size = stream.read(&mut buffer).ok()?;
    let request = String::from_utf8_lossy(&buffer[..size]);
    request.lines().find_map(|line| {
        let (name, value) = line.split_once(':')?;
        if name.eq_ignore_ascii_case("x-monster-token") {
            Some(value.trim().to_string())
        } else {
            None
        }
    })
}

fn write_checkpoint_response(
    stream: &mut TcpStream,
    authorized: bool,
    cancel_requested: bool,
) -> std::io::Result<()> {
    let (status_line, body) = if authorized {
        (
            "HTTP/1.1 200 OK",
            json!({ "ok": true, "cancelRequested": cancel_requested }).to_string(),
        )
    } else {
        (
            "HTTP/1.1 401 Unauthorized",
            json!({ "ok": false, "error": "unauthorized" }).to_string(),
        )
    };
    let response = format!(
        "{status_line}\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    stream.write_all(response.as_bytes())
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}
