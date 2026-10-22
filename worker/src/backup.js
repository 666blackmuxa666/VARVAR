// 💾 Бекапи закладу: щоночі повна копія сховища (стиснута gzip) у KV на 8 днів: bak:<заклад>:<день>.
// Відновлення — з консолі платформи (перед ним робиться ще одна копія «до відновлення»). Власник може завантажити копію собі.
import { dayKey, logEvent } from './ops.js';
import { venueId } from './venue.js';

const gz = async s => new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
const gunz = async b => new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
const pre = () => 'bak:' + venueId() + ':';

// 🔔 сповіщення власнику платформи (особисто, не в групу персоналу), не частіше разу на добу на вид
async function warnBak(env, kind, text) {
  const f = 'bakwarn:' + kind; if (await env.DB.get(f)) return; await env.DB.put(f, '1', { expirationTtl: 86400 });
  await (await import('./ideas.js')).toHub(env, { kind: 'help', by: 'Бекап', role: 'system', text: '💾 ' + text }).catch(() => {});
}
export async function backupNow(env, tag = dayKey()) {
  const data = await env.DB.dump(), json = JSON.stringify(data), buf = await gz(json);
  if (buf.byteLength > 17e6) await warnBak(env, 'size', `Бекап уже ${Math.round(buf.byteLength / 1e6)} МБ із 24 (ліміт сховища) — час переходити на архів/зовнішню копію. Скажи ATOM.`); // 🔔 понад ~70%
  if (buf.byteLength > 24e6) throw new Error('Бекап завеликий для KV (' + Math.round(buf.byteLength / 1e6) + ' МБ)');
  await env.DB.kv.put(pre() + tag, buf, { ...(tag === 'demo' ? {} : { expirationTtl: 8 * 86400 }), metadata: { at: Date.now(), n: data.length, kb: Math.round(buf.byteLength / 1024), raw: Math.round(json.length / 1024) } });
  return { tag, n: data.length, kb: Math.round(buf.byteLength / 1024) };
}
export async function backupList(env) {
  const r = await env.DB.kv.list({ prefix: pre() });
  return r.keys.map(k => ({ tag: k.name.slice(pre().length), ...(k.metadata || {}) })).sort((a, b) => (b.at || 0) - (a.at || 0));
}
export async function backupGet(env, tag) { const b = await env.DB.kv.get(pre() + tag, 'arrayBuffer'); return b ? gunz(b) : null; }
// 🔏 Файл копії для власника: конверт {atom_backup, venue, at, sig, data} з підписом HMAC (ключ із MASTER_KEY) — підроблений чи чужий файл не залити
const sigOf = async (env, venue, at, data) => {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode('bakfile:' + (env.MASTER_KEY || '')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(venue + '|' + at + '|' + data)))].map(x => x.toString(16).padStart(2, '0')).join('');
};
export async function backupSigned(env, tag) {
  const data = await backupGet(env, tag); if (!data) return null; const at = Date.now(), venue = venueId();
  return JSON.stringify({ atom_backup: 1, venue, tag, at, sig: env.MASTER_KEY ? await sigOf(env, venue, at, data) : '', data });
}
// перевірка файлу: формат, підпис, чий заклад → попередній перегляд (дата, чеки, клієнти, працівники)
export async function backupCheck(env, text, anyVenue) {
  let f; try { f = JSON.parse(text); } catch { return { error: 'Це не файл копії (не читається)' }; }
  if (!f || f.atom_backup !== 1 || typeof f.data !== 'string' || !f.venue) return { error: 'Невірний формат файлу копії' };
  if (!env.MASTER_KEY || !f.sig) return { error: 'Файл без підпису — відновлення з нього заборонено' };
  const want = await sigOf(env, f.venue, f.at, f.data), a = String(f.sig);
  if (a.length !== want.length || [...a].reduce((x, c, i) => x | (c.charCodeAt(0) ^ want.charCodeAt(i)), 0)) return { error: 'Підпис не збігається — файл змінено або він не від ATOM' };
  if (!anyVenue && f.venue !== venueId()) return { error: 'Це копія іншого закладу (' + String(f.venue).slice(0, 40) + ')' };
  let rows; try { rows = JSON.parse(f.data); if (!Array.isArray(rows)) throw 0; } catch { return { error: 'Вміст копії пошкоджено' }; }
  const cnt = p => rows.filter(e => Array.isArray(e) && String(e[0]).startsWith(p)).length, st = rows.find(e => e[0] === 'staff');
  return { ok: true, venue: f.venue, at: f.at, tag: f.tag, n: rows.length, checks: cnt('closed:'), clients: cnt('cli:'), staff: Array.isArray(st?.[1]) ? st[1].length : 0, rows };
}
export async function backupRestoreFile(env, text, who) {
  const c = await backupCheck(env, text); if (c.error) return c;
  await backupNow(env, 'до-відновлення-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ''));
  const n = await env.DB.restore(c.rows);
  await logEvent(env, { k: 'shift', text: `♻️ Дані закладу відновлено з файлу копії (${n} записів) — ${who}` }).catch(() => {});
  return { ok: true, n };
}
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
  await backupNow(env).catch(async e => { console.log('backup', e.message); await env.DB.delete(f); await warnBak(env, 'fail', 'Нічний бекап не вдався: ' + String(e.message).slice(0, 200)); }); // збій — наступна година спробує ще
}
