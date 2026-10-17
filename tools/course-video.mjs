// 🎬 Відео до уроків «🎓 Навчання»: безголовий Chrome проходить тур кожного уроку на ТЕСТОВОМУ сервері
// (worker-test :8787 + site :8000) з «пальцем», що натискає підсвічені кнопки, і пише img/course/<id>.mp4 + .jpg.
// Запуск: node tools/course-video.mjs [id1,id2…]   (потрібен ffmpeg). Після — sh tools/build-pos.sh і підняти ?v=.
// Змінився інтерфейс → просто запустити ще раз.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
const API = process.env.API || 'http://localhost:8787', SITE = process.env.SITE || 'http://localhost:8000';
const ONLY = (process.argv[2] || '').split(',').filter(Boolean), OUT = 'img/course', W = 375, H = 740, FPS = 15;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = [process.env.CHROME, join(homedir(), 'Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find(p => existsSync(p));
if (!/localhost|127\.0\.0\.1/.test(API)) throw new Error('Лише тестовий сервер!');

async function chrome() {
  const dir = mkdtempSync(join(tmpdir(), 'course-')), port = 9800 + Math.floor(Math.random() * 100);
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, 'about:blank'], { stdio: 'ignore' });
  let ws; for (let i = 0; i < 50 && !ws; i++) { await sleep(200); try { ws = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === 'page')?.webSocketDebuggerUrl; } catch {} }
  const sock = new WebSocket(ws); await new Promise(r => { sock.onopen = r; });
  let id = 0; const wait = new Map(), on = {};
  sock.onmessage = m => { const x = JSON.parse(m.data); if (x.id && wait.has(x.id)) { wait.get(x.id)(x.result); wait.delete(x.id); } else if (x.method && on[x.method]) on[x.method](x.params); };
  const send = (method, params = {}) => new Promise(ok => { const i = ++id; wait.set(i, ok); sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }))?.result?.value;
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  return { send, ev, on, close: () => { sock.close(); proc.kill(); setTimeout(() => rmSync(dir, { recursive: true, force: true }), 500); } };
}
async function user(code) {
  for (let i = 0; i < 6; i++) { const r = await (await fetch(API + '/api/pos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'register', code, name: 'Олена ' + Math.random().toString(36).slice(2, 5), pin: String(200000 + Math.floor(Math.random() * 700000)) }) })).json(); if (r.token) return r; }
  throw new Error('реєстрація ' + code);
}
// 👆 «палець» і проходження уроку — виконується в сторінці
const PLAY = id => `(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), L = window.__CR.find(l => l.id === ${JSON.stringify(id)});
  let f = document.getElementById('vfinger'); if (!f) { f = document.createElement('div'); f.id = 'vfinger'; f.style.cssText = 'position:fixed;z-index:10000;width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.5);transition:left .7s ease,top .7s ease,transform .15s;left:50%;top:110%;pointer-events:none'; document.body.append(f); }
  document.querySelector('[data-a="crGo"][data-id="' + L.id + '"]').click();
  for (let g = 0; g < 20 && window.__TR.l; g++) {
    await sl(2600); const T = window.__TR; if (!T.l) break; const i = T.i, s = T.l.s[i], el = s.sel && [...document.querySelectorAll(s.sel)].find(e => e.offsetParent);
    const tgt = el || document.querySelector('[data-crx="1"]'); if (!tgt) break; const r = tgt.getBoundingClientRect();
    f.style.left = r.left + r.width / 2 + 'px'; f.style.top = r.top + r.height / 2 + 'px'; await sl(900);
    f.style.transform = 'scale(.7)'; await sl(160); f.style.transform = ''; tgt.click(); await sl(700);
    if (window.__TR.l && window.__TR.i === i) document.querySelector('[data-crx="1"]')?.click(); // кнопка не перевела далі (напр., відкрила вікно) — «Далі»
  }
  await sl(1500); f.style.top = '110%'; return true;
})()`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const roles = { a: '1119', w: '1112', k: '1113', c: '1114' }, made = [];
  const b = await chrome();
  await b.send('Page.navigate', { url: `${SITE}/pos.html?api=${encodeURIComponent(API)}` }); await sleep(2500);
  const all = await b.ev(`(async () => { localStorage.setItem('course', '{}'); return 1; })()`);
  for (const [r, code] of Object.entries(roles)) {
    const u = await user(code);
    await b.ev(`localStorage.setItem('pos_token', ${JSON.stringify(JSON.stringify(u.token))}); localStorage.setItem('pos_me', ${JSON.stringify(JSON.stringify(u.me))}); localStorage.setItem('course','{}'); 1`);
    await b.send('Page.reload'); await sleep(3500);
    const ids = (await b.ev(`window.__CR.filter(l => l.r === '${r}').map(l => l.id)`)) || [];
    for (const id of ids.filter(x => !ONLY.length || ONLY.includes(x))) {
      // кожен урок — з вкладки «Навчання», чистий екран
      await b.ev(`(() => { document.querySelector('[data-a="closeSheet"]')?.click(); document.querySelector('#modal')?.remove(); const x = document.createElement('button'); x.dataset.a = 'view'; x.dataset.v = 'course'; document.body.append(x); x.click(); x.remove(); return 1; })()`); await sleep(700);
      const tmp = mkdtempSync(join(tmpdir(), 'cv-')); const frames = []; let last = null;
      b.on['Page.screencastFrame'] = p => { b.send('Page.screencastFrameAck', { sessionId: p.sessionId }); frames.push([p.metadata.timestamp, p.data]); };
      await b.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: W * 2, maxHeight: H * 2, everyNthFrame: 1 });
      await sleep(600); await b.ev(PLAY(id)); await b.send('Page.stopScreencast'); await sleep(300);
      if (frames.length < 5) { console.log('⚠️', id, 'замало кадрів'); continue; }
      // рівний FPS: кожен кадр триває до наступного
      const t0 = frames[0][0], tEnd = frames.at(-1)[0] + 1; let n = 0;
      for (let t = t0, k = 0; t < tEnd; t += 1 / FPS) { while (k + 1 < frames.length && frames[k + 1][0] <= t) k++; writeFileSync(join(tmp, String(n++).padStart(5, '0') + '.jpg'), Buffer.from(frames[k][1], 'base64')); }
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(tmp, '%05d.jpg'), '-vf', 'scale=480:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '30', '-movflags', '+faststart', join(OUT, id + '.mp4')]);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(tmp, String(Math.floor(n * 0.35)).padStart(5, '0') + '.jpg'), '-vf', 'scale=480:-2', '-q:v', '5', join(OUT, id + '.jpg')]);
      rmSync(tmp, { recursive: true, force: true }); made.push(id); console.log('🎬', id, (n / FPS).toFixed(1) + ' с');
      await b.ev(`(() => { document.querySelector('[data-crx="0"]')?.click(); return 1; })()`);
    }
  }
  b.close();
  // список уроків з відео → у касу
  const have = execFileSync('ls', [OUT]).toString().split('\n').filter(f => f.endsWith('.mp4')).map(f => f.slice(0, -4));
  writeFileSync('js/pos/94-course-vid.js', `  // 🎬 уроки з відео (img/course/<id>.mp4) — файл перезаписує tools/course-video.mjs\n  const COURSE_VID = ${JSON.stringify(have)};\n`);
  console.log('✅ знято', made.length, '· усього з відео', have.length);
}
main().catch(e => { console.error('❌', e.message); process.exit(1); });
