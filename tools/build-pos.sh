#!/bin/sh
# Збірка каси: js/pos/*.js (розділи) склеюються в одну функцію → esbuild → js/pos.build.js (es2017 — старі Windows / iPad)
# Після збірки — підняти ?v= у pos.html.
cd "$(dirname "$0")/.." || exit 1
OUT=js/pos.joined.tmp.js
{ cat js/pos/_head.txt; for f in js/pos/[0-9]*.js; do printf '\n  // ===== %s =====\n' "$(basename "$f")"; cat "$f"; done; cat js/pos/_tail.txt; } > "$OUT"
npx esbuild "$OUT" --target=es2017 --outfile=js/pos.build.js --log-level=warning && rm -f "$OUT" && echo "✅ js/pos.build.js"
