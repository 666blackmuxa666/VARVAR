import { spawn } from 'node:child_process'; import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
const [,, html, out, T, fps = 30] = process.argv; rmSync(out, { recursive: true, force: true }); mkdirSync(out);
const ch = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=9333', '--user-data-dir=/tmp/ccvid', '--hide-scrollbars', `--window-size=${process.env.W || 1920},${process.env.H || 1080}`, '--force-device-scale-factor=1', 'about:blank']);
await new Promise(r => setTimeout(r, 1500));
const tabs = await (await fetch('http://127.0.0.1:9333/json')).json(); const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r); let id = 0; const P = {};
ws.onmessage = e => { const m = JSON.parse(e.data); if (P[m.id]) { P[m.id](m.result); delete P[m.id]; } };
const C = (method, params = {}) => new Promise(r => { P[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
await C('Emulation.setDeviceMetricsOverride', { width: +(process.env.W || 1920), height: +(process.env.H || 1080), deviceScaleFactor: 1, mobile: false });
await C('Page.enable'); await C('Page.navigate', { url: 'file://' + html }); await new Promise(r => setTimeout(r, 1500));
const N = Math.round(T * fps);
for (let f = 0; f < N; f++) {
  await C('Runtime.evaluate', { expression: `document.getAnimations().forEach(a=>{a.pause();a.currentTime=${f * 1000 / fps}})`, awaitPromise: false });
  const s = await C('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
  writeFileSync(`${out}/${String(f).padStart(5, '0')}.jpg`, Buffer.from(s.data, 'base64'));
}
ch.kill(); process.exit(0);
