#!/usr/bin/env bash
set -euo pipefail

required=(
  "docs/ai/codex-goal-ops-manual.md"
  "docs/ai/codex-goal-mode.md"
  "docs/ai/creative-architecture-guardrails.md"
  "docs/ai/creative-system-roadmap.md"
  "docs/ai/creative-regression-checklist.md"
  "docs/ai/multi-agent-operating-model.md"
  "docs/ai/phase-prompt-index.md"
  "docs/goals/goal_00_docs_guardrails.md"
  "docs/goals/goal_01_minimal_db_model.md"
  "docs/goals/goal_02_task_service_commands.md"
  "docs/templates/codex_goal_template.md"
)

missing=0
for f in "${required[@]}"; do
  if [ ! -f "$f" ]; then
    echo "Missing: $f"
    missing=1
  fi
done

if [ "$missing" -eq 0 ]; then
  echo "All required Codex Goal docs exist."
fi

exit "$missing"
