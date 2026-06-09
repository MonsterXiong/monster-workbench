use crate::infra::{AppError, AppResult};
use std::net::TcpStream;
use std::time::Duration;

pub struct HttpInfra;

impl HttpInfra {
    pub fn new() -> Self {
        Self
    }

    /// 校验与指定主机的连通性，用作简单的网络状态探针
    pub fn check_connection(&self, host: &str, port: u16, timeout_ms: u64) -> AppResult<bool> {
        let addr = format!("{}:{}", host, port);
        let socket_addrs = match addr.parse() {
            Ok(sa) => vec![sa],
            Err(_) => {
                // 如果是域名，尝试解析出来，但为了避免 DNS 解析引起长时阻塞，这里只支持直接的 IP:PORT，或者使用 DNS lookup。
                // 作为一个简单的连通性工具，如果直接尝试解析失败，可以尝试通过 std::net::ToSocketAddrs 转换
                use std::net::ToSocketAddrs;
                match addr.to_socket_addrs() {
                    Ok(addrs) => addrs.collect(),
                    Err(e) => {
                        return Err(AppError::Network(format!("无法解析主机名或地址: {}", e)))
                    }
                }
            }
        };

        if socket_addrs.is_empty() {
            return Err(AppError::Network("解析出的套接字地址为空".to_string()));
        }

        // 尝试连接
        for socket_addr in socket_addrs {
            if TcpStream::connect_timeout(&socket_addr, Duration::from_millis(timeout_ms)).is_ok() {
                return Ok(true);
            }
        }

        Ok(false)
    }
}
