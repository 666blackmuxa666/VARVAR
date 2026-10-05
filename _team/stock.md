# 🧮 Склад (Розрахунок)

## Що робить
Облік продуктів на двох складах — Кухня (`k`) і Бар (`b`): прихід накладними (вручну, з фото/QR через Gemini), списання, переміщення, заготовки (напівфабрикати), інвентаризація. Техкарти страв автоматично списують продукти при продажу й рахують собівартість/фудкост. Усе спільне для каси й бота персоналу.

## Файли
- `js/pos/80-calc.js` — розділ каси «Розрахунок» (`S.sk`, вкладки `stock/prod/inv/cards/buy/tech/count/rep`).
  - `loadCalc` → тягне дані потрібної вкладки; `skIngEdit` → картка продукту; `skQty` → прихід/списання/переміщення;
  - `skScan/skCam` → фото/QR накладної → `skInvParse` → чернетка `K.draft`; `skDraftSave` → `skInvSave`; `skInvView` → перегляд/оплата/видалення;
  - `skCardOpen/skCardSave/skCardAi/skAiAll` → техкарти (ШІ-чернетка для однієї/всіх страв); `skProduce` → заготовка;
  - інвентаризація: поля з дебаунсом → `skCountSave`, `skCntFinish` → `skCountFinish`; `skTechAll/skTechOne` → техкарти для кухаря без грошей.
- `worker/src/stock.js` — уся логіка + `stockApi` (роутер `sk*`).
  - `getIng/putIng`, `getCards/putCards`; `lk()` = `L(env,'ing')` — один замок на весь склад.
  - `ingSave/ingDel` (приховати/повернути), `adjust` (±, причина), `transfer` (k⇄b), `purchaseList/purchaseText` (що купити: нижче мінімуму);
  - `cardResolver/cardFor/unitCost/cardCost` → техкарта страви (з урахуванням варіантів, рекурсія заготовок, `depth`);
  - `consume` (продаж → списання за техкартами + `use:<день>`), `wasteDish` (скасована страва → списання), `produce` (заготовка: мінус інгредієнти, плюс напівфабрикат);
  - `invoiceSave` (прихід, середня ціна, аліаси `al`, борг постачальника, оплата → витрата), `invPay`, `invoiceDel` (видалити/повернути), `invList`, `matchLines` (зіставлення рядків із продуктами: `mem/name/guess`);
  - `countGet/countSave/countFinish` (інвентаризація: нестачі/надлишки), `costList`, `costReport` (фудкост, списання, меню-інженерія), `lowCheck/sendLow` (сповіщення «закінчується»).
- `worker/src/stockbot.js` — те саме в боті: `calcView`, `stockText`, `stockCmd` (текстові команди), `invPhoto` (фото → чернетка `invd:`), `stockCallback` (читання) / `stockCallbackW` (запис).
- `worker/src/ai.js` — Gemini: `models()` (список flash-моделей, кеш), `gemini()` (перемикання моделей при 429/404, `ai_busy`), `aiInvoice` (фото/текст QR → `{sup,no,date,total,lines}`), `aiCard` (чернетка техкарти), `aiHelp` (помічник гостя «не знаю, що хочу», не склад).

## Ключі бази
- `ing` → `[{id,n,u,cat,home:'k'|'b',st:{k,b},cost,min,loss,bc:[штрихкоди],semi,off}]`
- `cards` → `{ <ключ страви | 'semi:'+id>: {out,wh?,perL?,yield?,draft?,items:[{id,q,loss,wh?}]} }`
- `stk:<YYYY-MM-DD>` → журнал рухів `[{ts,at,t,id,n,u,wh,q,sum,by,note,ref}]`
- `use:<день>` → витрата за продажами `{id:q}` (TTL 400 днів)
- `inv:<id>` → накладна; `invl:<YYYY-MM>` → індекс накладних місяця; `sups` → `{постачальник:{debt}}`; `al` → аліаси назв рядків → id продукту
- `cnt:open:<k|b>` → відкрита інвентаризація (TTL 14 днів); `cnt:<id>` → документ; `cntl` → список
- `invd:<tg uid>` → чернетка накладної з фото в боті (TTL 15 хв)
- `ai_models`, `ai_busy` (кеш моделей / пауза), `ai:<dev>` (ліміт помічника гостя)

