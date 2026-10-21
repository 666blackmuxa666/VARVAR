# 🗺 Карта коду

_Генерується `node tools/map.mjs` (і кожним `tools/test.sh`). Руками не правити._

## Сервер — файли

| Файл | Рядків | Що робить |
|---|---|---|
| `acct.js` | 54 | 📤 Експорт для бухгалтера: таблиці за період (продажі, оплати, приходи складу, списання, ЗП). Лише читання. |
| `agg.js` | 47 | 🛵 Агрегатори доставки (Glovo, Bolt Food…) — модуль `agg`. |
| `ai.js` | 296 | ✨ Помічник «Не знаю, що хочу»: Gemini ставить кілька питань і підбирає страви / сет із нашого меню |
| `aitest.js` | 63 | ⏸ ВИМКНЕНО (виклик прибрано з index.js scheduled, ключі віддано боту підтримки). 🧪 ШІ-тестувальник у хмарі: двічі на день (вікна нижче, за  |
| `analytics.js` | 59 | 📊 Розширена аналітика закладу (вкладка «Аналітика» кабінету): один запит за період, результат кешується на 5 хв. |
| `backup.js` | 40 | 💾 Бекапи закладу: щоночі повна копія сховища (стиснута gzip) у KV на 8 днів: bak:<заклад>:<день>. |
| `bank.js` | 276 | 🏦 Банк (етап 2): імпорт виписок і автозвірка. Модуль `bank`, право `cash`. Каса → 🏦 Банк і бот (файл виписки / «банк»). |
| `billing.js` | 86 | 💳 Платежі платформи ATOM (ключі LiqPay платформи = VARVAR): |
| `bot-main.js` | 712 | 🤖 Бот персоналу — обробка повідомлень (handleUpdate) і натискань кнопок (handleCallback) |
| `bot-views.js` | 391 | 🤖 Бот персоналу — екрани й клавіатури: столи, рахунок, каса, звіти, кухня, закриті, стоп-лист, Wi‑Fi, персонал, броні, рух грошей, Z |
| `bot.js` | 9 | Telegram-бот закладу. Вхід: пароль офіціанта (столи, замовлення, закриття, стоп-лист) |
| `brand.js` | 52 | 🎨 Оформлення трьох Telegram-ботів: аватар з емблемою (img/bots/*.png), ім'я, опис, команди. |
| `buildid.js` | 3 | мітка збірки для tools/test.sh (чекає, поки тестовий сервер перезавантажить саме цей код) |
| `chat.js` | 47 | 💬 Чат на posatom.online: ШІ-асистент збирає заявку з фактів про ATOM. Розмова — у Hub (chat:<leadId>), у lead лише прапорці chat/hot/last. |
| `courier.js` | 242 | 🛵 Кур'єри: окремий Telegram-бот (сповіщення про доставки, «Беру», «Поїхав», «Видано», проблеми, фото), |
| `delivery.js` | 310 | 🛵 Замовлення за посиланням: самовивіз і доставка. Кожне — «віртуальний стіл» (tn.js): звичайний bill: з полем go, |
| `demomap.js` | 29 | 🏛 Дизайнерські зали демо-закладу (atom-demo): зал зі стійкою, вікнами, колонами, диванами + літня тераса. |
| `demoseed.js` | 103 | 🎬 Демо-заклад «Все за 500» (atom-demo): видумане меню, персонал і 14 днів «життя» закладу. |
| `digest.js` | 59 | 🌙 Підсумок дня для власника (о 23:00 за Києвом): виручка, чеки, оплати, ЗП, нестача, топ страв. |
| `excise.js` | 143 | 🍾 Акциз: марки пляшок на складі → продаж порціями → марка у фіскальному чеку при першій порції з пляшки. |
| `exmark.js` | 57 | 🍾 Акцизні марки: пляшки акцизного продукту (марка → скільки лишилось у пляшці). Чиста логіка без імпортів складу. |
| `fiscal.js` | 262 | 🧾 ПРРО Checkbox: фіскальний чек на кожен закритий рахунок, повернення, службові внесення/видачі, Z. |
| `guestbot.js` | 252 | 🤖 Бот гостей (@…GUEST_BOT_TOKEN): меню, статус замовлення, бонуси, день народження, сертифікати, |
| `hub.js` | 342 | 🌐 HUB — центральна база платформи (один Durable Object): акаунти власників, заклади, сесії кабінету. |
| `ideas.js` | 64 | 💡 Побажання розробнику: працівник пише з особистого кабінету (каса) або з бота персоналу. |
| `index.js` | 474 |  |
| `kitbot.js` | 146 | 👨‍🍳 Бот кухні (KITCHEN_BOT_TOKEN, вебхук /tg4): кухарі отримують нові замовлення на телефон, |
| `kitchen.js` | 133 | 👨‍🍳 Легкий кухонний екран для старих планшетів (iPad 2 / iOS 9): відкривається по http://…workers.dev/kitchen |
| `ledger.js` | 158 | 📒 Облік закладу (фундамент Ф1/Ф3/Ф4/Ф6/Ф7): документи і журнал змін у SQL-таблицях Store (ledgerdb.js). |
| `ledgerdb.js` | 23 | 📒 SQL-таблиці обліку в базі закладу (Store на SQLite). Без імпортів — підключається і в store.js, і в ledger.js. |
| `liqpay.js` | 51 | 💳 LiqPay (ПриватБанк): форма оплати, перевірка підпису callback, серверні запити (статус, повернення, відписка). |
| `lpay.js` | 113 | 💳 Оплата рахунку столу з QR (LiqPay закладу) + callback для сертифікатів / підписки ATOM / балансу ШІ. |
| `mail.js` | 14 | ✉️ Листи власникам (підтвердження пошти, відновлення пароля) — через Brevo (безкоштовно 300 листів/добу, без власного домену). |
| `match.js` | 73 | 🔎 Зіставлення рядка накладної з продуктом складу (чиста логіка, без бази — тестується `node tools/stock-match-bench.mjs`). |
| `menu.js` | 271 | Меню в KV + редагування через Telegram звичайними фразами. |
| `mig.js` | 226 | 📥 Перехід з іншої системи (етап 1): одне ядро «пакет переходу» + адаптери. Адаптер (майстер у кабінеті: Excel/CSV, вивантаження 1С…) |
| `migrate.js` | 17 | 🧬 Міграції даних закладу: коли змінюється формат даних, кожен заклад САМ оновлюється при першому зверненні |
| `mono.js` | 61 | 💳 monobank (еквайринг): рахунок (invoice/create), вебхук з перевіркою ECDSA-підпису (X-Sign + pubkey), повернення (cancel). |
| `ops-bill.js` | 374 | 🍽 Стіл: замовлення (гість/офіціант), прийняти/відхилити, скасування страв, закриття й оплата, знижка, чайові, перенесення, розділення, вида |
| `ops-closed.js` | 160 | 🧾 Закриті рахунки: список, видалення/повернення, редагування, повторне відкриття, відновлення стола, передрук |
| `ops-core.js` | 192 | 🧱 Ядро закладу: дата/робочий день, гроші, рахунки столів (get/put), замки L(), стрічка подій, статистика, налаштування, зали й схема, групи |
| `ops-kitchen.js` | 118 | 👨‍🍳 Кухня: цехи (станції), черга кухонного екрана, готовність, статистика кухні |
| `ops-money.js` | 315 | 💰 Гроші й звіти: витрати, рух коштів, залишки, звірка, зміна, Z/X-звіти, рекорд дня, звіти за період |
| `ops-staff.js` | 135 | 👥 Доступ і персонал: паролі, PIN, коди реєстрації, працівники, права, перейменування, аватарки |
| `ops.js` | 10 | Спільна логіка закладу для Telegram-бота і касової програми (POS). |
| `orderui.js` | 133 | Замовлення офіціанта кнопками: стіл → категорія → страва → (розмір) → кількість → знову категорії. |
| `owner.js` | 481 | 👑 Кабінет власника мережі й консоль платформи: /api/owner (поза закладом) + внутрішні виклики закладів /__int/* (всередині Store). |
| `pay.js` | 233 | 👷 Графік змін і зарплата: прихід «Почати зміну» → адмін підтверджує → ✅ у графіку; ставка за зміну + % від виручки + бонус за план; |
| `perm.js` | 59 | 🔑 Ролі й права з галочками (_team/roles.md). |
| `photoai.js` | 101 | 📸 ШІ-фото страв в одному стилі закладу: Gemini Image (платний ключ GEMINI_IMG_KEY — лише тут; решта ШІ — безкоштовний ключ). |
| `pos.js` | 469 | API касової програми (pos.html). POST /api/pos {op, ...} з заголовком Authorization: Bearer <token>. |
| `print.js` | 223 | Черга друку для принтера в закладі (XP-80C через програму printer/varvar-print.ps1 на Windows). |
| `promo.js` | 306 | 🎁 Лояльність: рівні постійних клієнтів (знижка / кешбек) і акції-правила (категорія, щасливі години, N-та в подарунок, |
| `push.js` | 147 | 🔔 Push-сповіщення в шторку (Web Push, VAPID + aes128gcm, RFC 8291/8292) — без бібліотек, лише WebCrypto. |
| `qr.js` | 47 | 🔳 QR-коди меню: ключ закладу (qr_key) → ключ кожного столу; PNG генерується на сервері (для принтера чеків і для друкарні). |
| `site.js` | 468 | 🌐 Сайт-візитка: дані закладу, бронювання (+ передзамовлення), подарункові сертифікати, кабінет гостя (вхід через Telegram), |
| `siteapi.js` | 37 | 🖥 каса: сайт-візитка, броні, сертифікати (op: site*, bk*, cert*) |
| `sitedesign.js` | 85 | 🎨 Конструктор сайту-візитки: перевірка всього, що власник зберігає з кабінету (тема, головний екран, блоки, панель, |
| `stock.js` | 598 | 🧮 Розрахунок: склад (Кухня / Бар), техкарти й собівартість, заготовки, накладні, інвентаризація. |
| `stockbot.js` | 256 | 🧮 Розрахунок у Telegram-боті (паритет з касою): залишки, закупівля, накладні з фото, списання, заготовки, інвентаризація, техкарти, фудкост |
| `store.js` | 191 | Надійне сховище закладу: Durable Object (одна копія, без затримок узгодження, як у KV). |
| `supbot.js` | 142 | 🛟 Бот підтримки ATOM (вебхук /tg5). Клієнт пише боту → окрема тема в групі-форумі помічників; відповідь помічника в темі → клієнту. |
| `supkb.js` | 3 | Згенеровано tools/supkb.mjs — не правити руками. |
| `suppliers.js` | 115 | 🏭 Постачальники: профіль (реквізити з накладної, контакти, відстрочка), борг і накладні, ціни, замовлення, акт звірки, нагадування. |
| `tasks.js` | 97 | 📋 План на день: адмін складає завдання (разові + шаблони, що повторюються), працівник відмічає ✅ зробив / ❌ не зробив (з причиною, за потре |
| `tax.js` | 107 | 📅 Податковий календар: власник обирає ФОП (1/2/3 група) або ТОВ → дати звітів і платежів + нагадування в Telegram. |
| `tn.js` | 6 | 🛵 номери віртуальних столів: 1001+ — доставка (Д‑1…), 2001+ — самовивіз (С‑1…); решта — столи залу |
| `venue.js` | 71 | 🏪 Мультизаклад: який заклад обслуговує запит і його «середовище» (env). |
| `waiter.js` | 111 | Замовлення від офіціанта текстом у боті: |
| `wl.js` | 51 | ⏳ Черга в залі (waitlist): гість без броні чекає вільного столу. Один ключ wl:<день>, без окремого полінгу — каса бачить чергу разом зі стан |

## Каса — розділи і функції

- **00-core.js** (670) — applyBrand:24, offBanner:49, offOverlay:63, offPre:81, offFlush:89, api:106, showLogin:128, tryLogin:133, pinKey:152, showReg:160, logout:182, loadState:191, loadMenu:205, revive:208, connect:209, ding:269, applyLook:281, applySkin:292, loadLookV:293, renderNav:315, render:327, loadView:339, renderMain:355, modal:403, askVal:417, askLong:421, ask:425, pickTable:429, toast:441, on:448, goBack:558, checkVer:586, pushSubNow:601, pushMenu:612, pushBanner:625, pushSwSync:635, start:655
- **10-hall.js** (454) — hallHTML:1, renderFeed:45, openTable:77, closeSheet:84, menuItems:89, renderSheet:97, paintCounts:142, addItem:147, upsHint:167, sendCart:173, closeFlow:183, voidReason:209, discFlow:214, moveFlow:223, splitRender:233, splitFlow:239, hallGrid:252, closedHTML:275, hallViews:299, mapPos:311, mapStart:317, mapSave:319, floorUI:320, mapEdit:350, hallPick:363, myHalls:368, wlFree:390, wlOpen:395
- **12-evcom.js** (110) — evFoot:12, evList:18, chatSay:26, evNotify:28, evcOpen:35, evcClose:45, evcRender:46, evcDo:58, evcSend:59, evcMent:61, evcPutMent:68, evRecStart:71, evRecStop:83, evPlay:85
- **20-delivery.js** (191) — goBlock:1, goNew:12, goDone:45, cliT:51, loadCour:71, goHTML:73, goCtlHTML:102, courCard:120, goSetHTML:124, goTileInfo:141, goEdit:143, goMap:153, loadCourRep:155, courRepHTML:156
- **30-books-site.js** (66) — loadBooks:1, booksHTML:3, bkForm:25, bdGiftT:40, certT:46
- **40-kitchen.js** (88) — kOff:2, loadKq:3, tone:10, siren:13, kPlay:37, kSndPick:47, kitchenStart:53, kitchenGate:59, kqHTML:61
- **50-cash.js** (206) — cashHTML:1, cashHTML0:8, balInfo:53, cashMove:64, shOpen:73, zDay:85, cEdit:103, bankHTML:142, bankFile:161, bkAct:176
- **52-agg.js** (26) — aggsLoad:3, aggManage:8, aggEd:17
- **60-reports.js** (215) — perRange:1, dishOf:14, acctExport:25, loadReport:35, prevRange:52, repChecks:54, repStats:61, reportsHTML:78
- **70-settings.js** (276) — stopHTML:1, printerHTML:11, printerCards:14, stCard:23, stSave:32, stEdit:33, taxCard:47, taxDo:62, prnCard:69, menuHTML:79, lookHTML:85, settingsHTML:99, menuEdit:157, qrPanel:185, qrSave:197, qrSheet:202, shrink:214, hallsSave:221, hallEdit:222
- **75-loyalty.js** (180) — gbInbox:9, gbThread:13, loadLoy:22, loyRange:32, loyHTML:33, ruleWhat:77, loyLvEdit:82, loyRuleEdit:94, loyCliCard:130, loyAfter:149
- **80-calc.js** (573) — loadCalc:1, calcHTML:14, skStockHTML:26, skIngEdit:51, skMergeUI:79, skGrpEdit:93, skDups:106, skGrpNew:115, skQty:116, skPick:135, skJournal:148, skBuyHTML:163, skShare:170, skInvHTML:176, skDraftHTML:190, skNewIng:211, skDraftSave:220, skAutoF:231, skPhotos:233, skBench:246, skScan:258, skCode:265, skDraftAdd:281, skCam:287, skInvView:303, skUnitCost:311, skCardsHTML:317, skCardOpen:334, skCardEdHTML:340, skMass:369, skMakeIngs:377, skCardSave:386, skCardAi:396, skAiAll:405, skTechHTML:424, skTechOne:429, skTechAll:434, skProdHTML:441, skProduce:448, skCountHTML:455, skCfInput:471, skCntFinish:477, skCntShow:484, skRepHTML:493
- **81-excise.js** (98) — skExHTML:6, skExOneHTML:30, exReload:42, exScan:44, exAfterInv:65
- **82-suppliers.js** (69) — skSupHTML:5, supLoad:14, supOpen:15, supEdit:51, supPrices:58
- **85-team.js** (215) — loadPay:1, teamHTML:2, payHTML:3, gridHTML:42, zpPend:48, zpCell:56, zpSet:72, zpOpN:84, ideasLoad:93, helpAsk:94, thrMy:99, ideasMy:110, supTg:117, zpMy:122, staffPerms:196
- **86-tasks.js** (68) — loadMyTasks:6, myTasksHTML:8, tkMark:13, tkLoad:21, tkAdminHTML:22, tkForm:38, tkClick:51
- **94-course-vid.js** (3) — —
- **95-course.js** (225) — courseLeft:154, courseHTML:159, crNav:175, crEnd:176, crStep:177, crHelpBtn:217
- **99-core-end.js** (2) — —

## Op каси → де обробляється → хто викликає

| op | сервер | каса |
|---|---|---|
| accept | pos.js:170 | 00-core.js |
| acctExport | pos.js:379 | 60-reports.js |
| aggList | pos.js:282 | 52-agg.js |
| aggSet | pos.js:321 | 52-agg.js |
| aiBench | pos.js:79 | 80-calc.js |
| avatar | pos.js:108 | 85-team.js |
| bankAct | pos.js:322 | 50-cash.js |
| bankImp | pos.js:322, pos.js:325, pos.js:326 | 50-cash.js |
| bankInvs | pos.js:322, pos.js:324 | 50-cash.js |
| bankList | pos.js:322, pos.js:324 | 00-core.js |
| bkEdit | siteapi.js:23 | 30-books-site.js |
| bkList | siteapi.js:22 | 00-core.js, 30-books-site.js |
| bkNew | siteapi.js:24 | 30-books-site.js |
| bkSet | siteapi.js:25 | 30-books-site.js |
| cashMove | pos.js:289 | 50-cash.js |
| catAdd | pos.js:314, pos.js:335 | 70-settings.js |
| catSet | pos.js:313 | 70-settings.js |
| certBd | siteapi.js:30 | 30-books-site.js |
| certDel | siteapi.js:28 | 00-core.js |
| certGet | siteapi.js:29 | 30-books-site.js |
| certList | siteapi.js:26 | 00-core.js |
| certOff | siteapi.js:31 | 10-hall.js |
| certPay | siteapi.js:27 | 00-core.js |
| certUse | siteapi.js:32 | 30-books-site.js |
| cfgSet | pos.js:375 | 00-core.js, 70-settings.js |
| chatSay | pos.js:245 | 12-evcom.js |
| cliBonus | delivery.js:298 | 10-hall.js, 20-delivery.js |
| cliGet | delivery.js:292 | 20-delivery.js, 30-books-site.js |
| cliSet | delivery.js:293 | 20-delivery.js |
| close | pos.js:157 | 10-hall.js |
| closed | pos.js:260 | 00-core.js, 50-cash.js |
| closedBack | pos.js:263 | 00-core.js |
| closedDel | pos.js:278 | 00-core.js |
| closedEdit | pos.js:266 | 50-cash.js |
| closedPrint | pos.js:262 | 00-core.js |
| closedRefund | pos.js:268 | 00-core.js |
| closedReopen | pos.js:264 | 10-hall.js |
| courAct | pos.js:99 | 20-delivery.js |
| courCash | pos.js:102 | 20-delivery.js |
| courList | pos.js:100 | 00-core.js, 20-delivery.js |
| courMe | pos.js:97 | 20-delivery.js |
| courRep | pos.js:101 | 20-delivery.js |
| courTg | pos.js:98 | 20-delivery.js |
| delete | pos.js:88, pos.js:172 | 10-hall.js |
| discount | pos.js:166 | 10-hall.js |
| evAck | pos.js:209 | 10-hall.js |
| evNames | pos.js:248 | 12-evcom.js |
| evSeen | pos.js:211, pos.js:235 | 12-evcom.js |
| evVoiceGet | pos.js:247 | 12-evcom.js |
| expense | pos.js:302 | 00-core.js |
| expenseBack | pos.js:293 | 50-cash.js |
| expenseDel | pos.js:308 | 50-cash.js |
| fav | pos.js:132 | 10-hall.js |
| fisRetry | pos.js:274 | 10-hall.js |
| float | pos.js:301 | 00-core.js |
| gbCast | guestbot.js:244 | 75-loyalty.js |
| gbClose | guestbot.js:247 | 75-loyalty.js |
| gbCount | guestbot.js:243 | 75-loyalty.js |
| gbGet | guestbot.js:241 | 75-loyalty.js |
| gbInbox | guestbot.js:245 | 75-loyalty.js |
| gbReply | guestbot.js:248 | 75-loyalty.js |
| gbSet | guestbot.js:242 | 75-loyalty.js |
| gbThread | guestbot.js:246 | 75-loyalty.js |
| goCfg | delivery.js:290 | 00-core.js |
| goCfgSet | delivery.js:291 | 20-delivery.js |
| goCour | delivery.js:271 | 00-core.js |
| goEdit | delivery.js:289 | 20-delivery.js |
| goMap | delivery.js:279 | 20-delivery.js |
| goSt | delivery.js:261, pos.js:88 | 00-core.js, 20-delivery.js |
| hallsSet | pos.js:373 | 70-settings.js |
| help | owner.js:351, pos.js:72 | 85-team.js |
| ibanQr | pos.js:151 | 10-hall.js |
| ideaAdd | ideas.js:42 | 85-team.js |
| ideaDel | ideas.js:44 | 85-team.js |
| ideaDone | ideas.js:45 | 85-team.js |
| ideaList | ideas.js:43 | 85-team.js |
| ideaSay | ideas.js:47 | 85-team.js |
| ideaSeen | ideas.js:48 | 85-team.js |
| ideaThr | ideas.js:46 | 85-team.js |
| jsErr | pos.js:246 | 00-core.js |
| kDone | pos.js:184 | 40-kitchen.js |
| kMsg | pos.js:187 | 40-kitchen.js |
| kStart | pos.js:185 | 40-kitchen.js |
| kStats | pos.js:188 | 60-reports.js |
| kUndo | pos.js:186 | 40-kitchen.js |
| kitchen | pos.js:179 | 40-kitchen.js |
| kitchenPct | pos.js:378 | 00-core.js |
| login | owner.js:264, pos.js:40 | 00-core.js |
| logout | owner.js:309, pos.js:107 | 00-core.js |
| lookV | pos.js:80 | 00-core.js |
| lookVSet | pos.js:87 | 70-settings.js |
| loyCli | promo.js:247 | 75-loyalty.js |
| loyCliGet | promo.js:248 | 75-loyalty.js |
| loyCliSet | promo.js:249 | 75-loyalty.js |
| loyGet | promo.js:232 | 75-loyalty.js |
| loyLevel | promo.js:236 | 75-loyalty.js |
| loyOff | promo.js:251 | 75-loyalty.js |
| loyPreset | promo.js:245 | 75-loyalty.js |
| loyRep | promo.js:255 | 75-loyalty.js |
| loyRule | promo.js:241 | 75-loyalty.js |
| loyRuleOn | promo.js:244 | 75-loyalty.js |
| loySet | promo.js:233 | 75-loyalty.js |
| mapSet | pos.js:374 | 10-hall.js |
| menu | pos.js:131 | 00-core.js |
| menuDel | pos.js:314, pos.js:336 | 70-settings.js |
| menuPhoto | pos.js:314, pos.js:346 | 70-settings.js |
| menuSave | pos.js:314, pos.js:334 | 70-settings.js |
| menuUndo | pos.js:314, pos.js:342 | 70-settings.js |
| modSet | pos.js:376 | 70-settings.js |
| move | pos.js:169 | 10-hall.js |
| moveBack | pos.js:292 | 50-cash.js |
| moveDel | pos.js:291 | 50-cash.js |
| order | pos.js:135 | 10-hall.js |
| photoInfo | photoai.js:33 | 70-settings.js |
| precheck | pos.js:150 | 00-core.js |
| printClear | pos.js:249 | 00-core.js, 70-settings.js |
| printMove | pos.js:203 | 00-core.js |
| printQ | pos.js:193 | 70-settings.js |
| printQr | pos.js:250 | 70-settings.js |
| printRoute | pos.js:199 | 70-settings.js |
| printTest | pos.js:192 | 70-settings.js |
| pushAll | push.js:86 | 00-core.js |
| pushKey | push.js:85 | 00-core.js |
| pushSub | push.js:91 | 00-core.js |
| pushTest | push.js:93 | 00-core.js |
| pushUnsub | push.js:92 | 00-core.js |
| qrInfo | pos.js:252 | 70-settings.js |
| qrNew | pos.js:252, pos.js:254 | 70-settings.js |
| rcptGet | pos.js:194 | 00-core.js, 70-settings.js |
| reconcile | pos.js:290 | 50-cash.js |
| regCode | pos.js:53, pos.js:370 | 00-core.js |
| register | pos.js:41 | 00-core.js |
| reject | pos.js:171 | 10-hall.js |
| remove | pos.js:149 | 10-hall.js |
| report | pos.js:299 | 60-reports.js |
| reset | owner.js:278, pos.js:309 | 70-settings.js |
| shift | pos.js:285 | 00-core.js, 50-cash.js |
| shiftOpen | pos.js:296 | 50-cash.js |
| skAdj | stock.js:535 | 80-calc.js |
| skBuy | stock.js:543 | 80-calc.js |
| skCardAi | stock.js:552 | 80-calc.js |
| skCardSave | stock.js:551 | 80-calc.js |
| skCost | stock.js:550 | 80-calc.js |
| skCount | stock.js:579 | 80-calc.js |
| skCountDoc | stock.js:592 | 80-calc.js |
| skCountFinish | stock.js:581 | 80-calc.js |
| skCountList | stock.js:582 | 80-calc.js |
| skCountSave | stock.js:580 | 80-calc.js |
| skCountUndo | stock.js:583 | 80-calc.js |
| skData | stock.js:526 | 80-calc.js, 81-excise.js |
| skDups | stock.js:546 | 80-calc.js |
| skEx | stock.js:538 | 80-calc.js, 81-excise.js |
| skExAdd | stock.js:539 | 81-excise.js |
| skExLic | stock.js:542 | 81-excise.js |
| skExOff | stock.js:541 | 81-excise.js |
| skExOpen | stock.js:540 | 81-excise.js |
| skGrp | stock.js:545 | 80-calc.js |
| skIngCost | stock.js:528 | 80-calc.js |
| skIngDel | stock.js:534 | 80-calc.js |
| skIngSave | stock.js:527 | 80-calc.js |
| skInvDel | stock.js:576 | 80-calc.js |
| skInvGet | stock.js:575 | 80-calc.js |
| skInvList | stock.js:574 | 80-calc.js |
| skInvParse | stock.js:563 | 80-calc.js |
| skInvPay | stock.js:577 | 80-calc.js |
| skInvSave | stock.js:571 | 80-calc.js |
| skJournal | stock.js:548 | 80-calc.js |
| skJrUndo | stock.js:547 | 80-calc.js |
| skMerge | stock.js:544 | 80-calc.js |
| skMove | stock.js:536 | 80-calc.js |
| skProduce | stock.js:561 | 80-calc.js |
| skReport | stock.js:594 | 00-core.js, 80-calc.js |
| skSupAct | stock.js:590 | 82-suppliers.js |
| skSupCard | stock.js:585 | 82-suppliers.js |
| skSupList | stock.js:584 | 80-calc.js, 82-suppliers.js |
| skSupMerge | stock.js:587 | 82-suppliers.js |
| skSupOrder | stock.js:589 | 82-suppliers.js |
| skSupPay | stock.js:588 | 82-suppliers.js |
| skSupPrices | stock.js:591 | 82-suppliers.js |
| skSupSave | stock.js:586 | 82-suppliers.js |
| skTech | stock.js:553 | 80-calc.js |
| split | pos.js:168 | 10-hall.js |
| stGet | pos.js:391 | 70-settings.js |
| stSet | pos.js:392 | 70-settings.js |
| staff | pos.js:369 | 00-core.js, 50-cash.js |
| staffAdd | pos.js:371 | 70-settings.js |
| staffDel | pos.js:397 | 70-settings.js |
| staffEdit | pos.js:398 | 85-team.js |
| staffPerm | pos.js:52, pos.js:394 | 85-team.js |
| state | pos.js:113 | 00-core.js |
| stop | pos.js:191 | 70-settings.js |
| tableBack | pos.js:265 | 10-hall.js |
| taskAdd | tasks.js:67 | 86-tasks.js |
| taskDel | tasks.js:72 | 86-tasks.js |
| taskList | tasks.js:63 | 86-tasks.js |
| taskMark | tasks.js:73 | 86-tasks.js |
| taskPh | tasks.js:74 | 86-tasks.js |
| taskTpl | tasks.js:75 | 86-tasks.js |
| taxDone | pos.js:390 | 70-settings.js |
| taxGet | pos.js:380 | 70-settings.js |
| taxSet | pos.js:389 | 70-settings.js |
| tip | pos.js:167 | 00-core.js, 10-hall.js |
| tipPay | pos.js:288 | 00-core.js |
| tpayOk | lpay.js:90, pos.js:89 | 10-hall.js |
| tpayRefund | lpay.js:95, pos.js:89 | 10-hall.js |
| upsGet | delivery.js:287 | 70-settings.js |
| upsMap | delivery.js:286 | 10-hall.js |
| upsSet | delivery.js:288 | 70-settings.js |
| voidBack | pos.js:261 | 10-hall.js |
| waiterOut | pos.js:402 | 70-settings.js |
| wifi | pos.js:361 | 00-core.js |
| wifiAdd | pos.js:362 | 70-settings.js |
| wifiClear | pos.js:366 | 70-settings.js |
| wlAct | pos.js:130 | 10-hall.js |
| wlAdd | pos.js:129 | 10-hall.js |
| zDay | pos.js:287 | 50-cash.js |
| zX | pos.js:286 | 50-cash.js |
| zpAtt | pay.js:218 | 85-team.js |
| zpGrid | pay.js:217 | 85-team.js |
| zpGridSet | pay.js:223 | 85-team.js |
| zpIn | pay.js:208 | 85-team.js |
| zpMy | pay.js:210 | 85-team.js |
| zpOp | pay.js:221 | 85-team.js |
| zpOpDel | pay.js:222 | 85-team.js |
| zpOut | pay.js:209 | 85-team.js |
| zpPeople | pay.js:211 | 85-team.js |
| zpPlan | pay.js:219 | 85-team.js |
| zpPlanCopy | pay.js:220 | 85-team.js |
| zpStaff | pay.js:229 | 85-team.js |
| zpSwap | pay.js:212 | 85-team.js |
| zpSwapStep | pay.js:213 | 85-team.js |

## Ключі бази → файли

_Ключ — префікс до «:» (`bill:`, `att:`…)._

| Ключ | Файли |
|---|---|
| `acct:` | hub.js |
| `adm:` | bot-main.js, bot-views.js, ops-staff.js, pos.js |
| `admmsg:` | bot-main.js, bot-views.js |
| `ai:` | ai.js |
| `ait:` | aitest.js |
| `alog:` | ops-core.js |
| `apf:` | index.js |
| `att:` | pay.js, push.js |
| `bak:` | owner.js |
| `bank:` | bank.js |
| `bfprev:` | ops-core.js |
| `bill:` | ops-bill.js, ops-core.js, ops-staff.js |
| `bkm:` | site.js |
| `book:` | demoseed.js, site.js |
| `brand:` | brand.js |
| `ccash:` | courier.js |
| `cert:` | mig.js, site.js |
| `cfg:` | delivery.js, index.js, lpay.js, owner.js, photoai.js, pos.js, store.js, venue.js |
| `cli:` | delivery.js, promo.js |
| `closed:` | fiscal.js, ledger.js, ops-bill.js, ops-closed.js, ops-core.js, ops-money.js, pos.js |
| `cnt:` | stock.js |
| `cooks:` | ops-bill.js, pay.js, pos.js |
| `cph:` | courier.js |
| `ctl:` | courier.js |
| `day:` | ops-money.js, site.js |
| `dish:` | ops-money.js |
| `draft:` | bot-main.js |
| `ev:` | ops-core.js |
| `exp:` | ops-money.js |
| `expd:` | bot-main.js |
| `fail:` | bot-main.js, hub.js |
| `fis:` | fiscal.js, owner.js |
| `gav:` | site.js |
| `gch:` | guestbot.js |
| `gchm:` | guestbot.js |
| `gl:` | site.js |
| `glu:` | site.js |
| `gop:` | delivery.js |
| `gopend:` | bot-main.js |
| `gridx:` | pay.js |
| `gs:` | site.js |
| `gst:` | guestbot.js |
| `img:` | brand.js, index.js, menu.js, ops-staff.js, photoai.js, pos.js, site.js, siteapi.js |
| `inv:` | stock.js |
| `invd:` | stockbot.js |
| `invl:` | suppliers.js |
| `kbm:` | kitbot.js |
| `kbw:` | bot-main.js, bot-views.js |
| `kfail:` | kitbot.js |
| `kq:` | courier.js, ops-core.js, ops-kitchen.js |
| `lcs:` | promo.js |
| `ldg:` | ledger.js |
| `lead:` | hub.js |
| `lfail:` | pos.js |
| `lk:` | index.js |
| `mig:` | mig.js |
| `mov:` | fiscal.js, ops-money.js, pay.js |
| `msg:` | hub.js |
| `nsT:` | index.js |
| `ob:` | orderui.js |
| `okip:` | pos.js |
| `ord:` | courier.js, delivery.js, index.js, ops-bill.js |
| `pay:` | pay.js |
| `payer:` | hub.js |
| `plan:` | pay.js |
| `pos:` | owner.js, pos.js |
| `push:` | push.js |
| `rate:` | site.js |
| `rec:` | ops-money.js, pos.js |
| `rl:` | index.js |
| `rvph:` | site.js |
| `rvtxt:` | site.js |
| `scan:` | index.js |
| `seen:` | hub.js, pay.js |
| `sess:` | hub.js |
| `signup:` | hub.js |
| `st:` | bot-main.js, kitbot.js, stockbot.js |
| `stk:` | stock.js |
| `sup:` | suppliers.js |
| `sv:` | site.js |
| `task:` | tasks.js |
| `tgs:` | bot-main.js, bot-views.js, ops-staff.js |
| `tippay:` | pos.js |
| `tph:` | tasks.js |
| `tpp:` | lpay.js |
| `vc:` | pos.js |
| `venue:` | hub.js |
| `void:` | ops-bill.js, ops-closed.js |
| `wlog:` | bot-main.js, bot-views.js, ops-staff.js, pos.js |
| `zpbs:` | bot-main.js |

## Фронт (не каса)

| Файл | Що робить |
|---|---|
| `js/about-design.js` | 🎨 Конструктор візитки: застосовує дизайн із кабінету власника (тема, фон, шрифти, головний екран, блоки, панель, |
| `js/about.js` | VARVAR — сайт-візитка: дані з /api/site (редагуються в касі й боті), бронювання, сертифікати, кабінет гостя |
| `js/app.js` |  |
| `js/avatar.js` | 👤 Аватарка в кабінеті (каса, кабінет власника, кабінет гостя): тап по фото → одразу галерея телефона. |
| `js/config.js` | Налаштування закладу — редагуйте тут |
| `js/floor3d.js` | 🏛 3D-план залу — спільний для каси (pos.html) і сайту гостя (about.html: вибір столу при броні). |
| `js/i18n.js` |  |
| `js/menu-design.js` | 🍽 Дизайн онлайн-меню з кабінету власника (Конструктор меню): тема, фон, шрифти, вигляд карток, фон під фото, |
| `js/menu-i18n.js` | Переклад меню на інші мови. Основа — англійська версія з меню (name.en / desc.en). |
| `js/owner-acc.js` | 🧮 Кабінет бухгалтера «Мої клієнти» (роль acc) + запрошення бухгалтера власником (🏪 Заклади → 🧮 Бухгалтер). |
| `js/owner-an.js` | 📊 Кабінет → Аналітика → «Деталі закладу»: теплова карта, топ/антитоп, ABC, канали, оплати, офіціанти, кухня, склад, гості, прогноз. |
| `js/owner-atomsite.js` | 🎨 Кабінет → 🚀 Продажі → «Конструктор сайту ATOM» (posatom.online): кольори (теми, генератор, кожен колір окремо, |
| `js/owner-course.js` | 🎓 Кабінет власника → «Навчання»: короткі інструкції по розділах «Налаштувань» (без запитів до сервера). |
| `js/owner-crm.js` | 🚀 Кабінет → «Продажі» (лише платформа): заявки з сайту ATOM (posatom.online), статуси, нотатки, нагадування «подзвонити», |
| `js/owner-design.js` | 🎨 Кабінет власника → Друк і дизайн: візитки, таблички на столи, меню, флаєри, банери, сертифікати, наклейки, бейджі — |
| `js/owner-mig.js` | 📥 Кабінет власника → заклад → Перехід: майстер переходу з іншої системи (етап 1). Адаптер «будь-який Excel/CSV»: |
| `js/owner-print.js` | 🧾 Кабінет власника → Принтер: конструктор чека (живий перегляд) і встановлювач програми друку одним файлом. |
| `js/owner-site.js` | 🎨 Конструктор сайту-візитки (кабінет власника → Заклади → 🌐 Сайт → «🎨 Конструктор»). Повноекранний редактор: |
| `js/owner-venue.js` | ⚙️ Кабінет власника → налаштування закладу без розробника: 🚀 запуск (чек-лист), заклад, сайт, меню (+ імпорт з Excel/Google), доставка, кас |
| `js/owner.js` | 👑 Кабінет власника мережі (owner.html): вхід → мережа сьогодні → аналітика → заклади → (платформа). |
| `js/photo-ai.js` | 📸 ШІ-фото страв — ОДНЕ вікно для каси (Налаштування → Меню) і кабінету власника (Меню). |
| `js/prnroute.js` | 🖨 Кілька принтерів: що на який друкувати (спільне для каси й кабінету власника). |
| `js/skin.js` | 🖌 Спільний рушій стилю (конструктор) для каси й кабінету власника. Без data-skin — «Стара каса», css/skin.css нічого не чіпає. |
| `js/tabprint.js` | 📱 Принтер, підключений прямо до планшета з касою — без компʼютера. |
