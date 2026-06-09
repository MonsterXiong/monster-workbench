#!/usr/bin/env bash
set -euo pipefail

echo "== Batch Image Demo boundary check =="

echo ""
echo "1) Check for direct Python localhost fetch..."
grep -RInE "fetch\\(['\\\"]http://(127\\.0\\.0\\.1|localhost):|axios\\.(get|post)\\(['\\\"]http://(127\\.0\\.0\\.1|localhost):" src 2>/dev/null || true

echo ""
echo "2) Check for image base64 in frontend..."
grep -RInE "data:image|base64|readAsDataURL" src 2>/dev/null || true

echo ""
echo "3) Check for possible frontend batch loops around provider/image generation..."
grep -RInE "Promise\\.all|Array\\.from|forEach|for \\(" src 2>/dev/null | grep -Ei "image|generate|provider|batch|1000" || true

echo ""
echo "4) Check batch-related keywords..."
grep -RInE "batch|concurrency|max_retries|cancel|pause|resume" src src-tauri 2>/dev/null || true

echo ""
echo "Batch demo boundary check completed. Review manually; some matches may be false positives."
