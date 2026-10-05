# Паспорт: Зал і столи + кухня

## Що робить
Рахунки столів залу (і віртуальних столів доставки): замовлення, дозамовлення, скасування позиції, знижка, пречек, закриття (готівка/карта), перенос/об'єднання, розділ, видалення, відновлення закритих. Паралельно веде чергу кухні (`kq:`) для екрана кухні в касі та на старому iPad (`/k`), друкує бігунки й чеки через чергу друку.

## Файли
- `js/pos/10-hall.js` — сітка столів і робота зі столом у касі.
  - `hallHTML/hallGrid` → плитки столів (вільний/зайнятий/рахунок/нове/🔔 виклик/📅 бронь) + смуга go-замовлень (t>1000).
  - `openTable` → картка стола; `menuItems/addItem/sendCart` → кошик і `act('order')` (t=-1 — нова доставка з каси, `S.goDraft`).
  - `voidReason` → причина скасування; `discFlow` → `discount`; `closeFlow/closeSheet` → `close`; `moveFlow` → `move`; `splitFlow/splitRender` → `split`; `cliT` → телефон гостя (`cliGet/cliSet/cliBonus`); `closedHTML` → закриті рахунки.
- `js/pos/40-kitchen.js` — екран кухні в касі: `loadKq` (op `kitchen`), `kqHTML`, `kitchenStart`, `siren/tone` (звук нових/термінових), `kitchenGate` (кнопка дозволу звуку).
- `worker/src/ops.js` — уся логіка рахунків і кухні (обгортки під замком внизу файлу):
  - `getBill/putBill` (TTL 12 год, total=0 → delete), `openTables`, `billItems`, `discAmt/payable`.
  - `_addWaiterOrder` → рахунок + статистика + бігунок + `addKitchen` + подія `waiter`.
  - `_acceptOrder/_rejectOrder` → замовлення гостя `ord:`; прийняте → друк + кухня; `acceptOrder` ставить `b.waiter` і `go.st=acc`.
  - `_removeOne` (скасування 1 шт. + `void:` + `kitchenCancel`), `_restoreVoid`.
  - `_closeTable` → чек, delete bill, `kitchenClosed`, `day:` (closed/cash/card/disc/tip), `closed:`, чайові `splitTip`.
  - `precheck`, `_setDiscount` (ліміт `cfg.discMax` для не-адміна), `_setTip`.
  - `_moveTable` (перенос/об'єднання, сумує знижки в грн і чайові, kq переносить на новий номер), `_splitTable`, `_deleteTable` (у `void:` + `closed:` з `del:1`, брак `wasteDish`).
  - `_delClosed/_restoreClosed/_reopenClosed/_restoreTable/reprintClosed`.
  - Кухня: `_addKitchen` (лише категорії кухні + `inshe-food`), `kitchenDone` (уся картка або одна страва, toggle), `kitchenStart`, `kitchenUndo` (≤30 хв), `kitchenMsg` (кухня → зал / кур'єру), `_kitchenClosed`, `_kitchenCancel`, `kitchenStats`.
  - Події: `logEvent/editEv/getEvents` (`ev:` день, TTL 3 доби).
- `worker/src/kitchen.js` — `KITCHEN_HTML`, сторінка `/k` (`/kitchen`). ES5 + XMLHttpRequest, без grid. Вхід PIN (роль cook/admin), токен у `localStorage.ktok`. Вкладки: черга (`load` кожні 4 с), стрічка (`state` кожні 8 с), замовлення (`order`), стоп-лист (`stop`), списання (`skData/skAdj`). Звуки `SND`, `noSleep`.
- `worker/src/print.js` — `queuePrint(kind, lines)` → DO `PrintQ` (`j:` у його storage); `kitchenTicket`, `receipt` (номер `rcpt:день`), `printApi` (`/api/print/pull|ack`, ключ `PRINT_KEY`).

## Ключі бази (env.DB)
- `bill:<t>` → `{ total, orders, opened, waiter, log:[{at,kind,lines:["2× Назва — 300"],comment,oid}], disc, discSum, discBy, tip, ktip, bonus, cli, check, pay, voids, go? }`, TTL 12 год.
- `ord:<oid>` → замовлення гостя `{ s:new|acc|rej, t, html, lines, comment, kind, mid, by, at, go?, g? }`.
- `kq:<день>` → `[{ id, ts, at, t, by, src, tw, urgent, comment, items:[{n,q,done,cancel,canc}], start, done, doneAt, closed, cancelled, msgs:[{at,text}] }]` (останні 400).
- `ev:<день>` → стрічка подій `{ k: waiter|guest|call|ready|cooking|kmsg|move|del|go|shift|ccash…, t, by, s, … }`.
- `closed:<день>` → закриті рахунки (dishes, voids, del, go, cour, cash/card…); `void:<день>` → скасування; `day:<день>` → лічильники дня; `dish:` → топ страв; `rcpt:<день>` → номер чека; `cooks:<день>`, `tipbal`.
- День (`dayKey`) починається о 03:00 Києва.

## API (op у pos.js → `/api/pos`)
`state, menu, fav, order, remove, precheck, close, discount, tip (лише прибрати, адмін), split, move, accept, reject, delete (адмін), kitchen, kDone, kStart, kUndo, kMsg, kStats, stop, printTest, printQr, closed, voidBack, closedPrint, closedBack, closedReopen, tableBack, closedDel` (останні 5 — адмін).
Роль cook: лише `logout,state,menu,fav,order,accept,reject,stop,kitchen,kDone,kStart,kUndo,kMsg,printTest`.
Маршрути index.js: `/k`, `/kitchen` (HTML кухні), `/api/pos`, `/api/pos/live`, `/api/orders?ids=` (статуси гостя), `/api/order`, `/api/call`, `/api/scan`, `/api/print/*`, `/print/agent.ps1`.

## Telegram (бот персоналу, bot.js)
`tbl:<t>` стіл, `pre:<t>` пречек, `cls:<t>` закрити, `ed:` редагувати, `dsc:/dscc:` знижка, `mv:/mvt:` перенос, `spl:/splt:` розділ, `tipx:` чайові, `delok:` видалення, `vbk:`/`tbk:` повернення, `kst:/kdn:` кухня старт/готово, `acc:<t>:<oid>`/`rej:<t>:<oid>` замовлення гостя. Кожна дія каси шле `notify` у робочий чат з кнопками `tgBtns(t)`.

## Зв'язки
- Доставка: `bill.go`, `goKitchen` (кухня старт/готово рухає статус доставки), `courNotify` (kMsg для t>1000), `goSet('done')` → `closeTable`.
- Каса-гроші/звіти: `day:`, `closed:`, `void:`, чайові (`splitTip`, `tipbal`).
- Склад: `addDishes`/списання, `wasteDish` при видаленні приготованого.
- Сайт: замовлення гостя за QR → `ord:` + подія `guest`; бронь (`S.books`) на плитці.

## Тонкі місця
- Кожна зміна рахунків — під `L(env,'bills',…)`; кухня — `kq:<день>`; події — `ev:<день>`. Не вкладати `bills` усередину іншого замка в зворотному порядку (див. коментар у `acceptOrder`).
- Ціни лише з меню (`itemsFromMenu`), рядок `LINE = /^(\d+)× (.+?) — (\d+)$/` — формат рядка не міняти.
- Столи залу 1..`env.TABLES` (15); 1001+ доставка (Д‑N), 2001+ самовивіз (С‑N); показ — завжди через `tn(t)`.
- Чайові — офіціанту стола (`bill.waiter` = перший, хто вибив/прийняв), не тому, хто закрив. Додає чайові лише гість.
- Закриття стола знімає його картки з кухні (`closed:1`), видалення/скасування — позначає `cancel` (червоне «СКАСОВАНО»).
- `kitchen.js` — тільки ES5 (старий Safari): без `=>`, `let`, шаблонних рядків.
- Паритет: кожна дія зі столом є і в касі, і в боті.

## Як перевіряти (worker-test)
1. `rsync -a worker/src/ ../.varvar-test/worker/src/`, запустити `worker-test` і `site`; каса `http://localhost:8000/pos.html?api=http://localhost:8787`.
2. Стіл 3: замовити страву кухні + напій → на кухні (вкладка/`/k`) картка лише зі стравою.
3. Скасувати 1 шт. → червоне на кухні, запис у `void:`. Знижка 10% → сума.
4. Перенести 3→5, потім розділити 5→7 частину; кухня бачить нові номери.
5. Закрити 5 карткою, 7 готівкою → `closed:`, `day:` cash/card, картки кухні зникли. Відновити/повернути закритий (адмін).
6. `/k` на вузькому вікні: вхід PIN кухаря, «Почати», «Готово», повідомлення в зал.
