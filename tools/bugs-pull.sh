#!/bin/sh
# Забирає знахідки хмарного ШІ-тестувальника з KV у _team/bugs.md і очищає їх у хмарі
cd "$(dirname "$0")/../worker" || exit 1
B=$(npx wrangler kv key get ait:bugs --namespace-id 279c013ca4564083a7f56326a2855bbd --remote 2>/dev/null)
case "$B" in ""|*"Value not found"*) echo "Нових знахідок немає"; exit 0;; esac
printf '%s\n' "$B" >> ../_team/bugs.md && npx wrangler kv key delete ait:bugs --namespace-id 279c013ca4564083a7f56326a2855bbd --remote >/dev/null && echo "✅ Додано в _team/bugs.md"
