// 📱 Принтер, підключений прямо до планшета з касою — без компʼютера.
// Android (Chrome): Bluetooth і USB — каса сама показує все, що поруч / підключено. iPad (Safari): лише Wi-Fi-принтери Epson з ePOS.
// Завдання ті самі, що для програми друку (рядки зі стилями) → малюємо на canvas → растр ESC/POS (або ePOS для Epson).
(() => {
  const KEY = 'tabp', ld = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } }, sv = v => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch {} };
  const IOS = /iP(ad|hone|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const CAN = { bt: !!navigator.bluetooth, usb: !!navigator.usb, epos: true };
  let H = {}, link = null, busy = false, again = false, lock = null;

  // ---------- малювання чека (як у програмі друку: одиниці 1/100 дюйма, шрифти в пунктах) ----------
  const imgs = {};
  const getImg = async name => { if (!(name in imgs)) { try { const r = await fetch(`${H.base}/print/${name}.png`); imgs[name] = r.ok ? await createImageBitmap(await r.blob()) : null; } catch { imgs[name] = null; } } return imgs[name]; };
  function layout(c, lines, draw) {
    let mm = 80, k = 1, lw = 120, y = 0;
    const W = () => (mm === 58 ? 190 : 280), F = (pt, b) => `${b ? '700 ' : ''}${(pt * k * 100 / 72).toFixed(1)}px Arial, Helvetica, sans-serif`, LH = pt => pt * k * 100 / 72 * 1.18;
    const wrap = (t, f, w) => { c.font = f; const out = []; for (const para of String(t ?? '').split('\n')) { let cur = ''; for (const wd of para.split(' ')) { const nx = cur ? cur + ' ' + wd : wd; if (c.measureText(nx).width <= w || !cur) cur = nx; else { out.push(cur); cur = wd; } } out.push(cur); } return out; };
    const text = (t, pt, b, al = 'l', w = W(), x0 = 0, col = '#000') => { const f = F(pt, b), ls = wrap(t, f, w); if (draw) { c.font = f; c.fillStyle = col; c.textBaseline = 'top'; for (const [i, s] of ls.entries()) { const tw = c.measureText(s).width; c.fillText(s, al === 'c' ? x0 + (w - tw) / 2 : al === 'r' ? x0 + w - tw : x0, y + i * LH(pt)); } } return ls.length * LH(pt); };
    const bar = (t, pt, pad) => { const hh = LH(pt) + pad; if (draw) { c.fillStyle = '#000'; c.fillRect(0, y, W(), hh); const yy = y; y += pad / 2; text(t, pt, 1, 'c', W(), 0, '#fff'); y = yy; } y += hh + 4; };
    const line = dy => { if (draw) { c.fillStyle = '#000'; c.fillRect(0, y + dy, W(), 1); } };
    for (const l of lines) {
      const [s, a, b] = l;
      if (s === 'cfg') { mm = +a === 58 ? 58 : 80; k = (+b || 100) / 100; lw = Math.min(W(), +l[3] || 120); continue; }
      if (s === 'logo' || s === 'img') { const im = s === 'logo' ? imgs.__logo : imgs[a]; if (!im) continue; const iw = s === 'logo' ? lw : Math.min(W(), +b || 130), ih = im.height * iw / im.width; if (draw) c.drawImage(im, (W() - iw) / 2, y, iw, ih); y += ih + (s === 'logo' ? 8 : 6); continue; }
      if (s === 'gap') { y += 14; continue; }
      if (s === 'hr') { if (draw) { c.fillStyle = '#000'; for (let x = 0; x < W(); x += 6) c.fillRect(x, y + 4, 3, 1); } y += 8; continue; }
      if (s === 'dbl') { line(3); line(6); y += 10; continue; }
      if (s === 'inv') { bar(a, 11, 6); continue; }
      if (s === 'invb') { bar(a, 16, 8); continue; }
      if (s === 'total') { const hh = LH(14) + 10; if (draw) { c.fillStyle = '#000'; c.fillRect(0, y, W(), hh); const yy = y; y += 5; text(a, 14, 1, 'l', W() - 12, 6, '#fff'); text(b, 14, 1, 'r', W() - 12, 6, '#fff'); y = yy; } y += hh + 4; continue; }
      if (s === 'item') { const h1 = text(a, 10, 1, 'l', W() - 70); text(b, 10, 1, 'r'); y += Math.max(h1, LH(10)) + 1; continue; }
      if (s === 'lr' || s === 'lr2') { const pt = s === 'lr2' ? 11 : 9, bd = s === 'lr2'; const h1 = text(a, pt, bd, 'l', W() * .6); text(b, pt, bd, 'r'); y += Math.max(h1, LH(pt)) + 1; continue; }
      if (s === 'sub') { y += text(a, 7.5, 0, 'l', W() - 8, 8) + 3; continue; }
      if (s === 's') { y += text(a, 7.5, 0, 'c') + 1; continue; }
      if (s === 'big') { y += text(a, 16, 1, 'c') + 2; continue; }
      if (s === 'c') { y += text(a, 9, 0, 'c') + 1; continue; }
      if (s === 'k') { y += text(a, 12, 1) + 3; continue; }
      y += text(a, 9, s === 'b') + 1;
    }
    return { h: y + 10, W: W(), dots: mm === 58 ? 384 : 576 };
  }
  // → 1 біт на точку, рядок за рядком (1 = чорне) — однаково для ESC/POS і Epson ePOS
  async function raster(lines) {
    const need = [...new Set(lines.filter(l => l[0] === 'img').map(l => l[1]))]; await Promise.all(need.map(getImg));
    if (lines.some(l => l[0] === 'logo') && !('__logo' in imgs)) { try { const r = await fetch(`${H.base}/print/logo.png`); imgs.__logo = r.ok ? await createImageBitmap(await r.blob()) : null; } catch { imgs.__logo = null; } }
    const m = layout(document.createElement('canvas').getContext('2d'), lines, false), sc = m.dots / m.W;
    const cv = document.createElement('canvas'); cv.width = m.dots; cv.height = Math.ceil(m.h * sc); const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); c.scale(sc, sc); layout(c, lines, true);
    const px = c.getImageData(0, 0, cv.width, cv.height).data, wb = cv.width / 8, out = new Uint8Array(wb * cv.height);
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) { const i = (y * cv.width + x) * 4; if (px[i] * .3 + px[i + 1] * .59 + px[i + 2] * .11 < 150) out[y * wb + (x >> 3)] |= 0x80 >> (x & 7); }
    return { wb, h: cv.height, bits: out };
  }
  function escpos(r) {
    const parts = [Uint8Array.of(0x1B, 0x40)];
    for (let y0 = 0; y0 < r.h; y0 += 200) { const h = Math.min(200, r.h - y0); parts.push(Uint8Array.of(0x1D, 0x76, 0x30, 0, r.wb & 255, r.wb >> 8, h & 255, h >> 8), r.bits.subarray(y0 * r.wb, (y0 + h) * r.wb)); }
    parts.push(Uint8Array.of(0x1B, 0x64, 4, 0x1D, 0x56, 66, 0));
    const all = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; } return all;
  }

  // ---------- підключення ----------
  const BT_SV = ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '49535343-fe7d-4ae5-8fa9-9fafd205e455', '0000ff00-0000-1000-8000-00805f9b34fb', '0000fee7-0000-1000-8000-00805f9b34fb', '0000ae30-0000-1000-8000-00805f9b34fb', '0000ffe0-0000-1000-8000-00805f9b34fb'];
  async function btOpen(dev) {
    const g = dev.gatt.connected ? dev.gatt : await dev.gatt.connect();
    for (const s of await g.getPrimaryServices()) for (const ch of await s.getCharacteristics().catch(() => [])) if (ch.properties.writeWithoutResponse || ch.properties.write) {
      dev.addEventListener('gattserverdisconnected', () => { link = null; }, { once: true });
      return { t: 'bt', dev, send: async b => { for (let i = 0; i < b.length; i += 180) { const p = b.subarray(i, i + 180); ch.properties.writeWithoutResponse ? await ch.writeValueWithoutResponse(p) : await ch.writeValue(p); if (i % 3600 === 0) await new Promise(r => setTimeout(r, 15)); } } };
    }
    throw new Error('Принтер не приймає дані — це точно чековий принтер?');
  }
  async function usbOpen(d) {
    if (!d.opened) await d.open(); if (!d.configuration) await d.selectConfiguration(1);
    for (const itf of d.configuration.interfaces) for (const alt of itf.alternates) { const ep = alt.endpoints.find(e => e.direction === 'out' && e.type === 'bulk'); if (ep) { if (!itf.claimed) await d.claimInterface(itf.interfaceNumber); return { t: 'usb', dev: d, send: async b => { for (let i = 0; i < b.length; i += 16384) await d.transferOut(ep.endpointNumber, b.subarray(i, i + 16384)); } }; } }
    throw new Error('Пристрій не схожий на принтер');
  }
  const eposUrl = ip => `${location.protocol === 'http:' ? 'http' : 'https'}://${ip}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=20000`;
  const eposOpen = ip => ({ t: 'epos', send: async (_, r) => {
    let b64 = ''; for (let i = 0; i < r.bits.length; i += 8192) b64 += String.fromCharCode.apply(null, r.bits.subarray(i, i + 8192)); b64 = btoa(b64);
    const xml = `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print"><image width="${r.wb * 8}" height="${r.h}" color="color_1" mode="mono">${b64}</image><feed line="3"/><cut type="feed"/></epos-print></s:Body></s:Envelope>`;
    const res = await fetch(eposUrl(ip), { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', 'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT', SOAPAction: '""' }, body: xml });
    const t = await res.text(); if (!/success="true"/.test(t)) throw new Error('Epson: ' + ((t.match(/code="([^"]+)"/) || [])[1] || 'помилка друку'));
  } });
  // відновити звʼязок без натискань (USB і Epson — завжди; Bluetooth — якщо браузер памʼятає дозвіл)
  async function reopen(c) {
    if (link) return link;
    if (c.type === 'epos') return (link = eposOpen(c.ip));
    if (c.type === 'usb' && CAN.usb) { const d = (await navigator.usb.getDevices()).find(x => x.vendorId === c.vid && x.productId === c.pid); if (d) return (link = await usbOpen(d)); }
    if (c.type === 'bt' && navigator.bluetooth?.getDevices) { const d = (await navigator.bluetooth.getDevices()).find(x => x.id === c.bid); if (d) return (link = await btOpen(d)); }
    return null;
  }
  // кнопка «підключити» — Bluetooth після перезапуску браузера потребує одного дотику
  function nudge(on) {
    let b = document.getElementById('tabpBtn');
    if (!on) return b?.remove();
    if (b) return; b = document.createElement('button'); b.id = 'tabpBtn'; b.className = 'btn sm primary'; b.textContent = '🖨 Підключити принтер';
    b.style.cssText = 'position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:80;box-shadow:0 4px 16px #0006';
    b.onclick = async () => { try { const c = ld(); const d = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BT_SV }); link = await btOpen(d); sv({ ...c, bid: d.id }); nudge(false); H.toast?.('🖨 Принтер підключено'); check(); } catch (e) { if (e.name !== 'NotFoundError') H.toast?.('⚠️ ' + e.message); } };
    document.body.append(b);
  }
  async function out(lines, c = ld()) {
    const l = await reopen(c); if (!l) { nudge(true); throw new Error('Принтер планшета не підключено'); }
    const r = await raster(lines);
    try { await l.send(l.t === 'epos' ? null : escpos(r), r); } catch (e) { link = null; throw e; }
  }

  // ---------- черга: каса отримує сигнал «tpq змінено» через уже наявний WebSocket — без опитування ----------
  async function check() {
    const c = ld(); if (!c || !H.api) return; if (busy) { again = true; return; } busy = true;
    try { const { jobs } = await H.api('tabJobs', { dev: c.id }); for (const j of jobs || []) { await out(j.lines, c); await H.api('tabAck', { ids: [j.id], dev: c.id }); } }
    catch (e) { if (!/не підключено/.test(e.message)) H.toast?.('🖨 ' + e.message); }
    finally { busy = false; if (again) { again = false; check(); } }
  }
  const wake = async () => { if (!ld() || document.visibilityState !== 'visible') return; try { lock = await navigator.wakeLock?.request('screen'); } catch {} }; // екран не гасне — інакше друк зупиниться
  document.addEventListener('visibilitychange', () => { wake(); if (document.visibilityState === 'visible') check(); });

  // ---------- налаштування (каса → 🖨 Принтер, лише адмін) ----------
  const E = s => String(s ?? '').replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
  const TN = { bt: '🔵 Bluetooth', usb: '🔌 USB', epos: '📶 Epson Wi-Fi' };
  const IOS_HINT = `<div class="muted set-note" style="margin-top:8px;line-height:1.5">🍏 <b>iPad</b> не дає браузеру доступ до Bluetooth і USB — працюють лише <b>Wi-Fi-принтери Epson з ePOS</b>:
      Epson TM-m30, TM-m30II, TM-m30III, TM-m50, TM-T88VI, TM-T88VII (або будь-який Epson TM з позначкою «ePOS-Print»).<br>
      Як підключити: 1) принтер і iPad в одній Wi-Fi; 2) затисніть кнопку Feed при ввімкненні — принтер надрукує свою IP-адресу;
      3) у Safari відкрийте <b>https://IP-адреса</b> і погодьтесь «Перейти на сайт» (один раз); 4) натисніть «📶 Epson Wi-Fi» і введіть адресу.<br>
      Дешеві Xprinter / Rongta / Bluetooth-принтери з iPad не працюють — для них потрібен Android-планшет або компʼютер з програмою друку.</div>`;
  window.TABP = {
    init(h) { H = h; if (ld()) { wake(); check(); } },
    check,
    has: () => !!ld(), print: lines => out(lines), // 📴 друк прямо з каси (пречек без зв'язку)
    html() {
      const c = ld();
      if (c) return `<div class="kv"><span>${TN[c.type]} · <b>${E(c.name)}</b><br><small class="muted">${link ? '✅ підключено' : c.type === 'bt' ? 'підключиться при першому друці' : 'готовий'} · друкує все, що призначено на «📱 ${E(c.name)}»</small></span></div>
        <div class="btnrow" style="margin-top:8px"><button class="btn sm" data-tp="test">🧪 Тест</button><button class="btn sm red" data-tp="off">🔌 Відʼєднати</button></div>
        <div class="muted set-note">Каса має бути відкрита на цьому планшеті — екран не гасне сам. Призначте принтер у списку вище (🍳 🍹 💨 🧾).</div>`;
      return `<div class="muted set-note">Без компʼютера: каса сама знайде принтер поруч або в USB.</div><div class="btnrow" style="margin-top:8px">${CAN.bt ? '<button class="btn sm primary" data-tp="bt">🔵 Bluetooth</button>' : ''}${CAN.usb ? '<button class="btn sm primary" data-tp="usb">🔌 USB</button>' : ''}<button class="btn sm" data-tp="epos">📶 Epson Wi-Fi</button></div>
        ${IOS || !CAN.bt ? IOS_HINT : '<div class="muted set-note" style="margin-top:8px">🔵 Bluetooth: увімкніть принтер — він зʼявиться у списку. 🔌 USB: кабель через OTG-перехідник.</div>'}`;
    },
    async click(a) {
      try {
        if (a === 'off') { const c = ld(); sv(null); link = null; nudge(false); if (c) await H.api('tabReg', { id: c.id, off: 1 }); H.toast?.('🔌 Відʼєднано'); return; }
        if (a === 'test') { await out([['cfg', 80, 100, 120], ['big', 'TEST OK'], ['c', 'Принтер планшета · ' + (ld()?.name || '')], ['hr'], ['c', new Date().toLocaleString('uk-UA')], ['gap'], ['gap']]); H.toast?.('🧪 Надруковано'); return; }
        let c;
        if (a === 'bt') { const d = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BT_SV }); link = await btOpen(d); c = { type: 'bt', bid: d.id, name: d.name || 'Bluetooth-принтер' }; }
        if (a === 'usb') { const d = await navigator.usb.requestDevice({ filters: [] }); link = await usbOpen(d); c = { type: 'usb', vid: d.vendorId, pid: d.productId, name: d.productName || 'USB-принтер' }; }
        if (a === 'epos') { const ip = (await H.ask('📶 IP-адреса принтера Epson', 'напр. 192.168.1.50'))?.trim(); if (!ip) return; if (!/^((10|127)\.\d+|192\.168|172\.(1[6-9]|2\d|3[01]))\.\d+\.\d+(:\d+)?$|^[\w-]+\.local(:\d+)?$/.test(ip)) throw new Error('Потрібна адреса в мережі закладу, напр. 192.168.1.50'); c = { type: 'epos', ip, name: 'Epson ' + ip }; link = eposOpen(ip); }
        if (!c) return;
        const nm = (await H.ask('🖨 Назва принтера', 'напр. Бар, Кухня'))?.trim(); c.name = (nm || c.name).slice(0, 40);
        c.id = ld()?.id || 'tab:' + Math.random().toString(36).slice(2, 10);
        sv(c); await H.api('tabReg', { id: c.id, name: c.name, type: c.type }); wake();
        H.toast?.('✅ Підключено — тепер призначте, що на ньому друкувати');
      } catch (e) { if (e.name !== 'NotFoundError') H.toast?.('⚠️ ' + (e.name === 'TypeError' && a === 'epos' ? 'Принтер не відповідає — перевірте IP і крок 3 (https)' : e.message)); }
    },
  };
})();
