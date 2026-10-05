# 💰 Каса-гроші й звіти

## Що робить
Облік грошей закладу: виручка за день (готівка/картка), витрати, рух коштів (внесення, вилучення, обмін, звірка, видача чайових і ЗП), накопичені чайові персоналу, Z-звіт за день і (застаріле) відкриття/закриття зміни. Залишки рахуються «за весь час» — змін фактично немає, гроші переходять з дня в день. Звіти за будь-який період (чеки, страви, офіціанти, контроль) — у касі та підсумками в боті.

## Файли
- `js/pos/50-cash.js` — екран «Каса»: `cashHTML()` (вкладки 💰 Сьогодні / 🧾 Чеки → `closedHTML`), `cashHTML0()` (залишки, день, витрати, рух, чайові), `balInfo(src)` (деталі залишку + ✏️ звірка → `reconcile`), `cashMove(t)` (→ `cashMove`), `zDay()` (друк/надсилання Z → `zDay`), `shOpen()` (→ `shiftOpen`; мертвий `shClose()` видалено — кнопки не було).
- `js/pos/60-reports.js` — «Звіти»: `perRange(p)` (період), `loadReport()` (`report` + `kStats` + попередній період для порівняння), `prevRange`, `dishOf` (страва → категорія/група), `repChecks`, `repStats`, `reportsHTML()`. Фільтри й підсумки рахуються на клієнті з сирих даних.
- `worker/src/ops.js` (грошова частина):
  - `dayKey`, `DAY_START_H=3`, `dayStart`, `midnight` — бізнес-день.
  - `_closeTable` → `bump day:`, `logClosed` (`closed:`), `splitTip` → `addTipBal`.
  - Чайові: `splitTip` (частка кухні `kitchen_pct`, ділиться між `cooks:<day>` або в пул «👨‍🍳 Кухня»), `tipSplitOf`, `tipBalances` (перший раз відновлює з `closed:` через `tipSplitOf`), `addTipBal`, `payTips` (→ `tippay:` + рух `tipc/tipk`).
  - Витрати: `getExp`, `addExpense`, `delExpense/restoreExpense` (м'яке `del`).
  - Рух: `MOVE` (ручні: in, out, k2c, c2k, kin, kout), `MOVE_ALL` (+ tipc, tipk, adjc, adjk, salc, salk), `moveCash/moveCard` (знак), `getMov`, `addMove` (лише типи з MOVE), `delMove/restoreMove`, `reconcile` (коригування adjc/adjk = факт − програма).
  - `balances()` — залишки за весь час по всіх `day:/exp:/mov:` + `tipOwed`, `free`.
  - `cashData()` — день: float, cash, card, disc, tip, витрати, рух, `net` (без чайових і ЗП), відкриті столи.
  - Зміна: `getShift`, `shiftData`, `lastZ` (уся готівка за весь час), `lastZrec`, `openShift`, `closeShift` → `z:<day>`, `zText`, `zTicket`.
  - Z за день: `dayZData`, `dayZ` (пише `z:<day>` з kind 'day', друк), `zDayText`, `zDayTicket`, `delZ/restoreZ`.
  - Звіти: `sumDays`, `reportsData`, `topData`, `reportRange(from,to)` (сирі checks/voids/removed/exp/expDel/z/zDel/mov/movDel), `reportBreakdown(by)` для бота (waiter|tips|table|group|cat|ctrl), `controlData` (контроль офіціантів).

## Ключі бази (env.DB)
- `day:<YYYY-MM-DD>` → {closed, tables, cash, card, disc, tip, orders, float} (через `bump`, під замком).
- `closed:<day>` → [{id, ts, at, t, sum, cash, card, by, w, disc, discSum, tip, tipSplit, dishes[[n,q,s]], voids, go…, del?, rm?, reopen?}] (≤500).
- `exp:<day>` → [{ts, at, sum, note, src cash|card, by, inv?, del?}].
- `mov:<day>` → [{ts, at, type, sum, note, by, del?}] (sum adj може бути від'ємним).
- `tipbal` → {ім'я: сума} невидані чайові; `tippay:<day>` → [{ts, at, name, sum, src, by}].
- `cooks:<day>` → [імена кухарів] (TTL 3 дні); `kitchen_pct` → % чайових кухні (типово 20).
- `shift` → {id, opened, by, float} відкрита зміна; `z:<day>` → [Z-записи, `del?`].
- Читає: `bill:<t>` (відкриті столи), `void:<day>`, `staff`.

## API / ops каси (pos.js, лише admin)
`shift` (усе для екрана: tipbal, tippay, z=dayZData, day=cashData, exp, mov, last=lastZ, bal=balances, closed), `zDay` {print}, `tipPay` {name, src}, `cashMove` {type, sum, note}, `reconcile` {src, actual}, `moveDel/moveBack` {i, day}, `expense` {sum, note, src}, `expenseDel/expenseBack` {i, day}, `zDel/zBack` {i, day}, `shiftOpen` {float}, `shiftClose` {counted, print}, `float` {sum}, `report` {from, to}, `reports`, `kStats`; чеки: `closed`, `closedPrint`, `closedBack`, `closedReopen`, `tableBack`, `closedDel`. Маршрут — `POST /api/pos` (index.js).

## Telegram (бот персоналу)
Меню каси (bot.js ~152): `zday` (Z-звіт з друком), `exlist` (витрати → `exdel:` / `exbk:`), `cmvp`/`cmvm`/`cmvx` → `cmv:<type>` (далі текстом «сума коментар», стан `cmv:`), `rcn:cash|card` (звірка, стан `rcn:`), `kpct` (частка кухні), `tpc:<ім'я>`/`tpk:<ім'я>` (видати чайові), `shop`/`shopl` (відкрити касу; `shopl` — на суму `lastZ`), закриття зміни через стан тексту. Витрата: `exs:` (cash/card). Сповіщення кожної дії з каси йдуть у групу з префіксом 🖥.

## Зв'язки
- Зал (`_closeTable` у ops.js) — джерело виручки й чайових; повернення/видалення закритих рахунків змінюють `day:`/`closed:`.
- Склад (`stock.js`): накладні → `addExpense` з `inv`; `reportRange` для собівартості.
- ЗП (`pay.js`): `reportRange`, `tipBalances`, рухи `salc/salk` (видача ЗП), `delMove/restoreMove`.
- Сертифікати (`site.js` `certPay`): рух `in`/`kin` — гроші є, але не виручка.
- Доставка: курʼєрська готівка (`courCard` у 50-cash, `cc:` у боті).
- Друк: `queuePrint('z', …)`.

## Тонкі місця й правила
- **Бізнес-день з 03:00** (Київ): все, що закрито до 03:00, — у попередньому дні. Старі записи без `ts` — `tsOf` у `shiftData`.
- **Чайові — не виручка**: у `day:` і `closed:` `sum/cash/card` включають чайові (так гість заплатив); у Z за день, Z зміни (`shiftData.total`, є `gross`, `tip`, `tipBy`; `inBox` — фізична готівка з чайовими), `cashData.net`, `sumDays`, `reportBreakdown` чайові віднімаються. Видача — рух `tipc/tipk`, зменшує залишок.
- Усі «прочитав → змінив → записав» — під `L()`; `payTips` блокує одразу `tipbal`, `tippay:`, `mov:`. `cDay()` не дає правити майбутні дні.
- Від подвійних натискань: `invPay` (stock.js) — під замком `inv:<id>`+`ing`+`exp:<day>`; `payOp` (pay.js) — один замок `mov:<day>`+`pay:<month>`; бот `zpbs` — замок `zpbs:<staffId>` + запобіжник 10 с (ключ `zpbs:<staffId>` {ts}, TTL 60).
- Видалення — тільки м'яке (`del:1`), відновлення через `*Back`.
- `addMove` приймає лише ручні типи `MOVE`; службові (tip/adj/sal) пишуться напряму в інших функціях.
- Кнопок відкриття/закриття зміни в UI немає (за словами власника) — `shiftOpen/Close` залишились у коді й боті.
- Паритет каса ⇄ бот: рух, витрати, звірка, Z, чайові є в обох; видалення/відновлення руху й Z у боті — перевірити.

## Як перевіряти (worker-test)
1. `rsync -a worker/src/ ../.varvar-test/worker/src/`, запустити `worker-test` + `site`, відкрити `pos.html?api=http://localhost:8787`, увійти адміном.
2. Створити замовлення на столі, додати чайові (гість), закрити готівкою → «Каса»: готівка = сума з чайовими, виручка Z = без чайових, у «Чайові» — офіціант/кухня.
3. ➕ Внести 500, 🔁 Обмін картка→готівка, 💸 витрата 100 → перевірити залишки (`balances`), видалити й відновити рух.
4. ✏️ Звірка готівки на фактичну суму → рух `adjc` з різницею.
5. 💝 Видати чайові → `tipbal` обнулився, рух `tipc`.
6. 🧾 Z-звіт (без друку) → запис `z:<day>`; «Звіти» за сьогодні — чек, витрата, Z, рух на місці; порівняння з попереднім періодом без помилок у консолі.

- 🎁 Знижки акцій/рівнів — `payable` віднімає `bill.promo.sum`; у `closed:` поля `promo`, `promoSum`, `gross`; у Z/`day:.disc` — лише ручні знижки, акції — звіт `loyRep` (`_team/loyalty.md`).
