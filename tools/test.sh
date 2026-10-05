#!/bin/sh
# 🧪 Тест у СПІЛЬНОМУ тестовому середовищі — по черзі (замок), щоб працівники не перезаписували код одне одному.
# Запуск з кореня СВОЄЇ копії (worktree): sh tools/test.sh [--api-only|--ui-only]
# Потрібні запущені launch-конфіги «worker-test» (8787) і «site-test» (8001).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# справжня тестова копія завжди поруч із ГОЛОВНИМ репозиторієм (а не з worktree помічника)
TEST="$(cd "$(git -C "$ROOT" rev-parse --path-format=absolute --git-common-dir)/../.." && pwd)/.varvar-test"
[ -d "$TEST/worker/src" ] || { echo "⚠️ не знайдено тестову копію $TEST"; exit 1; }
LOCK=/tmp/varvar-test.lock; WHO="$(basename "$ROOT")"
i=0; until mkdir "$LOCK" 2>/dev/null; do
  [ $((i % 6)) -eq 0 ] && echo "⏳ тест зайнятий: $(cat $LOCK/who 2>/dev/null) — чекаю…"; i=$((i+1)); sleep 10
  [ $i -gt 90 ] && { echo "⚠️ замок висить >15 хв — знімаю"; rm -rf "$LOCK"; }
done
echo "$WHO $(date +%H:%M:%S)" > "$LOCK/who"; trap 'rm -rf "$LOCK"' EXIT INT TERM
echo "🔒 тестове середовище — $WHO"
rsync -a --delete "$ROOT/worker/src/" "$TEST/worker/src/"
rsync -a --delete --exclude worker --exclude .git --exclude .claude --exclude node_modules --exclude print/ --exclude varvar-print.config.json "$ROOT/" "$TEST/site/"
ID="$WHO-$(date +%s)"; printf "export const BUILD = '%s';\n" "$ID" > "$TEST/worker/src/buildid.js"
i=0; until [ "$(curl -s http://localhost:8787/api/build 2>/dev/null | grep -o "$ID")" = "$ID" ]; do i=$((i+1)); [ $i -gt 60 ] && { echo "⚠️ тестовий сервер не перезавантажився за 60 с — чи запущено worker-test?"; exit 1; }; sleep 1; done
echo "✅ сервер на коді $WHO (за ${i} с)"
API=http://localhost:8787 SITE=http://localhost:8001 node "$ROOT/tools/selftest.mjs" "$@"
