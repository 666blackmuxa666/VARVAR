# 🌐 Сайт, броні, сертифікати, кабінет гостя

## Що робить
Публічна візитка закладу (about.html) з бронюванням столів/банкетів, заявками на подарункові сертифікати й кабінетом гостя (вхід через бота гостей). Персонал керує бронями, сертифікатами й вмістом сайту з каси (розділ «Броні» / «Сайт») і з бота персоналу. Cron надсилає нагадування про броні й прохання оцінити візит. Сюди ж — меню гостя за QR (`js/app.js`) і режим `?go` / `?go&book=ID`.

## Файли
- `about.html` + `css/about.css` — розмітка й стилі візитки.
- `js/about.js` — фронт візитки: `api()` (fetch до воркера, Bearer-токен кабінету), `render()` (дані з `/api/site`), `bookInit()`/`showBook()` (форма броні → `POST /api/book`, статус `GET /api/book?id`), `certInit()`/`certPage()` (`POST/GET /api/cert`), `me()`/`meShow()` (вхід: `/api/me/start` → посилання на бота → поллінг `/api/me/poll` кожні 3 с, токен у `store gtok`).
- `js/app.js` — меню гостя: `syncStatus()` (`/api/status`, перевірка QR-сесії), `send()` (`/api/order`), `callWaiter()` (`/api/call`), `showWifi()` (тепер «скануйте QR на столі», 403 → банер), `pollOrders()`; режим `?go`: `goInit/goForm/goSend` (`/api/goinfo`, `/api/reco`, `/api/go`); `?go&book=ID` — передзамовлення до броні (`POST /api/bookpre`, телефон з `bkPhone`/`goPhone`).
- `js/pos/30-books-site.js` — каса: `loadBooks()` (bkList −7…+60 днів), `booksHTML()` (стрічка 21 день, картки броней, кнопки статусів), `bkForm()` (нова/редагування, підтягує ім'я з `cliGet`), `certT(t)` (списати сертифікат на стіл), `siteImg()` (стиснення до 1600px, JPEG .82 → `sitePhoto`), `siteHTML()` (редактор візитки).
- `worker/src/site.js` — уся логіка: `getSite/setSite/sitePublic/openNow`; броні `bookCreate, bookPre, bookStatus, bookSet, bookList, bookEditFields, bookManual, bkButtons, bkEdit`; сертифікати `certAsk, getCert, certPay, certUse, certList, certPublic`; кабінет `botName, meStart, mePoll, meData, meLogout`; бот гостей `guestBot, guestCallback, guestText, guestHello, guestMsg`; відгуки `reviewQueue, ratings`; `cron()`.
- `worker/src/siteapi.js` — `siteApi(b, env, me, t)`: ops каси для сайту/броней/сертифікатів.
- `worker/src/index.js` — публічні маршрути, `scheduled()` → `/__cron` у Store.

## Ключі бази (env.DB)
- `site` → JSON налаштувань (зливається з `SITE_DEF`): name, tagline, about, phone, addr, from/to, insta, tg, gmaps, geo, rating, ratingN, reviewsUrl, quotes[], hits[], promos[], photos[], hero, banquet, hookah, preMin, certOn, bookOn.
- `img:<id>` → ArrayBuffer фото (`site-xxxxxxxx`), віддається `/img/<id>`.
- `book:YYYY-MM` → масив броней місяця з **id** (id = `YYYYMMDD`+6 hex від дати створення): {id, kind table|banquet, name, phone, date, time, people, comment, note, st, t, pre[], preIds, preSent, mid, remA, remG, by, edBy, src}. Статуси: new, ok, no, cancel, came, noshow.
- Запис лежить у ключі місяця своєї **дати**: при зміні дати (`bookEditFields` → `bkEdit(..., nm)`) переноситься під замком обох ключів. `bkm:<id>` → місяць, де лежить запис, якщо він ≠ місяцю id (видаляється при поверненні). Пошук: `bkLoc/bkFind` (індекс → запасний варіант місяць з id). `bookList` сканує місяці дат + 62 дні назад (старі записи без індексу); `meData` бере броні через `bookList` (сьогодні…+365).
- `preSent`: `'sending'` (під замком, поки йде `addWaiterOrder`; при збої знімається) → timestamp. Повторне `kit` → «Вже відправлено».
- `bkrl:<device|ip>` → лічильник броней (≤3/год, TTL 3600). `ctrl:<device|ip>` — те саме для сертифікатів.
- `cert:<VV-XXXXX>` → {code, sum, left, st new|ok|no, from, to, phone, note, paid, paidAt, by}; `certs` → масив кодів (останні 500).
- `gl:<nonce16>` → {at} / {token} (TTL 900/300); `glu:<uid>` → nonce; `gs:<token32>` → телефон (TTL 30 днів); `g2hook` → SELF_URL з встановленим вебхуком; `gbotname`.
- `revq` → черга відгуків [{id, ph, at, sum}] (≤300); `rvph:<id>` → телефон; `rvtxt:<tgUid>` → телефон (чекаємо текст скарги); `rate:YYYY-MM` → [{d, n, ph}].
- Читає: `cli:<телефон>` (delivery.js, chat гостя), `closed:<day>` (історія в кабінеті), `scan:<device>`.

## API
**Публічні (index.js, IN_STORE):** `GET /api/site` (кеш 60 с), `/site` → редірект на about.html, `POST/GET /api/book`, `POST /api/bookpre`, `POST/GET /api/cert`, `/api/me/start`, `/api/me/poll?n=`, `POST /api/me/logout`, `GET /api/me` (Bearer), `/api/status`, `POST /api/scan`, `/api/menu`, `/img/*`, `/api/orders?ids=`, `/go` → `?go`, `/api/go`, `/api/goinfo`, `/api/reco`, `/api/call`, `/api/order`, `/__cron` (лише з `x-cron` і всередині Store). Вебхук бота гостей — `POST /tg2` (перевірка `TG_SECRET`).
**Ops каси (siteapi.js):** `siteGet`, `siteSet`*, `sitePhoto`*, `bkList`, `bkEdit`, `bkNew`, `bkSet` (st + опц. t), `certList`*, `certPay`*, `certGet`, `certUse` (на стіл t), `siteRates`. (* — лише admin.)

## Telegram
- **Бот персоналу** (група CHAT_ID): нова бронь з кнопками `bk:<id>:ok|no|came|noshow|kit` (bot.js `act==='bk'`; `kit` без столу питає номер через стан `bkt:<id>`); заявка на сертифікат `ct:<code>:cash|card|no` (лише admin); нагадування «за годину бронь». Повідомлення броні редагується через `mid`.
- **Бот гостей** (`GUEST_BOT_TOKEN`, `gtg`): вхід у кабінет (`/start` з nonce → запит контакту), підтвердження/відмова броні, нагадування за 2 год з `bkg:<id>:yes|no`, відгук `rv:<id>:1..5` (низька оцінка → `rvtxt` і пересилання тексту власнику).

## Зв'язки
- Доставка (`delivery.js`): `normPhone, fmtPhone, getCli, cliTouch` — гість = `cli:<телефон>`, ті самі бонуси.
- Зал (`ops.js`): `addWaiterOrder` (передзамовлення на кухню, src «бронь»), `getBill/putBill` (сертифікат як знижка на стіл), `logEvent/editEv`.
- Гроші: `certPay` пише рух `in`/`kin` у `mov:` (сертифікат — не виручка). `closeTable` викликає `reviewQueue` (відгук через 1 год).
- Курʼєри: `cron()` викликає `courWatch` з courier.js.
- Меню (`menu.js`): `getMenu, priceMap` — ціни передзамовлення з сервера.

## Тонкі місця
- Бронь живе в `book:<місяць id>`, а не місяці дати броні — тому `bookList` сканує від `from−62 дні`; якщо перенести бронь > ніж на 2 міс. вперед, вона може «загубитись».
- Усі записи `book:`/`cert:`/`certs`/`revq`/`rate:` — під `L()`; `bookCreate` рахує rate-limit без замка (допустимо).
- `bookSet('kit')` читає бронь без замка, потім `addWaiterOrder` — повторне натискання може задвоїти замовлення на кухню (захист лише `preSent` у кнопках).
- Нагадування: таймзона Києва вручну через `isDST`; зміна дати/часу скидає `remA/remG`.
- Ліміти: бронь ≤60 днів уперед, ≤60 гостей, 3 заявки/год з пристрою.
- Паритет: статуси броні є і в касі, і в боті; ✏️ редагування й ➕ ручна бронь — лише в касі (у боті немає) — перевірити паритет.
- `GUEST_BOT_TOKEN` відсутній → `gtg` шле від бота персоналу.

## Як перевіряти (worker-test)
1. `rsync -a worker/src/ ../.varvar-test/worker/src/`, запустити `worker-test` і `site`.
2. `about.html?api=http://localhost:8787` (або через змінну API в about.js): забронювати стіл → у касі «Броні» з'являється 🆕; ✅ Підтвердити → статус ok.
3. `index.html?go&book=<id>` — додати страви → «Передзамовлення» → у броні `pre`; у касі вказати стіл → «🔥 На кухню» → замовлення на столі.
4. Сертифікат: заявка з сайту → `certPay` (каса, admin) → у «Каса» рух ➕; на столі «🎟» → `certUse`, залишок зменшився.
5. `curl` `/__cron` без заголовка → 403; з Store — нагадування в логах (Telegram на тесті заглушений).
6. «Сайт»: змінити слоган і фото → `/api/site` віддає нове.
