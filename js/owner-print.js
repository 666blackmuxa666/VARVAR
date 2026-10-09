// 🧾 Кабінет власника → Принтер: конструктор чека (живий перегляд) і встановлювач програми друку одним файлом.
// Чек збирає сервер (worker/src/print.js → receipt / kitchenTicket) за налаштуваннями rcpt; тут — точна HTML-копія для перегляду.
window.OWNPRINT = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let C, R, mode = 'rcpt';
  const SAMPLE = [['Капучино', 2, 130], ['Бургер класичний', 1, 290], ['Лимонад', 1, 220]];
  // ---------- перегляд: ті самі рядки, що друкує програма ----------
  function lines(r, kind) {
    const now = new Date().toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
    if (kind === 'kitchen') return [[r.kBig ? 'invb' : 'inv', 'СТІЛ 5'], ['c', r.kTime ? 'ВІД ОФІЦІАНТА  ·  ' + new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : 'ВІД ОФІЦІАНТА'], ...(r.kWaiter ? [['c', 'Замовив: Олег']] : []), ['dbl'], ...SAMPLE.map(([n, q]) => ['k', `${q} × ${n}`]), ['dbl'], ['b', '>> без цибулі'], ['dbl']];
    const tot = SAMPLE.reduce((a, x) => a + x[2], 0);
    return [...(r.logo ? [['logo']] : []), ...(r.sub ? [['s', r.sub]] : []), ...r.head.map(h => ['c', h]), ['inv', kind === 'pre' ? r.pre || 'ПРЕЧЕК' : `${r.title || 'ЧЕК'} № 091026-014`], ...(kind === 'pre' && r.preNote ? [['s', r.preNote]] : []), ['gap'],
      ['lr', 'Стіл', '5'], ...(r.opened ? [['lr', 'Відкрито', now]] : []), ...(r.waiter ? [['lr', 'Обслуговував', 'Олег']] : []), ['lr', kind === 'pre' ? 'Надруковано' : 'Закрито', now], ['dbl'],
      ...SAMPLE.flatMap(([n, q, s]) => [['item', n, String(s)], ...(r.itemSub ? [['sub', `${q} × ${s / q} грн`]] : [])]), ['dbl'], ...(r.count ? [['lr', 'Позицій', '4']] : []),
      ['total', kind === 'pre' ? 'ДО СПЛАТИ' : 'СПЛАЧЕНО', `${tot} грн`], ...(r.tips && kind !== 'pre' ? [['lr', 'Чайові', '60 грн'], ['lr', 'Разом з чайовими', `${tot + 60} грн`]] : []), ...(r.pay && kind !== 'pre' ? [['lr', 'Оплата', 'Картка']] : []),
      ['gap'], ...r.foot.map(f => ['c', f]), ...(r.qr ? [['gap'], ['qr'], ['s', r.qrText]] : []), ...(r.footS ? [['s', r.footS]] : []), ...Array.from({ length: r.feed }, () => ['gap'])];
  }
  function paper(r, kind) {
    const k = r.scale / 100, W = r.w === 58 ? 190 : 280, logo = C.logoUrl + '?t=' + (C.lt || 0);
    const h = l => { const [t, a, b] = l; switch (t) {
      case 'logo': return `<div class="rp-c"><img src="${esc(logo)}" style="width:${Math.min(W, r.logoW)}px" alt="" onerror="this.style.display='none'"></div>`;
      case 's': return `<div class="rp-c rp-s">${esc(a)}</div>`; case 'c': return `<div class="rp-c">${esc(a)}</div>`; case 'b': return `<div class="rp-b">${esc(a)}</div>`;
      case 'inv': return `<div class="rp-inv">${esc(a)}</div>`; case 'invb': return `<div class="rp-inv rp-big">${esc(a)}</div>`; case 'gap': return '<div style="height:12px"></div>';
      case 'dbl': return '<div class="rp-dbl"></div>'; case 'hr': return '<div class="rp-hr"></div>';
      case 'lr': return `<div class="rp-lr"><span>${esc(a)}</span><span>${esc(b)}</span></div>`;
      case 'item': return `<div class="rp-lr rp-i"><span>${esc(a)}</span><span>${esc(b)}</span></div>`; case 'sub': return `<div class="rp-sub">${esc(a)}</div>`;
      case 'k': return `<div class="rp-k">${esc(a)}</div>`; case 'total': return `<div class="rp-tot"><span>${esc(a)}</span><span>${esc(b)}</span></div>`;
      case 'qr': return '<div class="rp-c"><div class="rp-qr"></div></div>'; default: return ''; } };
    return `<div class="rp" style="width:${W}px;font-size:${12.5 * k}px">${lines(r, kind).map(h).join('')}<div class="rp-cut">✂ ─ ─ ─ ─ ─ ─ ─</div></div>`;
  }
  // ---------- редактор ----------
  const tg = (k, l) => `<label class="sb-tg"><input type="checkbox" data-k="${k}" ${R[k] ? 'checked' : ''}><span>${l}</span></label>`;
  const tx = (k, l, n = 60) => `<label class="sb-f">${l}<input data-k="${k}" maxlength="${n}" value="${esc(R[k] || '')}"></label>`;
  const ta = (k, l) => `<label class="sb-f">${l} <small>(кожен рядок окремо, до 5)</small><textarea data-k="${k}" rows="3">${esc((R[k] || []).join('\n'))}</textarea></label>`;
  const rg = (k, l, a, b, u = '') => `<label class="sb-f">${l} <b data-o="${k}">${R[k]}${u}</b><input type="range" data-k="${k}" data-u="${u}" min="${a}" max="${b}" value="${R[k]}"></label>`;
  const card = (h, b) => `<div class="sb-card"><h4>${h}</h4>${b}</div>`;
  function form() {
    return card('📏 Папір', `<div class="sb-chips">${[58, 80].map(w => `<button type="button" data-w="${w}" class="${R.w === w ? 'on' : ''}">${w} мм</button>`).join('')}</div>${rg('scale', 'Розмір тексту', 70, 140, '%')}${rg('feed', 'Відступ знизу перед відрізом', 0, 4)}`)
      + card('🏷 Шапка', `${tg('logo', 'Логотип')}${R.logo ? `${rg('logoW', 'Ширина логотипа', 40, 260, '')}<div class="sb-row"><button type="button" class="btn sm" data-x="logoUp">🖼 Свій логотип для чека</button>${R.logoImg ? '<button type="button" class="btn sm" data-x="logoDel">✕ Як у закладі</button>' : ''}</div><div class="sb-note">Найкраще — чорно-білий PNG на білому або прозорому фоні.</div>` : ''}${tx('sub', 'Підпис під логотипом', 60)}${ta('head', 'Рядки шапки (адреса, телефон, Wi-Fi…)')}`)
      + card('🧾 Заголовки', `${tx('title', 'Фінальний чек', 30)}${tx('pre', 'Пречек', 30)}${tx('preNote', 'Примітка під пречеком', 60)}`)
      + card('👁 Що показувати', `${tg('opened', 'Час відкриття столу')}${tg('waiter', 'Хто обслуговував')}${tg('itemSub', 'Кількість × ціна під стравою')}${tg('count', 'Кількість позицій')}${tg('tips', 'Чайові')}${tg('pay', 'Спосіб оплати')}`)
      + card('💬 Низ чека', `${ta('foot', 'Подяка')}${tg('qr', '🔳 QR-код меню внизу чека')}${R.qr ? tx('qrText', 'Підпис під QR', 60) : ''}${tx('footS', 'Дрібний рядок у самому низу', 120)}`)
      + card('👨‍🍳 Бігунок на кухню', `${tg('kBig', 'Великий номер столу')}${tg('kWaiter', 'Хто замовив')}${tg('kTime', 'Час замовлення')}`);
  }
  function draw() {
    const P = document.getElementById('rcP'), V = document.getElementById('rcV'); if (!P) return;
    const sy = P.scrollTop; P.innerHTML = form(); P.scrollTop = sy; view();
    document.getElementById('rcSave').classList.toggle('dirty', C.dirty);
  }
  function view() { const V = document.getElementById('rcV'); if (V) V.innerHTML = `<div class="sb-chips" style="justify-content:center">${[['rcpt', '🧾 Чек'], ['pre', '🧾 Пречек'], ['kitchen', '👨‍🍳 Кухня']].map(([k, l]) => `<button type="button" data-m="${k}" class="${mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>${paper(R, mode)}`; }
  const touch = (re) => { C.dirty = true; document.getElementById('rcSave')?.classList.add('dirty'); re ? draw() : view(); };
  function open(ctx) {
    C = ctx; R = JSON.parse(JSON.stringify(ctx.rcpt)); C.dirty = false; mode = 'rcpt';
    document.body.insertAdjacentHTML('beforeend', `<div id="sb" class="rc"><div class="sb-top"><button type="button" class="btn sm" data-x="close">✕</button><b>🧾 Конструктор чека</b><span class="sb-sp"></span><button type="button" class="btn sm sb-pvb" data-x="pv">👁 Чек</button><button type="button" class="btn sm" data-x="test" title="Надрукувати пробний пречек">🖨<span class="sb-lbl"> Пробний друк</span></button><button type="button" class="btn sm primary" id="rcSave" data-x="save">💾<span class="sb-lbl"> Зберегти</span></button></div>
      <div class="sb-body"><div class="sb-side"><div class="sb-p" id="rcP" style="grid-row:1/-1"></div></div><div class="sb-view"><div class="rc-v" id="rcV"></div></div></div></div>`);
    document.body.style.overflow = 'hidden'; draw();
  }
  function close(f) { if (!f && C.dirty && !confirm('Закрити без збереження?')) return; document.getElementById('sb')?.remove(); document.body.style.overflow = ''; C = null; }
  const pick = () => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => { const f = i.files[0]; if (!f) return res(null); const im = new Image(); im.onload = () => { const k = Math.min(1, 600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/png')); }; im.src = URL.createObjectURL(f); }; i.click(); });
  document.addEventListener('click', async e => {
    if (!C || !e.target.closest('#sb.rc')) return; const b = e.target.closest('[data-x],[data-w],[data-m]'); if (!b) return; const x = b.dataset.x;
    if (b.dataset.w) { R.w = +b.dataset.w; return touch(true); }
    if (b.dataset.m) { mode = b.dataset.m; return view(); }
    if (x === 'close') return close();
    if (x === 'pv') { const s = document.getElementById('sb'); s.classList.toggle('pv'); b.textContent = s.classList.contains('pv') ? '✏️ Редагувати' : '👁 Чек'; return; }
    if (x === 'save' || x === 'test') {
      try { if (C.dirty || x === 'save') { const r = await C.vapi('rcptSet', { rcpt: R }); R = r.rcpt; C.rcpt = r.rcpt; C.dirty = false; C.onSave?.(r.rcpt); }
        if (x === 'test') { await C.vapi('rcptTest'); C.toast('🖨 Пробний пречек — у черзі друку'); } else C.toast('💾 Чек збережено — наступні чеки вже такі'); } catch (y) { C.toast('⚠️ ' + y.message); }
      return draw();
    }
    if (x === 'logoUp') { const data = await pick(); if (!data) return; try { const r = await C.vapi('rcptLogo', { data }); R.logoImg = r.rcpt.logoImg; R.logo = 1; C.lt = Date.now(); C.toast('🖼 Логотип чека збережено'); draw(); } catch (y) { C.toast('⚠️ ' + y.message); } return; }
    if (x === 'logoDel') { R.logoImg = ''; C.lt = Date.now(); return touch(true); }
  });
  document.addEventListener('input', e => {
    const el = e.target; if (!C || !el.closest('#sb.rc') || !el.dataset.k) return; const k = el.dataset.k;
    if (el.type === 'checkbox') { R[k] = el.checked ? 1 : 0; return touch(['logo', 'qr'].includes(k)); }
    if (el.type === 'range') { R[k] = +el.value; const o = document.querySelector(`#sb [data-o="${k}"]`); if (o) o.textContent = el.value + (el.dataset.u || ''); return touch(); }
    R[k] = el.tagName === 'TEXTAREA' ? el.value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 5) : el.value; touch();
  });

  // ---------- ⬇️ встановлювач одним файлом: config + завантаження програми + автозапуск + пошук принтерів ----------
  function installer(api, key) {
    const http = api.replace(/^https:/, 'http:');
    const cmd = `@echo off
chcp 65001 >nul
title VARVAR print - install
net session >nul 2>&1
if errorlevel 1 goto elevate
set D=%ProgramData%\\VARVAR-print
if not exist "%D%" mkdir "%D%"
type nul >> "%D%\\varvar-print.log"
icacls "%D%\\varvar-print.log" /grant *S-1-5-32-545:M >nul 2>&1
echo  [1/4] Downloading the program...
> "%D%\\varvar-print.config.json" echo {"api":"${http}","key":"${key}","printer":""}
powershell -NoProfile -Command "$ok=$false; foreach ($u in @('${api}/print/agent.ps1','${http}/print/agent.ps1')) { try { $h=New-Object -ComObject WinHttp.WinHttpRequest.5.1; try { [void]$h.GetType().InvokeMember('Option',[Reflection.BindingFlags]::SetProperty,$null,$h,@(9,0x0A80)) } catch {}; $h.Open('GET',$u,$false); $h.Send(); if ($h.Status -eq 200) { [IO.File]::WriteAllBytes('%D%\\varvar-print.ps1',[byte[]]$h.ResponseBody); $ok=$true; break } } catch {} }; if (-not $ok) { exit 1 }"
if errorlevel 1 goto noserver
echo  [2/4] Stopping old version...
powershell -NoProfile -ExecutionPolicy Bypass -File "%D%\\varvar-print.ps1" -Stop
del "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\VARVAR-print.vbs" 2>nul
echo  [3/4] Searching printers (USB, network, Bluetooth) and printing a test receipt...
powershell -NoProfile -ExecutionPolicy Bypass -File "%D%\\varvar-print.ps1" -Test
set S=%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\StartUp\\VARVAR-print.vbs
> "%S%" echo CreateObject("WScript.Shell").Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%D%\\varvar-print.ps1""", 0, False
> "%D%\\uninstall.cmd" echo @echo off
>> "%D%\\uninstall.cmd" echo del "%S%" 2^>nul
>> "%D%\\uninstall.cmd" echo powershell -NoProfile -ExecutionPolicy Bypass -File "%D%\\varvar-print.ps1" -Stop
>> "%D%\\uninstall.cmd" echo echo VARVAR print removed.
>> "%D%\\uninstall.cmd" echo pause
wscript "%S%"
echo  [4/4] Started and added to Windows startup (for all users).
echo.
echo  DONE. Which printer prints receipts and which prints kitchen tickets - owner cabinet: Settings - Printer.
echo.
pause
exit /b
:elevate
echo  Asking for administrator rights - needed to connect USB printers without driver...
powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b
:noserver
echo  ERROR: no internet or the server is not reachable.
pause
`.replace(/\n/g, '\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([cmd], { type: 'application/octet-stream' })); a.download = 'VARVAR-print-setup.cmd'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  return { open, installer };
})();
