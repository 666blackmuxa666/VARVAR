#!/usr/bin/env node
// 📸 Знімки всіх екранів каси й кабінету (для аудиту дизайну): node tools/shots.mjs <тека> [--w=375] [--only=hall,cash]
// Лише проти worker-test (:8787) і site-test (:8001). Реєструє тестового адміна кодом 1119.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const API = 'http://localhost:8787', SITE = 'http://localhost:8001', OUT = process.argv[2] || 'shots';
const W = +(process.argv.find(a => a.startsWith('--w=')) || '--w=375').slice(4), ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const pin = String(3000 + Math.floor(Math.random() * 6000));
const reg = await (await fetch(API + '/api/pos', { method: 'POST', body: JSON.stringify({ op: 'register', code: '1119', name: 'Дизайн ' + pin, pin }) })).json();
if (!reg.token) throw new Error('реєстрація: ' + JSON.stringify(reg));
const own = await (await fetch(API + '/api/owner', { method: 'POST', body: JSON.stringify({ op: 'login', email: 'qa-platform@test.local', pass: 'qa-platform-pass-1' }) })).json();

const bin = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find(existsSync);
const dir = mkdtempSync(join(tmpdir(), 'varvar-shots-')), port = 9800 + Math.floor(Math.random() * 100);
const proc = spawn(bin, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, 'about:blank'], { stdio: 'ignore' });
let ws; for (let i = 0; i < 50 && !ws; i++) { await sleep(200); try { ws = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const sock = new WebSocket(ws); await new Promise(r => { sock.onopen = r; });
let id = 0; const wait = new Map();
sock.onmessage = m => { const x = JSON.parse(m.data); if (x.id && wait.has(x.id)) { const [ok, no] = wait.get(x.id); wait.delete(x.id); x.error ? no(new Error(x.error.message)) : ok(x.result); } };
const send = (method, params = {}) => new Promise((ok, no) => { const i = ++id; wait.set(i, [ok, no]); sock.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send('Runtime.evaluate', { expression: `(async()=>{${e}})()`, awaitPromise: true, returnByValue: true })).result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 812, deviceScaleFactor: 1, mobile: W < 700 });
const shot = async name => { const h = Math.min(2400, await ev('return Math.max(document.documentElement.scrollHeight, innerHeight)'));
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70, captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height: h, scale: 1 } });
  writeFileSync(join(OUT, name + '.jpg'), Buffer.from(r.data, 'base64')); console.log('📸', name, h); };
const go = async url => { await send('Page.navigate', { url }); await sleep(3500); };
const want = k => !ONLY.length || ONLY.some(o => k.startsWith(o));

// ---- каса (адмін) ----
await go(SITE + '/pos.html?api=' + API);
await ev(`for (const k of Object.keys(localStorage)) if (k.startsWith('pos_')) localStorage.removeItem(k); localStorage.setItem('pos_token', JSON.stringify(${JSON.stringify(reg.token)})); localStorage.setItem('pos_me', JSON.stringify(${JSON.stringify(reg.me)}));`);
await go(SITE + '/pos.html?api=' + API);
const click = async (sel, ms = 1800) => { await ev(`document.querySelector(${JSON.stringify(sel)})?.click()`); await sleep(ms); };
const closeAll = () => ev(`document.querySelector('#modal')?.click?.(); document.querySelector('[data-a="closeSheet"], .sheet .x')?.click(); return 1`);
const views = { hall: [], books: [], kq: [], cash: ['seg:checks'], reports: [], calc: [], team: ['grid', 'pay', 'ops', 'eff', 'plan', 'people', 'ideas'], settings: ['venue', 'rules', 'site', 'go', 'loy', 'look', 'printer'] };
for (const [v, tabs] of Object.entries(views)) {
  if (!want(v)) continue;
  await ev(`window.scrollTo(0,0)`); await click(`[data-a="view"][data-v="${v}"]`, 2500); await shot(`pos-${v}`);
  for (const t of tabs) { const sel = v === 'team' ? `[data-a="zpTab"][data-t="${t}"]` : v === 'settings' ? `[data-a="setTab"][data-s="${t}"]` : null; if (!sel) continue; await click(sel, 2200); await shot(`pos-${v}-${t}`); }
}
// розділи звітів і складу
if (want('reports')) { await click('[data-a="view"][data-v="reports"]', 2500); const secs = await ev(`return [...document.querySelectorAll('[data-a="rSec"]')].map(b=>b.dataset.s)`) || []; for (const s of secs) { await click(`[data-a="rSec"][data-s="${s}"]`, 2500); await shot(`pos-reports-${s}`); } }
if (want('calc')) { await click('[data-a="view"][data-v="calc"]', 2500); const t = await ev(`return [...document.querySelectorAll('.rsec [data-a="skTab"]')].map(b=>b.dataset.t)`) || []; for (const s of t) { await click(`[data-a="skTab"][data-t="${s}"]`, 2500); await shot(`pos-calc-${s}`); } }
// вікна
if (want('modal')) {
  await click('[data-a="view"][data-v="hall"]', 2000);
  await click('.tbl', 2000); await shot('modal-table'); await ev(`document.querySelector('[data-a="closeTable"], .sheet-x, [data-a="closeSheet"]')?.click()`); await sleep(800);
  await click('[data-a="zpMy"]', 2500); await shot('modal-me'); await ev(`document.querySelector('#modal [data-mi]:last-child')?.click()`); await sleep(600);
  await click('[data-a="view"][data-v="cash"]', 2000); await click('[data-a="expense"]', 1000); await shot('modal-expense'); await ev(`document.querySelector('#modal [data-mi]:last-child')?.click()`); await sleep(600);
  await click('[data-a="view"][data-v="calc"]', 2500); await click('[data-a="skIng"][data-id]', 1200); await shot('modal-ing'); await ev(`document.querySelector('#modal [data-mi]:last-child')?.click()`); await sleep(600);
}
// ---- кабінет власника ----
if (want('owner') && own.token) {
  await go(SITE + '/owner.html?api=' + API);
  await ev(`localStorage.setItem('own_token', JSON.stringify(${JSON.stringify(own.token)}))`); await go(SITE + '/owner.html?api=' + API);
  const tabs = await ev(`return [...document.querySelectorAll('.tabs button[data-a="tab"]')].map(b=>b.dataset.t)`) || [];
  await shot('owner-home');
  for (const t of tabs) { await click(`.tabs button[data-t="${t}"]`, 2500); await shot('owner-' + t); }
}
sock.close(); proc.kill(); setTimeout(() => rmSync(dir, { recursive: true, force: true }), 500);
// прибрати тестового адміна
await fetch(API + '/api/pos', { method: 'POST', headers: { authorization: 'Bearer ' + reg.token }, body: JSON.stringify({ op: 'logout', token: reg.token }) });
