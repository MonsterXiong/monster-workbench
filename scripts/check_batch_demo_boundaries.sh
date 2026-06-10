#!/usr/bin/env bash
set -euo pipefail

search() {
  local pattern="$1"
  shift
  if rg --version >/dev/null 2>&1; then
    rg -n --no-heading -e "$pattern" "$@" || true
  else
    grep -RInE "$pattern" "$@" 2>/dev/null || true
  fi
}

TARGET_PATHS=(
  src/services/tauri.mock.ts
  src/services/task.service.ts
  src/stores/task.ts
  src/views/playground/components/playgroundWorkflowDemos
  src-tauri/src/services/batch_job_service.rs
  src-tauri/src/services/task_service.rs
  src-tauri/src/services/sidecar_lifecycle_service.rs
)

echo "== Batch Image Demo boundary check =="

echo ""
echo "1) Check for direct Python localhost fetch..."
search "fetch\\(['\\\"]http://(127\\.0\\.0\\.1|localhost):|axios\\.(get|post)\\(['\\\"]http://(127\\.0\\.0\\.1|localhost):" "${TARGET_PATHS[@]}"

echo ""
echo "2) Check for image base64 in frontend..."
search "data:image|base64|readAsDataURL" "${TARGET_PATHS[@]}"

echo ""
echo "3) Check for possible frontend batch loops around provider/image generation..."
if rg --version >/dev/null 2>&1; then
  rg -n --no-heading -e "Promise\\.all|Array\\.from|forEach|for \\(" "${TARGET_PATHS[@]}" | rg -i "image|generate|provider|batch|1000" || true
else
  grep -RInE "Promise\\.all|Array\\.from|forEach|for \\(" "${TARGET_PATHS[@]}" 2>/dev/null | grep -Ei "image|generate|provider|batch|1000" || true
fi

echo ""
echo "4) Check batch-related keywords..."
search "batch|concurrency|max_retries|cancel|pause|resume" "${TARGET_PATHS[@]}"

echo ""
echo "Batch demo boundary check completed. Review manually; some matches may be false positives."
