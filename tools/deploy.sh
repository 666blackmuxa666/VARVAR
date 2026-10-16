#!/bin/sh
# 🚀 Безпечне викладання сервера: тести → деплой → перевірка живого сервера → якщо зламалось, автоматичний відкат.
# Код один на всі заклади, тож помилка зачепила б усіх одразу — тому без зелених тестів не викладаємо.
#   sh tools/deploy.sh            — повний цикл
#   sh tools/deploy.sh --rollback — повернути попередню версію вручну
set -e
cd "$(dirname "$0")/.."
SELF=$(grep SELF_URL worker/wrangler.toml | cut -d'"' -f2)
if [ "$1" = "--rollback" ]; then (cd worker && npx wrangler rollback --message "ручний відкат" -y); exit; fi

echo "🧪 Тести…"
sh tools/test.sh --quiet | tail -1 | grep -q "✅" || { echo "❌ Тести не пройшли — не викладаю"; exit 1; }

sh tools/build-site.sh
echo "🚀 Деплой…"
(cd worker && npx wrangler deploy 2>&1 | grep -E "Deployed|rror")

echo "🩺 Перевірка живого сервера…"
ok=1
for p in "/api/menu" "/v/atom-demo/api/menu" "/api/site"; do
  code=$(curl -s -o /tmp/varvar-smoke.json -w "%{http_code}" "$SELF$p?smoke=$(date +%s)")
  if [ "$code" != "200" ] || ! grep -q "{" /tmp/varvar-smoke.json; then echo "  ❌ $p → $code"; ok=0; else echo "  ✅ $p"; fi
done
if [ $ok = 0 ]; then
  echo "↩️ Відкат на попередню версію…"; (cd worker && npx wrangler rollback --message "авто-відкат: перевірка не пройшла" -y)
  exit 1
fi
echo "✅ Викладено"
