const SECRET_PLACEHOLDER: &str = "[已脱敏]";

const SECRET_KEYS: [&str; 9] = [
    "api_key",
    "apikey",
    "apiKey",
    "Authorization",
    "authorization",
    "token",
    "secret",
    "password",
    "admin_password",
];

pub fn sanitize_sensitive_text(value: &str) -> String {
    let mut text = value.to_string();
    for marker in ["Bearer ", "sk-", "AIza"] {
        text = mask_token_after_marker(&text, marker);
    }

    for key in SECRET_KEYS {
        text = mask_json_like_secret_value(&text, key);
        text = mask_key_value_secret(&text, key);
    }

    text
}

fn mask_token_after_marker(value: &str, marker: &str) -> String {
    let mut output = String::new();
    let mut rest = value;

    while let Some(index) = rest.find(marker) {
        output.push_str(&rest[..index]);
        output.push_str(marker);
        output.push_str(SECRET_PLACEHOLDER);

        let token_start = index + marker.len();
        let token = &rest[token_start..];
        let token_end = token
            .char_indices()
            .find(|(_, ch)| matches!(ch, ' ' | '\n' | '\r' | '\t' | '"' | '\'' | ',' | '}' | ']'))
            .map(|(end, _)| end)
            .unwrap_or(token.len());
        rest = &token[token_end..];
    }

    output.push_str(rest);
    output
}

fn mask_json_like_secret_value(value: &str, key: &str) -> String {
    let mut output = String::new();
    let mut rest = value;
    let quoted_key = format!("\"{}\"", key);

    while let Some(index) = rest.find(&quoted_key) {
        output.push_str(&rest[..index + quoted_key.len()]);
        let after_key = &rest[index + quoted_key.len()..];
        let Some(colon_index) = after_key.find(':') else {
            output.push_str(after_key);
            return output;
        };

        output.push_str(&after_key[..=colon_index]);
        let after_colon = &after_key[colon_index + 1..];
        let leading_ws_len = after_colon
            .char_indices()
            .find(|(_, ch)| !ch.is_whitespace())
            .map(|(offset, _)| offset)
            .unwrap_or(after_colon.len());
        output.push_str(&after_colon[..leading_ws_len]);
        let after_ws = &after_colon[leading_ws_len..];

        if let Some(value_body) = after_ws.strip_prefix('"') {
            output.push('"');
            output.push_str(SECRET_PLACEHOLDER);
            output.push('"');
            let value_end = value_body.find('"').unwrap_or(value_body.len());
            rest = &value_body[value_end + usize::from(value_end < value_body.len())..];
        } else {
            output.push_str(SECRET_PLACEHOLDER);
            let value_end = after_ws
                .char_indices()
                .find(|(_, ch)| matches!(ch, ',' | '}' | ']'))
                .map(|(end, _)| end)
                .unwrap_or(after_ws.len());
            rest = &after_ws[value_end..];
        }
    }

    output.push_str(rest);
    output
}

fn mask_key_value_secret(value: &str, key: &str) -> String {
    let mut output = String::new();
    let mut rest = value;

    while let Some(index) = rest.find(key) {
        output.push_str(&rest[..index + key.len()]);
        let after_key = &rest[index + key.len()..];
        let leading_ws_len = after_key
            .char_indices()
            .find(|(_, ch)| !ch.is_whitespace())
            .map(|(offset, _)| offset)
            .unwrap_or(after_key.len());
        let leading_ws = &after_key[..leading_ws_len];
        let after_ws = &after_key[leading_ws_len..];
        let Some(separator) = after_ws.chars().next().filter(|ch| matches!(ch, '=' | ':')) else {
            rest = after_key;
            continue;
        };

        output.push_str(leading_ws);
        output.push(separator);
        let after_separator = &after_ws[separator.len_utf8()..];
        let value_leading_ws_len = after_separator
            .char_indices()
            .find(|(_, ch)| !ch.is_whitespace())
            .map(|(offset, _)| offset)
            .unwrap_or(after_separator.len());
        output.push_str(&after_separator[..value_leading_ws_len]);
        output.push_str(SECRET_PLACEHOLDER);

        let after_value = &after_separator[value_leading_ws_len..];
        let value_end = after_value
            .char_indices()
            .find(|(_, ch)| matches!(ch, ' ' | '\n' | '\r' | '\t' | ',' | ';' | '}' | ']'))
            .map(|(end, _)| end)
            .unwrap_or(after_value.len());
        rest = &after_value[value_end..];
    }

    output.push_str(rest);
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn masks_common_token_markers() {
        let raw = "Authorization: Bearer sk-live-secret token=AIzaSySecretValue";
        let sanitized = sanitize_sensitive_text(raw);

        assert!(!sanitized.contains("sk-live-secret"));
        assert!(!sanitized.contains("AIzaSySecretValue"));
        assert!(sanitized.contains("["));
        assert_ne!(sanitized, raw);
    }

    #[test]
    fn masks_json_like_secret_values() {
        let raw = r#"{"apiKey":"plain-secret","password":"p@ss","authorization":"Basic abc"}"#;
        let sanitized = sanitize_sensitive_text(raw);

        assert!(!sanitized.contains("plain-secret"));
        assert!(!sanitized.contains("p@ss"));
        assert!(!sanitized.contains("Basic abc"));
        assert!(sanitized.contains(r#""apiKey":"[已脱敏]""#));
        assert!(sanitized.contains(r#""password":"[已脱敏]""#));
        assert!(sanitized.contains(r#""authorization":"[已脱敏]""#));
    }

    #[test]
    fn masks_key_value_secret_values() {
        let raw = "apiKey=plain-secret Authorization: Basic abc admin_password = root";
        let sanitized = sanitize_sensitive_text(raw);

        assert!(!sanitized.contains("plain-secret"));
        assert!(!sanitized.contains("Basic abc"));
        assert!(!sanitized.contains("root"));
        assert!(sanitized.contains("apiKey=[已脱敏]"));
        assert!(sanitized.contains("Authorization: [已脱敏]"));
        assert!(sanitized.contains("admin_password = [已脱敏]"));
    }

    #[test]
    fn keeps_scanning_after_non_secret_key_prefixes() {
        let raw = "tokenization is normal token=real-secret";
        let sanitized = sanitize_sensitive_text(raw);

        assert!(sanitized.contains("tokenization is normal"));
        assert!(!sanitized.contains("real-secret"));
        assert!(sanitized.contains("token=[已脱敏]"));
    }
}
