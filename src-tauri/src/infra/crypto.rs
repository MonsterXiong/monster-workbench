
pub struct CryptoInfra;

impl CryptoInfra {
    pub fn new() -> Self {
        Self
    }

    /// 简单的字符串哈希（DJB2 算法），用作轻量防碰撞散列定位，避免引入重量级加密库
    pub fn simple_hash(&self, text: &str) -> String {
        let mut hash: u32 = 5381;
        for c in text.chars() {
            hash = ((hash << 5).wrapping_add(hash)).wrapping_add(c as u32);
        }
        format!("{:x}", hash)
    }
}
