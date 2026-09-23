#!/usr/bin/env bash
set -u

ROOT="/root/bot-teste"
BRANCH="recuperacao-backend"
LOG="$ROOT/build-frontend.log"

cd "$ROOT" || exit 1
echo "=== PortoPlan frontend test: $(date -Is) ===" | tee "$LOG"

# Preserve only local runtime env; discard old test edits so pull never blocks.
git reset --hard HEAD >>"$LOG" 2>&1
git clean -fd -e frontend/.env -e frontend/.env.local >>"$LOG" 2>&1

if ! git pull --ff-only origin "$BRANCH" 2>&1 | tee -a "$LOG"; then
  echo "PULL_FAILED" | tee -a "$LOG"
  exit 2
fi

cd frontend || exit 3
set +e
npm run build 2>&1 | tee -a "$LOG"
status=${PIPESTATUS[0]}
set -e

echo | tee -a "$LOG"
if [ "$status" -eq 0 ]; then
  echo "BUILD_OK" | tee -a "$LOG"
  exit 0
fi

echo "BUILD_FAILED" | tee -a "$LOG"
echo "---- resumo do erro ----" | tee -a "$LOG"
grep -E -A12 -B2 "Failed to compile|Module not found|Cannot find|Can't resolve|Attempted import|Should not import|Module parse failed|ERROR in|\[eslint\]" "$LOG" | tail -80 || tail -80 "$LOG"
exit "$status"
