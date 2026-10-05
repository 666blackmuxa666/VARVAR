# 🤖 Бот персоналу (Telegram)

## Що робить
Робочий бот для офіціантів і адміністратора: замовлення кнопками/текстом, столи, закриття, кухня, стоп-лист, доставка, броні; в адмін-режимі — каса, витрати, звіти, Z, склад, зарплата, меню, Wi-Fi, персонал, паролі. Логіка спільна з касою через `ops.js` — бот лише інтерфейс.

## Файли
- `worker/src/bot.js` — `handleUpdate` (повідомлення) і `handleCallback` (inline-кнопки).
  - Клавіатури: `W` (офіціант), `A` (адмін), `KEYBOARD`, `ADMIN_KB`, `COMMANDS` (меню `/`).
  - Види: `tablesView, tableView, editView, closeAsk, pickTable, cashView, expListView, reportsView, repView, kitchenView, closedView, closedOne, topView, stopView, wifiView, staffView`.
  - `remember/purgeAdminChat` → після виходу адміна (або 12 год) переписка адмін-режиму видаляється.
- `worker/src/orderui.js` — замовлення кнопками: `tablePick → catsView → groupView/itemsView/favView → qtyView → cartView`; `obCallback` (усі `o:*`).
- `worker/src/waiter.js` — замовлення текстом: `parseWaiterOrder` (1-й рядок стіл, далі «страва к-сть»), `matchItem` (нечіткий пошук: `lev`, `score`), `draftText`.
- `worker/src/menu.js` — меню: `getMenu` (KV або `data/menu.json`), `saveMenu` (+`menu_prev` для «відмінити»), `handleMenuText` (стоп-лист усім, зміни — адміну), `handleMenuPhoto` (фото страви → `img:<id>`), `priceMap`, `HELP`; замок `menuLock` (`env.DB.locked('menu')`).

## Ключі бази
- `st:<uid>` — стан очікування вводу (TTL 5–60 хв): `login`, `wlogin`, `exp`, `newpass`, `newwpass`, `ocom` (коментар), `gocon` (дані доставки), `dscc:<t>`, `rmr:<t>:<i>`, `bkt:<id>`, `cfg:<k>`, `kpct`, `rcn:<src>`, `cmv:<тип>`, `shopen`, `shclose`, `float`, `stfadd`, `bkd` (дата броней), `bkn` (нова бронь), `bke:<id>:<поле>`, `tgpin:<staffId>`, `skcn:<k|b>` (інвентаризація), `skpr:<ingId>` (заготовка), `skbc` (штрихкод)
- `tgs:<uid>` → id працівника зі `staff` (привʼязка Telegram ↔ персонал, без терміну; після вибору себе + PIN каси)
- `adm:<uid>` (адмін, TTL 12 год), `wlog:<uid>` (офіціант), `kbw:<uid>` (адмін у режимі офіціанта), `fail:<uid>` (невдалі паролі, 15 хв)
- `admmsg:<uid>` → `{chat, ids}` повідомлення адмін-сесії; `admin_pass`, `waiter_pass`
- `ob:<uid>` → кошик кнопок `{table,items:[{name,price,q}],com,ur,gk,tw,mid,chat}` (TTL 3 год); `draft:<id>` → текстове замовлення (1 год); `gopend:<uid>`, `expd:<id>`
- `menu`, `menu_prev`, `img:<id>`, `venue_ips`

## Telegram callback_data (`act:arg:oid:opt`)
- Замовлення: `o:t|c|g|f|i|q|fv|cart|r|com|send|ur|tw|tp|back|x|h`, `wok:<draft>`.
- Стіл: `tbl, ed, cls, clsok:<t>:cash|card:np?, pre, dsc, dscs, dscc, tipx, spl, splt, spli, mv, mvt, rm, rmq, back, del, delok, vbk, tbk`.
- Кухня: `kv, kst, kdn`; гості/доставка: `acc, rej, gos, cc`; броні `bk, bkd:<YYYY-MM-DD>, bkdd, bkn, bke:<id>, bkef:<id>:<поле>`; сертифікати `ct`.
- Закриті: `cvb, cv, cvp, cvbk, cvro, dc, dcok`; витрати: `exs, exlist, exdel, exdelok, exbk`.
- Каса: `shop, shopl, shcl, float, rcn, cmvp, cmvm, cmvx, cmv, tpay, tpc, tpk, zday, rp, cfg, kpct`.
- Персонал: `stfadd, stfdel, wout`; Wi-Fi `wifiask, wifiok`; друк `pqr, pqrt, ptest`; тест `rst1, rst2`; `no`.
- Рух коштів / Z (адмін): `mvl:<день>, mvdel|mvdok|mvbk:<i>:<день>`; `zl:<день>, zv|zdel|zdok|zbk:<i>:<день>`.
- Привʼязка працівника: `tgl:<staffId>, tgw, tgu`.
- ЗП: `atk, swk, zpb, zpbs`; склад: `sk*` (див. `stock.md`); нові `skcnm, skcn:<wh>, skcf:<wh>, skprl, skpr:<id>, skbc` — `stockbot.js` (`stockCallbackX`; текст у стані — `stockState`).

