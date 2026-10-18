# 🗺 Карта коду

_Генерується `node tools/map.mjs` (і кожним `tools/test.sh`). Руками не правити._

## Сервер — файли

| Файл | Рядків | Що робить |
|---|---|---|
| `acct.js` | 37 | 📤 Експорт для бухгалтера: таблиці за період (продажі, оплати, приходи складу, списання, ЗП). Лише читання. |
| `ai.js` | 296 | ✨ Помічник «Не знаю, що хочу»: Gemini ставить кілька питань і підбирає страви / сет із нашого меню |
| `aitest.js` | 63 | 🧪 ШІ-тестувальник у хмарі: двічі на день (вікна нижче, за Києвом) з cron кожні 5 хв бере по ОДНОМУ шматку коду |
| `analytics.js` | 59 | 📊 Розширена аналітика закладу (вкладка «Аналітика» кабінету): один запит за період, результат кешується на 5 хв. |
| `backup.js` | 40 | 💾 Бекапи закладу: щоночі повна копія сховища (стиснута gzip) у KV на 8 днів: bak:<заклад>:<день>. |
| `billing.js` | 84 | 💳 Платежі платформи ATOM (ключі LiqPay платформи = VARVAR): |
| `bot-main.js` | 663 | 🤖 Бот персоналу — обробка повідомлень (handleUpdate) і натискань кнопок (handleCallback) |
| `bot-views.js` | 377 | 🤖 Бот персоналу — екрани й клавіатури: столи, рахунок, каса, звіти, кухня, закриті, стоп-лист, Wi‑Fi, персонал, броні, рух грошей, Z |
| `bot.js` | 9 | Telegram-бот закладу. Вхід: пароль офіціанта (столи, замовлення, закриття, стоп-лист) |
| `brand.js` | 52 | 🎨 Оформлення трьох Telegram-ботів: аватар з емблемою (img/bots/*.png), ім'я, опис, команди. |
| `buildid.js` | 3 | мітка збірки для tools/test.sh (чекає, поки тестовий сервер перезавантажить саме цей код) |
| `chat.js` | 45 | 💬 Чат на posatom.online: ШІ-асистент збирає заявку з фактів про ATOM. Розмова — у Hub (chat:<leadId>), у lead лише прапорці chat/hot/last. |
| `courier.js` | 242 | 🛵 Кур'єри: окремий Telegram-бот (сповіщення про доставки, «Беру», «Поїхав», «Видано», проблеми, фото), |
| `delivery.js` | 308 | 🛵 Замовлення за посиланням: самовивіз і доставка. Кожне — «віртуальний стіл» (tn.js): звичайний bill: з полем go, |
| `demomap.js` | 29 | 🏛 Дизайнерські зали демо-закладу (atom-demo): зал зі стійкою, вікнами, колонами, диванами + літня тераса. |
| `demoseed.js` | 102 | 🎬 Демо-заклад «Все за 500» (atom-demo): видумане меню, персонал і 14 днів «життя» закладу. |
| `digest.js` | 59 | 🌙 Підсумок дня для власника (о 23:00 за Києвом): виручка, чеки, оплати, ЗП, нестача, топ страв. |
| `guestbot.js` | 252 | 🤖 Бот гостей (@…GUEST_BOT_TOKEN): меню, статус замовлення, бонуси, день народження, сертифікати, |
| `hub.js` | 278 | 🌐 HUB — центральна база платформи (один Durable Object): акаунти власників, заклади, сесії кабінету. |
| `ideas.js` | 64 | 💡 Побажання розробнику: працівник пише з особистого кабінету (каса) або з бота персоналу. |
| `index.js` | 461 |  |
| `kitbot.js` | 146 | 👨‍🍳 Бот кухні (KITCHEN_BOT_TOKEN, вебхук /tg4): кухарі отримують нові замовлення на телефон, |
| `kitchen.js` | 133 | 👨‍🍳 Легкий кухонний екран для старих планшетів (iPad 2 / iOS 9): відкривається по http://…workers.dev/kitchen |
| `liqpay.js` | 50 | 💳 LiqPay (ПриватБанк): форма оплати, перевірка підпису callback, серверні запити (статус, повернення, відписка). |
| `lpay.js` | 110 | 💳 Оплата рахунку столу з QR (LiqPay закладу) + callback для сертифікатів / підписки ATOM / балансу ШІ. |
| `mail.js` | 14 | ✉️ Листи власникам (підтвердження пошти, відновлення пароля) — через Brevo (безкоштовно 300 листів/добу, без власного домену). |
| `match.js` | 73 | 🔎 Зіставлення рядка накладної з продуктом складу (чиста логіка, без бази — тестується `node tools/stock-match-bench.mjs`). |
| `menu.js` | 271 | Меню в KV + редагування через Telegram звичайними фразами. |
| `migrate.js` | 17 | 🧬 Міграції даних закладу: коли змінюється формат даних, кожен заклад САМ оновлюється при першому зверненні |
| `mono.js` | 61 | 💳 monobank (еквайринг): рахунок (invoice/create), вебхук з перевіркою ECDSA-підпису (X-Sign + pubkey), повернення (cancel). |
| `ops-bill.js` | 366 | 🍽 Стіл: замовлення (гість/офіціант), прийняти/відхилити, скасування страв, закриття й оплата, знижка, чайові, перенесення, розділення, вида |
| `ops-closed.js` | 152 | 🧾 Закриті рахунки: список, видалення/повернення, редагування, повторне відкриття, відновлення стола, передрук |
| `ops-core.js` | 183 | 🧱 Ядро закладу: дата/робочий день, гроші, рахунки столів (get/put), замки L(), стрічка подій, статистика, налаштування, зали й схема, групи |
| `ops-kitchen.js` | 118 | 👨‍🍳 Кухня: цехи (станції), черга кухонного екрана, готовність, статистика кухні |
| `ops-money.js` | 301 | 💰 Гроші й звіти: витрати, рух коштів, залишки, звірка, зміна, Z/X-звіти, рекорд дня, звіти за період |
| `ops-staff.js` | 135 | 👥 Доступ і персонал: паролі, PIN, коди реєстрації, працівники, права, перейменування, аватарки |
| `ops.js` | 10 | Спільна логіка закладу для Telegram-бота і касової програми (POS). |
| `orderui.js` | 131 | Замовлення офіціанта кнопками: стіл → категорія → страва → (розмір) → кількість → знову категорії. |
| `owner.js` | 380 | 👑 Кабінет власника мережі й консоль платформи: /api/owner (поза закладом) + внутрішні виклики закладів /__int/* (всередині Store). |
| `pay.js` | 232 | 👷 Графік змін і зарплата: прихід «Почати зміну» → адмін підтверджує → ✅ у графіку; ставка за зміну + % від виручки + бонус за план; |
| `perm.js` | 59 | 🔑 Ролі й права з галочками (_team/roles.md). |
| `photoai.js` | 94 | 📸 ШІ-фото страв в одному стилі закладу: Gemini Image (платний ключ GEMINI_IMG_KEY — лише тут; решта ШІ — безкоштовний ключ). |
| `pos.js` | 427 | API касової програми (pos.html). POST /api/pos {op, ...} з заголовком Authorization: Bearer <token>. |
| `print.js` | 220 | Черга друку для принтера в закладі (XP-80C через програму printer/varvar-print.ps1 на Windows). |
| `promo.js` | 306 | 🎁 Лояльність: рівні постійних клієнтів (знижка / кешбек) і акції-правила (категорія, щасливі години, N-та в подарунок, |
| `push.js` | 125 | 🔔 Push-сповіщення в шторку (Web Push, VAPID + aes128gcm, RFC 8291/8292) — без бібліотек, лише WebCrypto. |
| `qr.js` | 47 | 🔳 QR-коди меню: ключ закладу (qr_key) → ключ кожного столу; PNG генерується на сервері (для принтера чеків і для друкарні). |
| `site.js` | 467 | 🌐 Сайт-візитка: дані закладу, бронювання (+ передзамовлення), подарункові сертифікати, кабінет гостя (вхід через Telegram), |
| `siteapi.js` | 37 | 🖥 каса: сайт-візитка, броні, сертифікати (op: site*, bk*, cert*) |
| `sitedesign.js` | 84 | 🎨 Конструктор сайту-візитки: перевірка всього, що власник зберігає з кабінету (тема, головний екран, блоки, панель, |
| `stock.js` | 567 | 🧮 Розрахунок: склад (Кухня / Бар), техкарти й собівартість, заготовки, накладні, інвентаризація. |
| `stockbot.js` | 223 | 🧮 Розрахунок у Telegram-боті (паритет з касою): залишки, закупівля, накладні з фото, списання, заготовки, інвентаризація, техкарти, фудкост |
| `store.js` | 175 | Надійне сховище закладу: Durable Object (одна копія, без затримок узгодження, як у KV). |
| `suppliers.js` | 115 | 🏭 Постачальники: профіль (реквізити з накладної, контакти, відстрочка), борг і накладні, ціни, замовлення, акт звірки, нагадування. |
| `tasks.js` | 97 | 📋 План на день: адмін складає завдання (разові + шаблони, що повторюються), працівник відмічає ✅ зробив / ❌ не зробив (з причиною, за потре |
| `tax.js` | 107 | 📅 Податковий календар: власник обирає ФОП (1/2/3 група) або ТОВ → дати звітів і платежів + нагадування в Telegram. |
| `tn.js` | 6 | 🛵 номери віртуальних столів: 1001+ — доставка (Д‑1…), 2001+ — самовивіз (С‑1…); решта — столи залу |
| `venue.js` | 71 | 🏪 Мультизаклад: який заклад обслуговує запит і його «середовище» (env). |
| `waiter.js` | 111 | Замовлення від офіціанта текстом у боті: |
| `wl.js` | 51 | ⏳ Черга в залі (waitlist): гість без броні чекає вільного столу. Один ключ wl:<день>, без окремого полінгу — каса бачить чергу разом зі стан |

## Каса — розділи і функції

- **00-core.js** (739) — applyBrand:24, offBanner:43, offFlush:49, api:63, showLogin:83, tryLogin:88, pinKey:107, showReg:115, logout:137, loadState:146, loadMenu:160, revive:163, connect:164, ding:224, applyLook:236, applySkin:247, loadLookV:248, renderNav:267, render:279, loadView:291, renderMain:306, modal:354, askVal:368, askLong:372, ask:376, pickTable:380, toast:392, goBack:631, checkVer:659, pushSubNow:674, pushMenu:685, pushBanner:698, pushSwSync:708, start:725
- **10-hall.js** (385) — hallHTML:1, renderFeed:45, openTable:77, closeSheet:84, menuItems:89, renderSheet:97, paintCounts:142, addItem:147, upsHint:167, sendCart:173, closeFlow:183, voidReason:202, discFlow:207, moveFlow:216, splitRender:225, splitFlow:231, hallGrid:244, closedHTML:255, hallViews:279, mapPos:291, mapStart:297, mapSave:299, floorUI:300, mapEdit:330, hallPick:343, myHalls:348, wlFree:370, wlOpen:375
- **12-evcom.js** (110) — evFoot:12, evList:18, chatSay:26, evNotify:28, evcOpen:35, evcClose:45, evcRender:46, evcDo:58, evcSend:59, evcMent:61, evcPutMent:68, evRecStart:71, evRecStop:83, evPlay:85
- **20-delivery.js** (170) — goBlock:1, goNew:12, goDone:45, cliT:51, loadCour:71, goHTML:73, goCtlHTML:102, courCard:120, goSetHTML:124, goTileInfo:141, goEdit:143, goMap:153, loadCourRep:155, courRepHTML:156
- **30-books-site.js** (53) — loadBooks:1, booksHTML:3, bkForm:25, bdGiftT:40, certT:46
- **40-kitchen.js** (73) — loadKq:1, tone:8, siren:11, kPlay:35, kSndPick:45, kitchenStart:51, kitchenGate:57, kqHTML:59
- **50-cash.js** (133) — cashHTML:1, cashHTML0:6, balInfo:51, cashMove:62, shOpen:71, zDay:83, cEdit:101
- **60-reports.js** (207) — perRange:1, dishOf:14, acctExport:25, loadReport:35, prevRange:52, repChecks:54, repStats:61, reportsHTML:78
- **70-settings.js** (235) — stopHTML:1, printerHTML:11, printerCards:14, stCard:23, stSave:32, stEdit:33, taxCard:47, taxDo:62, prnCard:69, menuHTML:79, lookHTML:85, settingsHTML:99, menuEdit:154, qrPanel:182, qrSave:194, qrSheet:199, shrink:211, hallsSave:218, hallEdit:219
- **75-loyalty.js** (180) — gbInbox:9, gbThread:13, loadLoy:22, loyRange:32, loyHTML:33, ruleWhat:77, loyLvEdit:82, loyRuleEdit:94, loyCliCard:130, loyAfter:149
- **80-calc.js** (568) — loadCalc:1, calcHTML:13, skStockHTML:25, skIngEdit:50, skMergeUI:76, skGrpEdit:90, skDups:103, skGrpNew:112, skQty:113, skPick:132, skJournal:145, skBuyHTML:160, skShare:167, skInvHTML:173, skDraftHTML:187, skNewIng:208, skDraftSave:217, skAutoF:227, skPhotos:229, skBench:242, skScan:254, skCode:261, skDraftAdd:277, skCam:283, skInvView:298, skUnitCost:306, skCardsHTML:312, skCardOpen:329, skCardEdHTML:335, skMass:364, skMakeIngs:372, skCardSave:381, skCardAi:391, skAiAll:400, skTechHTML:419, skTechOne:424, skTechAll:429, skProdHTML:436, skProduce:443, skCountHTML:450, skCfInput:466, skCntFinish:472, skCntShow:479, skRepHTML:488
- **82-suppliers.js** (69) — skSupHTML:5, supLoad:14, supOpen:15, supEdit:51, supPrices:58
- **85-team.js** (208) — loadPay:1, teamHTML:2, payHTML:3, gridHTML:41, zpPend:47, zpCell:55, zpSet:71, zpOpN:83, ideasLoad:92, helpAsk:93, thrMy:98, ideasMy:109, zpMy:115, staffPerms:189
- **86-tasks.js** (68) — loadMyTasks:6, myTasksHTML:8, tkMark:13, tkLoad:21, tkAdminHTML:22, tkForm:38, tkClick:51
- **94-course-vid.js** (3) — —
- **95-course.js** (225) — courseLeft:154, courseHTML:159, crNav:175, crEnd:176, crStep:177, crHelpBtn:217
- **99-core-end.js** (2) — —

## Op каси → де обробляється → хто викликає

| op | сервер | каса |
|---|---|---|
| accept | pos.js:159 | 00-core.js |
| acctExport | pos.js:345 | 60-reports.js |
| aiBench | pos.js:78 | 80-calc.js |
| avatar | pos.js:107 | 85-team.js |
| bkEdit | siteapi.js:23 | 00-core.js, 30-books-site.js |
| bkList | siteapi.js:22 | 00-core.js, 30-books-site.js |
| bkNew | siteapi.js:24 | 30-books-site.js |
| bkSet | siteapi.js:25 | 00-core.js |
| cashMove | pos.js:268 | 50-cash.js |
| catAdd | pos.js:293, pos.js:303 | 00-core.js |
| catSet | pos.js:292 | 00-core.js |
| certBd | siteapi.js:30 | 30-books-site.js |
| certDel | siteapi.js:28 | 00-core.js |
| certGet | siteapi.js:29 | 30-books-site.js |
| certList | siteapi.js:26 | 00-core.js |
| certOff | siteapi.js:31 | 00-core.js |
| certPay | siteapi.js:27 | 00-core.js |
| certUse | siteapi.js:32 | 30-books-site.js |
| cfgSet | pos.js:343 | 00-core.js |
| chatSay | pos.js:229 | 12-evcom.js |
| cliBonus | delivery.js:296 | 00-core.js, 20-delivery.js |
| cliGet | delivery.js:290 | 20-delivery.js, 30-books-site.js |
| cliSet | delivery.js:291 | 20-delivery.js |
| close | pos.js:149 | 10-hall.js |
| closed | pos.js:244 | 00-core.js, 50-cash.js |
| closedBack | pos.js:247 | 00-core.js |
| closedDel | pos.js:258 | 00-core.js |
| closedEdit | pos.js:250 | 50-cash.js |
| closedPrint | pos.js:246 | 00-core.js |
| closedRefund | pos.js:252 | 00-core.js |
| closedReopen | pos.js:248 | 00-core.js |
| courAct | pos.js:98 | 00-core.js |
| courCash | pos.js:101 | 00-core.js |
| courList | pos.js:99 | 00-core.js, 20-delivery.js |
| courMe | pos.js:96 | 20-delivery.js |
| courRep | pos.js:100 | 20-delivery.js |
| courTg | pos.js:97 | 00-core.js |
| delete | pos.js:87, pos.js:161 | 00-core.js |
| discount | pos.js:155 | 00-core.js, 10-hall.js |
| evAck | pos.js:193 | 00-core.js |
| evNames | pos.js:232 | 12-evcom.js |
| evSeen | pos.js:195, pos.js:219 | 12-evcom.js |
| evVoiceGet | pos.js:231 | 12-evcom.js |
| expense | pos.js:281 | 00-core.js |
| expenseBack | pos.js:272 | 00-core.js |
| expenseDel | pos.js:287 | 00-core.js |
| fav | pos.js:131 | 00-core.js |
| float | pos.js:280 | 00-core.js |
| gbCast | guestbot.js:244 | 75-loyalty.js |
| gbClose | guestbot.js:247 | 75-loyalty.js |
| gbCount | guestbot.js:243 | 75-loyalty.js |
| gbGet | guestbot.js:241 | 75-loyalty.js |
| gbInbox | guestbot.js:245 | 75-loyalty.js |
| gbReply | guestbot.js:248 | 75-loyalty.js |
| gbSet | guestbot.js:242 | 75-loyalty.js |
| gbThread | guestbot.js:246 | 75-loyalty.js |
| goCfg | delivery.js:288 | 00-core.js |
| goCfgSet | delivery.js:289 | 00-core.js |
| goCour | delivery.js:269 | 00-core.js |
| goEdit | delivery.js:287 | 20-delivery.js |
| goMap | delivery.js:277 | 20-delivery.js |
| goSt | delivery.js:259, pos.js:87 | 00-core.js, 20-delivery.js |
| hallsSet | pos.js:341 | 70-settings.js |
| help | owner.js:264, pos.js:71 | 85-team.js |
| ideaAdd | ideas.js:42 | 85-team.js |
| ideaDel | ideas.js:44 | 85-team.js |
| ideaDone | ideas.js:45 | 85-team.js |
| ideaList | ideas.js:43 | 85-team.js |
| ideaSay | ideas.js:47 | 85-team.js |
| ideaSeen | ideas.js:48 | 85-team.js |
| ideaThr | ideas.js:46 | 85-team.js |
| jsErr | pos.js:230 | 00-core.js |
| kDone | pos.js:173 | 00-core.js |
| kMsg | pos.js:176 | 00-core.js |
| kStart | pos.js:174 | 00-core.js |
| kStats | pos.js:177 | 60-reports.js |
| kUndo | pos.js:175 | 00-core.js |
| kitchen | pos.js:168 | 40-kitchen.js |
| kitchenPct | pos.js:344 | 00-core.js |
| login | owner.js:191, pos.js:39 | 00-core.js |
| logout | owner.js:242, pos.js:106 | 00-core.js |
| lookV | pos.js:79 | 00-core.js |
| lookVSet | pos.js:86 | 70-settings.js |
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
| mapSet | pos.js:342 | 10-hall.js |
| menu | pos.js:130 | 00-core.js |
| menuDel | pos.js:293, pos.js:304 | 70-settings.js |
| menuPhoto | pos.js:293, pos.js:314 | 70-settings.js |
| menuSave | pos.js:293, pos.js:302 | 70-settings.js |
| menuUndo | pos.js:293, pos.js:310 | 00-core.js |
| move | pos.js:158 | 10-hall.js |
| moveBack | pos.js:271 | 00-core.js |
| moveDel | pos.js:270 | 00-core.js |
| order | pos.js:134 | 10-hall.js |
| photoInfo | photoai.js:26 | 70-settings.js |
| precheck | pos.js:148 | 00-core.js |
| printClear | pos.js:233 | 00-core.js |
| printMove | pos.js:192 | 00-core.js |
| printQ | pos.js:182 | 00-core.js |
| printQr | pos.js:234 | 00-core.js |
| printRoute | pos.js:188 | 70-settings.js |
| printTest | pos.js:181 | 00-core.js |
| pushKey | push.js:85 | 00-core.js |
| pushSub | push.js:87 | 00-core.js |
| pushTest | push.js:89 | 00-core.js |
| pushUnsub | push.js:88 | 00-core.js |
| qrInfo | pos.js:236 | 70-settings.js |
| qrNew | pos.js:236, pos.js:238 | 70-settings.js |
| rcptGet | pos.js:183 | 00-core.js, 70-settings.js |
| reconcile | pos.js:269 | 50-cash.js |
| regCode | pos.js:52, pos.js:338 | 00-core.js |
| register | pos.js:40 | 00-core.js |
| reject | pos.js:160 | 00-core.js |
| remove | pos.js:147 | 00-core.js |
| report | pos.js:278 | 60-reports.js |
| reset | owner.js:205, pos.js:288 | 00-core.js |
| shift | pos.js:264 | 00-core.js, 50-cash.js |
| shiftOpen | pos.js:275 | 50-cash.js |
| skAdj | stock.js:510 | 80-calc.js |
| skBuy | stock.js:512 | 80-calc.js |
| skCardAi | stock.js:521 | 80-calc.js |
| skCardSave | stock.js:520 | 80-calc.js |
| skCost | stock.js:519 | 80-calc.js |
| skCount | stock.js:548 | 80-calc.js |
| skCountDoc | stock.js:561 | 80-calc.js |
| skCountFinish | stock.js:550 | 80-calc.js |
| skCountList | stock.js:551 | 80-calc.js |
| skCountSave | stock.js:549 | 80-calc.js |
| skCountUndo | stock.js:552 | 80-calc.js |
| skData | stock.js:501 | 80-calc.js |
| skDups | stock.js:515 | 80-calc.js |
| skGrp | stock.js:514 | 80-calc.js |
| skIngCost | stock.js:503 | 80-calc.js |
| skIngDel | stock.js:509 | 80-calc.js |
| skIngSave | stock.js:502 | 80-calc.js |
| skInvDel | stock.js:545 | 80-calc.js |
| skInvGet | stock.js:544 | 80-calc.js |
| skInvList | stock.js:543 | 80-calc.js |
| skInvParse | stock.js:532 | 80-calc.js |
| skInvPay | stock.js:546 | 80-calc.js |
| skInvSave | stock.js:540 | 80-calc.js |
| skJournal | stock.js:517 | 80-calc.js |
| skJrUndo | stock.js:516 | 80-calc.js |
| skMerge | stock.js:513 | 80-calc.js |
| skMove | stock.js:511 | 80-calc.js |
| skProduce | stock.js:530 | 80-calc.js |
| skReport | stock.js:563 | 00-core.js, 80-calc.js |
| skSupAct | stock.js:559 | 82-suppliers.js |
| skSupCard | stock.js:554 | 82-suppliers.js |
| skSupList | stock.js:553 | 80-calc.js, 82-suppliers.js |
| skSupMerge | stock.js:556 | 82-suppliers.js |
| skSupOrder | stock.js:558 | 82-suppliers.js |
| skSupPay | stock.js:557 | 82-suppliers.js |
| skSupPrices | stock.js:560 | 82-suppliers.js |
| skSupSave | stock.js:555 | 82-suppliers.js |
| skTech | stock.js:522 | 80-calc.js |
| split | pos.js:157 | 10-hall.js |
| stGet | pos.js:349 | 70-settings.js |
| stSet | pos.js:350 | 70-settings.js |
| staff | pos.js:337 | 00-core.js, 50-cash.js |
| staffAdd | pos.js:339 | 00-core.js |
| staffDel | pos.js:355 | 00-core.js |
| staffEdit | pos.js:356 | 85-team.js |
| staffPerm | pos.js:51, pos.js:352 | 85-team.js |
| state | pos.js:112 | 00-core.js |
| stop | pos.js:180 | 00-core.js |
| tableBack | pos.js:249 | 00-core.js |
| taskAdd | tasks.js:67 | 86-tasks.js |
| taskDel | tasks.js:72 | 86-tasks.js |
| taskList | tasks.js:63 | 86-tasks.js |
| taskMark | tasks.js:73 | 86-tasks.js |
| taskPh | tasks.js:74 | 86-tasks.js |
| taskTpl | tasks.js:75 | 86-tasks.js |
| taxDone | pos.js:348 | 70-settings.js |
| taxGet | pos.js:346 | 70-settings.js |
| taxSet | pos.js:347 | 70-settings.js |
| tip | pos.js:156 | 00-core.js |
| tipPay | pos.js:267 | 00-core.js |
| tpayOk | lpay.js:87, pos.js:88 | 00-core.js |
| tpayRefund | lpay.js:92, pos.js:88 | 00-core.js |
| upsGet | delivery.js:285 | 00-core.js |
| upsMap | delivery.js:284 | 10-hall.js |
| upsSet | delivery.js:286 | 00-core.js |
| voidBack | pos.js:245 | 00-core.js |
| waiterOut | pos.js:360 | 00-core.js |
| wifi | pos.js:329 | 00-core.js |
| wifiAdd | pos.js:330 | 00-core.js |
| wifiClear | pos.js:334 | 00-core.js |
| wlAct | pos.js:129 | 10-hall.js |
| wlAdd | pos.js:128 | 10-hall.js |
| zDay | pos.js:266 | 50-cash.js |
| zX | pos.js:265 | 50-cash.js |
| zpAtt | pay.js:217 | 85-team.js |
| zpGrid | pay.js:216 | 85-team.js |
| zpGridSet | pay.js:222 | 85-team.js |
| zpIn | pay.js:207 | 85-team.js |
| zpMy | pay.js:209 | 85-team.js |
| zpOp | pay.js:220 | 85-team.js |
| zpOpDel | pay.js:221 | 85-team.js |
| zpOut | pay.js:208 | 85-team.js |
| zpPeople | pay.js:210 | 85-team.js |
| zpPlan | pay.js:218 | 85-team.js |
| zpPlanCopy | pay.js:219 | 85-team.js |
| zpStaff | pay.js:228 | 85-team.js |
| zpSwap | pay.js:211 | 85-team.js |
| zpSwapStep | pay.js:212 | 85-team.js |

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
| `att:` | pay.js, push.js |
| `bak:` | owner.js |
| `bfprev:` | ops-core.js |
| `bill:` | ops-bill.js, ops-core.js, ops-staff.js |
| `bkm:` | site.js |
| `book:` | demoseed.js, site.js |
| `brand:` | brand.js |
| `ccash:` | courier.js |
| `cert:` | site.js |
| `cfg:` | delivery.js, index.js, lpay.js, owner.js, photoai.js, pos.js, store.js, venue.js |
| `cli:` | delivery.js, promo.js |
| `closed:` | ops-bill.js, ops-closed.js, ops-core.js, pos.js |
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
| `fail:` | bot-main.js |
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
| `lead:` | hub.js |
| `lfail:` | pos.js |
| `lk:` | index.js |
| `mov:` | ops-money.js, pay.js |
| `msg:` | hub.js |
| `nsT:` | index.js |
| `ob:` | orderui.js |
| `okip:` | pos.js |
| `ord:` | courier.js, delivery.js, index.js, ops-bill.js |
| `pay:` | pay.js |
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
| `js/owner-an.js` | 📊 Кабінет → Аналітика → «Деталі закладу»: теплова карта, топ/антитоп, ABC, канали, оплати, офіціанти, кухня, склад, гості, прогноз. |
| `js/owner-atomsite.js` | 🎨 Кабінет → 🚀 Продажі → «Конструктор сайту ATOM» (posatom.online): кольори (теми, генератор, кожен колір окремо, |
| `js/owner-course.js` | 🎓 Кабінет власника → «Навчання»: короткі інструкції по розділах «Налаштувань» (без запитів до сервера). |
| `js/owner-crm.js` | 🚀 Кабінет → «Продажі» (лише платформа): заявки з сайту ATOM (posatom.online), статуси, нотатки, нагадування «подзвонити», |
| `js/owner-design.js` | 🎨 Кабінет власника → Друк і дизайн: візитки, таблички на столи, меню, флаєри, банери, сертифікати, наклейки, бейджі — |
| `js/owner-print.js` | 🧾 Кабінет власника → Принтер: конструктор чека (живий перегляд) і встановлювач програми друку одним файлом. |
| `js/owner-site.js` | 🎨 Конструктор сайту-візитки (кабінет власника → Заклади → 🌐 Сайт → «🎨 Конструктор»). Повноекранний редактор: |
| `js/owner-venue.js` | ⚙️ Кабінет власника → налаштування закладу без розробника: 🚀 запуск (чек-лист), заклад, сайт, меню (+ імпорт з Excel/Google), доставка, кас |
| `js/owner.js` | 👑 Кабінет власника мережі (owner.html): вхід → мережа сьогодні → аналітика → заклади → (платформа). |
| `js/photo-ai.js` | 📸 ШІ-фото страв — ОДНЕ вікно для каси (Налаштування → Меню) і кабінету власника (Меню). |
| `js/prnroute.js` | 🖨 Кілька принтерів: що на який друкувати (спільне для каси й кабінету власника). |
| `js/skin.js` | 🖌 Спільний рушій стилю (конструктор) для каси й кабінету власника. Без data-skin — «Стара каса», css/skin.css нічого не чіпає. |
| `js/tabprint.js` | 📱 Принтер, підключений прямо до планшета з касою — без компʼютера. |
