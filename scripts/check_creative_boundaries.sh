#!/usr/bin/env bash
set -euo pipefail

echo "== Creative boundary check =="

echo ""
echo "1) Check direct Vue-to-Python localhost fetch risk..."
grep -RInE "fetch\\(['\\\"]http://(127\\.0\\.0\\.1|localhost):|axios\\.(get|post|put|delete)\\(['\\\"]http://(127\\.0\\.0\\.1|localhost):" src 2>/dev/null || true

echo ""
echo "2) Check direct invoke outside expected service files..."
grep -RIn "invoke(" src 2>/dev/null | grep -v "src/services/tauri" | grep -v "src/services/" || true

echo ""
echo "3) Check forbidden early infra keywords..."
grep -RInE "\\b(redis|ioredis|bullmq|postgres|pg\\b|remote worker|celery)\\b" . \
  --exclude-dir=node_modules \
  --exclude-dir=target \
  --exclude-dir=.git \
  --exclude-dir=dist \
  --exclude-dir=src-tauri/target \
  2>/dev/null || true

echo ""
echo "4) Check possible large base64 image handling..."
grep -RInE "data:image|base64|readAsDataURL" src src-tauri 2>/dev/null || true

echo ""
echo "5) Check forbidden frontend fs/sql plugin references..."
grep -RInE "@tauri-apps/plugin-(fs|sql)|tauri-plugin-(fs|sql)|sql:|fs:default" . \
  --exclude-dir=node_modules \
  --exclude-dir=target \
  --exclude-dir=.git \
  --exclude-dir=dist \
  --exclude-dir=src-tauri/target \
  2>/dev/null || true

echo ""
echo "Boundary check completed. Review matches manually; some may be false positives."
