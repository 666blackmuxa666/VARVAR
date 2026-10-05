#!/bin/sh
# 🧪 Тест у СПІЛЬНОМУ тестовому середовищі — по черзі (замок), щоб працівники не перезаписували код одне одному.
# Запуск з кореня СВОЄЇ копії (worktree): sh tools/test.sh [--api-only|--ui-only]
# Потрібні запущені launch-конфіги «worker-test» (8787) і «site-test» (8001).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; TEST="$ROOT/../.varvar-test"; [ -d "$TEST" ] || TEST="$(cd "$ROOT" && git rev-parse --path-format=absolute --git-common-dir)/../../.varvar-test"
LOCK=/tmp/varvar-test.lock; WHO="$(basename "$ROOT")"
i=0; until mkdir "$LOCK" 2>/dev/null; do
  [ $((i % 6)) -eq 0 ] && echo "⏳ тест зайнятий: $(cat $LOCK/who 2>/dev/null) — чекаю…"; i=$((i+1)); sleep 10
  [ $i -gt 90 ] && { echo "⚠️ замок висить >15 хв — знімаю"; rm -rf "$LOCK"; }
done
echo "$WHO $(date +%H:%M:%S)" > "$LOCK/who"; trap 'rm -rf "$LOCK"' EXIT INT TERM
echo "🔒 тестове середовище — $WHO"
rsync -a --delete "$ROOT/worker/src/" "$TEST/worker/src/"
rsync -a --delete --exclude worker --exclude .git --exclude .claude --exclude node_modules --exclude print/ --exclude varvar-print.config.json "$ROOT/" "$TEST/site/"
sleep 6 # wrangler dev перезавантажує код
API=http://localhost:8787 SITE=http://localhost:8001 node "$ROOT/tools/selftest.mjs" "$@"
