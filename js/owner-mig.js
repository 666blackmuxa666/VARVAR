// 📥 Кабінет власника → заклад → Перехід: майстер переходу з іншої системи (етап 1). Адаптер «будь-який Excel/CSV»:
// файл (.xlsx/.xls/.csv, R-Keeper: .dbf з RK7_dbf і .xml довідників XML-інтерфейсу) або вставка з таблиці → пошук рядка заголовків (звіти 1С мають шапку) → зіставлення колонок (вгадуємо + памʼятаємо для системи)
// → 🔍 перевірка (migRun dry) → ✅ імпорт → журнал з ↩️ відкатом. Сервер — worker/src/mig.js. Підключається з owner-venue.js (розділ «mig»).
window.OWNMIG = (() => {
  let C = null; // { S, esc, money, toast, render, vapi, reload }
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  // підказки заголовків: поле → як його називають у 1С / Poster / R-Keeper / Excel (укр і рос). Порядок полів = KINDS (rowsOf бере ключі звідси)
  const HINT = {
    mods: { grp: /груп|group|схем|scheme/, n: /модиф|modif|варіант|вариант|назв|name/, p: /ціна|цена|price|сума/, min: /мін|мин|min/, max: /макс|max/, dish: /страв|блюд|dish|товар|menu/ }, // 🧩 R3
    menu: { id: /^(код|артикул|id|code|ident)\b/, cat: /розд|катег|груп|categ|parent/, name: /назв|найменув|наименов|страв|блюд|товар|name|позиц|номенклат/, pick: /з собою|с собой|навинос|на винос|takeaway|самовив/, del: /доставк|delivery/, price: /ціна|цена|вартість|price/, /* 💲 pick/del — раніше за price: «Ціна з собою» не має забрати ціну залу */ v: /^(розмір|размер|варіант|вариант|variant|модифікац)/, desc: /опис|склад|desc/, size: /ваг|вихід|выход|об.?є?м|порц|size|грам/ },
    ing: { id: /^(код|артикул|id|code)\b/, n: /назв|найменув|наименов|номенклат|товар|продукт|інгред|ингред|name/, u: /^(од|ед)\.?\b|одиниц|единиц|unit/, cat: /груп|катег|розд/, q: /залиш|остат|кільк|колич|к-ть|qty|сальдо/, wh: /^склад|warehouse|місце збер/, cost: /ціна|цена|собіварт|себестоим|price|cost/, sum: /сума|сумма|вартість|стоимост|sum|total/, bc: /штрих|barcode|ean/ },
    cards: { dish: /страв|блюд|dish|продукц|рецепт|калькуляц|техкарт/, ing: /продукт|інгред|ингред|сировин|сырь|компонент|ingredient|номенклат|товар/, q: /брутто|кільк|колич|норма|qty|вага/, u: /^(од|ед)\.?\b|одиниц|единиц|unit/, loss: /втрат|потер|відход|отход|loss/, out: /вихід|выход|нетто|yield/ },
    sup: { n: /назв|найменув|наименов|контрагент|постач|поставщ|name/, code: /єдрпоу|едрпоу|іпн|инн|рнокпп|edrpou|^код/, iban: /iban|рахун|счет|р\/р/, phone: /тел|phone|моб/, addr: /адрес|address/ },
    cli: { phone: /тел|phone|моб/, name: /^ім|^им|піб|фио|name|клієнт|клиент|гість|гост/, bal: /^(?!.*(депоз|deposit)).*(бонус|бал|bonus|point)/, bd: /народж|рожд|birth|д\.?\s?н\.?$/, note: /нотат|приміт|примеч|коментар|note/, card: /картк|карт[аы]|card/, grp: /груп|рівен|уровен|discount|знижк|скидк/, dep: /депоз|deposit|аванс/ },
    staff: { n: /^ім|^им|піб|фио|прізв|фамил|name|працівн|сотрудн|employee/, role: /посад|должн|роль|role|категор/ },
    book: { id: /^(код|номер|id|code)\b/, date: /дата|date|день/, time: /час|время|time/, name: /^ім|^им|піб|фио|name|гість|гост|клієнт|клиент|замовн/, phone: /тел|phone|моб/, people: /гост.*к|осіб|персон|people|pax|кільк/, kind: /тип|вид|kind|банкет/, dep: /передопл|предопл|аванс|депоз|deposit|prepay/, comment: /комент|примеч|приміт|comment|note/, t: /^стіл|^стол|table/ },
    cert: { code: /код|номер|code|^№/, sum: /номінал|номинал|сума|сумма|amount|nominal/, left: /залиш|остат|balance|left/, phone: /тел|phone/, to: /кому|отримув|получат|^to$/, exp: /діє до|действ|термін|срок|expir/ },
  };
  const FILL = { menu: ['cat'], ing: ['cat', 'wh'], cards: ['dish'] }; // порожня клітинка = як у рядку вище (групи в 1С / рецептури)
  const TOTAL = /^(разом|всього|усього|итого|всего|total)\b/i;
  const ORDER = ['menu', 'ing', 'cards', 'sup', 'cli', 'cert', 'staff', 'book'];
  // 🔴 R-Keeper: файли вивантаження й звідки їх узяти (див. _team/rkeeper.md)
  const RK = `🔴 <b>R-Keeper:</b> вивантажуйте, <b>поки працює ваш сервер RK7</b>. <b>Меню, ціни, персонал</b> — утиліта RK7_dbf (файли .dbf) або довідники XML-інтерфейсу <code>GetRefData</code> (MENUITEMS, CATEGLIST, EMPLOYEES — файли .xml). <b>Техкарти, залишки, постачальники</b> — StoreHouse: калькуляційні карти, звіт залишків на дату переходу, кореспонденти → Excel. <b>Гості</b> — звіт CRM на день переходу → Excel: телефон, бонуси, <b>номер картки, група знижки, залишок депозиту</b> (депозит стане сертифікатом гостя <code>DEP-телефон</code> — гаситься на касі й у боті). <b>Сертифікати</b> — окремим файлом. Не впевнені — напишіть ATOM, вивантажимо разом безкоштовно.`;
  const DIRECT = { poster: 'Poster → Доступ → Інтеграції → API → скопіюйте ключ (вигляд 123456:abc…). Заберемо меню, техкарти, залишки, постачальників і гостей з бонусами.', syrve: 'Syrve Office → Налаштування Cloud API → «API login». Заберемо меню й товари; техкарти й залишки — файлом.' };
  function fromPull(k) { // 📡 рядки з API старої системи → та сама таблиця, що й з файлу (зіставлення 1:1)
    const m = st(), F = Object.keys(kinds()[k].f), rows = m.pulled?.[k] || []; if (!rows.length) return;
    Object.assign(m, { head: F.map(f => kinds()[k].f[f].replace('*', '')), data: rows.map(r => F.map(f => r[f] ?? '')), map: Object.fromEntries(F.map((f, j) => [f, j])), file: '📡 ' + (C.S.mig.sysName || '') });
  }
  const st = () => (C.S.mig ||= { sys: 'xls', kind: '', head: [], data: [], map: {}, res: null, file: '' });

  // ---------- читання ----------
  function parseText(t) { // TSV (копія з Excel/Google) або CSV з «;» / «,» і лапками
    const first = t.split(/\r?\n/).find(l => l.trim()) || '', sep = first.includes('\t') ? '\t' : first.split(';').length >= first.split(',').length ? ';' : ',';
    const out = []; let row = [], cell = '', q = false;
    for (let i = 0; i < t.length; i++) { const ch = t[i];
      if (q) { if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; continue; }
      if (ch === '"' && !cell) q = true; else if (ch === sep) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = ''; } else cell += ch; }
    if (cell || row.length) { row.push(cell); out.push(row); }
    return out.map(r => r.map(x => String(x).trim()));
  }
  let xl = null;
  // .xml R-Keeper (відповідь GetRefData): таблиця = найчастіший елемент з атрибутами, колонки — атрибути (Code, Name, …)
  function parseXML(t) {
    const doc = new DOMParser().parseFromString(t, 'application/xml'); if (doc.querySelector('parsererror')) throw new Error('Файл XML пошкоджений');
    const by = new Map(); for (const e of doc.getElementsByTagName('*')) if (e.attributes.length >= 2) by.set(e.tagName, (by.get(e.tagName) || 0) + 1);
    const tag = [...by].sort((a, b) => b[1] - a[1])[0]?.[0]; if (!tag) throw new Error('У XML не знайдено рядків');
    const els = [...doc.getElementsByTagName(tag)], cols = [...new Set(els.flatMap(e => [...e.attributes].map(a => a.name)))];
    return [cols, ...els.map(e => cols.map(c => e.getAttribute(c) ?? ''))];
  }
  async function parseFile(f) {
    if (/\.xml$/i.test(f.name)) { const t = new TextDecoder('utf-8').decode(await f.arrayBuffer()); if (!/urn:schemas-microsoft-com:office:spreadsheet/.test(t.slice(0, 2000))) return parseXML(t); }
    if (/\.(csv|txt|tsv)$/i.test(f.name)) { const buf = new Uint8Array(await f.arrayBuffer()); let t = new TextDecoder('utf-8').decode(buf); if (t.includes('�')) t = new TextDecoder('windows-1251').decode(buf); return parseText(t.replace(/^﻿/, '')); }
    if (!window.XLSX) { xl ||= new Promise((res, rej) => { const s = document.createElement('script'); s.src = XLSX_URL; s.onload = res; s.onerror = () => { xl = null; rej(new Error('Не вдалося завантажити читач Excel — перевірте інтернет')); }; document.head.append(s); }); await xl; }
    const wb = window.XLSX.read(await f.arrayBuffer(), { type: 'array' }), ws = wb.Sheets[wb.SheetNames[0]];
    return window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }).map(r => r.map(x => String(x ?? '').trim()));
  }
  // рядок заголовків — той, де найбільше колонок схожі на наші поля (у звітах 1С зверху шапка й період)
  function setTable(rows, name) {
    const m = st(), H = HINT[m.kind]; rows = rows.filter(r => r.some(x => x));
    let hi = -1, best = 0; rows.slice(0, 25).forEach((r, i) => { const sc = Object.values(H).filter(re => r.some(x => x && x.length < 60 && re.test(x.toLowerCase()))).length; if (sc > best) { best = sc; hi = i; } });
    const w = Math.max(0, ...rows.map(r => r.length));
    m.head = hi >= 0 ? Array.from({ length: w }, (_, j) => rows[hi][j] || `Стовпець ${j + 1}`) : Array.from({ length: w }, (_, j) => `Стовпець ${String.fromCharCode(65 + (j % 26))}`);
    m.data = rows.slice(hi + 1); m.file = name || ''; m.res = null; m.map = guess(m.head);
  }
  function guess(head) {
    const m = st(), H = HINT[m.kind], saved = C.S.cfgV?.d?.map?.[m.sys + '|' + m.kind] || {}, used = new Set(), map = {};
    for (const f of Object.keys(H)) { const j = head.findIndex((h, k) => !used.has(k) && saved[f] && h === saved[f]); if (j >= 0) { map[f] = j; used.add(j); } }
    for (const [f, re] of Object.entries(H)) { if (f in map) continue; const j = head.findIndex((h, k) => !used.has(k) && re.test(String(h).toLowerCase())); if (j >= 0) { map[f] = j; used.add(j); } }
    return map;
  }
  // таблиця → рядки нашими полями (порожні, «Разом» — геть; групи/страви тягнемо вниз)
  function rowsOf() {
    const m = st(), F = Object.keys(HINT[m.kind]), last = {}, main = F.find(f => kinds()[m.kind].f[f].endsWith('*'));
    return m.data.map(r => { const o = Object.fromEntries(F.map(f => [f, m.map[f] >= 0 ? String(r[m.map[f]] ?? '').trim() : '']));
      for (const f of FILL[m.kind] || []) { if (o[f]) last[f] = o[f]; else if (last[f]) o[f] = last[f]; } return o; })
      .filter(o => F.some(f => o[f] && !(FILL[m.kind] || []).includes(f)) && !TOTAL.test(o[main] || ''));
  }
  const kinds = () => C.S.cfgV?.d?.kinds || {};

  // ---------- вигляд ----------
  const esc = s => C.esc(s), n2 = x => (+x || 0).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const TOT = { cats: 'нових розділів', q: 'продуктів із залишком', val: 'вартість складу, ₴', dishes: 'техкарт', newIng: 'нових продуктів з техкарт', bal: 'бонусів разом, ₴', left: 'залишок сертифікатів, ₴', nopin: 'працівникам задати PIN', dep: 'передоплат разом, ₴' };
  const totText = t => Object.entries(t || {}).filter(([k]) => TOT[k]).map(([k, v]) => `${TOT[k]}: <b>${['val', 'bal', 'left', 'dep'].includes(k) ? n2(v) : v}</b>`).join(' · ');
  function html(v) {
    const d = v.d, m = st(), K = d.kinds || {}, SYS = d.sys || {};
    if (!d.on) return `<div class="card"><h3>📥 Перехід з іншої системи</h3><div class="muted" style="margin-bottom:10px">Модуль вимкнено. Увімкніть, щоб перенести меню, техкарти, залишки, постачальників, гостей з бонусами, сертифікати, персонал і майбутні броні з 1С, Poster, Excel чи іншої системи.</div><button class="btn primary" data-a="migOn">🧩 Увімкнути модуль «Перехід»</button></div>`;
    const kindBtns = ORDER.filter(k => K[k]).map(k => `<button class="btn sm ${m.kind === k ? 'primary' : ''}" data-a="migKind" data-k="${k}">${K[k].t}${m.pulled?.[k]?.length ? ' · ' + m.pulled[k].length : ''}</button>`).join(' ');
    let body = `<div class="card"><h3>📥 Перехід з іншої системи</h3>
      <div class="muted" style="font-size:13px;margin-bottom:10px">Порядок: меню → продукти й залишки → техкарти → постачальники → гості → сертифікати. Повторний імпорт оновлює, а не дублює. Перед кожним імпортом робиться копія даних.</div>
      <label>Звідки переходимо<select id="migSys">${Object.entries(SYS).map(([k, l]) => `<option value="${k}" ${m.sys === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      ${m.sys === '1c' ? `<div class="alert" style="font-size:13px;margin:8px 0">⚡ <b>Автоматично:</b> на компʼютері з 1С запустіть програму вивантаження — вона сама знайде меню з цінами, залишки, техкарти, контрагентів і дисконтні картки та збереже файли на робочий стіл (папка ATOM-1C-…). База лише читається; пароль 1С вводите ви, він нікуди не передається.<div style="margin-top:8px"><button class="btn sm primary" data-a="mig1c">⬇️ Програма вивантаження з 1С (Windows)</button></div>
        <div style="margin-top:8px">🟡 <b>Вручну:</b> довідник «Номенклатура» → Зберегти як Excel; залишки — «Оборотно-сальдова відомість» по рах. 201 / 281 на дату переходу (з кількістю) → Excel; рецептури — звіт «Калькуляційні картки» → Excel. Шапку звіту прибирати не треба.</div></div>` : ''}
      ${m.sys === 'rkeeper' ? `<div class="alert" style="font-size:13px;margin:8px 0">${RK}<div style="margin-top:8px">⚡ <b>Автоматично (бета):</b> на компʼютері в мережі з сервером RK7 запустіть програму — вона забере меню з цінами й персонал через XML-інтерфейс (лише читання) і збереже menu.csv, staff.csv на робочий стіл. Потрібні адреса XML-інтерфейсу й логін — їх знає ваш інтегратор.</div><div style="margin-top:8px"><button class="btn sm primary" data-a="migRk">⬇️ Програма вивантаження з R-Keeper (Windows)</button></div></div>` : ''}
      ${DIRECT[m.sys] ? `<div class="alert" style="font-size:13px;margin:8px 0">📡 <b>Напряму з ${esc(SYS[m.sys])}</b> — без файлів: ${DIRECT[m.sys]} Ключ використовується один раз і ніде не зберігається.
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><input id="migTok" type="password" autocomplete="off" placeholder="Ключ API" style="flex:1;min-width:180px"><button class="btn sm primary" data-a="migPull">📡 Забрати дані</button></div>
        ${m.pulled ? `<div style="margin-top:8px">✅ Отримано: ${ORDER.filter(k => m.pulled[k]?.length).map(k => `${esc(K[k].t)} <b>${m.pulled[k].length}</b>`).join(' · ') || 'нічого'}. Оберіть розділ нижче (по порядку) → 🔍 Перевірити → ✅ Імпортувати.${m.pullNote ? `<br>ℹ️ ${esc(m.pullNote)}` : ''}</div>` : ''}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${kindBtns}</div></div>`;
    if (m.kind && K[m.kind]) body += stepHTML(K[m.kind]);
    body += logHTML(d, K, SYS);
    return body;
  }
  function stepHTML(k) {
    const m = st(), F = Object.entries(k.f), rows = m.head.length ? rowsOf() : [];
    let h = `<div class="card"><h3>${esc(k.t)}</h3>
      <div class="muted" style="font-size:13px">Колонки: ${F.map(([, l]) => esc(l)).join(' · ')} (* — обовʼязково). Назви колонок можуть бути будь-які — зіставимо нижче.</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0"><label class="btn sm" style="cursor:pointer">📄 Обрати файл<input id="migFile" type="file" accept=".xlsx,.xls,.csv,.txt,.tsv,.dbf,.xml" hidden></label><span class="muted" style="font-size:13px;overflow-wrap:anywhere">${m.file ? '📎 ' + esc(m.file) : `Excel (.xlsx, .xls) або CSV${m.sys === 'rkeeper' ? ', R-Keeper .dbf / .xml' : ''}`}</span></div>
      <textarea id="migPaste" rows="3" placeholder="…або скопіюйте рядки з Excel / Google Sheets разом із заголовком і вставте сюди" style="width:100%;font:inherit;color:var(--text);background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:10px"></textarea>`;
    if (m.head.length) {
      h += `<div style="margin-top:12px"><b>🔗 Зіставлення колонок</b> <span class="muted" style="font-size:13px">· рядків: ${rows.length}</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px 12px;margin-top:6px">${F.map(([f, l]) => `<label style="min-width:0">${esc(l)}<select data-mf="${f}"><option value="-1">— немає —</option>${m.head.map((x, j) => `<option value="${j}" ${m.map[f] === j ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>`).join('')}</div>
        <div style="overflow-x:auto;margin-top:10px"><table style="border-collapse:collapse;font-size:12px;min-width:100%"><tr>${F.map(([, l]) => `<th style="text-align:left;padding:4px 6px;border-bottom:1px solid var(--line);white-space:nowrap">${esc(l.replace('*', ''))}</th>`).join('')}</tr>
        ${rows.slice(0, 6).map(r => `<tr>${F.map(([f]) => `<td style="padding:4px 6px;border-bottom:1px solid var(--line);max-width:220px;overflow-wrap:anywhere">${esc(r[f])}</td>`).join('')}</tr>`).join('')}</table></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"><button class="btn" data-a="migCheck">🔍 Перевірити</button><button class="btn primary" data-a="migGo" ${m.res?.dry ? '' : 'disabled'}>✅ Імпортувати ${rows.length}</button><button class="btn ghost" data-a="migClear">✖️ Інший файл</button></div>`;
    }
    if (m.res) h += resHTML(m.res);
    return h + '</div>';
  }
  function resHTML(r) {
    const bad = r.errs.filter(e => !e.w), warn = r.errs.filter(e => e.w), ln = i => `рядок ${i + 1}`;
    return `<div class="alert ${bad.length ? 'red' : ''}" style="margin-top:12px;font-size:13px">${r.dry ? '🔍 <b>Перевірка</b> (ще нічого не змінено)' : '✅ <b>Імпортовано</b>'}: нових <b>${r.add}</b>, оновиться <b>${r.upd}</b>${r.skip ? `, пропущено <b>${r.skip}</b>` : ''}${totText(r.tot) ? '<br>' + totText(r.tot) : ''}
      ${r.dups?.length ? `<br>🔁 Повтори у файлі (береться останній): ${r.dups.slice(0, 10).map(x => `${ln(x.i)} = ${ln(x.j)}`).join(', ')}${r.dups.length > 10 ? '…' : ''}` : ''}</div>
      ${bad.length ? `<div style="font-size:13px;margin-top:6px">${bad.slice(0, 30).map(e => `❌ ${ln(e.i)}: ${esc(e.m)}`).join('<br>')}${bad.length > 30 ? `<br>…ще ${bad.length - 30}` : ''}</div>` : ''}
      ${warn.length ? `<div class="muted" style="font-size:13px;margin-top:6px">${warn.slice(0, 30).map(e => `⚠️ ${ln(e.i)}: ${esc(e.m)}`).join('<br>')}${warn.length > 30 ? `<br>…ще ${warn.length - 30}` : ''}</div>` : ''}
      ${!r.dry && r.kind === 'staff' && r.add ? '<div class="muted" style="font-size:13px;margin-top:6px">🔑 PIN з іншої системи не переноситься. Задайте кожному в касі: Налаштування → Персонал → 🔑 (до того працівник не увійде).</div>' : ''}
      ${!r.dry && r.kind === 'book' && r.tot?.dep ? '<div class="muted" style="font-size:13px;margin-top:6px">💰 Передоплати видно в броні (каса й бот). Їх отримала стара система — при розрахунку адмін зараховує суму вручну.</div>' : ''}
      ${!r.dry && r.kind === 'cards' ? '<div class="muted" style="font-size:13px;margin-top:6px">📋 Техкарти збережено як чернетки — шеф перевіряє грамовки й підтверджує в касі: Склад → Техкарти → фільтр «чернетки».</div>' : ''}`;
  }
  function logHTML(d, K, SYS) {
    const l = d.list || [], lastUndo = l.find(e => e.undo && !e.undone);
    if (!l.length) return '';
    return `<div class="card"><h3>🕓 Журнал переходу</h3>${l.slice(0, 15).map(e => `<div class="kv"><span style="min-width:0">${e.undone ? '↩️' : e.nerr ? '⚠️' : '✅'} <b>${esc(K[e.kind]?.t || e.kind)}</b> · ${esc(SYS[e.sys] || e.sys)}<br><small class="muted">${new Date(e.ts).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · нових ${e.add}, оновлено ${e.upd}${e.skip ? `, пропущено ${e.skip}` : ''} · ${esc(e.who || '')}${e.undone ? ' · відмінено' : !e.undo ? ' · ↩️ відкат недоступний (завеликий) — лише повна копія через ATOM' : ''}${totText(e.tot) ? '<br>' + totText(e.tot) : ''}</small></span>${e === lastUndo ? `<button class="btn sm" data-a="migUndo" data-id="${esc(e.id)}">↩️ Відмінити</button>` : ''}</div>`).join('')}</div>`;
  }

  // ---------- дії ----------
  async function click(a, el) {
    const m = st();
    if (a === 'migOn') { try { await C.vapi('modSet', { k: 'mig', v: 1 }); C.toast('🧩 Модуль «Перехід» увімкнено'); } catch (e) { C.toast('⚠️ ' + e.message); } return C.reload(); }
    if (a === 'migKind') { Object.assign(m, { kind: el.dataset.k, head: [], data: [], map: {}, res: null, file: '' }); fromPull(el.dataset.k); return C.render(); }
    if (a === 'migPull') {
      const t = document.getElementById('migTok'), tok = t?.value.trim(); if (!tok) return C.toast('Вставте ключ API');
      el.disabled = true; el.textContent = '⏳ Забираю…';
      try { const r = await C.vapi('migPull', { sys: m.sys, token: tok }); Object.assign(m, { pulled: r.data, pullNote: r.note || '', sysName: C.S.cfgV?.d?.sys?.[m.sys] || m.sys, kind: '', head: [], data: [], map: {}, res: null }); C.toast('📡 Дані отримано — перевіряйте по розділах'); }
      catch (e) { C.toast('⚠️ ' + e.message); }
      if (t) t.value = ''; el.disabled = false; return C.render();
    }
    if (a === 'mig1c' || a === 'migRk') { // .cmd завантажує скрипт з нашого сайту й запускає (без прав адміністратора); самі скрипти — 1c/atom-1c-export.ps1, rk/atom-rk7-export.ps1
      const [sp, nm] = a === 'migRk' ? ['rk/atom-rk7-export.ps1', 'RK7'] : ['1c/atom-1c-export.ps1', '1C'];
      const u = new URL(sp, location.href).href.replace(/'/g, ''), /* поруч з owner.html: /owner/1c/… */ f = `%TEMP%\\${sp.split('/')[1]}`;
      const cmd = ['@echo off', 'chcp 65001 >nul', `title ATOM - ${nm} export`, 'echo Downloading...', `powershell -NoProfile -Command "try { $h=New-Object -ComObject WinHttp.WinHttpRequest.5.1; try { [void]$h.GetType().InvokeMember('Option',[Reflection.BindingFlags]::SetProperty,$null,$h,@(9,0x0A80)) } catch {}; $h.Open('GET','${u}',$false); $h.Send(); if ($h.Status -ne 200) { exit 1 }; [IO.File]::WriteAllBytes('${f}',[byte[]]$h.ResponseBody) } catch { exit 1 }"`, 'if errorlevel 1 (echo Download failed. Check internet. & pause & exit /b 1)', `powershell -NoProfile -ExecutionPolicy Bypass -File "${f}"`, ''].join('\r\n');
      const x = document.createElement('a'); x.href = URL.createObjectURL(new Blob([cmd], { type: 'application/octet-stream' })); x.download = `ATOM-${nm}-export.cmd`; x.click(); setTimeout(() => URL.revokeObjectURL(x.href), 5000);
      return C.toast(`⬇️ Запустіть ATOM-${nm}-export.cmd на компʼютері з ${a === 'migRk' ? 'доступом до сервера R-Keeper' : '1С'}`);
    }
    if (a === 'migClear') { Object.assign(m, { head: [], data: [], map: {}, res: null, file: '' }); return C.render(); }
    if (a === 'migCheck' || a === 'migGo') {
      const rows = rowsOf(); if (!rows.length) return C.toast('Немає рядків — перевірте зіставлення колонок');

      if (a === 'migGo' && !confirm(`Імпортувати ${rows.length} рядків? Перед цим буде збережено копію даних, а імпорт можна відмінити, поки ці записи ніхто не змінював.`)) return;
      el.disabled = true;
      try {
        const map = Object.fromEntries(Object.entries(m.map).filter(([, j]) => j >= 0).map(([f, j]) => [f, m.head[j]]));
        let res = null; for (let o = 0; o < rows.length; o += 2000) { // понад 2000 рядків — частинами, підсумок разом
          const r = await C.vapi('migRun', { sys: m.sys, kind: m.kind, rows: rows.slice(o, o + 2000), map, dry: a === 'migCheck' ? 1 : 0 }), sh = x => ({ ...x, i: x.i + o, ...(x.j != null ? { j: x.j + o } : {}) });
          res = !res ? { ...r, errs: r.errs.map(sh), dups: (r.dups || []).map(sh) } : { ...res, add: res.add + r.add, upd: res.upd + r.upd, skip: (res.skip || 0) + (r.skip || 0), errs: [...res.errs, ...r.errs.map(sh)], dups: [...res.dups, ...(r.dups || []).map(sh)], tot: Object.fromEntries(Object.entries(r.tot || {}).map(([k, v]) => [k, (+res.tot?.[k] || 0) + (+v || 0)])) };
        } m.res = res;
        if (a === 'migGo') { C.toast(`📥 Готово: нових ${m.res.add}, оновлено ${m.res.upd}`); const r = m.res; Object.assign(m, { head: [], data: [], map: {}, file: '' }); await C.reload(); m.res = r; }
      } catch (e) { C.toast('⚠️ ' + e.message); }
      el.disabled = false; return C.render();
    }
    if (a === 'migUndo') {
      if (!confirm('Відмінити цей імпорт? Записи повернуться до стану перед ним.')) return;
      try { const r = await C.vapi('migUndo', { id: el.dataset.id }); C.toast(`↩️ Відмінено (${r.n} записів)`); } catch (e) { C.toast('⚠️ ' + e.message); }
      return C.reload();
    }
  }
  function bind() {
    document.addEventListener('click', e => { const el = e.target.closest('[data-a^="mig"]'); if (el && C && C.S.cfgV?.sec === 'mig') click(el.dataset.a, el); });
    document.addEventListener('change', async e => {
      if (!C || C.S.cfgV?.sec !== 'mig') return; const m = st(), t = e.target;
      if (t.id === 'migSys') { m.sys = t.value; m.pulled = null; if (m.head.length) m.map = guess(m.head); m.res = null; return C.render(); }
      if (t.id === 'migPaste' && t.value.trim() && !m.head.length) { setTable(parseText(t.value), '📋 вставлено з таблиці'); return C.render(); }
      if (t.dataset?.mf) { m.map[t.dataset.mf] = +t.value; m.res = null; return C.render(); }
      if (t.id === 'migFile' && t.files[0]) { try { setTable(await parseFile(t.files[0]), t.files[0].name); } catch (x) { C.toast('⚠️ ' + x.message); } return C.render(); }
    });
    document.addEventListener('paste', e => { if (e.target.id !== 'migPaste' || !C) return; setTimeout(() => { const v = e.target.value; if (v.trim()) { setTable(parseText(v), '📋 вставлено з таблиці'); C.render(); } }, 0); });
  }
  let bound = false;
  return { init(ctx) { C = ctx; if (!bound) { bound = true; bind(); } }, html: v => html(v), _parseText: parseText, _parseXML: parseXML };
})();