## API каси (`/^sk[A-Z]/` → `stockApi`, роутиться в `pos.js` ДО перевірок кухаря/кур'єра)
`skData, skIngSave, skIngDel, skAdj, skMove, skBuy, skJournal, skCost, skCardSave, skCardAi, skCard, skTech, skProduce, skInvParse, skInvSave, skInvList, skInvGet, skInvDel, skInvPay, skCount, skCountSave, skCountFinish, skCountList, skCountDoc, skReport`.
- Кухар (`COOK`): дані без цін (`forCook`), `skAdj` лише списання (q<0), `skInvSave` завжди `pay='debt'`, інвентаризація лише кухні `k`, без сум у журналі/накладних/інвентаризаціях.
- Решта — лише адмін. Кур'єр — 403.

## Telegram (бот персоналу, лише адмін)
- Кнопка `🧮 Розрахунок` → `calcView`. Текст: `залишки|склад`, `закупівля`, `техкарти`, `списати сир фета 0.3 зіпсувався`, `+ продукт к-сть`…
- Фото з підписом `накладна…` → `invPhoto` (кілька фото дописуються в одну чернетку).
- callback: `skst` (залишки), `skbuy`, `skinvl` (накладні місяця), `skip:<id>` → `skipp:<id>:cash|card` (оплатити борг), `skrep` (фудкост 7 днів), `skis:<cash|card|debt>` (записати чернетку), `skix` (скасувати).

## Зв'язки
- Зал/каса (`ops.js`): продаж → `consume`, скасування → `wasteDish`; порядок замків **bills → ing**.
- Каса-гроші: оплата накладної → `addExpense/delExpense/restoreExpense` (витрата з каси/картки).
- Меню (`menu.js`): ключ техкарти = страва/варіант; `cfg` (`getCfg`) — пороги фудкосту.
- `notify` → робоча група (низький залишок, нова техкарта, видалена/оплачена накладна).

## Тонкі місця
- Будь-яка зміна `ing` — лише через `lk()`. Ніколи не брати `bills` всередині `ing`.
- `invPay`: перевірка `paid` іде ДО замка, `supDebt` під `ing`, `payExpense` — поза замком → подвійний клік може двічі списати борг і створити дві витрати.
- Ключ ШІ в коді — `env.GEMINI_API_KEY` (у CLAUDE.md написано `GEMINI_KEY` — звірити секрет).
- Фото накладної не зберігається; таймаути: `skInvParse` 75 с, `skCardAi` 45 с.
- Паритет: інвентаризація, заготовки, ШІ-техкарти, прив'язка штрихкодів — у боті лише частково (текстові команди). Кухар у боті складу не має (лише адмін).

## Як перевіряти (worker-test)
1. `rsync -a worker/src/ ../.varvar-test/worker/src/`, запустити `worker-test` і `site`; каса `http://localhost:8000/pos.html?api=http://localhost:8787`.
2. Адмін: додати продукт → прихід накладною вручну (в борг) → «Оплатити» → перевірити витрату в Касі та `sups.debt=0`.
3. Техкарта на страву → продати страву в залі → залишок зменшився, рядок у журналі.
4. Кухар: списання ок, прихід «+» → помилка «Кухар може лише списувати», ціни не видно.
5. Інвентаризація кухні: ввести факт → «Завершити» → документ з нестачами (адмін бачить суми).
6. Без `GEMINI_API_KEY` → фото дає «AI вимкнено» без падіння.
