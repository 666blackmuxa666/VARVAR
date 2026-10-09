// 💾 Бекапи закладу: щоночі повна копія сховища (стиснута gzip) у KV на 8 днів: bak:<заклад>:<день>.
// Відновлення — з консолі платформи (перед ним робиться ще одна копія «до відновлення»). Власник може завантажити копію собі.
import { dayKey, logEvent } from './ops.js';
import { venueId } from './venue.js';

const gz = async s => new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
const gunz = async b => new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
const pre = () => 'bak:' + venueId() + ':';

export async function backupNow(env, tag = dayKey()) {
  const data = await env.DB.dump(), json = JSON.stringify(data), buf = await gz(json);
  if (buf.byteLength > 24e6) throw new Error('Бекап завеликий для KV (' + Math.round(buf.byteLength / 1e6) + ' МБ)');
  await env.DB.kv.put(pre() + tag, buf, { ...(tag === 'demo' ? {} : { expirationTtl: 8 * 86400 }), metadata: { at: Date.now(), n: data.length, kb: Math.round(buf.byteLength / 1024), raw: Math.round(json.length / 1024) } });
  return { tag, n: data.length, kb: Math.round(buf.byteLength / 1024) };
}
export async function backupList(env) {
  const r = await env.DB.kv.list({ prefix: pre() });
  return r.keys.map(k => ({ tag: k.name.slice(pre().length), ...(k.metadata || {}) })).sort((a, b) => (b.at || 0) - (a.at || 0));
}
export async function backupGet(env, tag) { const b = await env.DB.kv.get(pre() + tag, 'arrayBuffer'); return b ? gunz(b) : null; }
export async function backupRestore(env, tag, who) {
  const txt = await backupGet(env, tag); if (!txt) return { error: 'Бекап не знайдено' };
  const data = JSON.parse(txt); await backupNow(env, 'до-відновлення-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ''));
  const n = await env.DB.restore(data);
  await logEvent(env, { k: 'shift', text: `♻️ Дані закладу відновлено з копії ${tag} (${n} записів) — ${who}` }).catch(() => {});
  return { ok: true, n };
}
// ⏰ щоночі (Cron, після 4:00)
export async function backupDaily(env) {
  const h = +new Date().toLocaleString('en-GB', { timeZone: 'Europe/Kyiv', hour: '2-digit', hour12: false }); if (h < 4 || h > 10) return;
  const f = 'bakday:' + dayKey(); if (await env.DB.get(f)) return; await env.DB.put(f, '1', { expirationTtl: 3 * 86400 });
  await backupNow(env).catch(e => console.log('backup', e.message));
}
