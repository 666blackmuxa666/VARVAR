# Паспорт: Доставка й кур'єри

## Що робить
Замовлення «з собою» (самовивіз) і доставка: гість оформлює на сайті (`?go`) або адмін з каси (☎️). Кожне замовлення — віртуальний стіл (`bill:` з полем `go`), проходить статуси new → acc → cook → ready → road → done | rej. Кур'єри беруть доставки в касі (роль courier) або в окремому Telegram-боті; ведеться готівка на руках кур'єра, клієнтська база й бонуси.

## Файли
- `worker/src/tn.js` — `GO_DEL=1000`, `GO_PICK=2000`, `isGo(t)`, `goKind(t)`, `tn(t)` → «Д‑N»/«С‑N»/номер стола.
- `worker/src/delivery.js`
  - `GO_DEF`, `getGoCfg/setGoCfg` (on, del, pick, from/to, min, fee, free, prep, phone, zone, cash %, bmax %, cpay), `isOpen`.
  - `normPhone/fmtPhone`, `getCli/cliTouch/cliClose` (клієнт, кешбек).
  - `goAlloc(kind)` → наступний вільний номер 1001..1999 / 2001..2999 (`goseq:<день>`).
  - `goSet(t, st, who, {pay, cour})` → статус; `done` закриває чек через `closeTable` (онлайн-оплата — завжди card).
  - `goKitchen` → кухня «почала/готово» рухає статус і будить кур'єра.
  - `goOrder` (сайт, `/api/go`): валідація, антиспам 3/10 хв (`gorl:`), ціни з меню, доставка платна до `free`, бонуси ≤ `bmax`%, створює bill + `ord:` + подію `guest` + повідомлення в чат з `acc:/rej:`.
  - `goFromPos/goAttach` → доставка з каси (рядок «🛵 Доставка», одразу `accAt`, кур'єрам).
  - `goList/goText/goButtons` (бот), `reco` (пари страв за 30 днів, кеш `reco`), `goInfo` (`/api/goinfo`).
  - `goApi` → op каси `goSt, goCour, goMap (🗺 маршрут від getSite().geo через ≤10 активних доставок, адмін), goEdit (✏️ ім'я/телефон/адреса/під'їзд/час/коментар, адмін → courNotify 'upd'), goCfg, goCfgSet, cliGet, cliSet, cliBonus`.
- `worker/src/courier.js` — бот кур'єрів (`COURIER_BOT_TOKEN`, `/tg3`).
  - `courBot` (вебхук + ім'я бота), `courLinkUrl` (одноразове посилання прив'язки), `courNotify(t, kind, extra, pre)` (new/remind/taken/refresh/ready/msg/upd/gone; `pre` — рахунок до видалення для 'gone'; без кур'єра upd/gone правлять «🆕» у всіх), `courDay` (доставки, готівка, заробіток), `courCashGive`, `courShiftEnd`, `courWatch` (cron: 3 хв — нагадати кур'єрам, 5 хв — адміну), `courAct(take|road|done|eta|prob|km)`, `courUpdate` (кнопки, фото), `multiRoute`, `courRep(m)` — звіт за місяць з `closed:` (доставок, сума, сер. road→done, at→done, запізнення > when+5 хв за Києвом, проблеми `gt.prob`).
- `js/pos/20-delivery.js` — у касі: `goBlock/goHTML` (картка доставки на столі), `goNew` (☎️ нова, `S.goDraft`, t=-1), `goDone`, `goSetHTML` (налаштування доставки), `courCard/loadCour` (екран кур'єра: «нові/мої», звук), `renderSheet`, `goMapBtn/goTileInfo` (виклик із `10-hall.js`: кнопка «🗺 Карта доставок» над рядом Д-/С-, на плитці Д- кур'єр і хв у дорозі), `goEdit`, `courRepHTML/loadCourRep` (вкладка Звіти → Персонал → 🛵 Кур'єри). Кліки `goMap/goEdit/crRepM` — власний `document` listener у цьому файлі (без правок 00-core).
- `js/app.js` режим `?go` — `GO=qs.has('go')`, `goInit` (`/api/goinfo`, `/api/reco`), `goCart/goForm/goRead`, `goBal` (бонуси за телефоном), відправка `/api/go`, `goPoll` (статус через `/api/orders`), історія в `localStorage` (`goHist`, `goName`…). `?go&book=ID` — передзамовлення до броні (розділ «Сайт»).

## Ключі бази
- `bill:<1001+|2001+>` → рахунок + `go:{ kind:del|pick, name, phone, addr, ent, when, pay:cash|card|online, change, cut, note, fee, bonus, st, oid, at, accAt, roadAt, takeAt, cour, etaC, prob, rem1, rem2, paid, src }`, `cli`.
- `ord:<oid>` → `{ s, g (статус для гостя), gAt, t, html, lines, sold, go:1, eta, etaC, mid }`.
- `gocfg` → налаштування; `goseq:<день>` → лічильник номерів; `gorl:<пристрій/IP>` → антиспам (10 хв).
- `cli:<380…>` → `{ name, n, sum, bal, addr:[≤5] }`.
- `courtg` → `{ ім'я: chat_id }`; `ctl:<код>` → ім'я (15 хв); `cmsg:<t>` → `{ ім'я: message_id }`; `cph:<chat>` → t (очікує фото); `ccash:<день>` → `{ ім'я:{sum,by,at} }`; `g3hook`, `cbotname`; `reco`.

## API і маршрути
- `/api/pos`: префікс `go*`/`cli*` → `goApi`; `courMe, courTg, courAct, courList (адмін), courCash (адмін), courRep {m:'YYYY-MM'} (адмін)`; `order` з `b.go` і t=0 → нова доставка з каси.
- Роль courier: лише `logout, state, goSt, goCour, zpIn, zpOut, zpMy, courMe, courTg, courAct`; `goSt` лише `road|done` і лише своя доставка.
- index.js: `POST /api/go`, `/api/goinfo?ph=`, `/api/reco`, `/api/orders?ids=`, `/go` → редірект на сайт `?go`, `POST /tg3` (бот кур'єрів), cron `/__cron` → `courWatch`.

## Telegram
- Бот персоналу: `acc:<t>:<oid>`, `rej:<t>:<oid>`, `gos:<t>:road|ready|done` (+ вибір оплати), `cc:<ім'я>…` «отримав готівку від кур'єра».
- Бот кур'єрів: `cb:<t>:take`, `cb:<t>:road`, `cb:<t>:eta:<хв>`, `cb:<t>:done:cash|card`, `cb:<t>:prob[:noans|addr|refuse]`, `cb:<t>:km:soon|here`; прив'язка через `/start <код>`.

## Зв'язки
- Зал (ops.js): bill, `closeTable`, `acceptOrder` (ставить `go.st=acc`, `courNotify new`), кухня `kitchenStart/Done` → `goKitchen`, `kitchenMsg` → кур'єру.
- Сайт (`site.js`): `guestMsg` — повідомлення гостю (ETA кур'єра).
- Каса-гроші: `closed:` з `cour`, `go`, `gt`; `courDay` рахує готівку з закритих.
- Персонал/ЗП: ставка доставки `staff.pay.dlv` або `cpay`.

## Тонкі місця
- 'gone': обгортки `rejectOrder`/`deleteTable` в ops.js читають рахунок ДО видалення і передають у `courNotify(...,'gone','',b0)` — працює однаково з каси й бота.
- `goEdit` поки лише в касі — у боті персоналу ще немає (паритет — TODO).
- Номери: 1001–1999 доставка, 2001–2999 самовивіз; `isGo(t)` = t>1000. Скрізь показ через `tn()`; у ES5-кухні — власна `tnm`.
- Кур'єрам ідуть лише доставки (`t ≤ 2000`), самовивіз — ні.
- Будь-яка зміна `bill.go` — під `L('bills')`; `ord:` — під `L('ord:'+oid)`; `goAlloc` — під `goseq` (у `goOrder` він усередині `bills`).
- Онлайн-оплата: чек не ставиться в «рахунок» (`check`), при `done` — завжди карта.
- Паритет: статуси й дії кур'єра однакові в касі (`courAct`) і в боті (`courUpdate` викликає ту саму `courAct`).

## Як перевіряти (worker-test)
1. `rsync -a worker/src/ ../.varvar-test/worker/src/`, `worker-test` + `site`.
2. Сайт `http://localhost:8000/?go` (з `api` на 8787 за налаштуванням `app.js`): самовивіз, потім доставка з адресою → у касі смуга С‑1/Д‑1, подія «нове».
3. Прийняти → статус acc; на кухні «Почати»/«Готово» → cook/ready; статус гостя оновлюється.
4. Кур'єр (тестовий працівник role courier): «Беру» → «Поїхав» → «Видано 💵» → `closed:` з `cour`, `courMe` показує готівку; адмін `courCash`.
5. ☎️ доставка з каси (t=-1) → рядок «🛵 Доставка», номер Д‑N. Бонуси: `cliGet/cliSet/cliBonus` на столі залу.
6. Без `COURIER_BOT_TOKEN` бот мовчить — це нормально для тесту.
