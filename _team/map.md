# 🗺 Карта коду

_Генерується `node tools/map.mjs` (і кожним `tools/test.sh`). Руками не правити._

## Сервер — файли

| Файл | Рядків | Що робить |
|---|---|---|
| `acct.js` | 134 | 📤 Експорт для бухгалтера: таблиці за період (продажі, оплати, приходи складу, списання, ЗП). Лише читання. |
| `agg.js` | 47 | 🛵 Агрегатори доставки (Glovo, Bolt Food…) — модуль `agg`. |
| `ai.js` | 296 | ✨ Помічник «Не знаю, що хочу»: Gemini ставить кілька питань і підбирає страви / сет із нашого меню |
| `aitest.js` | 63 | ⏸ ВИМКНЕНО (виклик прибрано з index.js scheduled, ключі віддано боту підтримки). 🧪 ШІ-тестувальник у хмарі: двічі на день (вікна нижче, за  |
| `analytics.js` | 59 | 📊 Розширена аналітика закладу (вкладка «Аналітика» кабінету): один запит за період, результат кешується на 5 хв. |
| `api-v1.js` | 221 | 🔌 Публічне API v1 для партнерів (агрегатори, сайти, бухгалтерія): ключ закладу → ті самі дії, що й сайт/каса. |
| `backup.js` | 68 | 💾 Бекапи закладу: щоночі повна копія сховища (стиснута gzip) у KV на 8 днів: bak:<заклад>:<день>. |
| `bank.js` | 287 | 🏦 Банк (етап 2): імпорт виписок і автозвірка. Модуль `bank`, право `cash`. Каса → 🏦 Банк і бот (файл виписки / «банк»). |
| `bankapi.js` | 103 | 🔄 Банк автоматично (етап 2): monobank — особистий токен api.monobank.ua (лише рахунки ФОП у гривні) і ПриватБанк «Автоклієнт». |
| `billing.js` | 86 | 💳 Платежі платформи ATOM (ключі LiqPay платформи = VARVAR): |
| `bot-main.js` | 739 | 🤖 Бот персоналу — обробка повідомлень (handleUpdate) і натискань кнопок (handleCallback) |
| `bot-views.js` | 393 | 🤖 Бот персоналу — екрани й клавіатури: столи, рахунок, каса, звіти, кухня, закриті, стоп-лист, Wi‑Fi, персонал, броні, рух грошей, Z |
| `bot.js` | 9 | Telegram-бот закладу. Вхід: пароль офіціанта (столи, замовлення, закриття, стоп-лист) |
| `brand.js` | 52 | 🎨 Оформлення трьох Telegram-ботів: аватар з емблемою (img/bots/*.png), ім'я, опис, команди. |
| `buildid.js` | 3 | мітка збірки для tools/test.sh (чекає, поки тестовий сервер перезавантажить саме цей код) |
| `chat.js` | 47 | 💬 Чат на posatom.online: ШІ-асистент збирає заявку з фактів про ATOM. Розмова — у Hub (chat:<leadId>), у lead лише прапорці chat/hot/last. |
| `courier.js` | 242 | 🛵 Кур'єри: окремий Telegram-бот (сповіщення про доставки, «Беру», «Поїхав», «Видано», проблеми, фото), |
| `delivery.js` | 311 | 🛵 Замовлення за посиланням: самовивіз і доставка. Кожне — «віртуальний стіл» (tn.js): звичайний bill: з полем go, |
| `demomap.js` | 29 | 🏛 Дизайнерські зали демо-закладу (atom-demo): зал зі стійкою, вікнами, колонами, диванами + літня тераса. |
| `demoseed.js` | 103 | 🎬 Демо-заклад «Все за 500» (atom-demo): видумане меню, персонал і 14 днів «життя» закладу. |
| `digest.js` | 59 | 🌙 Підсумок дня для власника (о 23:00 за Києвом): виручка, чеки, оплати, ЗП, нестача, топ страв. |
| `excise.js` | 145 | 🍾 Акциз: марки пляшок на складі → продаж порціями → марка у фіскальному чеку при першій порції з пляшки. |
| `exmark.js` | 57 | 🍾 Акцизні марки: пляшки акцизного продукту (марка → скільки лишилось у пляшці). Чиста логіка без імпортів складу. |
| `export.js` | 108 | 📦 Ф12 Повне вивантаження закладу одним ZIP: «дані клієнта — у клієнта». Лише читання. |
| `fiscal.js` | 284 | 🧾 ПРРО Checkbox: фіскальний чек на кожен закритий рахунок, повернення, службові внесення/видачі, Z. |
| `guestbot.js` | 252 | 🤖 Бот гостей (@…GUEST_BOT_TOKEN): меню, статус замовлення, бонуси, день народження, сертифікати, |
| `hub.js` | 342 | 🌐 HUB — центральна база платформи (один Durable Object): акаунти власників, заклади, сесії кабінету. |
| `ideas.js` | 64 | 💡 Побажання розробнику: працівник пише з особистого кабінету (каса) або з бота персоналу. |
| `income.js` | 100 | 📒 Книга доходів (етап 3): дохід за датою, коли надійшли гроші. Право `tax` (адмін). Каса → ⚙️ Налаштування → 📒, бот «книга» / «дохід 5000  |
| `index.js` | 491 |  |
| `kitbot.js` | 146 | 👨‍🍳 Бот кухні (KITCHEN_BOT_TOKEN, вебхук /tg4): кухарі отримують нові замовлення на телефон, |
| `kitchen.js` | 133 | 👨‍🍳 Легкий кухонний екран для старих планшетів (iPad 2 / iOS 9): відкривається по http://…workers.dev/kitchen |
| `ledger.js` | 159 | 📒 Облік закладу (фундамент Ф1/Ф3/Ф4/Ф6/Ф7): документи і журнал змін у SQL-таблицях Store (ledgerdb.js). |
| `ledgerdb.js` | 23 | 📒 SQL-таблиці обліку в базі закладу (Store на SQLite). Без імпортів — підключається і в store.js, і в ledger.js. |
| `liqpay.js` | 51 | 💳 LiqPay (ПриватБанк): форма оплати, перевірка підпису callback, серверні запити (статус, повернення, відписка). |
| `lpay.js` | 115 | 💳 Оплата рахунку столу з QR (LiqPay закладу) + callback для сертифікатів / підписки ATOM / балансу ШІ. |
| `mail.js` | 14 | ✉️ Листи власникам (підтвердження пошти, відновлення пароля) — через Brevo (безкоштовно 300 листів/добу, без власного домену). |
| `match.js` | 73 | 🔎 Зіставлення рядка накладної з продуктом складу (чиста логіка, без бази — тестується `node tools/stock-match-bench.mjs`). |
| `menu.js` | 346 | Меню в KV + редагування через Telegram звичайними фразами. |
| `mig.js` | 384 | 📥 Перехід з іншої системи (етап 1): одне ядро «пакет переходу» + адаптери. Адаптер (майстер у кабінеті: Excel/CSV, вивантаження 1С…) |
| `migrate.js` | 17 | 🧬 Міграції даних закладу: коли змінюється формат даних, кожен заклад САМ оновлюється при першому зверненні |
| `mono.js` | 61 | 💳 monobank (еквайринг): рахунок (invoice/create), вебхук з перевіркою ECDSA-підпису (X-Sign + pubkey), повернення (cancel). |
| `ops-bill.js` | 381 | 🍽 Стіл: замовлення (гість/офіціант), прийняти/відхилити, скасування страв, закриття й оплата, знижка, чайові, перенесення, розділення, вида |
| `ops-closed.js` | 162 | 🧾 Закриті рахунки: список, видалення/повернення, редагування, повторне відкриття, відновлення стола, передрук |
| `ops-core.js` | 192 | 🧱 Ядро закладу: дата/робочий день, гроші, рахунки столів (get/put), замки L(), стрічка подій, статистика, налаштування, зали й схема, групи |
| `ops-kitchen.js` | 118 | 👨‍🍳 Кухня: цехи (станції), черга кухонного екрана, готовність, статистика кухні |
| `ops-money.js` | 314 | 💰 Гроші й звіти: витрати, рух коштів, залишки, звірка, зміна, Z/X-звіти, рекорд дня, звіти за період |
| `ops-staff.js` | 134 | 👥 Доступ і персонал: паролі, PIN, коди реєстрації, працівники, права, перейменування, аватарки |
| `ops.js` | 10 | Спільна логіка закладу для Telegram-бота і касової програми (POS). |
| `orderui.js` | 155 | Замовлення офіціанта кнопками: стіл → категорія → страва → (розмір) → кількість → знову категорії. |
| `owner.js` | 508 | 👑 Кабінет власника мережі й консоль платформи: /api/owner (поза закладом) + внутрішні виклики закладів /__int/* (всередині Store). |
| `pay.js` | 233 | 👷 Графік змін і зарплата: прихід «Почати зміну» → адмін підтверджує → ✅ у графіку; ставка за зміну + % від виручки + бонус за план; |
| `perm.js` | 59 | 🔑 Ролі й права з галочками (_team/roles.md). |
| `photoai.js` | 115 | 📸 ШІ-фото страв в одному стилі закладу: Gemini Image (платний ключ GEMINI_IMG_KEY — лише тут; решта ШІ — безкоштовний ключ). |
| `plan.js` | 64 | 🗺 «План» у кабінеті (лише платформа): дошка команди, план (горизонт → гілка → задача → підзадача), помилки, «чекає власника», чернетка. |
| `plock.js` | 18 | 🔒 Ф5 замок періоду: закритий місяць не правиться (чеки, витрати, Z, рух каси, облікові документи). |
| `pos.js` | 496 | API касової програми (pos.html). POST /api/pos {op, ...} з заголовком Authorization: Bearer <token>. |
| `print.js` | 224 | Черга друку для принтера в закладі (XP-80C через програму printer/varvar-print.ps1 на Windows). |
| `promo.js` | 306 | 🎁 Лояльність: рівні постійних клієнтів (знижка / кешбек) і акції-правила (категорія, щасливі години, N-та в подарунок, |
| `push.js` | 147 | 🔔 Push-сповіщення в шторку (Web Push, VAPID + aes128gcm, RFC 8291/8292) — без бібліотек, лише WebCrypto. |
| `qr.js` | 49 | 🔳 QR-коди меню: ключ закладу (qr_key) → ключ кожного столу; PNG генерується на сервері (для принтера чеків і для друкарні). |
| `site.js` | 477 | 🌐 Сайт-візитка: дані закладу, бронювання (+ передзамовлення), подарункові сертифікати, кабінет гостя (вхід через Telegram), |
| `siteapi.js` | 37 | 🖥 каса: сайт-візитка, броні, сертифікати (op: site*, bk*, cert*) |
| `sitedesign.js` | 85 | 🎨 Конструктор сайту-візитки: перевірка всього, що власник зберігає з кабінету (тема, головний екран, блоки, панель, |
| `stock.js` | 598 | 🧮 Розрахунок: склад (Кухня / Бар), техкарти й собівартість, заготовки, накладні, інвентаризація. |
| `stockbot.js` | 256 | 🧮 Розрахунок у Telegram-боті (паритет з касою): залишки, закупівля, накладні з фото, списання, заготовки, інвентаризація, техкарти, фудкост |
| `store.js` | 191 | Надійне сховище закладу: Durable Object (одна копія, без затримок узгодження, як у KV). |
| `supbot.js` | 142 | 🛟 Бот підтримки ATOM (вебхук /tg5). Клієнт пише боту → окрема тема в групі-форумі помічників; відповідь помічника в темі → клієнту. |
| `supkb.js` | 3 | Згенеровано tools/supkb.mjs — не правити руками. |
| `suppliers.js` | 115 | 🏭 Постачальники: профіль (реквізити з накладної, контакти, відстрочка), борг і накладні, ціни, замовлення, акт звірки, нагадування. |
| `tasks.js` | 108 | 📋 План на день: адмін складає завдання (разові + шаблони, що повторюються), працівник відмічає ✅ зробив / ❌ не зробив (з причиною, за потре |
| `tax.js` | 115 | 📅 Податковий календар: власник обирає ФОП (1/2/3 група) або ТОВ → дати звітів і платежів + нагадування в Telegram. |
| `tn.js` | 6 | 🛵 номери віртуальних столів: 1001+ — доставка (Д‑1…), 2001+ — самовивіз (С‑1…); решта — столи залу |
| `venue.js` | 71 | 🏪 Мультизаклад: який заклад обслуговує запит і його «середовище» (env). |
| `waiter.js` | 111 | Замовлення від офіціанта текстом у боті: |
| `wl.js` | 51 | ⏳ Черга в залі (waitlist): гість без броні чекає вільного столу. Один ключ wl:<день>, без окремого полінгу — каса бачить чергу разом зі стан |

## Каса — розділи і функції

- **00-core.js** (669) — applyBrand:26, offBanner:51, offOverlay:65, offPre:84, offFlush:92, api:109, showLogin:131, tryLogin:136, pinKey:155, showReg:163, logout:185, loadState:194, loadMenu:208, revive:211, connect:212, ding:260, applyLook:272, applySkin:283, loadLookV:284, renderNav:312, render:324, loadView:336, renderMain:352, modal:400, askVal:414, askLong:418, ask:422, pickTable:426, toast:438, on:445, goBack:557, checkVer:585, pushSubNow:600, pushMenu:611, pushBanner:624, pushSwSync:634, start:654
- **10-hall.js** (470) — hallHTML:1, renderFeed:45, openTable:77, closeSheet:84, menuItems:89, renderSheet:97, paintCounts:142, addItem:147, pickMods:168, upsHint:182, sendCart:188, closeFlow:198, voidReason:224, discFlow:229, moveFlow:238, splitRender:248, splitFlow:254, hallGrid:267, closedHTML:290, hallViews:314, mapPos:326, mapStart:332, mapSave:334, floorUI:335, mapEdit:365, hallPick:378, myHalls:383, wlFree:405, wlOpen:410
- **12-evcom.js** (110) — evFoot:12, evList:18, chatSay:26, evNotify:28, evcOpen:35, evcClose:45, evcRender:46, evcDo:58, evcSend:59, evcMent:61, evcPutMent:68, evRecStart:71, evRecStop:83, evPlay:85
- **20-delivery.js** (191) — goBlock:1, goNew:12, goDone:45, cliT:51, loadCour:71, goHTML:73, goCtlHTML:102, courCard:120, goSetHTML:124, goTileInfo:141, goEdit:143, goMap:153, loadCourRep:155, courRepHTML:156
- **30-books-site.js** (66) — loadBooks:1, booksHTML:3, bkForm:25, bdGiftT:40, certT:46
- **40-kitchen.js** (88) — kOff:2, loadKq:3, tone:10, siren:13, kPlay:37, kSndPick:47, kitchenStart:53, kitchenGate:59, kqHTML:61
- **50-cash.js** (211) — cashHTML:1, cashHTML0:8, balInfo:53, cashMove:64, shOpen:73, zDay:85, cEdit:103, bankHTML:145, bankFile:164, bkAct:179
- **52-agg.js** (26) — aggsLoad:3, aggManage:8, aggEd:17
- **60-reports.js** (236) — perRange:1, dishOf:14, plockFlow:25, acctExport:33, loadReport:49, prevRange:66, repChecks:68, repStats:75, reportsHTML:92
- **70-settings.js** (319) — stopHTML:1, printerHTML:11, printerCards:14, stCard:23, stSave:32, stEdit:33, taxCard:47, taxDo:63, incCard:72, prnCard:99, menuHTML:109, lookHTML:115, settingsHTML:129, modsEdit:191, menuEdit:197, qrPanel:227, qrSave:239, qrSheet:244, shrink:256, hallsSave:263, hallEdit:264
- **75-loyalty.js** (180) — gbInbox:9, gbThread:13, loadLoy:22, loyRange:32, loyHTML:33, ruleWhat:77, loyLvEdit:82, loyRuleEdit:94, loyCliCard:130, loyAfter:149
- **80-calc.js** (584) — loadCalc:1, calcHTML:14, skStockHTML:26, skIngEdit:51, skMergeUI:79, skGrpEdit:93, skDups:106, skGrpNew:115, skQty:116, skPick:135, skJournal:148, skBuyHTML:163, skShare:170, skInvHTML:176, skDraftHTML:190, skNewIng:211, skDraftSave:220, skAutoF:231, skPhotos:233, skBench:246, skScan:258, skCode:265, skDraftAdd:281, skCam:287, skInvView:303, skUnitCost:311, skCardsHTML:317, skCardOpen:334, skPriceSet:342, skCardEdHTML:348, skMass:378, skMakeIngs:386, skCardSave:395, skCardAi:405, skAiAll:414, skTechHTML:433, skTechOne:438, skTechAll:443, skProdHTML:450, skProduce:457, skCountHTML:464, skCfInput:480, skCntFinish:486, skCntShow:493, skRepHTML:502
- **81-excise.js** (98) — skExHTML:6, skExOneHTML:30, exReload:42, exScan:44, exAfterInv:65
- **82-suppliers.js** (69) — skSupHTML:5, supLoad:14, supOpen:15, supEdit:51, supPrices:58
- **85-team.js** (215) — loadPay:1, teamHTML:2, payHTML:3, gridHTML:42, zpPend:48, zpCell:56, zpSet:72, zpOpN:84, ideasLoad:93, helpAsk:94, thrMy:99, ideasMy:110, supTg:117, zpMy:122, staffPerms:196
- **86-tasks.js** (79) — loadMyTasks:6, annEdit:9, myTasksHTML:14, tkMark:19, tkLoad:27, tkAdminHTML:28, tkForm:47, tkClick:60
- **94-course-vid.js** (3) — —
- **95-course.js** (245) — courseLeft:174, courseHTML:179, crNav:195, crEnd:196, crStep:197, crHelpBtn:237
- **99-core-end.js** (2) — —

## Op каси → де обробляється → хто викликає

| op | сервер | каса |
|---|---|---|
| accept | pos.js:172 | 00-core.js |
| acctExport | pos.js:398 | 60-reports.js |
| acctFile | pos.js:397 | 60-reports.js |
| aggList | pos.js:284 | 52-agg.js |
| aggSet | pos.js:325 | 52-agg.js |
| aiBench | pos.js:81 | 80-calc.js |
| avatar | pos.js:110 | 85-team.js |
| bankAct | pos.js:327 | 50-cash.js |
| bankImp | pos.js:327, pos.js:331, pos.js:332 | 50-cash.js |
| bankInvs | pos.js:327, pos.js:330 | 50-cash.js |
| bankList | pos.js:327, pos.js:330 | 00-core.js |
| bankSync | pos.js:327, pos.js:329 | 50-cash.js |
| bkEdit | siteapi.js:23 | 30-books-site.js |
| bkList | siteapi.js:22 | 00-core.js, 30-books-site.js |
| bkNew | siteapi.js:24 | 30-books-site.js |
| bkSet | siteapi.js:25 | 30-books-site.js |
| cashMove | pos.js:291 | 50-cash.js |
| catAdd | pos.js:316, pos.js:353 | 70-settings.js |
| catSet | pos.js:315 | 70-settings.js |
| certBd | siteapi.js:30 | 30-books-site.js |
| certDel | siteapi.js:28 | 00-core.js |
| certGet | siteapi.js:29 | 30-books-site.js |
| certList | siteapi.js:26 | 00-core.js |
| certOff | siteapi.js:31 | 10-hall.js |
| certPay | siteapi.js:27 | 00-core.js |
| certUse | siteapi.js:32 | 30-books-site.js |
| cfgSet | pos.js:393 | 00-core.js, 70-settings.js |
| chatSay | pos.js:247 | 12-evcom.js |
| cliBonus | delivery.js:299 | 10-hall.js, 20-delivery.js |
| cliGet | delivery.js:293 | 20-delivery.js, 30-books-site.js |
| cliSet | delivery.js:294 | 20-delivery.js |
| close | pos.js:159 | 10-hall.js |
| closed | pos.js:262 | 00-core.js, 50-cash.js |
| closedBack | pos.js:265 | 00-core.js |
| closedDel | pos.js:280 | 00-core.js |
| closedEdit | pos.js:268 | 50-cash.js |
| closedPrint | pos.js:264 | 00-core.js |
| closedRefund | pos.js:270 | 00-core.js |
| closedReopen | pos.js:266 | 10-hall.js |
| courAct | pos.js:101 | 20-delivery.js |
| courCash | pos.js:104 | 20-delivery.js |
| courList | pos.js:102 | 00-core.js, 20-delivery.js |
| courMe | pos.js:99 | 20-delivery.js |
| courRep | pos.js:103 | 20-delivery.js |
| courTg | pos.js:100 | 20-delivery.js |
| delete | pos.js:90, pos.js:174 | 10-hall.js |
| discount | pos.js:168 | 10-hall.js |
| evAck | pos.js:211 | 10-hall.js |
| evNames | pos.js:250 | 12-evcom.js |
| evSeen | pos.js:213, pos.js:237 | 12-evcom.js |
| evVoiceGet | pos.js:249 | 12-evcom.js |
| expense | pos.js:304 | 00-core.js |
| expenseBack | pos.js:295 | 50-cash.js |
| expenseDel | pos.js:310 | 50-cash.js |
| fav | pos.js:134 | 10-hall.js |
| fisRetry | pos.js:276 | 10-hall.js |
| float | pos.js:303 | 00-core.js |
| fullExport | pos.js:399 | 60-reports.js |
| gbCast | guestbot.js:244 | 75-loyalty.js |
| gbClose | guestbot.js:247 | 75-loyalty.js |
| gbCount | guestbot.js:243 | 75-loyalty.js |
| gbGet | guestbot.js:241 | 75-loyalty.js |
| gbInbox | guestbot.js:245 | 75-loyalty.js |
| gbReply | guestbot.js:248 | 75-loyalty.js |
| gbSet | guestbot.js:242 | 75-loyalty.js |
| gbThread | guestbot.js:246 | 75-loyalty.js |
| goCfg | delivery.js:291 | 00-core.js |
| goCfgSet | delivery.js:292 | 20-delivery.js |
| goCour | delivery.js:272 | 00-core.js |
| goEdit | delivery.js:290 | 20-delivery.js |
| goMap | delivery.js:280 | 20-delivery.js |
| goSt | delivery.js:262, pos.js:90 | 00-core.js, 20-delivery.js |
| hallsSet | pos.js:391 | 70-settings.js |
| help | owner.js:363, pos.js:74 | 85-team.js |
| ibanQr | pos.js:153 | 10-hall.js |
| ideaAdd | ideas.js:42 | 85-team.js |
| ideaDel | ideas.js:44 | 85-team.js |
| ideaDone | ideas.js:45 | 85-team.js |
| ideaList | ideas.js:43 | 85-team.js |
| ideaSay | ideas.js:47 | 85-team.js |
| ideaSeen | ideas.js:48 | 85-team.js |
| ideaThr | ideas.js:46 | 85-team.js |
| incAdd | pos.js:413 | 70-settings.js |
| incDel | pos.js:414 | 70-settings.js |
| incGet | pos.js:412 | 70-settings.js |
| jsErr | pos.js:248 | 00-core.js |
| kDone | pos.js:186 | 40-kitchen.js |
| kMsg | pos.js:189 | 40-kitchen.js |
| kStart | pos.js:187 | 40-kitchen.js |
| kStats | pos.js:190 | 60-reports.js |
| kUndo | pos.js:188 | 40-kitchen.js |
| kitchen | pos.js:181 | 40-kitchen.js |
| kitchenPct | pos.js:396 | 00-core.js |
| login | owner.js:276, pos.js:40 | 00-core.js |
| logout | owner.js:321, pos.js:109 | 00-core.js |
| lookV | pos.js:82 | 00-core.js |
| lookVSet | pos.js:89 | 70-settings.js |
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
| mapSet | pos.js:392 | 10-hall.js |
| menu | pos.js:133 | 00-core.js |
| menuDel | pos.js:316, pos.js:354 | 70-settings.js |
| menuPhoto | pos.js:316, pos.js:364 | 70-settings.js |
| menuPrice | pos.js:316, pos.js:341 | 80-calc.js |
| menuSave | pos.js:316, pos.js:340 | 70-settings.js |
| menuUndo | pos.js:316, pos.js:360 | 70-settings.js |
| modSet | pos.js:394 | 70-settings.js |
| modsSave | pos.js:316, pos.js:348 | 70-settings.js |
| move | pos.js:171 | 10-hall.js |
| moveBack | pos.js:294 | 50-cash.js |
| moveDel | pos.js:293 | 50-cash.js |
| order | pos.js:137 | 10-hall.js |
| photoInfo | photoai.js:37 | 70-settings.js |
| plockGet | pos.js:400 | 60-reports.js |
| plockSet | pos.js:401 | 60-reports.js |
| precheck | pos.js:152 | 00-core.js |
| printClear | pos.js:251 | 00-core.js, 70-settings.js |
| printMove | pos.js:205 | 00-core.js |
| printQ | pos.js:195 | 70-settings.js |
| printQr | pos.js:252 | 70-settings.js |
| printRoute | pos.js:201 | 70-settings.js |
| printTest | pos.js:194 | 70-settings.js |
| pushAll | push.js:86 | 00-core.js |
| pushKey | push.js:85 | 00-core.js |
| pushSub | push.js:91 | 00-core.js |
| pushTest | push.js:93 | 00-core.js |
| pushUnsub | push.js:92 | 00-core.js |
| qrInfo | pos.js:254 | 70-settings.js |
| qrNew | pos.js:254, pos.js:256 | 70-settings.js |
| rcptGet | pos.js:196 | 00-core.js, 70-settings.js |
| reconcile | pos.js:292 | 50-cash.js |
| regCode | pos.js:53, pos.js:388 | 00-core.js |
| register | pos.js:41 | 00-core.js |
| reject | pos.js:173 | 10-hall.js |
| remove | pos.js:151 | 10-hall.js |
| report | pos.js:301 | 60-reports.js |
| reset | owner.js:290, pos.js:311 | 70-settings.js |
| shift | pos.js:287 | 00-core.js, 50-cash.js |
| shiftOpen | pos.js:298 | 50-cash.js |
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
| split | pos.js:170 | 10-hall.js |
| stGet | pos.js:416 | 70-settings.js |
| stSet | pos.js:417 | 70-settings.js |
| staff | pos.js:387 | 00-core.js, 50-cash.js |
| staffAdd | pos.js:389 | 70-settings.js |
| staffDel | pos.js:422 | 70-settings.js |
| staffEdit | pos.js:423 | 85-team.js |
| staffPerm | pos.js:52, pos.js:419 | 85-team.js |
| state | pos.js:115 | 00-core.js |
| stop | pos.js:193 | 70-settings.js |
| tableBack | pos.js:267 | 10-hall.js |
| taskAdd | tasks.js:77 | 86-tasks.js |
| taskAnn | tasks.js:82 | 86-tasks.js |
| taskDel | tasks.js:83 | 86-tasks.js |
| taskList | tasks.js:73 | 86-tasks.js |
| taskMark | tasks.js:84 | 86-tasks.js |
| taskPh | tasks.js:85 | 86-tasks.js |
| taskTpl | tasks.js:86 | 86-tasks.js |
| taxDone | pos.js:415 | 70-settings.js |
| taxGet | pos.js:402 | 70-settings.js |
| taxSet | pos.js:411 | 70-settings.js |
| tip | pos.js:169 | 00-core.js, 10-hall.js |
| tipPay | pos.js:290 | 00-core.js |
| tpayOk | lpay.js:92, pos.js:91 | 10-hall.js |
| tpayRefund | lpay.js:97, pos.js:91 | 10-hall.js |
| upsGet | delivery.js:288 | 70-settings.js |
| upsMap | delivery.js:287 | 10-hall.js |
| upsSet | delivery.js:289 | 70-settings.js |
| voidBack | pos.js:263 | 10-hall.js |
| waiterOut | pos.js:427 | 70-settings.js |
| wifi | pos.js:379 | 00-core.js |
| wifiAdd | pos.js:380 | 70-settings.js |
| wifiClear | pos.js:384 | 70-settings.js |
| wlAct | pos.js:132 | 10-hall.js |
| wlAdd | pos.js:131 | 10-hall.js |
| zDay | pos.js:289 | 50-cash.js |
| zX | pos.js:288 | 50-cash.js |
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
| `apiord:` | api-v1.js |
| `att:` | pay.js, push.js |
| `bak:` | owner.js |
| `bank:` | bank.js, income.js |
| `bfprev:` | ops-core.js |
| `bill:` | ops-bill.js, ops-core.js, ops-staff.js |
| `bkapi:` | bankapi.js |
| `bkm:` | site.js |
| `book:` | demoseed.js, site.js |
| `brand:` | brand.js |
| `ccash:` | courier.js |
| `cert:` | mig.js, promo.js, site.js |
| `cfg:` | delivery.js, index.js, lpay.js, owner.js, photoai.js, plock.js, pos.js, store.js, venue.js |
| `cli:` | delivery.js, export.js, promo.js |
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
| `inc:` | income.js |
| `incm:` | income.js, ops-closed.js |
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
| `ord:` | api-v1.js, courier.js, delivery.js, index.js, ops-bill.js |
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
| `js/owner-plan.js` | 🗺 Кабінет → «План» (лише платформа): компас «де ми», ⭐ першим, дошка команди, план (горизонт → гілка → задача → підзадача), |
| `js/owner-print.js` | 🧾 Кабінет власника → Принтер: конструктор чека (живий перегляд) і встановлювач програми друку одним файлом. |
| `js/owner-site.js` | 🎨 Конструктор сайту-візитки (кабінет власника → Заклади → 🌐 Сайт → «🎨 Конструктор»). Повноекранний редактор: |
| `js/owner-venue.js` | ⚙️ Кабінет власника → налаштування закладу без розробника: 🚀 запуск (чек-лист), заклад, сайт, меню (+ імпорт з Excel/Google), доставка, кас |
| `js/owner.js` | 👑 Кабінет власника мережі (owner.html): вхід → мережа сьогодні → аналітика → заклади → (платформа). |
| `js/photo-ai.js` | 📸 ШІ-фото страв — ОДНЕ вікно для каси (Налаштування → Меню) і кабінету власника (Меню). |
| `js/prnroute.js` | 🖨 Кілька принтерів: що на який друкувати (спільне для каси й кабінету власника). |
| `js/sheet.js` | 📱 Вікна (.modal-bg > .modal) на телефоні — нижній лист: свайп униз закриває (як «ручка» зверху підказує). Спільне для каси й кабінету власн |
| `js/skin.js` | 🖌 Спільний рушій стилю (конструктор) для каси й кабінету власника. Без data-skin — «Стара каса», css/skin.css нічого не чіпає. |
| `js/tabprint.js` | 📱 Принтер, підключений прямо до планшета з касою — без компʼютера. |
