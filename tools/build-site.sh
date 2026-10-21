#!/bin/sh
# 📦 Збирає файли сайту для Cloudflare (worker/.site): лише те, що в git, без сервера, інструментів і службового (жодних прихованих .файлів і .тек — .manus, .work, .github…; звіти outputs/).
# + копія коду сервера в /__src (для ШІ-тестувальника; ззовні не видно — index.js не віддає /__src).
set -e
cd "$(dirname "$0")/.."
rm -rf worker/.site && mkdir -p worker/.site/__src
git ls-files --cached --others --exclude-standard | grep -vE '^(worker|tools|_team|outputs)/|(^|/)\.|\.md$|varvar-print\.config\.json$' | while IFS= read -r f; do [ -f "$f" ] && mkdir -p "worker/.site/$(dirname "$f")" && cp "$f" "worker/.site/$f"; done
cp worker/src/*.js worker/.site/__src/
node tools/stamp.mjs worker/.site
echo "📦 Сайт: $(find worker/.site -type f | wc -l | tr -d ' ') файлів"
