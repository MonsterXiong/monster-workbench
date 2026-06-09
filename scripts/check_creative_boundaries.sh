#!/usr/bin/env bash
set -euo pipefail

echo "== Creative boundary check =="

RG_COMMON_ARGS=(
  --line-number
  --hidden
  --glob '!node_modules/**'
  --glob '!target/**'
  --glob '!dist/**'
  --glob '!src-tauri/target/**'
  --glob '!.git/**'
  --glob '!.gemini/**'
)

echo ""
echo "1) Check direct Vue-to-Python localhost fetch risk..."
rg "${RG_COMMON_ARGS[@]}" "fetch\\(['\\\"]http://(127\\.0\\.0\\.1|localhost):|axios\\.(get|post|put|delete)\\(['\\\"]http://(127\\.0\\.0\\.1|localhost):" src 2>/dev/null || true

echo ""
echo "2) Check direct invoke outside expected service files..."
rg "${RG_COMMON_ARGS[@]}" "invoke\\(" src 2>/dev/null | grep -v "src/services/tauri" | grep -v "src/services/" || true

echo ""
echo "3) Check forbidden early infra keywords..."
rg "${RG_COMMON_ARGS[@]}" "\\b(redis|ioredis|bullmq|postgres|pg\\b|remote worker|celery)\\b" . 2>/dev/null || true

echo ""
echo "4) Check possible large base64 image handling..."
rg "${RG_COMMON_ARGS[@]}" "data:image|base64|readAsDataURL" src src-tauri 2>/dev/null || true

echo ""
echo "5) Check forbidden frontend fs/sql plugin references..."
rg "${RG_COMMON_ARGS[@]}" "@tauri-apps/plugin-(fs|sql)|tauri-plugin-(fs|sql)|sql:|fs:default" . 2>/dev/null || true

echo ""
echo "Boundary check completed. Review matches manually; some may be false positives."