## Зв'язки
- `ops.js` — уся бізнес-логіка (рахунки, зміна, Z, витрати, рух грошей, кухня, стоп-лист).
- `pay.js` (ЗП), `stockbot.js` (склад), `delivery.js`, `site.js` (броні/сайт), `courier.js`, `print.js`.

## Тонкі місця й правила
- **Паритет з касою:** нова дія в касі → кнопка/команда тут (і навпаки). Склад у боті: інвентаризація, заготовки, штрихкоди — кнопками і текстом (`штрихкод <код> [назва]`); ШІ-техкарт кнопками ще нема.
- Права: `handleCallback` пускає лише офіціанта/адміна; адмінські кнопки перевіряють `admin` всередині. Ролей кухар/кур'єр бот не знає (кур'єр — окремий бот).
- Стани `st:` перехоплюють будь-який текст, крім кнопок `W`/`A` і `/`-команд — не забувати `delete('st:'+uid)`.
- `callback_data` ≤ 64 байти; розбір через `split(':')` — у аргументах не має бути `:`.
- Знижка офіціанта обмежена `WAITER_DISC_MAX`; скасування позиції — лише з причиною.
- Тестові кнопки `🧹 Видалити закритий`, `♻️ Обнулити все` не прибирати без власника.
- `зміна` бере працівника з `tgs:<uid>`; без привʼязки — вибір себе зі списку (або підказка за `first_name`) + PIN каси (`pinHash`, 5 спроб / 15 хв). `хто я` — показати / відвʼязати.
- Броні: `📅 Броні` = 14 днів + ◀/▶, «📆 Інша дата», «➕ Нова бронь» (`bookManual`), «✏️ Змінити» (`bookEditFields`: дата, час, гості, стіл, нотатка, імʼя, телефон). Текстом: `броні 25.10`, `броні 25.10-30.10`, `бронь 25.10 19:30 4 Олена 0671234567 стіл 5 коментар`. Пошук за id — `bookGet` (site.js, індекс `bkm:`), без обмеження 14 днів.
- Рух коштів і Z: у «💰 Каса» кнопки «🔁 Рух коштів», «🔒 Закриття каси (Z)» — по днях, видалення (з підтвердженням) / повернення тими ж `delMove/restoreMove/delZ/restoreZ`.
- Стани складу `skcn/skpr/skbc`: якщо текст не схожий на введення — стан знімається і текст іде як звичайна команда (щоб адмін не «застряг» в інвентаризації).
- Справжній `worker` шле в робочу групу — тестувати лише `worker-test`.

## Як перевіряти (worker-test)
Швидко без сервера: node-скрипт з мок-`env.DB` (Map) і підміненим `fetch` викликає `handleUpdate` з фейковими `message`/`callback_query`; JSON-імпорт меню — через `module.registerHooks` (`importAttributes: {type:'json'}`).

Telegram там немає, тож: `rsync -a worker/src/ ../.varvar-test/worker/src/`, запустити `worker-test` і слати POST на вебхук із фейковим `update` (`message` з `from.id`/`chat.id` або `callback_query` з `data`), перевіряючи ключі бази (`st:`, `ob:`, `bills`) і що дія дала той самий результат, що й у касі (`?api=http://localhost:8787`). Сценарій: вхід паролем офіціанта → `➕ Замовлення` → `o:t:5` → `o:c:0` → `o:q:0:0:2` → `o:send` → стіл 5 у касі; адмін: `зарплата`, `накладна` (без ключа ШІ → «AI вимкнено»).
