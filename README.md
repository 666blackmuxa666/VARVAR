# VARVAR — меню із замовленням у Telegram

Легкий сайт-меню (UA/EN) без фреймворків. Гість сканує QR → обирає страви → вибирає стіл → «Замовити». Замовлення приходить у Telegram-групу персоналу. Замовити можна лише з Wi‑Fi закладу.

- `index.html`, `css/`, `js/`: сайт (GitHub Pages)
- `data/menu.json`: стартова/резервна копія меню; робоче меню живе на сервері й редагується через Telegram (напишіть боту `help`)
- `img/`: фото страв, вирізані зі сторінок PDF-меню
- `worker/`: Cloudflare Worker (Telegram, перевірка Wi‑Fi, рахунок столу)
- `admin.html`: «Це наша мережа» (PIN), запускати з телефону в Wi‑Fi закладу
- `tools/qr.html`: табличка на стіл для друку

## Кнопки в кошику
- перше замовлення: **Замовити** / **Замовити + чек**
- далі: **Дозамовити** / **Хочу чек** (у Telegram приходить загальна сума за стіл)

## Запуск (один раз)
1. **Telegram-бот**: @BotFather → `/newbot` → отримаєте `BOT_TOKEN`. Створіть групу персоналу, додайте бота, дізнайтесь `CHAT_ID` групи (напр. через @RawDataBot).
2. **Cloudflare** (безкоштовно): у папці `worker/`:
   ```
   npx wrangler login
   npx wrangler kv namespace create DB      # id → wrangler.toml
   npx wrangler secret put BOT_TOKEN
   npx wrangler secret put CHAT_ID
   npx wrangler secret put ADMIN_PIN        # PIN для admin.html
   npx wrangler secret put TG_SECRET        # будь-який випадковий рядок
   npx wrangler deploy
   ```
3. Webhook бота (для команд `/close N`, `/tables`):
   `https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<WORKER_URL>/tg&secret_token=<TG_SECRET>`
4. У `js/config.js` вкажіть URL Worker'а, назву й пароль Wi‑Fi, кількість столів. Те саме число `TABLES` у `worker/wrangler.toml`.
5. GitHub → Settings → Pages → Deploy from branch `main` / root.
6. З телефону в Wi‑Fi закладу відкрийте `…/VARVAR/admin.html`, введіть PIN → «Це наша мережа».
7. Роздрукуйте `tools/qr.html`.

## Зміна меню / цін
Редагуйте `tools/menu-data.mjs`, потім `node tools/menu-data.mjs` і `cd worker && npx wrangler deploy` (сервер рахує ціни сам, клієнту не довіряє).
Перерізати фото: `swift tools/crop.swift "../Все разом-1-стиснуто.pdf" tools/crops.json img`.

## Команди бота (у групі)
- `/tables`: відкриті рахунки
- `/close 5`: закрити рахунок столу 5 (у гостя обнулиться історія)
