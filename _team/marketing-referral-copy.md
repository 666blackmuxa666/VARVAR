# 📣 Тексти реферальної програми: лендинг і кабінет (UA/EN, чернетка, не вбудовано)

Без незатверджених цифр: ліміт місяців, умови для не-клієнтів, терміни — не згадуємо (🔎 додати після рішення власника). Єдине, що стверджуємо: місяць ATOM у подарунок обом, коли приведений заклад уперше заплатить.

## 1. Лендинг (posatom.online)
**Рядок у футері / біля ціни**
- UA: 🎁 Приведіть друга-ресторатора — місяць ATOM у подарунок вам обом.
- EN: 🎁 Refer a fellow owner — you both get a month of ATOM free.

**Блок «Запросіть друга» (заголовок + 2 рядки + кнопка)**
- UA: **Подаруйте місяць — і отримайте місяць.** Поділіться посиланням зі своїм кабінету. Коли ваш друг уперше оплатить ATOM, ви обоє отримаєте по місяцю в подарунок. · Кнопка: **Отримати посилання**
- EN: **Gift a month, get a month.** Share your link from the dashboard. When your friend makes their first payment, you both get a free month. · Button: **Get my link**

**Для того, хто прийшов за посиланням (банер, якщо `?ref=`)**
- UA: 👋 Вас запросили в ATOM. Спробуйте касу в демо — а після першої оплати ви отримаєте місяць у подарунок.
- EN: 👋 You've been invited to ATOM. Try the demo — and after your first payment you get a free month.

**Мінімальні правила (сторінка /ref або «Деталі»)**
- UA: Подарунок нараховується після першої оплати нового закладу. Не діє для власних закладів. Умови можуть змінюватись — актуальні завжди тут.
- EN: The gift applies after the new venue's first payment. It doesn't apply to your own venues. Terms may change; the current ones are always here.

**Після відправлення заявки з ref**
- UA: ✅ Дякуємо! Передзвонимо найближчим часом. Ваш подарунковий місяць уже закріплено за запрошенням.
- EN: ✅ Thanks! We'll call you soon. Your gift month is already linked to the invitation.
(🔎 лише коли нарахування справді працює; до того — стандартне «Дякуємо!»)

## 2. Кабінет власника (картка «🎁 Запросити друга»)
- Заголовок: UA 🎁 Запросити друга · EN 🎁 Invite a friend
- Підзаголовок: UA Приведіть інший заклад: коли він уперше заплатить — місяць ATOM у подарунок вам обом. · EN Bring another venue: when it makes its first payment, you both get a month of ATOM free.
- Рядки: UA «Ваше посилання» / «Заявок за вашим кодом» / «Подаровано місяців» · EN "Your link" / "Leads from your code" / "Months gifted"
- Кнопки: UA 📋 Копіювати · EN 📋 Copy · toast: UA 📋 Скопійовано · EN 📋 Copied
- Порожній стан (заявок 0): UA Поки що ніхто не прийшов за вашим посиланням. Надішліть його колезі — і місяць ваш. · EN Nobody has used your link yet. Send it to a colleague — a free month is waiting.
- Код заблоковано: UA 🚫 Код заблоковано. Напишіть нам, якщо це помилка. · EN 🚫 Your code is blocked. Contact us if this is a mistake.
- Платформа (кнопки): UA 🎁 +1 міс · Заблокувати код · Розблокувати код · EN 🎁 +1 month · Block code · Unblock code
- Модалка «+1 міс»: UA «Причина (обовʼязково)» · «Код рефері (якщо не збережено)» · EN "Reason (required)" · "Referrer code (if not saved)"

## 3. Повідомлення для месенджера (власник пересилає другу)
- UA: Я користуюсь ATOM — каса, кухня, склад і сайт закладу в одному телефоні. Зареєструйся за моїм посиланням: [ПОСИЛАННЯ] — після першої оплати ми обоє отримаємо по місяцю в подарунок.
- EN: I use ATOM — POS, kitchen, stock and website for a venue in one phone. Join with my link: [LINK] — after your first payment we both get a free month.

## 4. Для розробника
Поточні рядки картки в `js/owner-venue.js` (refCard) українською — EN-варіанти потрібні лише коли з'явиться локалізація кабінету. Лендинг: блоки додати в `atom.html` (футер/ціна) і банер при `?ref=` (код вже читається `refCode()`).
