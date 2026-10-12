#!/bin/sh
# Відправляє заповнені ключі з ../ключі.env у Cloudflare (і TEST_AI_* — для хмарного тестувальника)
F="$(dirname "$0")/../../ключі.env"; cd "$(dirname "$0")/../worker" || exit 1
grep -E '^[A-Z_]+=[^ #]' "$F" | while IFS='=' read -r k v; do
  v=$(printf %s "$v" | sed 's/[[:space:]]*#.*//;s/[[:space:]]*$//'); [ -n "$v" ] || continue
  printf %s "$v" | npx wrangler secret put "$k" >/dev/null && echo "✅ $k"
done
